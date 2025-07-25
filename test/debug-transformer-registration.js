#!/usr/bin/env node

// 诊断脚本：检查transformer注册和provider配置

const fs = require('fs');
const path = require('path');

console.log('🔍 Transformer & Provider 诊断');
console.log('===============================\n');

// 检查配置文件
const configFileName = process.env.NODE_ENV === 'development' ? 'config-dev.json' : 'config.json';
const configPath = path.join(process.env.HOME, '.claude-code-router', configFileName);
console.log(`📄 配置文件路径: ${configPath}`);

try {
  const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  
  console.log('📋 Provider列表:');
  config.Providers?.forEach((provider, i) => {
    console.log(`  ${i + 1}. ${provider.name}`);
    console.log(`     - API: ${provider.api_base_url}`);
    console.log(`     - Models: ${JSON.stringify(provider.models)}`);
    console.log(`     - Transformer: ${JSON.stringify(provider.transformer)}`);
    console.log(`     - Enabled: ${provider.enabled}`);
    console.log('');
  });
  
  console.log('🎯 Router配置:');
  console.log(`   Default: ${config.Router?.default}`);
  console.log(`   Background: ${config.Router?.background}`);
  console.log(`   Think: ${config.Router?.think}`);
  console.log(`   LongContext: ${config.Router?.longContext}`);
  console.log('');
  
  // 检查k2cc provider
  const k2ccProvider = config.Providers?.find(p => p.name === 'k2cc');
  if (k2ccProvider) {
    console.log('✅ K2CC Provider找到:');
    console.log(JSON.stringify(k2ccProvider, null, 2));
    
    if (k2ccProvider.transformer?.use?.includes('k2cc')) {
      console.log('✅ K2CC Transformer配置正确');
    } else {
      console.log('❌ K2CC Transformer配置缺失');
    }
  } else {
    console.log('❌ 未找到K2CC Provider');
  }
  
  // 检查默认路由
  if (config.Router?.default?.includes('k2cc')) {
    console.log('✅ K2CC设置为默认路由');
  } else {
    console.log('❌ K2CC未设置为默认路由');
  }
  
} catch (error) {
  console.error('❌ 配置文件读取失败:', error.message);
}

console.log('\n🧪 测试请求路由:');
console.log('模拟请求: claude-sonnet-4-20250514');

// 模拟router逻辑
try {
  const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  const defaultRoute = config.Router?.default;
  
  if (defaultRoute) {
    const [providerName, modelName] = defaultRoute.split(',');
    console.log(`🎯 路由到: Provider=${providerName}, Model=${modelName}`);
    
    const provider = config.Providers?.find(p => p.name === providerName);
    if (provider) {
      console.log('✅ Provider找到');
      console.log(`🔄 Transformer配置: ${JSON.stringify(provider.transformer)}`);
      
      if (provider.transformer?.use) {
        console.log(`🔧 应调用的Transformers: ${provider.transformer.use.join(', ')}`);
      } else {
        console.log('⚠️ 无Transformer配置');
      }
    } else {
      console.log('❌ Provider未找到');
    }
  }
} catch (error) {
  console.error('❌ 路由分析失败:', error.message);
}