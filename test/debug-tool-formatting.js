#!/usr/bin/env node

/**
 * Debug Tool Formatting - Compare k2cc transformer tool formatting with working kiro2cc
 * 
 * This script tests our K2CC transformer tool formatting against the expected CodeWhisperer format
 * based on the working kiro2cc Go implementation.
 */

// Using node's built-in fetch instead of axios

console.log('🔧 Testing K2CC Tool Formatting...\n');

// Test with a simple tool request to verify formatting
const testAnthropicRequest = {
  model: "claude-sonnet-4-20250514",
  max_tokens: 1000,
  messages: [
    {
      role: "user", 
      content: "List the files in the current directory"
    }
  ],
  tools: [
    {
      name: "bash",
      description: "Execute bash commands",
      input_schema: {
        type: "object",
        properties: {
          command: {
            type: "string",
            description: "The bash command to execute"
          }
        },
        required: ["command"]
      }
    }
  ],
  stream: false
};

console.log('📤 Original Anthropic Request:');
console.log(JSON.stringify(testAnthropicRequest, null, 2));
console.log('\n' + '='.repeat(80) + '\n');

// Expected CodeWhisperer format based on kiro2cc analysis
const expectedCodeWhispererFormat = {
  profileArn: "arn:aws:codewhisperer:us-east-1:699475941385:profile/EHGA3GRVQMUK",
  conversationState: {
    chatTriggerType: "MANUAL",
    conversationId: "uuid-here", 
    currentMessage: {
      userInputMessage: {
        content: "List the files in the current directory",
        modelId: "CLAUDE_SONNET_4_20250514_V1_0",
        origin: "AI_EDITOR",
        userInputMessageContext: {
          tools: [
            {
              toolSpecification: {
                name: "bash",
                description: "Execute bash commands", 
                inputSchema: {
                  json: {
                    type: "object",
                    properties: {
                      command: {
                        type: "string",
                        description: "The bash command to execute"
                      }
                    },
                    required: ["command"]
                  }
                }
              }
            }
          ],
          toolResults: []
        }
      }
    },
    history: []
  }
};

console.log('📋 Expected CodeWhisperer Format (based on kiro2cc):');
console.log(JSON.stringify(expectedCodeWhispererFormat, null, 2));
console.log('\n' + '='.repeat(80) + '\n');

// Test our transformer
async function testTransformer() {
  try {
    console.log('📡 Testing our K2CC transformer...');
    
    const response = await fetch('http://localhost:3457/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify(testAnthropicRequest)
    });
    
    const responseData = await response.json();
    
    console.log('✅ Response received:');
    console.log(`Status: ${response.status}`);
    console.log(JSON.stringify(responseData, null, 2));
    
  } catch (error) {
    console.error('❌ Transformer test failed:');
    console.error('Error:', error.message);
  }
}

// Run the test
testTransformer().then(() => {
  console.log('\n🏁 Tool formatting test completed');
}).catch(console.error);