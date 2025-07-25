#!/usr/bin/env node

// 测试脚本3：验证transformer调用链
// 专门测试transformer是否被正确调用

const fs = require('fs');
const path = require('path');

console.log('🔍 测试3：Transformer调用链验证');
console.log('=====================================\n');

// 读取构建后的代码，检查transformer定义
console.log('📦 检查构建后的transformer代码...');

const distPath = path.join(process.cwd(), 'dist', 'cli.js');
if (fs.existsSync(distPath)) {
  const distCode = fs.readFileSync(distPath, 'utf8');
  
  // 检查K2CC transformer是否存在于构建代码中
  if (distCode.includes('K2ccTransformer')) {
    console.log('✅ K2ccTransformer类存在于构建代码中');
  } else {
    console.log('❌ K2ccTransformer类不存在于构建代码中');
  }
  
  // 检查未注释的endPoint属性
  const activeEndPointMatches = distCode.match(/^\s*endPoint\s*[=:]\s*["']([^"']+)["']/gm);
  if (activeEndPointMatches) {
    console.log('⚠️ 发现活跃endPoint属性 - 可能导致endpoint模式');
    console.log('🔍 发现的活跃endPoint定义:');
    activeEndPointMatches.forEach(match => console.log(`   ${match.trim()}`));
  } else {
    console.log('✅ 构建代码中无活跃endPoint属性');
  }
  
  // 检查K2CC的endPoint状态
  const k2ccContext = distCode.match(/name\s*=\s*"k2cc"[\s\S]{0,200}/);
  if (k2ccContext) {
    console.log('🔍 K2CC transformer上下文:');
    console.log(k2ccContext[0].replace(/\s+/g, ' '));
  }
  
  // 检查transformer注册代码
  if (distCode.includes('registerTransformer') && distCode.includes('k2cc')) {
    console.log('✅ Transformer注册代码存在');
  } else {
    console.log('❌ Transformer注册代码缺失');
  }
  
  // 检查调试日志
  const debugPatterns = [
    'K2CC TRANSFORM REQUEST IN CALLED',
    'K2CC TRANSFORM RESPONSE OUT CALLED',
    'K2cc transformer constructed'
  ];
  
  console.log('\n🔍 检查调试日志模式:');
  debugPatterns.forEach(pattern => {
    if (distCode.includes(pattern)) {
      console.log(`✅ 找到日志: "${pattern}"`);
    } else {
      console.log(`❌ 缺失日志: "${pattern}"`);
    }
  });
  
} else {
  console.log('❌ 构建文件不存在，请先运行 npm run build');
}

console.log('\n📋 Transformer调用链分析:');
console.log('1. 请求 -> Router -> Provider匹配');
console.log('2. Provider transformer.use -> 查找transformer');
console.log('3. 调用 transformRequestIn -> API请求');
console.log('4. API响应 -> 调用 transformResponseOut');
console.log('5. 返回处理后的响应');

console.log('\n🧪 手动验证建议:');
console.log('1. 启动服务，检查是否有 "🔄 Registered k2cc transformer" 日志');
console.log('2. 发送测试请求，应该看到 transformer 调用日志');
console.log('3. 如无调用日志，说明 transformer 未被调用');

console.log('\n🔧 可能的问题:');
console.log('- endPoint属性导致被识别为endpoint transformer');
console.log('- transformer未正确注册到系统');
console.log('- provider配置与transformer名称不匹配');
console.log('- 路由逻辑跳过了provider transformer');