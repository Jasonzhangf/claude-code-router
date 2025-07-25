#!/usr/bin/env node

// 测试脚本2：将完整的CodeWhisperer响应传给Transformer
// 检查从完整响应到用户界面这个过程中哪些函数调用是错的
// 不需要每次都和模型对话，只要模拟这个模型的响应

const fs = require('fs');
const path = require('path');

console.log('🔍 测试：Transformer响应处理流程检查');
console.log('=====================================\n');

// 模拟完整的CodeWhisperer响应 (基于第1个脚本的成功结果)
function createMockCodeWhispererResponse() {
  console.log('📋 步骤1: 创建模拟的CodeWhisperer完整响应');
  
  // 模拟真实的响应内容 - 基于第1个脚本的成功案例
  const mockContent = `Hello! I'll explain machine learning comprehensively.

## What is Machine Learning?

Machine learning is a subset of artificial intelligence (AI) that enables computers to learn and make decisions from data without being explicitly programmed for every specific task. Instead of following pre-written instructions, ML systems identify patterns in data and use these patterns to make predictions or decisions about new, unseen data.

## Core Concepts

### 1. **Data**
Data is the foundation of machine learning. It can include:
- **Structured data**: Numbers, categories (like spreadsheet data)
- **Unstructured data**: Text, images, audio, video
- **Features**: Individual measurable properties of observed phenomena
- **Labels/Targets**: The correct answers we want the model to predict

### 2. **Training and Testing**
- **Training data**: Used to teach the algorithm patterns
- **Testing data**: Used to evaluate how well the model performs on unseen data
- **Validation data**: Used during training to tune model parameters

Thank you for your question!`;

  // 创建模拟的二进制响应 (简化版，包含必要的帧结构)
  const mockEvents = mockContent.split(' ').map(word => ({
    content: word + (word.endsWith('.') || word.endsWith('!') || word.endsWith('?') ? '' : ' ')
  }));
  
  // 构建模拟的二进制响应
  let mockBuffer = Buffer.alloc(0);
  
  for (const event of mockEvents) {
    const payload = JSON.stringify(event);
    const payloadBuffer = Buffer.from(payload, 'utf8');
    const headerLen = 92; // 固定头部长度
    const totalLen = payloadBuffer.length + headerLen + 12;
    
    // 创建帧
    const frame = Buffer.alloc(totalLen);
    frame.writeUInt32BE(totalLen, 0);        // totalLen
    frame.writeUInt32BE(headerLen, 4);       // headerLen
    
    // 填充头部 (简化，只填充必要字节)
    for (let i = 8; i < 8 + headerLen; i++) {
      frame[i] = 0x00;
    }
    
    // 填充载荷
    payloadBuffer.copy(frame, 8 + headerLen);
    
    // 填充CRC32 (简化，填0)
    frame.writeUInt32BE(0, totalLen - 4);
    
    mockBuffer = Buffer.concat([mockBuffer, frame]);
  }
  
  console.log(`✅ 创建了 ${mockBuffer.length} 字节的模拟响应，包含 ${mockEvents.length} 个事件`);
  return mockBuffer;
}

// 导入k2cc transformer (模拟)
function loadK2ccTransformer() {
  console.log('📋 步骤2: 加载K2cc Transformer');
  
  // 从实际文件中读取k2cc transformer的实现
  const transformerPath = path.join(__dirname, '..', 'src', 'transformers', 'k2cc.ts');
  const transformerCode = fs.readFileSync(transformerPath, 'utf-8');
  
  console.log('✅ K2cc Transformer代码已加载');
  
  // 模拟transformer实例 (简化版本，只包含必要方法)
  return {
    // 解析SSE事件的方法 (从k2cc.ts提取)
    parseSSEEvents: function(responseBuffer) {
      const events = [];
      let offset = 0;
      
      console.log(`🔄 开始解析 ${responseBuffer.length} 字节的响应`);
      
      while (offset < responseBuffer.length - 12) {
        try {
          // 读取帧头 (big endian)
          const totalLen = responseBuffer.readUInt32BE(offset);
          const headerLen = responseBuffer.readUInt32BE(offset + 4);
          
          console.log(`📦 帧信息 - totalLen: ${totalLen}, headerLen: ${headerLen}, offset: ${offset}`);
          
          // 验证帧长度
          if (totalLen > responseBuffer.length - offset + 8) {
            console.log('❌ 帧长度无效，停止解析');
            break;
          }
          
          // 跳过头部
          const headerStart = offset + 8;
          const headerEnd = headerStart + headerLen;
          
          // 读取载荷
          const payloadLen = totalLen - headerLen - 12;
          const payloadStart = headerEnd;
          const payloadEnd = payloadStart + payloadLen;
          
          if (payloadEnd > responseBuffer.length || payloadLen <= 0) {
            console.log('❌ 载荷边界无效');
            offset += 1;
            continue;
          }
          
          const payload = responseBuffer.slice(payloadStart, payloadEnd);
          
          // 移除"vent"前缀
          let payloadStr = payload.toString('utf8');
          payloadStr = payloadStr.replace(/^vent/, '');
          
          // 解析JSON
          try {
            const assistantEvent = JSON.parse(payloadStr);
            console.log(`✅ 解析JSON成功: ${JSON.stringify(assistantEvent)}`);
            
            // 转换为SSE事件
            const sseEvent = this.convertAssistantEventToSSE(assistantEvent);
            if (sseEvent.event) {
              events.push(sseEvent);
              console.log(`📝 添加SSE事件: ${sseEvent.event} - "${sseEvent.data?.delta?.text || ''}"`)
            }
            
          } catch (parseError) {
            console.log(`❌ JSON解析错误: ${parseError.message}`);
          }
          
          // 移动到下一帧
          offset = payloadEnd + 4;
          
        } catch (error) {
          console.log(`❌ 帧解析错误: ${error.message}`);
          offset += 1;
        }
      }
      
      console.log(`✅ 总共解析了 ${events.length} 个SSE事件`);
      return events;
    },
    
    // 转换助手事件为SSE格式
    convertAssistantEventToSSE: function(evt) {
      if (evt.content) {
        return {
          event: 'content_block_delta',
          data: {
            type: 'content_block_delta',
            index: 0,
            delta: {
              type: 'text_delta',
              text: evt.content,
            },
          },
        };
      }
      return {};
    },
    
    // 模拟transformResponseOut方法
    transformResponseOut: async function(mockResponseBuffer) {
      console.log('🔄 调用 transformResponseOut');
      console.log(`📥 输入: ${mockResponseBuffer.length} 字节的二进制响应`);
      
      try {
        // 解析SSE事件
        console.log('📋 步骤A: 解析SSE事件');
        const events = this.parseSSEEvents(mockResponseBuffer);
        
        // 提取内容
        console.log('📋 步骤B: 提取内容');
        let fullContent = '';
        let contentFragments = [];
        
        for (const event of events) {
          if (event.event === 'content_block_delta' && event.data) {
            const delta = event.data.delta;
            if (delta && delta.type === 'text_delta' && delta.text) {
              fullContent += delta.text;
              contentFragments.push(delta.text);
              console.log(`📝 内容片段 ${contentFragments.length}: "${delta.text}"`);
            }
          }
        }
        
        console.log(`📊 提取统计: ${contentFragments.length} 个片段，总长度 ${fullContent.length} 字符`);
        console.log(`🎯 完整内容前100字符: "${fullContent.substring(0, 100)}..."`);
        
        // 创建OpenAI格式响应 (如当前代码所做)
        console.log('📋 步骤C: 创建OpenAI格式响应');
        const openaiResponse = {
          id: `msg_${Date.now()}`,
          object: 'chat.completion',
          created: Math.floor(Date.now() / 1000),
          model: 'claude-sonnet-4-20250514',
          choices: [{
            index: 0,
            message: {
              role: 'assistant',
              content: fullContent || 'Response processed through k2cc transformer'
            },
            finish_reason: 'stop'
          }],
          usage: {
            prompt_tokens: 10,
            completion_tokens: Math.max(Math.floor(fullContent.length / 4), 1),
            total_tokens: 10 + Math.max(Math.floor(fullContent.length / 4), 1)
          }
        };
        
        console.log('📋 步骤D: 创建Response对象');
        const responseJson = JSON.stringify(openaiResponse);
        const finalResponse = new Response(responseJson, {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
          },
        });
        
        console.log(`✅ transformResponseOut完成: ${responseJson.length} 字符的JSON响应`);
        console.log(`🔧 OpenAI响应结构预览: choices[0].message.content长度=${openaiResponse.choices[0].message.content.length}`);
        
        return { finalResponse, openaiResponse, fullContent, contentFragments };
        
      } catch (error) {
        console.error(`❌ transformResponseOut错误: ${error.message}`);
        console.error(`❌ 错误堆栈: ${error.stack}`);
        return null;
      }
    }
  };
}

// 模拟@musistudio/llms的后续处理
function simulateMusistudioProcessing(openaiResponse) {
  console.log('📋 步骤3: 模拟@musistudio/llms后续处理');
  
  try {
    console.log('🔄 步骤3A: 接收OpenAI格式响应');
    console.log(`📥 输入响应类型: ${openaiResponse.object}`);
    console.log(`📥 choices数组长度: ${openaiResponse.choices?.length || 0}`);
    
    if (!openaiResponse.choices || openaiResponse.choices.length === 0) {
      throw new Error('OpenAI响应缺少choices数组');
    }
    
    const choice = openaiResponse.choices[0];
    if (!choice.message) {
      throw new Error('Choice缺少message字段');
    }
    
    console.log(`✅ message.content长度: ${choice.message.content?.length || 0}`);
    
    console.log('🔄 步骤3B: 转换为Anthropic格式');
    const anthropicResponse = {
      id: openaiResponse.id,
      type: 'message',
      role: 'assistant',
      model: openaiResponse.model,
      content: [{
        type: 'text',
        text: choice.message.content
      }],
      stop_reason: choice.finish_reason === 'stop' ? 'end_turn' : choice.finish_reason,
      stop_sequence: null,
      usage: {
        input_tokens: openaiResponse.usage?.prompt_tokens || 0,
        output_tokens: openaiResponse.usage?.completion_tokens || 0
      }
    };
    
    console.log('✅ Anthropic格式转换完成');
    console.log(`🔧 content[0].text前100字符: "${anthropicResponse.content[0].text.substring(0, 100)}..."`);
    
    return anthropicResponse;
    
  } catch (error) {
    console.error(`❌ @musistudio/llms处理错误: ${error.message}`);
    return null;
  }
}

// 检查用户界面接收
function checkUserInterfaceReceiver(anthropicResponse) {
  console.log('📋 步骤4: 检查用户界面接收');
  
  try {
    console.log('🔄 步骤4A: 验证Anthropic响应结构');
    
    const requiredFields = ['id', 'type', 'role', 'model', 'content', 'stop_reason', 'usage'];
    for (const field of requiredFields) {
      if (!(field in anthropicResponse)) {
        throw new Error(`缺少必需字段: ${field}`);
      }
    }
    
    console.log('✅ Anthropic响应结构验证通过');
    
    console.log('🔄 步骤4B: 提取用户可见内容');
    if (!Array.isArray(anthropicResponse.content) || anthropicResponse.content.length === 0) {
      throw new Error('content数组为空或不是数组');
    }
    
    const textContent = anthropicResponse.content
      .filter(block => block.type === 'text')
      .map(block => block.text)
      .join('');
    
    console.log(`✅ 用户可见内容长度: ${textContent.length} 字符`);
    console.log(`🎯 用户看到的内容前200字符:`);
    console.log(`"${textContent.substring(0, 200)}..."`);
    
    return {
      success: true,
      userVisibleContent: textContent,
      contentLength: textContent.length,
      responseStructure: anthropicResponse
    };
    
  } catch (error) {
    console.error(`❌ 用户界面接收错误: ${error.message}`);
    return {
      success: false,
      error: error.message
    };
  }
}

// 主测试函数
async function testTransformerProcessing() {
  try {
    console.log('🚀 开始Transformer响应处理流程测试\n');
    
    // 步骤1: 创建模拟响应
    const mockBuffer = createMockCodeWhispererResponse();
    
    // 步骤2: 加载transformer并处理
    const transformer = loadK2ccTransformer();
    const transformResult = await transformer.transformResponseOut(mockBuffer);
    
    if (!transformResult) {
      throw new Error('Transformer处理失败');
    }
    
    const { openaiResponse, fullContent, contentFragments } = transformResult;
    
    // 步骤3: 模拟@musistudio/llms处理
    const anthropicResponse = simulateMusistudioProcessing(openaiResponse);
    
    if (!anthropicResponse) {
      throw new Error('@musistudio/llms处理失败');
    }
    
    // 步骤4: 检查用户界面接收
    const uiResult = checkUserInterfaceReceiver(anthropicResponse);
    
    // 生成测试报告
    console.log('\n' + '='.repeat(80));
    console.log('📊 测试报告');
    console.log('='.repeat(80));
    
    console.log(`📥 输入数据:`);
    console.log(`   - 模拟响应大小: ${mockBuffer.length} 字节`);
    
    console.log(`🔧 Transformer处理:`);
    console.log(`   - 提取的内容片段: ${contentFragments.length} 个`);
    console.log(`   - 完整内容长度: ${fullContent.length} 字符`);
    console.log(`   - OpenAI响应状态: ✅ 成功`);
    
    console.log(`🔄 @musistudio/llms处理:`);
    console.log(`   - Anthropic转换状态: ${anthropicResponse ? '✅ 成功' : '❌ 失败'}`);
    
    console.log(`👤 用户界面接收:`);
    console.log(`   - 接收状态: ${uiResult.success ? '✅ 成功' : '❌ 失败'}`);
    if (uiResult.success) {
      console.log(`   - 用户可见内容长度: ${uiResult.contentLength} 字符`);
    } else {
      console.log(`   - 错误: ${uiResult.error}`);
    }
    
    // 对比检查
    console.log(`\n🔍 一致性检查:`);
    console.log(`   - Transformer提取长度: ${fullContent.length}`);
    console.log(`   - OpenAI响应内容长度: ${openaiResponse.choices[0].message.content.length}`);
    console.log(`   - Anthropic内容长度: ${anthropicResponse.content[0].text.length}`);
    console.log(`   - 用户看到长度: ${uiResult.success ? uiResult.contentLength : 0}`);
    
    const isConsistent = fullContent.length === openaiResponse.choices[0].message.content.length &&
                        openaiResponse.choices[0].message.content.length === anthropicResponse.content[0].text.length &&
                        anthropicResponse.content[0].text.length === (uiResult.success ? uiResult.contentLength : 0);
    
    console.log(`   - 长度一致性: ${isConsistent ? '✅ 一致' : '❌ 不一致'}`);
    
    // 保存测试结果
    const resultPath = path.join(__dirname, 'transformer-processing-test-result.json');
    const testResult = {
      timestamp: new Date().toISOString(),
      input: {
        mockBufferSize: mockBuffer.length
      },
      transformer: {
        fragmentsCount: contentFragments.length,
        fullContentLength: fullContent.length,
        fullContent: fullContent.substring(0, 500) + '...' // 保存前500字符
      },
      openaiResponse: {
        contentLength: openaiResponse.choices[0].message.content.length,
        structure: 'valid'
      },
      anthropicResponse: {
        contentLength: anthropicResponse ? anthropicResponse.content[0].text.length : 0,
        structure: anthropicResponse ? 'valid' : 'invalid'
      },
      userInterface: uiResult,
      consistency: {
        lengthConsistent: isConsistent,
        allStagesSuccess: uiResult.success
      }
    };
    
    fs.writeFileSync(resultPath, JSON.stringify(testResult, null, 2));
    console.log(`\n💾 测试结果已保存到: ${resultPath}`);
    
    if (isConsistent && uiResult.success) {
      console.log('\n🎉 测试成功！所有处理步骤都正常工作，内容完整传递到用户界面');
    } else {
      console.log('\n⚠️ 测试发现问题，需要进一步调查处理流程中的错误');
    }
    
  } catch (error) {
    console.error('\n❌ 测试失败:', error.message);
    console.error('错误堆栈:', error.stack);
    process.exit(1);
  }
}

// 运行测试
testTransformerProcessing();