#!/usr/bin/env node

// Debug binary response parsing from CodeWhisperer
// This script will make a direct API call and analyze the binary response

const fs = require('fs');
const path = require('path');

async function debugBinaryParsing() {
  console.log('🔍 Debug: Binary Response Parsing from CodeWhisperer');
  
  // Read token data
  const tokenPath = path.join(process.env.HOME, '.aws', 'sso', 'cache', 'kiro-auth-token.json');
  let tokenData;
  
  try {
    const tokenContent = fs.readFileSync(tokenPath, 'utf-8');
    tokenData = JSON.parse(tokenContent);
    console.log('✅ Token loaded successfully');
  } catch (error) {
    console.error('❌ Failed to load token:', error.message);
    return;
  }
  
  // Create test request
  const testRequest = {
    profileArn: "arn:aws:codewhisperer:us-east-1:699475941385:profile/EHGA3GRVQMUK",
    conversationState: {
      chatTriggerType: "MANUAL",
      conversationId: `test-${Date.now()}`,
      currentMessage: {
        userInputMessage: {
          content: "Hello, how are you?",
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
  
  try {
    const response = await fetch('https://codewhisperer.us-east-1.amazonaws.com/generateAssistantResponse', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${tokenData.accessToken}`,
        'Content-Type': 'application/x-amz-json-1.1',
        'X-Amz-Target': 'CodeWhispererService.GenerateAssistantResponse',
        'User-Agent': 'debug-binary-parser/1.0.0'
      },
      body: JSON.stringify(testRequest)
    });
    
    console.log(`📊 Response status: ${response.status}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ API Error: ${errorText}`);
      return;
    }
    
    // Get response as buffer
    const responseBuffer = Buffer.from(await response.arrayBuffer());
    console.log(`📦 Response buffer size: ${responseBuffer.length} bytes`);
    
    // Save raw response for analysis
    const rawFile = '/tmp/codewhisperer-raw-response.bin';
    fs.writeFileSync(rawFile, responseBuffer);
    console.log(`💾 Raw response saved to: ${rawFile}`);
    
    // Convert to string and analyze
    const responseText = responseBuffer.toString('utf8');
    console.log('\n🔍 Text representation analysis:');
    console.log('First 500 characters:');
    console.log(responseText.substring(0, 500));
    console.log('\n' + '='.repeat(50));
    
    // Try different extraction methods
    console.log('\n🧪 Testing extraction methods:');
    
    // Method 1: Original regex
    const contentMatches1 = responseText.match(/"content"\s*:\s*"([^"]*)"/g) || [];
    console.log(`Method 1 - Original regex matches: ${contentMatches1.length}`);
    contentMatches1.forEach((match, i) => {
      console.log(`  Match ${i+1}: ${match}`);
    });
    
    // Method 2: More flexible regex
    const contentMatches2 = responseText.match(/"content"\s*:\s*"([^"\\]*(\\.[^"\\]*)*)"/g) || [];
    console.log(`Method 2 - Flexible regex matches: ${contentMatches2.length}`);
    contentMatches2.forEach((match, i) => {
      console.log(`  Match ${i+1}: ${match}`);
    });
    
    // Method 3: JSON-like patterns
    const jsonMatches = responseText.match(/\{[^{}]*"content"[^{}]*\}/g) || [];
    console.log(`Method 3 - JSON patterns: ${jsonMatches.length}`);
    jsonMatches.forEach((match, i) => {
      console.log(`  JSON ${i+1}: ${match}`);
      try {
        const parsed = JSON.parse(match);
        if (parsed.content) {
          console.log(`    Extracted content: "${parsed.content}"`);
        }
      } catch (e) {
        console.log(`    Parse error: ${e.message}`);
      }
    });
    
    // Method 4: Search for any text that looks like AI response
    const textPatterns = responseText.match(/[A-Z][^"{}]*[.!?]/g) || [];
    console.log(`Method 4 - Text patterns: ${textPatterns.length}`);
    textPatterns.slice(0, 5).forEach((match, i) => {
      console.log(`  Text ${i+1}: "${match}"`);
    });
    
    console.log('\n✅ Binary parsing debug complete');
    
  } catch (error) {
    console.error('❌ Request failed:', error);
  }
}

debugBinaryParsing().catch(console.error);