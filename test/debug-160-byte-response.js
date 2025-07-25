#!/usr/bin/env node

// Debug the 160-byte response issue
// Make the exact same request as the transformer and examine the raw response

const fs = require('fs');
const path = require('path');

async function debug160ByteResponse() {
  console.log('🔍 Debug: 160-byte Response Issue');
  
  // Read token data
  const tokenPath = path.join(process.env.HOME, '.aws', 'sso', 'cache', 'kiro-auth-token.json');
  let tokenData;
  
  try {
    const tokenContent = fs.readFileSync(tokenPath, 'utf-8');
    tokenData = JSON.parse(tokenContent);
    console.log('✅ Token loaded successfully');
    console.log(`🔑 Token expires at: ${tokenData.expiresAt}`);
  } catch (error) {
    console.error('❌ Failed to load token:', error.message);
    return;
  }
  
  // Create the exact same request as the transformer
  const testRequest = {
    profileArn: "arn:aws:codewhisperer:us-east-1:699475941385:profile/EHGA3GRVQMUK",
    conversationState: {
      chatTriggerType: "MANUAL",
      conversationId: `debug-160-${Date.now()}`,
      currentMessage: {
        userInputMessage: {
          content: "你好，请简单介绍一下自己",
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
  
  console.log('🔄 Making request to CodeWhisperer API...');
  console.log('📝 Request:', JSON.stringify(testRequest, null, 2));
  
  try {
    const response = await fetch('https://codewhisperer.us-east-1.amazonaws.com/generateAssistantResponse', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${tokenData.accessToken}`,
        'Content-Type': 'application/x-amz-json-1.1',
        'X-Amz-Target': 'CodeWhispererService.GenerateAssistantResponse',
        'User-Agent': 'debug-160-byte/1.0.0'
      },
      body: JSON.stringify(testRequest)
    });
    
    console.log(`📊 Response status: ${response.status}`);
    console.log(`📋 Response headers:`, Object.fromEntries(response.headers.entries()));
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ API Error: ${errorText}`);
      return;
    }
    
    // Get response as buffer
    const responseBuffer = Buffer.from(await response.arrayBuffer());
    console.log(`📦 Response buffer size: ${responseBuffer.length} bytes`);
    
    // Save raw response for analysis
    const rawFile = '/tmp/debug-160-response.bin';
    fs.writeFileSync(rawFile, responseBuffer);
    console.log(`💾 Raw response saved to: ${rawFile}`);
    
    // Convert to hex for analysis
    console.log('\n🔍 Hex dump (first 200 bytes):');
    console.log(responseBuffer.slice(0, 200).toString('hex').replace(/(.{2})/g, '$1 ').trim());
    
    // Convert to string and analyze
    const responseText = responseBuffer.toString('utf8');
    console.log('\n🔍 UTF-8 representation:');
    console.log(responseText);
    
    // Test our regex patterns
    console.log('\n🧪 Testing extraction patterns:');
    
    // Pattern 1: JSON objects with content
    const jsonMatches = responseText.match(/\{[^{}]*"content"[^{}]*\}/g) || [];
    console.log(`JSON content matches: ${jsonMatches.length}`);
    jsonMatches.forEach((match, i) => {
      console.log(`  ${i+1}: ${match}`);
    });
    
    // Pattern 2: Any content field
    const contentMatches = responseText.match(/"content"\s*:\s*"([^"]*)"/g) || [];
    console.log(`Content field matches: ${contentMatches.length}`);
    contentMatches.forEach((match, i) => {
      console.log(`  ${i+1}: ${match}`);
    });
    
    // Check if this is an error response
    if (responseText.includes('error') || responseText.includes('Error')) {
      console.log('\n❌ This appears to be an error response');
    }
    
    // Check for specific error patterns
    if (responseText.includes('AccessDenied') || responseText.includes('Forbidden')) {
      console.log('\n🚫 Access denied - token may be expired or invalid');
    }
    
    console.log('\n✅ 160-byte response debug complete');
    
  } catch (error) {
    console.error('❌ Request failed:', error);
  }
}

debug160ByteResponse().catch(console.error);