#!/usr/bin/env node

// 测试脚本4：验证请求路由过程
// 检查请求是否正确路由到k2cc provider

const http = require('http');
const fs = require('fs');
const path = require('path');

console.log('🔍 测试4：请求路由验证');
console.log('==========================\n');

// 读取配置文件进行路由模拟
const configFileName = process.env.NODE_ENV === 'development' ? 'config-dev.json' : 'config.json';
const configPath = path.join(process.env.HOME, '.claude-code-router', configFileName);
let config;

try {
  config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
} catch (error) {
  console.error('❌ 配置文件读取失败:', error.message);
  process.exit(1);
}

console.log('📋 模拟路由逻辑:');

// 模拟请求
const testRequest = {
  model: 'claude-sonnet-4-20250514',
  max_tokens: 20,
  messages: [{ role: 'user', content: 'Test' }]
};

console.log(`🎯 请求模型: ${testRequest.model}`);

// 步骤1：Router匹配
const defaultRoute = config.Router?.default;
console.log(`🚀 默认路由: ${defaultRoute}`);

if (defaultRoute) {
  const [providerName, modelName] = defaultRoute.split(',');
  console.log(`📍 路由结果: Provider=${providerName}, Model=${modelName}`);
  
  // 步骤2：Provider查找
  const provider = config.Providers?.find(p => p.name === providerName);
  if (provider) {
    console.log(`✅ Provider找到: ${provider.name}`);
    console.log(`🔧 API Base: ${provider.api_base_url}`);
    console.log(`📦 Models: ${JSON.stringify(provider.models)}`);
    console.log(`🔄 Transformer配置: ${JSON.stringify(provider.transformer)}`);
    console.log(`⚡ Enabled: ${provider.enabled}`);
    
    // 步骤3：Model验证
    if (provider.models.includes(testRequest.model)) {
      console.log(`✅ 模型匹配: ${testRequest.model} 在provider的models列表中`);
    } else {
      console.log(`❌ 模型不匹配: ${testRequest.model} 不在provider的models列表中`);
    }
    
    // 步骤4：Transformer配置检查
    if (provider.transformer?.use) {
      console.log(`🔧 应该调用的Transformers: ${provider.transformer.use.join(', ')}`);
      
      // 检查是否包含k2cc
      if (provider.transformer.use.includes('k2cc')) {
        console.log(`✅ K2CC Transformer应该被调用`);
      } else {
        console.log(`❌ K2CC Transformer不在调用列表中`);
      }
    } else {
      console.log(`❌ Provider没有配置transformer`);
    }
    
  } else {
    console.log(`❌ Provider未找到: ${providerName}`);
  }
} else {
  console.log('❌ 无默认路由配置');
}

console.log('\n🧪 实际请求测试:');
console.log('发送HTTP请求到本地服务器...');

const postData = JSON.stringify(testRequest);

// Use development port from config
const port = config.PORT || 3457;

const options = {
  hostname: 'localhost',
  port: port,
  path: '/v1/messages',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'anthropic-version': '2023-06-01',
    'Content-Length': Buffer.byteLength(postData)
  }
};

const req = http.request(options, (res) => {
  console.log(`📥 响应状态: ${res.statusCode}`);
  console.log(`📋 响应头: ${JSON.stringify(res.headers)}`);
  
  let body = '';
  res.on('data', (chunk) => {
    body += chunk;
  });
  
  res.on('end', () => {
    console.log(`📦 响应大小: ${body.length} 字符`);
    
    // 检查是否是二进制数据
    if (body.includes('\u0000')) {
      console.log('❌ 检测到二进制数据 - transformer未被调用');
      console.log('🔍 前100字符:', body.substring(0, 100));
    } else {
      console.log('✅ 响应是文本数据 - transformer可能被调用');
      try {
        const jsonResponse = JSON.parse(body);
        console.log('📋 解析后的响应:', JSON.stringify(jsonResponse, null, 2));
      } catch (error) {
        console.log('⚠️ 响应不是有效JSON');
      }
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