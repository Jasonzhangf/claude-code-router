#!/usr/bin/env node

/**
 * Test scenario where K2CC returns empty content and causes the [0] access error
 */

console.log('🔍 Testing Empty Content Scenario');
console.log('===============================\n');

// Simulate K2CC when no content is extracted
function simulateEmptyContentResponse() {
    console.log('🎭 Simulating K2CC with empty content extraction...');
    
    // This happens when contentMatches is empty or no content is found
    let fullContent = ''; // Empty content scenario
    
    const anthropicResponse = {
        id: `msg_${Date.now()}`,
        type: 'message',
        role: 'assistant',
        model: 'claude-sonnet-4-20250514',
        content: [
            {
                type: 'text',
                text: fullContent || 'Response processed through k2cc transformer' // Fallback
            }
        ],
        stop_reason: 'end_turn',
        stop_sequence: null,
        usage: {
            input_tokens: 10,
            output_tokens: Math.max(Math.floor(fullContent.length / 4), 1)
        }
    };
    
    console.log('📋 anthropicResponse created:', JSON.stringify(anthropicResponse, null, 2));
    
    const responseJson = JSON.stringify(anthropicResponse);
    const finalResponse = new Response(responseJson, {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
    });
    
    // Custom json() method like K2CC
    finalResponse.json = async () => {
        console.log('🔧 Custom json() called - returning anthropicResponse');
        return anthropicResponse;
    };
    
    return finalResponse;
}

// Simulate what might happen if content array is undefined or malformed
function simulateMalformedContentResponse() {
    console.log('\n🎭 Simulating malformed content response...');
    
    // This could happen if there's an error in response construction
    const badAnthropicResponse = {
        id: `msg_${Date.now()}`,
        type: 'message',
        role: 'assistant',
        model: 'claude-sonnet-4-20250514',
        content: undefined, // This could cause the error
        stop_reason: 'end_turn',
        stop_sequence: null,
        usage: {
            input_tokens: 10,
            output_tokens: 1
        }
    };
    
    console.log('📋 badAnthropicResponse created:', JSON.stringify(badAnthropicResponse, null, 2));
    
    const responseJson = JSON.stringify(badAnthropicResponse);
    const finalResponse = new Response(responseJson, {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
    });
    
    // Custom json() method
    finalResponse.json = async () => {
        console.log('🔧 Custom json() called - returning badAnthropicResponse');
        return badAnthropicResponse;
    };
    
    return finalResponse;
}

async function testNormalEmptyContent() {
    console.log('\n🧪 Test 1: Normal empty content (should work)');
    
    try {
        const response = simulateEmptyContentResponse();
        const result = await response.json();
        
        console.log('✅ json() call successful');
        console.log('🔍 result.content exists:', !!result.content);
        console.log('🔍 result.content is array:', Array.isArray(result.content));
        console.log('🔍 result.content[0] exists:', !!result.content[0]);
        
        if (result.content && result.content[0]) {
            console.log('✅ Can access result.content[0].text:', result.content[0].text);
        }
        
    } catch (error) {
        console.error('❌ Error in normal empty content test:', error.message);
    }
}

async function testMalformedContent() {
    console.log('\n🧪 Test 2: Malformed content (undefined content array)');
    
    try {
        const response = simulateMalformedContentResponse();
        const result = await response.json();
        
        console.log('✅ json() call successful');
        console.log('🔍 result.content:', result.content);
        
        // This is where the error would occur
        console.log('🔍 Trying to access result.content[0]...');
        console.log('result.content[0]:', result.content[0]); // Should throw the error
        
    } catch (error) {
        console.error('❌ Error in malformed content test:', error.message);
        if (error.message.includes("Cannot read properties of undefined (reading '0')")) {
            console.log('🎯 FOUND THE EXACT ERROR! This is what causes it.');
            return true;
        }
    }
    
    return false;
}

// Check if @musistudio/llms might be accessing content[0] directly
function analyzePostJsonProcessing() {
    console.log('\n🔍 Analysis: What happens after routes.js line 117?');
    console.log('routes.js line 117: return finalResponse.json()');
    console.log('This returns the anthropicResponse object to the caller');
    console.log('The caller (probably @musistudio/llms internals) might then:');
    console.log('1. Access response.content[0] directly');
    console.log('2. Try to get response.content[0].text');
    console.log('3. Process the first content block');
    console.log('\nIf content is undefined, accessing content[0] will throw:');
    console.log('"Cannot read properties of undefined (reading \'0\')"');
}

async function main() {
    console.log('🚀 Testing empty/malformed content scenarios...\n');
    
    await testNormalEmptyContent();
    const foundError = await testMalformedContent();
    
    analyzePostJsonProcessing();
    
    console.log('\n📊 Summary:');
    console.log('- Normal empty content works fine (has fallback text)');
    console.log('- Malformed content (undefined content array) causes the error');
    console.log('- The error occurs when @musistudio/llms tries to access content[0]');
    console.log('- K2CC needs to ensure content array is always defined and non-empty');
    
    if (foundError) {
        console.log('\n🎯 SOLUTION IDENTIFIED:');
        console.log('K2CC transformer should never return anthropicResponse with undefined content');
        console.log('Always ensure content is a non-empty array with at least one text block');
    }
}

main();