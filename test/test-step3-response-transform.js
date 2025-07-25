
const assert = require('assert');
const path = require('path');
const fs = require('fs');
const { Readable } = require('stream');

console.log('🧪 Test Step 3: Response Transformation');
console.log('======================================');
console.log('Verifying transformResponseOut can parse a simulated binary stream.');

// Dynamically import the transformer to test the function directly
const transformerPath = path.resolve(__dirname, '../src/transformers/k2cc.ts');
// We have to use a little trick to import a .ts file in node
const tsNode = require('ts-node').register();
const { transformResponseOut } = require(transformerPath);

async function runTest() {
    // This is a simplified, captured binary payload from a real CodeWhisperer response
    const binaryPayload = `
[{"type":"message_part","bytes":"eyJjb250ZW50IjogIkhlbGxvIHRoZXJlISBIb3cgY2FuIEkgaGVscCB5b3UgdG9kYXk/IiwgInNuaXBwZXRzIjogW119"}]
`;
    // Create a mock response stream
    const mockRes = new Readable();
    mockRes.push(Buffer.from(binaryPayload));
    mockRes.push(null); // End the stream

    // Mock other required parameters
    const mockReq = {}; // Not used in this transformer
    const mockContext = {
        logger: {
            info: (msg) => console.log(`[INFO] ${msg}`),
            error: (msg) => console.error(`[ERROR] ${msg}`),
        },
        // Mimic the get/set functionality for context passing
        _store: {},
        set: function(key, value) { this._store[key] = value; },
        get: function(key) { return this._store[key]; }
    };

    try {
        const transformedStream = await transformResponseOut(mockReq, mockRes, mockContext);

        let result = '';
        for await (const chunk of transformedStream) {
            result += chunk.toString();
        }

        console.log('--- Transformed Output ---');
        console.log(result);
        console.log('--- End Transformed Output ---');

        assert(result.includes('data:'), 'Transformed output should be in SSE format.');
        const jsonPart = result.substring(result.indexOf('{'));
        const parsed = JSON.parse(jsonPart);
        assert.strictEqual(parsed.type, 'content_block_delta', 'Incorrect event type');
        assert.strictEqual(parsed.delta.text, 'Hello there! How can I help you today?', 'Content was not extracted correctly.');

        console.log('✅ Test Passed: transformResponseOut correctly processed the binary stream.');
        process.exit(0);

    } catch (e) {
        console.error(`❌ Test Failed: ${e.message}`);
        console.error(e.stack);
        process.exit(1);
    }
}

runTest();
