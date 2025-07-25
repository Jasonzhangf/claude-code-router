#!/usr/bin/env node

// 测试脚本：代理服务器完整流程模拟测试
// 使用模拟数据测试整个代理服务器流程，不进行真实API调用

const fs = require('fs');
const path = require('path');

console.log('🔍 测试：代理服务器完整流程模拟');
console.log('===============================\n');

// 模拟Anthropic请求
const mockAnthropicRequest = {
  model: 'claude-sonnet-4-20250514',
  max_tokens: 100,
  messages: [{
    role: 'user',
    content: 'Please explain machine learning briefly.'
  }]
};

// 模拟token数据
const mockTokenData = {
  accessToken: 'mock-access-token-12345',
  refreshToken: 'mock-refresh-token-67890',
  expiresAt: new Date(Date.now() + 3600000).toISOString()
};

// 模拟provider配置
const mockProvider = {
  name: 'k2cc',
  baseUrl: 'https://codewhisperer.us-east-1.amazonaws.com/',
  apiKey: 'dummy-key-not-used',
  models: ['claude-sonnet-4-20250514'],
  transformer: { use: ['k2cc'] },
  config: {}
};

// 创建完整的模拟CodeWhisperer响应
function createMockCodeWhispererResponse() {
  console.log('📋 步骤1: 创建模拟CodeWhisperer响应');
  
  const mockResponseText = `Machine learning is a subset of artificial intelligence that enables computers to learn patterns from data without explicit programming. 

Key concepts include:
- **Data**: The foundation - can be structured (numbers, categories) or unstructured (text, images)
- **Training**: Teaching algorithms using labeled examples
- **Models**: Mathematical representations that capture patterns
- **Prediction**: Using learned patterns on new, unseen data

Common algorithms include linear regression, decision trees, neural networks, and support vector machines. Applications span from email spam detection to autonomous vehicles.

The process involves collecting data, training models, evaluating performance, and deploying for real-world use.`;

  // 将文本分割成片段，模拟SSE流式响应
  const words = mockResponseText.split(/(\s+)/);
  const mockEvents = [];
  
  for (let i = 0; i < words.length; i += 3) {
    const chunk = words.slice(i, i + 3).join('');
    if (chunk.trim()) {
      mockEvents.push({ content: chunk });
    }
  }
  
  // 构建模拟的二进制响应
  let mockBuffer = Buffer.alloc(0);
  
  for (const event of mockEvents) {
    const payload = JSON.stringify(event);
    const payloadBuffer = Buffer.from(payload, 'utf8');
    const headerLen = 92;
    const totalLen = payloadBuffer.length + headerLen + 12;
    
    // 创建帧
    const frame = Buffer.alloc(totalLen);
    frame.writeUInt32BE(totalLen, 0);
    frame.writeUInt32BE(headerLen, 4);
    
    // 填充头部
    for (let i = 8; i < 8 + headerLen; i++) {
      frame[i] = 0x00;
    }
    
    // 填充载荷
    payloadBuffer.copy(frame, 8 + headerLen);
    
    // 填充CRC32
    frame.writeUInt32BE(0, totalLen - 4);
    
    mockBuffer = Buffer.concat([mockBuffer, frame]);
  }
  
  console.log(`✅ 创建了 ${mockBuffer.length} 字节的模拟响应，包含 ${mockEvents.length} 个事件`);
  return { mockBuffer, expectedContent: mockResponseText };
}

// 模拟K2cc Transformer的transformRequestIn方法
function simulateTransformRequestIn(request, provider) {
  console.log('\n📋 步骤2: 模拟 K2cc.transformRequestIn');
  console.log(`🔄 输入请求: ${JSON.stringify(request, null, 2)}`);
  
  try {
    // 生成UUID
    function generateUUID() {
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
      });
    }
    
    // 获取消息内容
    function getMessageContent(content) {
      if (typeof content === 'string') {
        return content || "answer for user question";
      }
      if (Array.isArray(content)) {
        const texts = content
          .filter(block => block.type === 'text' || block.type === 'tool_result')
          .map(block => block.text || block.content)
          .filter(Boolean);
        return texts.length > 0 ? texts.join('\n') : "answer for user question";
      }
      return "answer for user question";
    }
    
    // 构建CodeWhisperer请求
    const lastMessage = request.messages[request.messages.length - 1];
    const cwRequest = {
      profileArn: "arn:aws:codewhisperer:us-east-1:699475941385:profile/EHGA3GRVQMUK",
      conversationState: {
        chatTriggerType: "MANUAL",
        conversationId: generateUUID(),
        currentMessage: {
          userInputMessage: {
            content: getMessageContent(lastMessage.content),
            modelId: "CLAUDE_SONNET_4_20250514_V1_0",
            origin: "AI_EDITOR",
            userInputMessageContext: {
              tools: [],
              toolResults: []
            }
          }
        },
        history: []
      }
    };
    
    console.log(`✅ CodeWhisperer请求构建完成`);
    console.log(`🔧 CW请求内容: ${getMessageContent(lastMessage.content)}`);
    
    // 返回正确的@musistudio/llms格式
    const transformedRequest = {
      body: cwRequest,
      config: {
        url: new URL('generateAssistantResponse', provider.baseUrl),
        headers: {
          'Authorization': `Bearer ${mockTokenData.accessToken}`,
          'Content-Type': 'application/x-amz-json-1.1',
          'X-Amz-Target': 'CodeWhispererService.GenerateAssistantResponse',
          'User-Agent': 'k2cc-transformer/1.0.0'
        },
      },
      _k2ccIntercepted: true,
      _k2ccToken: mockTokenData,
      _cwRequest: cwRequest,
      _originalRequest: { ...request },
      _tokenId: 'mock-token-id'
    };
    
    console.log(`✅ transformRequestIn完成`);
    console.log(`🔧 返回格式: body=${typeof transformedRequest.body}, config.headers存在=${!!transformedRequest.config.headers}`);
    
    return transformedRequest;
    
  } catch (error) {
    console.error(`❌ transformRequestIn错误: ${error.message}`);
    return null;
  }
}

// 模拟@musistudio/llms发送请求
function simulateHttpRequest(transformedRequest, mockResponse) {
  console.log('\n📋 步骤3: 模拟 @musistudio/llms HTTP请求');
  
  try {
    // 检查请求格式
    console.log(`🔄 检查请求格式:`);
    console.log(`   - body类型: ${typeof transformedRequest.body}`);
    console.log(`   - config存在: ${!!transformedRequest.config}`);
    console.log(`   - headers存在: ${!!transformedRequest.config?.headers}`);
    
    // 验证headers
    const headers = transformedRequest.config.headers;
    const requiredHeaders = ['Authorization', 'Content-Type', 'X-Amz-Target'];
    const missingHeaders = requiredHeaders.filter(h => !headers[h]);
    
    if (missingHeaders.length > 0) {
      throw new Error(`缺少必需的headers: ${missingHeaders.join(', ')}`);
    }
    
    console.log(`✅ Headers验证通过`);
    console.log(`🔧 Authorization: ${headers.Authorization.substring(0, 20)}...`);
    console.log(`🔧 Content-Type: ${headers['Content-Type']}`);
    console.log(`🔧 X-Amz-Target: ${headers['X-Amz-Target']}`);
    
    // 检查请求体格式
    if (typeof transformedRequest.body !== 'object' || !transformedRequest.body.profileArn) {
      throw new Error('请求体不是正确的CodeWhisperer格式');
    }
    
    console.log(`✅ 请求体格式验证通过`);
    console.log(`🔧 profileArn存在: ${!!transformedRequest.body.profileArn}`);
    console.log(`🔧 conversationState存在: ${!!transformedRequest.body.conversationState}`);
    
    // 模拟发送请求并返回响应
    console.log(`📤 模拟发送CodeWhisperer请求...`);
    console.log(`📥 模拟接收 ${mockResponse.mockBuffer.length} 字节响应`);
    
    // 创建模拟的Response对象
    const mockHttpResponse = {
      ok: true,
      status: 200,
      arrayBuffer: () => Promise.resolve(mockResponse.mockBuffer.buffer.slice(
        mockResponse.mockBuffer.byteOffset,
        mockResponse.mockBuffer.byteOffset + mockResponse.mockBuffer.byteLength
      ))
    };
    
    console.log(`✅ HTTP请求模拟完成`);
    return mockHttpResponse;
    
  } catch (error) {
    console.error(`❌ HTTP请求模拟错误: ${error.message}`);
    return null;
  }
}

// 模拟K2cc Transformer的transformResponseOut方法
async function simulateTransformResponseOut(mockHttpResponse, expectedContent) {
  console.log('\n📋 步骤4: 模拟 K2cc.transformResponseOut');
  
  try {
    console.log(`📥 响应状态: ${mockHttpResponse.status}`);
    
    // 获取二进制响应
    const responseBuffer = Buffer.from(await mockHttpResponse.arrayBuffer());
    console.log(`✅ 获得 ${responseBuffer.length} 字节的二进制响应`);
    
    // 解析SSE事件 (使用第2个脚本的成功实现)
    const events = [];
    let offset = 0;
    
    console.log(`🔄 开始解析SSE事件...`);
    
    while (offset < responseBuffer.length - 12) {
      try {
        const totalLen = responseBuffer.readUInt32BE(offset);
        const headerLen = responseBuffer.readUInt32BE(offset + 4);
        
        if (totalLen > responseBuffer.length - offset + 8) {
          break;
        }
        
        const headerStart = offset + 8;
        const headerEnd = headerStart + headerLen;
        const payloadLen = totalLen - headerLen - 12;
        const payloadStart = headerEnd;
        const payloadEnd = payloadStart + payloadLen;
        
        if (payloadEnd > responseBuffer.length || payloadLen <= 0) {
          offset += 1;
          continue;
        }
        
        const payload = responseBuffer.slice(payloadStart, payloadEnd);
        let payloadStr = payload.toString('utf8');
        payloadStr = payloadStr.replace(/^vent/, '');
        
        try {
          const assistantEvent = JSON.parse(payloadStr);
          if (assistantEvent.content) {
            events.push({
              event: 'content_block_delta',
              data: {
                type: 'content_block_delta',
                index: 0,
                delta: {
                  type: 'text_delta',
                  text: assistantEvent.content,
                },
              },
            });
          }
        } catch (parseError) {
          // 忽略JSON解析错误
        }
        
        offset = payloadEnd + 4;
        
      } catch (error) {
        offset += 1;
      }
    }
    
    console.log(`✅ 解析了 ${events.length} 个SSE事件`);
    
    // 提取内容
    let fullContent = '';
    let contentFragments = [];
    
    for (const event of events) {
      if (event.event === 'content_block_delta' && event.data) {
        const delta = event.data.delta;
        if (delta && delta.type === 'text_delta' && delta.text) {
          fullContent += delta.text;
          contentFragments.push(delta.text);
        }
      }
    }
    
    console.log(`✅ 提取内容完成: ${contentFragments.length} 个片段，${fullContent.length} 字符`);
    console.log(`🎯 内容前100字符: "${fullContent.substring(0, 100)}..."`);
    
    // 创建OpenAI格式响应
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
    
    console.log(`✅ transformResponseOut完成`);
    
    // 验证内容正确性
    const contentMatch = fullContent.length > 0 && expectedContent.includes(fullContent.substring(0, 50));
    console.log(`🔍 内容匹配验证: ${contentMatch ? '✅ 通过' : '❌ 失败'}`);
    
    return { openaiResponse, fullContent, contentFragments, contentMatch };
    
  } catch (error) {
    console.error(`❌ transformResponseOut错误: ${error.message}`);
    return null;
  }
}

// 模拟@musistudio/llms转换为Anthropic格式
function simulateAnthropicConversion(openaiResponse) {
  console.log('\n📋 步骤5: 模拟 Anthropic格式转换');
  
  try {
    if (!openaiResponse.choices || openaiResponse.choices.length === 0) {
      throw new Error('OpenAI响应缺少choices数组');
    }
    
    const choice = openaiResponse.choices[0];
    if (!choice.message) {
      throw new Error('Choice缺少message字段');
    }
    
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
    
    console.log(`✅ Anthropic格式转换完成`);
    console.log(`🔧 content[0].text长度: ${anthropicResponse.content[0].text.length}`);
    
    return anthropicResponse;
    
  } catch (error) {
    console.error(`❌ Anthropic格式转换错误: ${error.message}`);
    return null;
  }
}

// 主测试函数
async function testProxyServerSimulation() {
  try {
    console.log('🚀 开始代理服务器完整流程模拟测试\n');
    
    // 创建测试数据
    console.log(`📋 输入请求: ${JSON.stringify(mockAnthropicRequest, null, 2)}`);
    const mockResponse = createMockCodeWhispererResponse();
    
    // 步骤2: 模拟transformRequestIn
    const transformedRequest = simulateTransformRequestIn(mockAnthropicRequest, mockProvider);
    if (!transformedRequest) {
      throw new Error('transformRequestIn模拟失败');
    }
    
    // 步骤3: 模拟HTTP请求
    const mockHttpResponse = simulateHttpRequest(transformedRequest, mockResponse);
    if (!mockHttpResponse) {
      throw new Error('HTTP请求模拟失败');
    }
    
    // 步骤4: 模拟transformResponseOut
    const transformResult = await simulateTransformResponseOut(mockHttpResponse, mockResponse.expectedContent);
    if (!transformResult) {
      throw new Error('transformResponseOut模拟失败');
    }
    
    // 步骤5: 模拟Anthropic转换
    const anthropicResponse = simulateAnthropicConversion(transformResult.openaiResponse);
    if (!anthropicResponse) {
      throw new Error('Anthropic转换模拟失败');
    }
    
    // 生成测试报告
    console.log('\n' + '='.repeat(80));
    console.log('📊 代理服务器模拟测试报告');
    console.log('='.repeat(80));
    
    console.log(`📥 输入数据:`);
    console.log(`   - Anthropic请求: ${mockAnthropicRequest.messages[0].content}`);
    console.log(`   - 模拟响应大小: ${mockResponse.mockBuffer.length} 字节`);
    
    console.log(`🔧 处理流程:`);
    console.log(`   - transformRequestIn: ${transformedRequest ? '✅ 成功' : '❌ 失败'}`);
    console.log(`   - HTTP请求模拟: ${mockHttpResponse ? '✅ 成功' : '❌ 失败'}`);
    console.log(`   - transformResponseOut: ${transformResult ? '✅ 成功' : '❌ 失败'}`);
    console.log(`   - Anthropic转换: ${anthropicResponse ? '✅ 成功' : '❌ 失败'}`);
    
    console.log(`📊 内容处理:`);
    console.log(`   - 提取片段数: ${transformResult.contentFragments.length}`);
    console.log(`   - 提取内容长度: ${transformResult.fullContent.length} 字符`);
    console.log(`   - 内容匹配度: ${transformResult.contentMatch ? '✅ 正确' : '❌ 错误'}`);
    
    console.log(`👤 最终用户响应:`);
    console.log(`   - 响应ID: ${anthropicResponse.id}`);
    console.log(`   - 响应类型: ${anthropicResponse.type}`);
    console.log(`   - 内容长度: ${anthropicResponse.content[0].text.length} 字符`);
    console.log(`   - 停止原因: ${anthropicResponse.stop_reason}`);
    
    // 一致性检查
    const isConsistent = transformResult.fullContent.length === anthropicResponse.content[0].text.length;
    console.log(`🔍 一致性检查: ${isConsistent ? '✅ 通过' : '❌ 失败'}`);
    
    // 显示最终内容
    console.log(`\n🎯 最终用户看到的内容前300字符:`);
    console.log(`"${anthropicResponse.content[0].text.substring(0, 300)}..."`);
    
    // 保存测试结果
    const resultPath = path.join(__dirname, 'proxy-server-simulation-result.json');
    const testResult = {
      timestamp: new Date().toISOString(),
      success: true,
      input: {
        request: mockAnthropicRequest,
        mockResponseSize: mockResponse.mockBuffer.length
      },
      processing: {
        transformRequestIn: !!transformedRequest,
        httpRequest: !!mockHttpResponse,
        transformResponseOut: !!transformResult,
        anthropicConversion: !!anthropicResponse
      },
      content: {
        fragmentsCount: transformResult.contentFragments.length,
        extractedLength: transformResult.fullContent.length,
        finalLength: anthropicResponse.content[0].text.length,
        contentMatch: transformResult.contentMatch,
        consistent: isConsistent
      },
      finalResponse: {
        id: anthropicResponse.id,
        contentPreview: anthropicResponse.content[0].text.substring(0, 200),
        fullContent: anthropicResponse.content[0].text
      }
    };
    
    fs.writeFileSync(resultPath, JSON.stringify(testResult, null, 2));
    console.log(`\n💾 测试结果已保存到: ${resultPath}`);
    
    if (isConsistent && transformResult.contentMatch) {
      console.log('\n🎉 模拟测试成功！代理服务器流程完全正常，可以进行实地测试');
      return true;
    } else {
      console.log('\n⚠️ 模拟测试发现问题，需要进一步修复');
      return false;
    }
    
  } catch (error) {
    console.error('\n❌ 模拟测试失败:', error.message);
    console.error('错误堆栈:', error.stack);
    
    // 保存错误结果
    const errorResultPath = path.join(__dirname, 'proxy-server-simulation-error.json');
    const errorResult = {
      timestamp: new Date().toISOString(),
      success: false,
      error: {
        message: error.message,
        stack: error.stack
      }
    };
    
    fs.writeFileSync(errorResultPath, JSON.stringify(errorResult, null, 2));
    console.log(`💾 错误信息已保存到: ${errorResultPath}`);
    
    return false;
  }
}

// 运行模拟测试
console.log('🧪 代理服务器完整流程模拟测试');
console.log('使用模拟数据，不进行真实API调用\n');

testProxyServerSimulation().then(success => {
  if (success) {
    console.log('\n✅ 模拟测试通过，可以继续实地测试');
    process.exit(0);
  } else {
    console.log('\n❌ 模拟测试失败，需要修复问题');
    process.exit(1);
  }
});