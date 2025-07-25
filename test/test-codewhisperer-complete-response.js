#!/usr/bin/env node

// 测试脚本：完整接收CodeWhisperer响应并成功拼接
// 目标：让接收到的信息和其他接收方式的内容没有差别

const fs = require('fs');
const path = require('path');

console.log('🔍 测试：CodeWhisperer完整响应接收和拼接');
console.log('===========================================\n');

// 读取token
function loadToken() {
  const tokenPath = path.join(process.env.HOME, '.aws', 'sso', 'cache', 'kiro-auth-token.json');
  try {
    const tokenData = fs.readFileSync(tokenPath, 'utf-8');
    return JSON.parse(tokenData);
  } catch (error) {
    throw new Error(`无法读取token: ${error.message}`);
  }
}

// 基于kiro2cc的SSE解析器 (完整实现)
function parseSSEEvents(responseBuffer) {
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
      
      // 移除"vent"前缀 (就像kiro2cc做的)
      let payloadStr = payload.toString('utf8');
      payloadStr = payloadStr.replace(/^vent/, '');
      
      console.log(`📝 载荷内容 (${payloadLen} 字节): ${payloadStr}`);
      
      // 解析JSON
      try {
        const assistantEvent = JSON.parse(payloadStr);
        console.log(`✅ 解析JSON成功:`, assistantEvent);
        
        // 转换为SSE事件
        const sseEvent = convertAssistantEventToSSE(assistantEvent);
        if (sseEvent.event) {
          events.push(sseEvent);
          console.log(`🎯 添加SSE事件: ${sseEvent.event}`);
        }
        
        // 处理工具使用完成
        if (assistantEvent.toolUseId && assistantEvent.name && assistantEvent.stop) {
          events.push({
            event: 'message_delta',
            data: {
              type: 'message_delta',
              delta: {
                stop_reason: 'tool_use',
                stop_sequence: null,
              },
              usage: { output_tokens: 0 }
            }
          });
        }
        
      } catch (parseError) {
        console.log(`❌ JSON解析错误: ${parseError.message}`);
      }
      
      // 移动到下一帧 (跳过CRC32)
      offset = payloadEnd + 4;
      
    } catch (error) {
      console.log(`❌ 帧解析错误: ${error.message}`);
      offset += 1;
    }
  }
  
  console.log(`🎉 总共解析了 ${events.length} 个SSE事件`);
  return events;
}

// 转换助手事件为SSE格式 (基于kiro2cc逻辑)
function convertAssistantEventToSSE(evt) {
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
  } else if (evt.toolUseId && evt.name && !evt.stop) {
    if (!evt.input) {
      return {
        event: 'content_block_start',
        data: {
          type: 'content_block_start',
          index: 1,
          content_block: {
            type: 'tool_use',
            id: evt.toolUseId,
            name: evt.name,
            input: {},
          },
        },
      };
    } else {
      return {
        event: 'content_block_delta',
        data: {
          type: 'content_block_delta',
          index: 1,
          delta: {
            type: 'input_json_delta',
            id: evt.toolUseId,
            name: evt.name,
            partial_json: evt.input,
          },
        },
      };
    }
  } else if (evt.stop) {
    return {
      event: 'content_block_stop',
      data: {
        type: 'content_block_stop',
        index: 1,
      },
    };
  }
  
  return {};
}

// 生成UUID
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// 主测试函数
async function testCompleteResponse() {
  try {
    console.log('📋 步骤1: 加载token');
    const token = loadToken();
    console.log('✅ Token加载成功');
    
    console.log('\n📋 步骤2: 准备CodeWhisperer请求');
    const request = {
      profileArn: "arn:aws:codewhisperer:us-east-1:699475941385:profile/EHGA3GRVQMUK",
      conversationState: {
        chatTriggerType: "MANUAL",
        conversationId: generateUUID(),
        currentMessage: {
          userInputMessage: {
            content: "Please write a detailed explanation of how machine learning works, including the key concepts and algorithms.",
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
    
    console.log('✅ 请求准备完成 (长文本，确保获得完整响应)');
    
    console.log('\n📋 步骤3: 发送请求到CodeWhisperer');
    const response = await fetch('https://codewhisperer.us-east-1.amazonaws.com/generateAssistantResponse', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token.accessToken}`,
        'Content-Type': 'application/x-amz-json-1.1',
        'X-Amz-Target': 'CodeWhispererService.GenerateAssistantResponse',
        'User-Agent': 'k2cc-complete-test/1.0.0'
      },
      body: JSON.stringify(request)
    });
    
    console.log(`📥 响应状态: ${response.status}`);
    
    if (!response.ok) {
      throw new Error(`CodeWhisperer API错误: ${response.status}`);
    }
    
    console.log('\n📋 步骤4: 获取二进制响应');
    const responseBuffer = Buffer.from(await response.arrayBuffer());
    console.log(`✅ 获得 ${responseBuffer.length} 字节的响应`);
    
    console.log('\n📋 步骤5: 解析SSE事件');
    const events = parseSSEEvents(responseBuffer);
    
    console.log('\n📋 步骤6: 拼接完整内容');
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
    
    console.log('\n🎉 完整响应拼接结果:');
    console.log('=' .repeat(80));
    console.log(fullContent);
    console.log('=' .repeat(80));
    
    console.log(`\n📊 统计信息:`);
    console.log(`   - 响应总字节数: ${responseBuffer.length}`);
    console.log(`   - 解析出的事件数: ${events.length}`);
    console.log(`   - 内容片段数: ${contentFragments.length}`);
    console.log(`   - 完整内容长度: ${fullContent.length} 字符`);
    console.log(`   - 平均片段长度: ${fullContent.length / contentFragments.length} 字符`);
    
    console.log('\n✅ 测试完成 - CodeWhisperer响应完整接收和拼接成功!');
    
    // 保存结果用于对比
    const resultPath = path.join(__dirname, 'codewhisperer-complete-response-result.json');
    const result = {
      timestamp: new Date().toISOString(),
      request: {
        content: request.conversationState.currentMessage.userInputMessage.content,
        modelId: request.conversationState.currentMessage.userInputMessage.modelId
      },
      response: {
        totalBytes: responseBuffer.length,
        eventsCount: events.length,
        fragmentsCount: contentFragments.length,
        fullContent: fullContent,
        contentLength: fullContent.length
      },
      events: events,
      fragments: contentFragments
    };
    
    fs.writeFileSync(resultPath, JSON.stringify(result, null, 2));
    console.log(`💾 结果已保存到: ${resultPath}`);
    
  } catch (error) {
    console.error('❌ 测试失败:', error.message);
    process.exit(1);
  }
}

// 运行测试
testCompleteResponse();