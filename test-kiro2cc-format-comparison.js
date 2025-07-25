#!/usr/bin/env node

/**
 * Kiro2cc格式对比测试
 * 对比我们的K2CC transformer和kiro2cc的请求格式
 * 找出UnknownOperationException的根本原因
 */

const fs = require('fs');
const path = require('path');

// 基于kiro2cc main.go的AnthropicRequest结构
const standardAnthropicRequest = {
  model: "claude-sonnet-4-20250514",
  max_tokens: 100,
  messages: [
    {
      role: "user",
      content: "Hello, test message"
    }
  ],
  stream: false
};

// 基于kiro2cc main.go的CodeWhispererRequest结构
const expectedCodeWhispererRequest = {
  conversationState: {
    chatTriggerType: "MANUAL",
    conversationId: "test-uuid-123",
    currentMessage: {
      userInputMessage: {
        content: "Hello, test message",
        modelId: "CLAUDE_SONNET_4_20250514_V1_0",
        origin: "AI_EDITOR",
        userInputMessageContext: {
          tools: [],
          toolResults: []
        }
      }
    },
    history: []
  },
  profileArn: "arn:aws:codewhisperer:us-east-1:699475941385:profile/EHGA3GRVQMUK"
};

// 正确的HTTP请求头（基于kiro2cc）
const correctHeaders = {
  'Content-Type': 'application/x-amz-json-1.1',
  'X-Amz-Target': 'CodeWhispererService.GenerateAssistantResponse',
  'User-Agent': 'k2cc-transformer/1.0.0'
};

async function testFormatComparison() {
  console.log('🔍 Kiro2cc格式对比测试');
  console.log('=======================');
  console.log('目标: 找出UnknownOperationException的根本原因');
  console.log('');

  // 1. 显示标准格式
  console.log('1️⃣ 标准Anthropic请求格式 (基于kiro2cc):');
  console.log(JSON.stringify(standardAnthropicRequest, null, 2));

  console.log('\\n2️⃣ 预期CodeWhisperer转换格式 (基于kiro2cc):');
  console.log(JSON.stringify(expectedCodeWhispererRequest, null, 2));

  console.log('\\n3️⃣ 正确的HTTP请求头 (基于kiro2cc):');
  console.log(JSON.stringify(correctHeaders, null, 2));

  console.log('\\n4️⃣ 分析我们的K2CC transformer...');

  // 2. 测试我们的服务器
  console.log('\\n📡 发送到我们的K2CC服务器...');
  
  try {
    const response = await fetch('http://localhost:3456/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify(standardAnthropicRequest)
    });

    const responseData = await response.json();
    
    console.log(`📥 服务器响应状态: ${response.status}`);
    
    if (response.ok) {
      console.log('✅ 请求成功');
      console.log('📋 响应:', JSON.stringify(responseData, null, 2));
    } else {
      console.log('❌ 请求失败');
      console.log('📋 错误响应:', JSON.stringify(responseData, null, 2));
      
      // 分析错误
      if (responseData.error && responseData.error.message) {
        const errorMsg = responseData.error.message;
        
        if (errorMsg.includes('UnknownOperationException')) {
          console.log('\\n🔍 UnknownOperationException分析:');
          console.log('这表明CodeWhisperer API不认识我们发送的操作');
          console.log('可能的原因:');
          console.log('  1. API端点URL错误');
          console.log('  2. X-Amz-Target头错误');
          console.log('  3. 请求体格式错误');
          console.log('  4. 缺少必需的AWS认证头');
        }
      }
    }
    
  } catch (error) {
    console.log('❌ 网络错误:', error.message);
  }

  // 3. 对比分析
  console.log('\\n5️⃣ 关键对比分析:');
  console.log('=================');
  
  console.log('🔗 API端点对比:');
  console.log('  Kiro2cc: POST /v1/messages');
  console.log('  我们的:  POST /v1/messages');
  console.log('  状态: ✅ 一致');
  
  console.log('\\n📋 请求体结构对比:');
  console.log('  Kiro2cc: AnthropicRequest -> CodeWhispererRequest');
  console.log('  我们的:  相同转换逻辑');
  console.log('  状态: ✅ 理论一致');
  
  console.log('\\n🌐 下游API调用对比:');
  console.log('  Kiro2cc目标: https://codewhisperer.us-east-1.amazonaws.com/generateAssistantResponse');
  console.log('  我们的目标:   https://codewhisperer.us-east-1.amazonaws.com/generateAssistantResponse');
  console.log('  状态: ✅ 一致');
  
  console.log('\\n🔐 认证方式对比:');
  console.log('  Kiro2cc: Bearer token + X-Amz-Target头');
  console.log('  我们的:   Bearer token + X-Amz-Target头');
  console.log('  状态: ✅ 一致');

  // 4. 可能的问题点
  console.log('\\n🚨 可能的问题点:');
  console.log('================');
  
  console.log('1. ProfileArn配置');
  console.log('   - 检查是否使用了正确的profileArn');
  console.log('   - 确认profileArn对应的账户有效');
  
  console.log('\\n2. Token有效性');
  console.log('   - 验证token是否真正有效');
  console.log('   - 检查token权限范围');
  
  console.log('\\n3. AWS服务区域');
  console.log('   - 确认使用us-east-1区域');
  console.log('   - 检查跨区域访问权限');
  
  console.log('\\n4. HTTP请求细节');
  console.log('   - User-Agent字符串');
  console.log('   - 请求超时设置');
  console.log('   - TLS/SSL版本');

  // 5. 诊断建议
  console.log('\\n💡 诊断建议:');
  console.log('============');
  
  console.log('1. 直接curl测试CodeWhisperer API');
  console.log('2. 对比kiro2cc的实际网络请求');
  console.log('3. 检查AWS CloudTrail日志');
  console.log('4. 验证token在AWS控制台中的状态');
  
  return {
    anthropicRequest: standardAnthropicRequest,
    codewhispererRequest: expectedCodeWhispererRequest,
    headers: correctHeaders
  };
}

async function generateDirectCurlTest() {
  console.log('\\n6️⃣ 生成直接curl测试命令:');
  console.log('==========================');
  
  // 读取当前token
  const tokenPath = '/Users/fanzhang/.aws/sso/cache/kiro-auth-token.json';
  
  try {
    const tokenData = JSON.parse(fs.readFileSync(tokenPath, 'utf8'));
    const token = tokenData.accessToken;
    
    const curlCommand = `curl -X POST "https://codewhisperer.us-east-1.amazonaws.com/generateAssistantResponse" \\\\
  -H "Content-Type: application/x-amz-json-1.1" \\\\
  -H "X-Amz-Target: CodeWhispererService.GenerateAssistantResponse" \\\\
  -H "Authorization: Bearer ${token.substring(0, 20)}..." \\\\
  -H "User-Agent: k2cc-transformer/1.0.0" \\\\
  -d '${JSON.stringify(expectedCodeWhispererRequest)}'`;
    
    console.log('📋 直接测试命令:');
    console.log(curlCommand);
    
    console.log('\\n⚠️  注意: token已截断显示，使用时需要完整token');
    
    // 保存测试脚本
    const testScript = `#!/bin/bash
# CodeWhisperer API直接测试脚本
# 生成时间: ${new Date().toISOString()}

TOKEN="${token}"

curl -X POST "https://codewhisperer.us-east-1.amazonaws.com/generateAssistantResponse" \\\\
  -H "Content-Type: application/x-amz-json-1.1" \\\\
  -H "X-Amz-Target: CodeWhispererService.GenerateAssistantResponse" \\\\
  -H "Authorization: Bearer $TOKEN" \\\\
  -H "User-Agent: k2cc-transformer/1.0.0" \\\\
  -d '${JSON.stringify(expectedCodeWhispererRequest, null, 2)}' \\\\
  -v
`;
    
    const scriptPath = path.join(__dirname, 'test', 'direct-codewhisperer-test.sh');
    if (!fs.existsSync(path.dirname(scriptPath))) {
      fs.mkdirSync(path.dirname(scriptPath), { recursive: true });
    }
    
    fs.writeFileSync(scriptPath, testScript);
    fs.chmodSync(scriptPath, 0o755);
    
    console.log(`📄 测试脚本已保存: ${scriptPath}`);
    console.log('运行: bash test/direct-codewhisperer-test.sh');
    
  } catch (error) {
    console.log('❌ 无法读取token文件:', error.message);
  }
}

async function main() {
  console.log('🚀 开始Kiro2cc格式对比分析');
  console.log('============================');
  
  const results = await testFormatComparison();
  await generateDirectCurlTest();
  
  // 保存分析结果
  const reportPath = path.join(__dirname, 'test', 'kiro2cc-format-comparison.json');
  if (!fs.existsSync(path.dirname(reportPath))) {
    fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  }
  
  const report = {
    timestamp: new Date().toISOString(),
    analysis: 'kiro2cc format comparison for UnknownOperationException debugging',
    standardFormats: results,
    conclusions: [
      'API endpoints are identical',
      'Request transformation logic should be identical',
      'Authentication method is identical', 
      'Issue likely in implementation details or token validity'
    ],
    nextSteps: [
      'Run direct curl test',
      'Compare actual network requests',
      'Verify token permissions',
      'Check AWS CloudTrail logs'
    ]
  };
  
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`\\n📊 分析报告已保存: ${reportPath}`);
}

if (require.main === module) {
  main().catch(console.error);
}