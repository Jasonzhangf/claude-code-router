#!/usr/bin/env node

// Debug脚本：检查transformer的实际注册和调用状态
// 直接连接到运行中的服务进行检查

const http = require('http');

console.log('🔍 Transformer注册状态检查');
console.log('===============================\n');

// 1. 检查服务是否运行
console.log('📡 检查服务状态...');

const checkService = () => {
  return new Promise((resolve, reject) => {
    const port = process.env.NODE_ENV === 'development' ? 3457 : 3456;
const req = http.request({
      hostname: 'localhost',
      port: port,
      path: '/health',
      method: 'GET',
      timeout: 5000
    }, (res) => {
      if (res.statusCode === 200 || res.statusCode === 404) {
        console.log('✅ 服务正在运行');
        resolve(true);
      } else {
        console.log(`❌ 服务状态异常: ${res.statusCode}`);
        resolve(false);
      }
    });
    
    req.on('error', (error) => {
      console.log('❌ 服务未运行或连接失败:', error.message);
      resolve(false);
    });
    
    req.on('timeout', () => {
      console.log('❌ 连接超时');
      req.destroy();
      resolve(false);
    });
    
    req.end();
  });
};

// 2. 发送详细的调试请求
const sendDebugRequest = () => {
  return new Promise((resolve, reject) => {
    const debugRequest = {
      model: 'claude-sonnet-4-20250514',
      max_tokens: 10,
      messages: [{ role: 'user', content: 'Debug test' }]
    };
    
    const postData = JSON.stringify(debugRequest);
    
    console.log('🧪 发送调试请求...');
    console.log(`📋 请求内容: ${postData}`);
    
    const port = process.env.NODE_ENV === 'development' ? 3457 : 3456;
const options = {
      hostname: 'localhost',
      port: port,
      path: '/v1/messages',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'anthropic-version': '2023-06-01',
        'Content-Length': Buffer.byteLength(postData)
      },
      timeout: 30000
    };
    
    const req = http.request(options, (res) => {
      console.log(`📥 响应状态: ${res.statusCode}`);
      console.log(`📋 响应头: ${JSON.stringify(res.headers, null, 2)}`);
      
      let body = '';
      res.on('data', (chunk) => {
        body += chunk;
      });
      
      res.on('end', () => {
        console.log(`📦 响应大小: ${body.length} 字符`);
        
        // 详细分析响应
        try {
          const jsonResponse = JSON.parse(body);
          console.log('\n🔍 响应分析:');
          console.log(`📄 消息ID: ${jsonResponse.id}`);
          console.log(`🤖 模型: ${jsonResponse.model}`);
          
          if (jsonResponse.content && jsonResponse.content[0]) {
            const content = jsonResponse.content[0].text;
            console.log(`📝 内容长度: ${content.length} 字符`);
            
            // 检查是否包含二进制数据特征
            const hasBinaryData = content.includes('\u0000') || content.includes(':event-type');
            if (hasBinaryData) {
              console.log('❌ 响应包含二进制数据 - TRANSFORMER未被调用');
              console.log('🔍 内容样本 (前200字符):');
              console.log(content.substring(0, 200));
              
              // 尝试提取实际文本内容
              const contentMatches = content.match(/"content":"([^"]+)"/g);
              if (contentMatches) {
                console.log('\n📄 提取的文本片段:');
                contentMatches.slice(0, 5).forEach((match, i) => {
                  const text = match.match(/"content":"([^"]+)"/)[1];
                  console.log(`   ${i + 1}: ${text}`);
                });
              }
            } else {
              console.log('✅ 响应是纯文本 - TRANSFORMER可能被调用');
              console.log(`📄 响应内容: ${content}`);
            }
          }
          
          if (jsonResponse.usage) {
            console.log(`📊 Token使用: input=${jsonResponse.usage.input_tokens}, output=${jsonResponse.usage.output_tokens}`);
          }
          
        } catch (error) {
          console.log('❌ 响应不是有效的JSON');
          console.log('🔍 原始响应 (前500字符):');
          console.log(body.substring(0, 500));
        }
        
        resolve(body);
      });
    });
    
    req.on('error', (error) => {
      console.error('❌ 请求失败:', error.message);
      reject(error);
    });
    
    req.on('timeout', () => {
      console.log('❌ 请求超时');
      req.destroy();
      reject(new Error('Request timeout'));
    });
    
    req.write(postData);
    req.end();
  });
};

// 主执行流程
async function main() {
  const serviceRunning = await checkService();
  
  if (!serviceRunning) {
    console.log('\n❌ 服务未运行，请先启动服务: node dist/cli.js start');
    process.exit(1);
  }
  
  console.log('\n🧪 执行详细调试请求...');
  try {
    await sendDebugRequest();
  } catch (error) {
    console.error('❌ 调试请求失败:', error.message);
  }
  
  console.log('\n📋 问题定位总结:');
  console.log('1. 如果看到二进制数据 = transformer未被调用');
  console.log('2. 如果看到纯文本 = transformer正常工作');
  console.log('3. 如果响应格式错误 = 请求路由问题');
  console.log('\n🔧 下一步调试方向:');
  console.log('- 检查@musistudio/llms的transformer调用条件');
  console.log('- 验证provider配置是否满足transformer调用要求');
  console.log('- 分析routes.js中的实际调用逻辑');
}

main().catch(console.error);