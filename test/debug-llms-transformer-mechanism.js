#!/usr/bin/env node

// Debug脚本：分析@musistudio/llms包中transformer调用机制

const fs = require('fs');
const path = require('path');

console.log('🔍 @musistudio/llms Transformer调用机制分析');
console.log('=============================================\n');

// 检查@musistudio/llms包的routes.js
const routesPath = path.join(process.cwd(), 'node_modules', '@musistudio', 'llms', 'dist', 'api', 'routes.js');

if (!fs.existsSync(routesPath)) {
  console.log('❌ routes.js文件不存在:', routesPath);
  process.exit(1);
}

console.log('📄 分析routes.js中的transformer调用逻辑...\n');

const routesCode = fs.readFileSync(routesPath, 'utf8');

// 查找transformer调用的关键代码段
console.log('🔍 搜索transformer调用模式...\n');

// 1. Provider level transformer
const providerTransformerPattern = /provider\.transformer\?\.\use[\s\S]{0,300}transformResponseOut/g;
const providerMatches = routesCode.match(providerTransformerPattern);

if (providerMatches) {
  console.log('✅ 找到Provider level transformer调用逻辑:');
  providerMatches.forEach((match, i) => {
    console.log(`\n--- Provider Transformer ${i + 1} ---`);
    console.log(match.replace(/\s+/g, ' ').substring(0, 200) + '...');
  });
} else {
  console.log('❌ 未找到Provider level transformer调用逻辑');
}

// 2. Model level transformer  
const modelTransformerPattern = /provider\.transformer\?\.\[.*?\]\?\.\use[\s\S]{0,300}transformResponseOut/g;
const modelMatches = routesCode.match(modelTransformerPattern);

if (modelMatches) {
  console.log('\n✅ 找到Model level transformer调用逻辑:');
  modelMatches.forEach((match, i) => {
    console.log(`\n--- Model Transformer ${i + 1} ---`);
    console.log(match.replace(/\s+/g, ' ').substring(0, 200) + '...');
  });
} else {
  console.log('\n❌ 未找到Model level transformer调用逻辑');
}

// 3. 检查完整的响应处理流程
const responsePattern = /finalResponse[\s\S]{0,500}/g;
const responseMatches = routesCode.match(responsePattern);

if (responseMatches) {
  console.log('\n🔍 响应处理流程分析:');
  responseMatches.slice(0, 3).forEach((match, i) => {
    console.log(`\n--- Response Flow ${i + 1} ---`);
    console.log(match.replace(/\s+/g, ' ').substring(0, 300) + '...');
  });
}

// 4. 搜索具体的API调用和transformer应用点
console.log('\n🎯 关键调用点分析:');

// 查找API调用后的响应处理
const apiCallPattern = /fetch.*?[\s\S]{0,200}transformResponseOut/g;
const apiMatches = routesCode.match(apiCallPattern);

if (apiMatches) {
  console.log('✅ 找到API调用后的transformer处理:');
  apiMatches.forEach((match, i) => {
    console.log(`\n--- API Call ${i + 1} ---`);
    console.log(match.replace(/\s+/g, ' '));
  });
} else {
  console.log('❌ 未找到API调用后的transformer处理');
}

// 5. 检查条件判断逻辑
const conditionPattern = /if\s*\(.*?transformer.*?\)[\s\S]{0,150}/g;
const conditionMatches = routesCode.match(conditionPattern);

if (conditionMatches) {
  console.log('\n🔧 Transformer调用条件:');
  conditionMatches.slice(0, 5).forEach((match, i) => {
    console.log(`\n--- Condition ${i + 1} ---`);
    console.log(match.replace(/\s+/g, ' '));
  });
}

console.log('\n📋 分析总结:');
console.log('1. 检查是否存在provider.transformer?.use的调用逻辑');
console.log('2. 确认transformResponseOut的调用条件');
console.log('3. 验证我们的k2cc provider配置是否满足调用条件');
console.log('4. 如发现问题，可能需要修改provider配置或transformer注册方式');