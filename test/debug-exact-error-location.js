#!/usr/bin/env node

// Debug脚本：精确定位"Cannot read properties of undefined (reading '0')"错误位置

const http = require('http');

console.log('🔍 精确错误定位调试');
console.log('=========================\n');

// 发送请求并获取详细错误信息
const debugRequest = {
  model: 'claude-sonnet-4-20250514',
  max_tokens: 10,
  messages: [{ role: 'user', content: 'Debug test' }]
};

const postData = JSON.stringify(debugRequest);

const options = {
  hostname: 'localhost',
  port: 3456,
  path: '/v1/messages',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'anthropic-version': '2023-06-01',
    'Content-Length': Buffer.byteLength(postData)
  }
};

console.log('📤 发送调试请求...');

const req = http.request(options, (res) => {
  console.log(`📥 响应状态: ${res.statusCode}`);
  console.log(`📋 响应头: ${JSON.stringify(res.headers, null, 2)}`);
  
  let body = '';
  res.on('data', (chunk) => {
    body += chunk;
  });
  
  res.on('end', () => {
    console.log(`📦 响应体: ${body}`);
    
    // 尝试解析JSON
    try {
      const jsonResponse = JSON.parse(body);
      console.log('📋 解析后的JSON:', JSON.stringify(jsonResponse, null, 2));
      
      // 如果是错误响应，分析错误信息
      if (jsonResponse.error) {
        console.log('\n❌ 错误分析:');
        console.log(`错误类型: ${jsonResponse.error.type}`);
        console.log(`错误代码: ${jsonResponse.error.code}`);
        console.log(`错误消息: ${jsonResponse.error.message}`);
        
        // 分析错误消息
        if (jsonResponse.error.message.includes("Cannot read properties of undefined (reading '0')")) {
          console.log('\n🔍 关键问题: 某处代码试图访问undefined[0]');
          console.log('可能的原因:');
          console.log('1. finalResponse.json()返回的对象中某个数组字段为undefined');
          console.log('2. @musistudio/llms内部处理逻辑有问题');
          console.log('3. content数组在某个地方被设置为undefined');
          
          console.log('\n💡 建议检查:');
          console.log('- 查看transformer返回的Response对象的json()结果');
          console.log('- 检查@musistudio/llms如何处理transformer的返回值');
          console.log('- 验证content字段的结构');
        }
      }
      
    } catch (parseError) {
      console.error('❌ JSON解析失败:', parseError.message);
    }
    
    process.exit(0);
  });
});

req.on('error', (error) => {
  console.error('❌ 请求失败:', error.message);
  process.exit(1);
});

req.write(postData);
req.end();