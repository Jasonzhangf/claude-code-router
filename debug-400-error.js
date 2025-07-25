#!/usr/bin/env node

/**
 * 调试400错误的专门脚本
 * 模拟Claude Code的请求并捕获详细错误信息
 */

async function debug400Error() {
  console.log('🔍 调试400错误');
  console.log('===============');
  
  const testRequests = [
    {
      name: "基本请求",
      request: {
        model: "claude-sonnet-4-20250514",
        max_tokens: 50,
        messages: [
          {
            role: "user",
            content: "Hello"
          }
        ]
      }
    },
    {
      name: "带工具的请求",
      request: {
        model: "claude-sonnet-4-20250514", 
        max_tokens: 50,
        messages: [
          {
            role: "user",
            content: "What time is it?"
          }
        ],
        tools: [
          {
            name: "get_time",
            description: "Get current time",
            input_schema: {
              type: "object",
              properties: {},
              required: []
            }
          }
        ]
      }
    },
    {
      name: "多轮对话请求",
      request: {
        model: "claude-sonnet-4-20250514",
        max_tokens: 50,
        messages: [
          {
            role: "user",
            content: "Hi"
          },
          {
            role: "assistant", 
            content: "Hello! How can I help you?"
          },
          {
            role: "user",
            content: "What's 2+2?"
          }
        ]
      }
    }
  ];

  for (let i = 0; i < testRequests.length; i++) {
    const test = testRequests[i];
    console.log(`\\n${i + 1}️⃣ 测试: ${test.name}`);
    console.log('-'.repeat(30));
    
    try {
      const response = await fetch('http://localhost:3456/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify(test.request)
      });
      
      const responseData = await response.json();
      
      console.log(`📊 状态码: ${response.status}`);
      
      if (response.status === 400) {
        console.log('❌ 400错误!');
        console.log('错误详情:', JSON.stringify(responseData, null, 2));
        
        // 分析错误类型
        if (responseData.error && responseData.error.message) {
          const errorMsg = responseData.error.message;
          
          if (errorMsg.includes('Improperly formed request')) {
            console.log('🔍 这是CodeWhisperer API返回的格式错误');
            console.log('说明我们发送给CodeWhisperer的请求格式不正确');
          } else if (errorMsg.includes('解析请求体失败')) {
            console.log('🔍 这是我们的服务器解析Anthropic请求失败');
            console.log('说明Claude Code发送的请求格式有问题');
          } else {
            console.log('🔍 其他类型的400错误:', errorMsg);
          }
        }
        
        // 中断测试，重点分析第一个400错误
        break;
        
      } else if (response.status === 200) {
        console.log('✅ 请求成功');
        const content = responseData.content?.[0]?.text || '无内容';
        console.log(`📝 响应: "${content.substring(0, 100)}..."`);
        
      } else {
        console.log(`⚠️  其他状态码: ${response.status}`);
        console.log('响应:', JSON.stringify(responseData, null, 2));
      }
      
    } catch (error) {
      console.log('❌ 网络错误:', error.message);
    }
    
    // 稍等一下再发送下一个请求
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
}

async function captureServerLogs() {
  console.log('\\n📄 检查服务器日志...');
  
  // 尝试通过ccr status获取进程信息
  try {
    const { exec } = require('child_process');
    const { promisify } = require('util');
    const execAsync = promisify(exec);
    
    const { stdout } = await execAsync('ccr status');
    console.log('服务器状态:', stdout);
    
  } catch (error) {
    console.log('无法获取服务器状态:', error.message);
  }
}

async function main() {
  console.log('🚀 开始调试400错误');
  console.log('====================');
  console.log('目标: 捕获并分析Claude Code中的400错误');
  console.log('');
  
  await debug400Error();
  await captureServerLogs();
  
  console.log('\\n📋 调试建议:');
  console.log('1. 如果看到"Improperly formed request"，说明CodeWhisperer请求格式有问题');
  console.log('2. 如果看到"解析请求体失败"，说明Anthropic请求格式有问题'); 
  console.log('3. 检查服务器日志以获取更多详细信息');
  console.log('4. 对比kiro2cc的工作请求格式');
}

if (require.main === module) {
  main().catch(console.error);
}