#!/usr/bin/env node

// 测试脚本2：测试从代理服务器发送到CodeWhisperer是否正常
// 模拟k2cc transformer发送请求到CodeWhisperer

const fs = require('fs');
const path = require('path');
const { homedir } = require('os');

async function testCodeWhispererAPI() {
  console.log('🔍 测试2：代理服务器到CodeWhisperer API');
  
  // 读取token
  const tokenPath = path.join(homedir(), '.aws', 'sso', 'cache', 'kiro-auth-token.json');
  let token;
  
  try {
    const tokenData = JSON.parse(fs.readFileSync(tokenPath, 'utf8'));
    token = tokenData.accessToken;
    console.log('✅ Token读取成功');
  } catch (error) {
    console.error('❌ Token读取失败:', error.message);
    return;
  }
  
  // 构建CodeWhisperer请求
  const cwRequest = {
    profileArn: "arn:aws:codewhisperer:us-east-1:699475941385:profile/EHGA3GRVQMUK",
    conversationState: {
      chatTriggerType: "MANUAL",
      conversationId: generateUUID(),
      currentMessage: {
        userInputMessage: {
          content: "Say hello",
          modelId: "CLAUDE_SONNET_4_20250514_V1_0",
          origin: "AI_EDITOR",
          userInputMessageContext: {
            tools: [],
            toolResults: []
          }
        }
      },
      history: []
    }
  };
  
  console.log('📤 发送请求到CodeWhisperer...');
  console.log('请求体:', JSON.stringify(cwRequest, null, 2));
  
  try {
    const response = await fetch('https://codewhisperer.us-east-1.amazonaws.com/generateAssistantResponse', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/x-amz-json-1.1',
        'X-Amz-Target': 'CodeWhispererService.GenerateAssistantResponse',
        'User-Agent': 'k2cc-test/1.0.0'
      },
      body: JSON.stringify(cwRequest)
    });
    
    console.log(`📥 响应状态: ${response.status}`);
    console.log('响应头:', JSON.stringify(Object.fromEntries(response.headers), null, 2));
    
    if (response.ok) {
      const responseBuffer = Buffer.from(await response.arrayBuffer());
      console.log(`📦 响应大小: ${responseBuffer.length} bytes`);
      console.log('前100字节:', responseBuffer.slice(0, 100));
      
      // 尝试提取内容
      const responseText = responseBuffer.toString('utf8');
      const contentMatches = responseText.match(/"content"\s*:\s*"([^"]*)"/g);
      if (contentMatches) {
        console.log('✅ 提取到的内容:');
        contentMatches.forEach((match, i) => {
          const content = match.match(/"content"\s*:\s*"([^"]*)"/)[1];
          console.log(`  ${i + 1}: "${content}"`);
        });
        
        const fullContent = contentMatches
          .map(match => match.match(/"content"\s*:\s*"([^"]*)"/)[1])
          .join('');
        console.log(`🎯 完整内容: "${fullContent}"`);
      } else {
        console.log('❌ 未找到内容');
      }
    } else {
      const errorText = await response.text();
      console.error('❌ API错误:', errorText);
    }
    
  } catch (error) {
    console.error('❌ 请求失败:', error.message);
  }
}

function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

testCodeWhispererAPI();