#!/usr/bin/env node

/**
 * 测试OpenAI vs Anthropic格式差异
 * 验证@musistudio/llms期望的数据格式
 */

// 使用内置fetch而不是axios

async function testFormatDifference() {
  console.log('🔍 测试@musistudio/llms对不同响应格式的处理...\n');
  
  // Anthropic格式（当前K2CC返回的）
  const anthropicFormat = {
    id: "msg_test123",
    type: "message", 
    role: "assistant",
    model: "claude-sonnet-4-20250514",
    content: [
      {
        type: "text", 
        text: "Test response content"
      }
    ],
    stop_reason: "end_turn",
    stop_sequence: null,
    usage: {
      input_tokens: 10,
      output_tokens: 5
    }
  };
  
  // OpenAI格式（Gemini返回的）
  const openaiFormat = {
    id: "chatcmpl-test123",
    object: "chat.completion",
    created: Math.floor(Date.now() / 1000),
    model: "claude-sonnet-4-20250514",
    choices: [{
      index: 0,
      message: {
        role: "assistant",
        content: "Test response content"
      },
      finish_reason: "stop"
    }],
    usage: {
      prompt_tokens: 10,
      completion_tokens: 5,
      total_tokens: 15
    }
  };
  
  console.log('📋 格式对比:');
  console.log('Anthropic格式 (K2CC当前):', JSON.stringify(anthropicFormat, null, 2));
  console.log('\nOpenAI格式 (Gemini使用):', JSON.stringify(openaiFormat, null, 2));
  
  // 测试数组访问模式
  console.log('\n🧪 模拟@musistudio/llms可能的访问模式:');
  
  try {
    // 模拟访问choices[0] - 这可能是错误原因
    console.log('访问anthropicFormat.choices[0]:', anthropicFormat.choices?.[0]);
    console.log('访问openaiFormat.choices[0]:', openaiFormat.choices?.[0]);
    
    // 模拟错误场景
    if (!anthropicFormat.choices) {
      console.log('❌ Anthropic格式没有choices字段 - 这就是错误原因！');
    }
    
    if (openaiFormat.choices && openaiFormat.choices[0]) {
      console.log('✅ OpenAI格式有choices[0] - 正常工作');
    }
    
  } catch (error) {
    console.error('💥 访问错误:', error.message);
  }
  
  // 测试真实API调用 - 如果服务正在运行
  try {
    console.log('\n🌐 测试真实API调用...');
    
    const response = await fetch('http://localhost:3457/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 20,
        messages: [
          {
            role: 'user',
            content: 'Say "format test"'
          }
        ]
      })
    });
    
    const data = await response.json();
    
    console.log('API响应状态:', response.status);
    console.log('API响应数据:', JSON.stringify(data, null, 2));
    
    // 分析响应格式
    if (data.choices) {
      console.log('✅ 响应包含choices字段 - OpenAI格式');
    } else if (data.content) {
      console.log('📋 响应包含content字段 - Anthropic格式'); 
    } else if (data.error) {
      console.log('❌ API返回错误:', data.error.message);
      
      if (data.error.message.includes("Cannot read properties of undefined (reading '0')")) {
        console.log('🎯 确认：这就是格式不匹配导致的错误！');
      }
    }
    
  } catch (error) {
    console.log('⚠️ API调用失败 - 服务可能未运行');
    console.log('错误:', error.message);
  }
  
  console.log('\n📊 结论:');
  console.log('- Gemini返回OpenAI格式 (choices[0].message.content)');
  console.log('- K2CC返回Anthropic格式 (content[0].text)'); 
  console.log('- @musistudio/llms期望OpenAI格式');
  console.log('- 修复方案：让K2CC也返回OpenAI格式');
}

testFormatDifference().catch(console.error);