#!/usr/bin/env node

/**
 * Debug the specific "Cannot read properties of undefined (reading '0')" error
 * that occurs in routes.js line 117: return finalResponse.json()
 */

console.log('🔍 Debugging finalResponse.json() Error');
console.log('=====================================\n');

// Simulate the K2CC transformer's response creation
function simulateK2CCResponse() {
    console.log('🎭 Simulating K2CC transformer response creation...');
    
    // This is what K2CC creates
    const anthropicResponse = {
        id: `msg_${Date.now()}`,
        type: 'message',
        role: 'assistant',
        model: 'claude-sonnet-4-20250514',
        content: [
            {
                type: 'text',
                text: 'Hello! How are you doing today?'
            }
        ],
        stop_reason: 'end_turn',
        stop_sequence: null,
        usage: {
            input_tokens: 10,
            output_tokens: 7
        }
    };
    
    // Create Response like K2CC does
    const responseJson = JSON.stringify(anthropicResponse);
    const finalResponse = new Response(responseJson, {
        status: 200,
        headers: {
            'Content-Type': 'application/json',
        },
    });
    
    // Override json() method like K2CC does
    finalResponse.json = async () => {
        console.log('🔧 Custom json() method called');
        console.log('🔧 anthropicResponse type:', typeof anthropicResponse);
        console.log('🔧 anthropicResponse:', JSON.stringify(anthropicResponse, null, 2));
        
        if (!anthropicResponse || typeof anthropicResponse !== 'object') {
            console.error('❌ Invalid anthropicResponse object');
            throw new Error('Invalid response object');
        }
        
        return anthropicResponse; // This is where the issue might be
    };
    
    return finalResponse;
}

async function testJsonMethod() {
    console.log('🧪 Testing finalResponse.json() method...');
    
    try {
        const finalResponse = simulateK2CCResponse();
        
        console.log('✅ finalResponse created successfully');
        console.log('✅ finalResponse.json is a function:', typeof finalResponse.json === 'function');
        
        // This is the call that happens in routes.js line 117
        console.log('\n📍 Calling finalResponse.json() (routes.js line 117 equivalent)...');
        const result = await finalResponse.json();
        
        console.log('✅ finalResponse.json() returned successfully');
        console.log('🔍 Result type:', typeof result);
        console.log('🔍 Result is array:', Array.isArray(result));
        console.log('🔍 Result keys:', Object.keys(result || {}));
        
        // Check if result has the expected structure
        if (result && result.content && Array.isArray(result.content)) {
            console.log('✅ Result has content array');
            console.log('🔍 Content array length:', result.content.length);
            
            if (result.content.length > 0) {
                console.log('✅ Content[0] exists:', !!result.content[0]);
                console.log('🔍 Content[0]:', JSON.stringify(result.content[0], null, 2));
            } else {
                console.log('⚠️ Content array is empty');
            }
        } else {
            console.log('❌ Result missing content array');
        }
        
        // Try to access properties that might cause the [0] error
        console.log('\n🔍 Testing potential [0] access patterns...');
        
        // These might be where the error occurs internally
        try {
            if (result.content) {
                console.log('✅ result.content exists');
                console.log('✅ result.content[0]:', result.content[0] ? 'exists' : 'undefined');
                
                if (result.content[0]) {
                    console.log('✅ result.content[0].text:', result.content[0].text || 'undefined');
                }
            }
        } catch (accessError) {
            console.error('❌ Error accessing result.content[0]:', accessError.message);
        }
        
        return result;
        
    } catch (error) {
        console.error('❌ Error calling finalResponse.json():', error.message);
        console.error('❌ Error stack:', error.stack);
        
        // Check if this is the specific error we're looking for
        if (error.message.includes("Cannot read properties of undefined (reading '0')")) {
            console.log('🎯 Found the exact error we are debugging!');
        }
        
        throw error;
    }
}

async function testWithMalformedResponse() {
    console.log('\n🧪 Testing with potentially malformed responses...');
    
    // Test case 1: undefined anthropicResponse
    try {
        console.log('\n📍 Test 1: undefined anthropicResponse');
        const badResponse = new Response('{}', {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });
        
        badResponse.json = async () => {
            return undefined; // This could cause the error
        };
        
        const result1 = await badResponse.json();
        console.log('Result1:', result1);
        
        // Try to access [0] on undefined
        console.log('Trying result1.content[0]...');
        console.log(result1.content[0]); // This would cause the error
        
    } catch (error) {
        console.log('❌ Caught error in test 1:', error.message);
        if (error.message.includes("Cannot read properties of undefined (reading '0')")) {
            console.log('🎯 This is the error! undefined.content[0] access');
        }
    }
    
    // Test case 2: response with undefined content
    try {
        console.log('\n📍 Test 2: response with undefined content');
        const badResponse2 = new Response('{}', {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });
        
        badResponse2.json = async () => {
            return { content: undefined }; // content is undefined
        };
        
        const result2 = await badResponse2.json();
        console.log('Result2:', result2);
        
        // Try to access [0] on undefined content
        console.log('Trying result2.content[0]...');
        console.log(result2.content[0]); // This would cause the error
        
    } catch (error) {
        console.log('❌ Caught error in test 2:', error.message);
        if (error.message.includes("Cannot read properties of undefined (reading '0')")) {
            console.log('🎯 This is the error! undefined content array access');
        }
    }
}

async function main() {
    try {
        console.log('🚀 Starting debug analysis...\n');
        
        // Test normal case
        await testJsonMethod();
        
        // Test problematic cases
        await testWithMalformedResponse();
        
        console.log('\n✅ Debug analysis completed');
        
    } catch (error) {
        console.error('\n❌ Main error:', error.message);
        
        // Final analysis
        console.log('\n📊 Error Analysis Summary:');
        console.log('- The error "Cannot read properties of undefined (reading \'0\')" occurs when:');
        console.log('  1. finalResponse.json() returns undefined/null');
        console.log('  2. The result has undefined content property');
        console.log('  3. Something tries to access result.content[0] when content is undefined');
        console.log('- This suggests @musistudio/llms or K2CC is trying to access array[0] after json() call');
        
        process.exit(1);
    }
}

// Run the debug analysis
main();