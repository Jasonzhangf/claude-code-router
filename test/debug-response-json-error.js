#!/usr/bin/env node

// Debug脚本：分析Response.json()调用错误
// 测试我们的Response对象是否正确实现了json()方法

console.log('🔍 Response.json() 错误调试');
console.log('===============================\n');

// 1. 测试标准Response对象的json()方法
console.log('📋 测试标准Response对象...');
try {
  const testResponse = {
    id: "msg_test",
    type: "message",
    role: "assistant",
    model: "claude-sonnet-4-20250514",
    content: [
      {
        type: "text",
        text: "Test content"
      }
    ],
    stop_reason: "end_turn",
    stop_sequence: null,
    usage: {
      input_tokens: 10,
      output_tokens: 5
    }
  };
  
  const standardResponse = new Response(JSON.stringify(testResponse), {
    status: 200,
    statusText: 'OK',
    headers: {
      'Content-Type': 'application/json'
    }
  });
  
  console.log('✅ 标准Response对象创建成功');
  console.log(`📄 Has json method: ${typeof standardResponse.json === 'function'}`);
  
  // 测试json()调用
  const jsonResult = await standardResponse.json();
  console.log('✅ json()调用成功');
  console.log(`📋 JSON结果:`, JSON.stringify(jsonResult, null, 2));
  
} catch (error) {
  console.error('❌ 标准Response测试失败:', error.message);
}

console.log('\n🔍 模拟K2CC transformer响应...');

// 2. 模拟我们的K2CC transformer返回的Response
try {
  const mockAnthropicResponse = {
    id: "msg_1753414716736",
    type: "message",
    role: "assistant",
    model: "claude-sonnet-4-20250514",
    content: [
      {
        type: "text",
        text: "Hello! Nice to meet you."
      }
    ],
    stop_reason: "end_turn",
    stop_sequence: null,
    usage: {
      input_tokens: 10,
      output_tokens: 8
    }
  };
  
  console.log('📦 创建K2CC风格的Response对象...');
  const k2ccResponse = new Response(JSON.stringify(mockAnthropicResponse), {
    status: 200,
    statusText: 'OK',
    headers: {
      'Content-Type': 'application/json'
    }
  });
  
  console.log('✅ K2CC Response对象创建成功');
  console.log(`📄 Has json method: ${typeof k2ccResponse.json === 'function'}`);
  
  // 关键测试：调用json()方法
  console.log('🧪 调用json()方法...');
  const k2ccJsonResult = await k2ccResponse.json();
  console.log('✅ K2CC json()调用成功');
  console.log(`📋 结果类型: ${typeof k2ccJsonResult}`);
  console.log(`📋 内容预览:`, JSON.stringify(k2ccJsonResult, null, 2).substring(0, 200));
  
  // 测试访问content[0]
  if (k2ccJsonResult && k2ccJsonResult.content && Array.isArray(k2ccJsonResult.content)) {
    console.log(`✅ content数组存在，长度: ${k2ccJsonResult.content.length}`);
    if (k2ccJsonResult.content.length > 0) {
      console.log(`✅ content[0]存在: ${JSON.stringify(k2ccJsonResult.content[0])}`);
    } else {
      console.log('❌ content数组为空');
    }
  } else {
    console.log('❌ content数组不存在或不是数组');
    console.log(`📋 content值: ${JSON.stringify(k2ccJsonResult?.content)}`);
  }
  
} catch (error) {
  console.error('❌ K2CC Response测试失败:', error.message);
  console.error('📋 Stack trace:', error.stack);
}

console.log('\n📊 调试总结:');
console.log('1. 检查Response对象创建是否正确');
console.log('2. 验证json()方法是否可用');
console.log('3. 确认content数组结构是否正确');
console.log('4. 如果所有测试都通过，问题可能在@musistudio/llms的其他地方');