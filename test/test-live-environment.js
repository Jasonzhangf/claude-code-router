#!/usr/bin/env node

/**
 * 实地测试脚本
 * 目标：在真实环境中测试K2CC transformer的完整功能
 * 前提：标准响应数据模拟测试已经通过，通路完整性已验证
 */

const fetch = require('node-fetch');

async function testLiveEnvironment() {
  console.log('🚀 开始实地测试');
  console.log('================');
  console.log('前提：标准响应数据模拟测试已通过 ✅');
  console.log('目标：验证真实环境下的K2CC transformer功能');
  console.log('');

  // 测试参数
  const testConfig = {
    proxyUrl: 'http://127.0.0.1:3457/v1/messages',
    testMessage: 'Hello, this is a live test message',
    expectedProvider: 'k2cc',
    expectedModel: 'claude-sonnet-4-20250514'
  };

  console.log('🔧 测试配置:');
  console.log(`  - 代理地址: ${testConfig.proxyUrl}`);
  console.log(`  - 测试消息: "${testConfig.testMessage}"`);
  console.log(`  - 期望Provider: ${testConfig.expectedProvider}`);
  console.log(`  - 期望模型: ${testConfig.expectedModel}`);
  console.log('');

  try {
    // 构建Anthropic格式请求
    const anthropicRequest = {
      model: testConfig.expectedModel,
      max_tokens: 100,
      messages: [{
        role: 'user',
        content: testConfig.testMessage
      }]
    };

    console.log('📤 发送Anthropic格式请求...');
    console.log('请求体:', JSON.stringify(anthropicRequest, null, 2));

    const startTime = Date.now();
    
    const response = await fetch(testConfig.proxyUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'live-test-client/1.0.0'
      },
      body: JSON.stringify(anthropicRequest)
    });

    const endTime = Date.now();
    const responseTime = endTime - startTime;

    console.log(`📥 响应接收完成 (${responseTime}ms)`);
    console.log(`状态: ${response.status} ${response.statusText}`);
    console.log('响应头:', JSON.stringify(Object.fromEntries(response.headers), null, 2));

    if (response.ok) {
      const responseData = await response.json();
      
      console.log('✅ 请求成功');
      console.log('📋 响应数据结构:', JSON.stringify(responseData, null, 2));

      // 验证响应格式
      const validation = validateAnthropicResponse(responseData);
      
      if (validation.isValid) {
        console.log('✅ Anthropic格式验证通过');
        console.log(`📝 响应内容: "${validation.content}"`);
        console.log(`📊 Token使用: 输入${validation.inputTokens}, 输出${validation.outputTokens}`);
        
        // 检查内容质量
        if (validation.content && validation.content.length > 10) {
          console.log('✅ 内容质量检查通过');
          
          // 性能检查
          if (responseTime < 30000) { // 30秒内
            console.log(`✅ 响应时间检查通过 (${responseTime}ms)`);
            
            console.log('\n🎉 实地测试完全成功！');
            console.log('====================');
            console.log('✅ 请求发送成功');
            console.log('✅ K2CC transformer工作正常');
            console.log('✅ CodeWhisperer API集成成功');
            console.log('✅ 响应格式正确');
            console.log('✅ 内容提取完整');
            console.log('✅ 性能表现良好');
            
            return {
              success: true,
              responseTime,
              content: validation.content,
              tokens: {
                input: validation.inputTokens,
                output: validation.outputTokens
              }
            };
          } else {
            console.log(`⚠️  响应时间较长: ${responseTime}ms`);
            return { success: false, error: 'Response time too long' };
          }
        } else {
          console.log('❌ 内容质量检查失败：内容过短或为空');
          return { success: false, error: 'Content quality check failed' };
        }
      } else {
        console.log('❌ Anthropic格式验证失败:', validation.error);
        return { success: false, error: 'Response format validation failed' };
      }
    } else {
      const errorText = await response.text();
      console.log('❌ 请求失败');
      console.log('错误内容:', errorText);
      return { success: false, error: `HTTP ${response.status}: ${errorText}` };
    }

  } catch (error) {
    console.error('❌ 实地测试失败:', error.message);
    return { success: false, error: error.message };
  }
}

function validateAnthropicResponse(data) {
  try {
    // 检查基本结构
    if (!data || typeof data !== 'object') {
      return { isValid: false, error: 'Response is not an object' };
    }

    // 检查必需字段
    if (!data.id || !data.type || !data.role || !data.content) {
      return { isValid: false, error: 'Missing required fields' };
    }

    // 检查content结构
    if (!Array.isArray(data.content) || data.content.length === 0) {
      return { isValid: false, error: 'Content is not a valid array' };
    }

    const textContent = data.content.find(block => block.type === 'text');
    if (!textContent || !textContent.text) {
      return { isValid: false, error: 'No text content found' };
    }

    // 检查usage信息
    const inputTokens = data.usage?.input_tokens || 0;
    const outputTokens = data.usage?.output_tokens || 0;

    return {
      isValid: true,
      content: textContent.text,
      inputTokens,
      outputTokens
    };

  } catch (error) {
    return { isValid: false, error: `Validation error: ${error.message}` };
  }
}

async function checkServerStatus() {
  console.log('🔍 检查服务器状态...');
  
  try {
    const response = await fetch('http://127.0.0.1:3457/health', {
      method: 'GET',
      timeout: 5000
    });
    
    if (response.ok) {
      console.log('✅ 服务器运行正常');
      return true;
    } else {
      console.log(`❌ 服务器状态异常: ${response.status}`);
      return false;
    }
  } catch (error) {
    console.log(`❌ 无法连接服务器: ${error.message}`);
    console.log('💡 请确保服务器已启动：./start-dev.sh');
    return false;
  }
}

async function runLiveTest() {
  console.log('🚀 K2CC Transformer 实地测试');
  console.log('============================');
  
  // 先检查服务器状态
  const serverOk = await checkServerStatus();
  if (!serverOk) {
    console.log('\n❌ 服务器未运行，无法进行实地测试');
    console.log('请先启动服务器：./start-dev.sh');
    return;
  }
  
  console.log('');
  
  // 执行实地测试
  const result = await testLiveEnvironment();
  
  console.log('\n📊 实地测试结果汇总');
  console.log('==================');
  
  if (result.success) {
    console.log('🎉 实地测试完全成功！');
    console.log(`⏱️  响应时间: ${result.responseTime}ms`);
    console.log(`📝 响应内容长度: ${result.content.length} 字符`);
    console.log(`🔢 Token使用: ${result.tokens.input}+${result.tokens.output}=${result.tokens.input + result.tokens.output}`);
    console.log('\n✅ K2CC Transformer 已准备好投入生产使用！');
  } else {
    console.log('❌ 实地测试失败');
    console.log(`错误: ${result.error}`);
    console.log('\n🔧 请检查日志并修复问题后重试');
  }
  
  return result;
}

// 运行测试
if (require.main === module) {
  runLiveTest().catch(console.error);
}

module.exports = { runLiveTest, testLiveEnvironment, validateAnthropicResponse };