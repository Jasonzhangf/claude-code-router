
const http = require('http');
const assert = require('assert');

console.log('🧪 Test Step 4: End-to-End k2cc Flow');
console.log('====================================');
console.log('Verifying the full request/response cycle through the k2cc transformer.');

const postData = JSON.stringify({
  model: "claude-sonnet-4-20250514", // Routed to k2cc
  messages: [{ role: 'user', content: 'Tell me a short story.' }],
  stream: true // E2E test should use streaming
});

const options = {
  hostname: 'localhost',
  port: 3456,
  path: '/v1/messages',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(postData)
  }
};

const req = http.request(options, (res) => {
  console.log(`STATUS: ${res.statusCode}`);
  assert.strictEqual(res.statusCode, 200, 'Expected status code 200');
  
  let responseBody = '';
  res.on('data', (chunk) => {
    responseBody += chunk.toString();
    console.log('Received chunk:', chunk.toString());
  });

  res.on('end', () => {
    console.log('\n--- Full Response Body ---');
    console.log(responseBody);
    console.log('--- End Full Response Body ---');

    try {
        assert(responseBody.length > 0, 'Response body should not be empty.');
        // Check for standard SSE format
        assert(responseBody.includes('data:'), 'Response should be in SSE format.');
        // Check for a stop message, indicating the stream completed properly
        assert(responseBody.includes('"type":"message_stop"'), 'Stream did not include a message_stop event.');
        // Check for content, assuming the mock or real service returns something
        assert(responseBody.includes('"type":"content_block_delta"'), 'No content was received.');
        
        console.log('✅ Test Passed: End-to-end flow for k2cc completed successfully.');
        process.exit(0);

    } catch (e) {
        console.error(`❌ Test Failed: ${e.message}`);
        process.exit(1);
    }
  });
});

req.on('error', (e) => {
  console.error(`❌ Test Failed: Could not connect to the server.`);
  console.error(e.message);
  console.error('Please ensure the main application is running with ./start-dev.sh');
  process.exit(1);
});

req.write(postData);
req.end();
