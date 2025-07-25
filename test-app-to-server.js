#!/usr/bin/env node

/**
 * 应用到服务器路径测试程序
 * 模拟Claude Code发送到ccr服务器的完整请求流程
 */

const fs = require('fs');
const path = require('path');

// 模拟Claude Code的请求格式（基于Anthropic API标准）
const mockClaudeCodeRequests = [
  {
    name: "简单文本请求",
    request: {
      model: "claude-sonnet-4-20250514",
      max_tokens: 100,
      messages: [
        {
          role: "user",
          content: "Hello, how are you?"
        }
      ]
    }
  },
  {
    name: "多轮对话请求",
    request: {
      model: "claude-sonnet-4-20250514", 
      max_tokens: 150,
      messages: [
        {
          role: "user",
          content: "What is machine learning?"
        },
        {
          role: "assistant",
          content: "Machine learning is a subset of artificial intelligence..."
        },
        {
          role: "user", 
          content: "Can you give me a simple example?"
        }
      ]
    }
  },
  {
    name: "带工具的请求",
    request: {
      model: "claude-sonnet-4-20250514",
      max_tokens: 200,
      messages: [
        {
          role: "user",
          content: "What's the weather like today?"
        }
      ],
      tools: [
        {
          name: "get_weather",
          description: "Get current weather for a location",
          input_schema: {
            type: "object",
            properties: {
              location: {
                type: "string",
                description: "The city and state, e.g. San Francisco, CA"
              }
            },
            required: ["location"]
          }
        }
      ]
    }
  },
  {
    name: "复杂内容块请求",
    request: {
      model: "claude-sonnet-4-20250514",
      max_tokens: 300,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Please analyze this code:"
            },
            {
              type: "text", 
              text: "function hello() { console.log('world'); }"
            }
          ]
        }
      ]
    }
  }
];

// 预期的CodeWhisperer转换格式
function expectedCodeWhispererFormat(anthropicRequest) {
  const lastMessage = anthropicRequest.messages[anthropicRequest.messages.length - 1];
  let content = '';
  
  if (typeof lastMessage.content === 'string') {
    content = lastMessage.content;
  } else if (Array.isArray(lastMessage.content)) {
    content = lastMessage.content
      .filter(block => block.type === 'text')
      .map(block => block.text || block.content)
      .join('\\n');
  }
  
  return {
    profileArn: "arn:aws:codewhisperer:us-east-1:699475941385:profile/EHGA3GRVQMUK",
    conversationState: {
      chatTriggerType: "MANUAL", 
      conversationId: "test-uuid-123",
      currentMessage: {
        userInputMessage: {
          content: content || "answer for user question",
          modelId: "CLAUDE_SONNET_4_20250514_V1_0",
          origin: "AI_EDITOR",
          userInputMessageContext: {
            tools: anthropicRequest.tools ? anthropicRequest.tools.map(tool => ({
              toolSpecification: {
                name: tool.name,
                description: tool.description,
                inputSchema: {
                  json: tool.input_schema
                }
              }
            })) : [],
            toolResults: []
          }
        }
      },
      history: anthropicRequest.messages.length > 1 ? 
        anthropicRequest.messages.slice(0, -1).map((msg, i) => {
          if (msg.role === 'user') {
            return {
              userInputMessage: {
                content: typeof msg.content === 'string' ? msg.content : 'previous user message',
                modelId: "CLAUDE_SONNET_4_20250514_V1_0",
                origin: "AI_EDITOR"
              }
            };
          } else {
            return {
              assistantResponseMessage: {
                content: typeof msg.content === 'string' ? msg.content : 'previous assistant response',
                toolUses: []
              }
            };
          }
        }) : []
    }
  };
}

async function testApplicationToServerPath() {
  console.log('🧪 应用到服务器路径测试');
  console.log('==========================');
  console.log('目标: 验证Claude Code → ccr服务器的完整转换路径');
  console.log('');

  const results = [];
  
  for (let i = 0; i < mockClaudeCodeRequests.length; i++) {
    const testCase = mockClaudeCodeRequests[i];
    console.log(`${i + 1}️⃣ 测试: ${testCase.name}`);
    console.log('----------------------------');
    
    // 显示原始请求
    console.log('📤 Claude Code请求格式:');
    console.log(JSON.stringify(testCase.request, null, 2));
    
    // 显示预期的CodeWhisperer转换
    const expectedCW = expectedCodeWhispererFormat(testCase.request);
    console.log('\\n🔄 预期CodeWhisperer转换:');
    console.log(JSON.stringify(expectedCW, null, 2));
    
    // 发送实际请求到服务器
    console.log('\\n📡 发送到服务器测试...');
    
    try {
      const response = await fetch('http://localhost:3456/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify(testCase.request)
      });
      
      const responseData = await response.json();
      
      console.log(`📥 服务器响应 (${response.status}):`);
      if (response.ok) {
        console.log('✅ 请求成功');
        console.log(`📝 响应内容: "${responseData.content?.[0]?.text || '无内容'}"`);
        
        results.push({
          test: testCase.name,
          success: true,
          request: testCase.request,
          expectedTransform: expectedCW,
          response: responseData
        });
      } else {
        console.log('❌ 请求失败');
        console.log('错误:', JSON.stringify(responseData, null, 2));
        
        results.push({
          test: testCase.name,
          success: false,
          request: testCase.request,
          expectedTransform: expectedCW,
          error: responseData
        });
      }
      
    } catch (error) {
      console.log('❌ 网络错误:', error.message);
      
      results.push({
        test: testCase.name,
        success: false,
        request: testCase.request,
        expectedTransform: expectedCW,
        error: { message: error.message, type: 'network_error' }
      });
    }
    
    console.log('\\n' + '='.repeat(50) + '\\n');
  }
  
  // 生成测试报告
  console.log('📊 测试结果汇总');
  console.log('================');
  
  const successful = results.filter(r => r.success).length;
  const total = results.length;
  
  console.log(`✅ 成功: ${successful}/${total}`);
  console.log(`❌ 失败: ${total - successful}/${total}`);
  
  if (successful === total) {
    console.log('\\n🎉 所有应用到服务器的路径测试通过!');
  } else {
    console.log('\\n⚠️  部分测试失败，需要修复:');
    results.filter(r => !r.success).forEach(result => {
      console.log(`  - ${result.test}: ${result.error?.message || '未知错误'}`);
    });
  }
  
  // 保存测试结果
  const reportFile = path.join(__dirname, 'test', 'app-to-server-test-results.json');
  try {
    if (!fs.existsSync(path.dirname(reportFile))) {
      fs.mkdirSync(path.dirname(reportFile), { recursive: true });
    }
    
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        total,
        successful,
        failed: total - successful
      },
      results
    };
    
    fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));
    console.log(`\\n📄 详细报告已保存: ${reportFile}`);
  } catch (error) {
    console.log('⚠️  报告保存失败:', error.message);
  }
  
  return results;
}

// 检查服务器可用性
async function checkServerAvailability() {
  try {
    const response = await fetch('http://localhost:3456/health');
    return response.status === 200 || response.status === 500; // 500也算可用，只是有错误
  } catch (error) {
    return false;
  }
}

async function main() {
  console.log('🚀 开始应用到服务器路径覆盖测试');
  console.log('==================================');
  
  // 检查服务器
  console.log('🔍 检查服务器状态...');
  const serverAvailable = await checkServerAvailability();
  
  if (!serverAvailable) {
    console.log('❌ 服务器不可用 (端口3456)');
    console.log('请确保运行了: ccr start');
    return;
  }
  
  console.log('✅ 服务器可用');
  console.log('');
  
  // 运行测试
  await testApplicationToServerPath();
}

// 运行测试
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { testApplicationToServerPath, mockClaudeCodeRequests };