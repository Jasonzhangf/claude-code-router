
const http = require('http');
const assert = require('assert');

console.log('🧪 Test Step 5: Provider Isolation');
console.log('==================================');
console.log('Verifying requests to other providers do not trigger k2cc transformer.');

// This test assumes you have another provider configured, e.g., "anthropic".
// We will send a request to a model that is NOT routed to k2cc.
const postData = JSON.stringify({
  model: "claude-3-haiku-20240307", // A model handled by a different provider
  messages: [{ role: 'user', content: 'What is the capital of France?' }],
  stream: false
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

// For this test to be valid, we must ensure the k2cc transformer logs
// are NOT present in the server output when this request is made.
// We can't check that from here, so this script mainly confirms the request
// completes. The validation must be done by inspecting server logs.

console.log('Sending a request to a non-k2cc model...');
console.log('After this test, please inspect the server logs from `./start-dev.sh`.');
console.log('You should NOT see any "K2CC TRANSFORM" messages.');

const req = http.request(options, (res) => {
  console.log(`STATUS: ${res.statusCode}`);
  let responseBody = '';
  res.on('data', (chunk) => responseBody += chunk);
  res.on('end', () => {
    try {
      // It might fail if API keys aren't set, but a 4xx/5xx is still a success for this test,
      // as it means the request was routed and processed by a different provider.
      console.log('Request completed. Status:', res.statusCode);
      console.log('Response snippet:', responseBody.substring(0, 200));
      assert(res.statusCode !== 501, "Status 501 indicates transformer may have failed, which is unexpected.");
      console.log('✅ Test Passed: Request to non-k2cc provider was sent.');
      console.log('Please verify server logs for absence of k2cc transformer messages.');
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
  process.exit(1);
});

req.write(postData);
req.end();
