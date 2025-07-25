
const http = require('http');

console.log('🧪 Test Step 1: Proxy Reception');
console.log('================================');
console.log('Verifying the proxy server can receive a request for the k2cc model.');

const postData = JSON.stringify({
  model: "claude-sonnet-4-20250514", // This model is routed to k2cc in config
  messages: [{ role: 'user', content: 'Hello, this is a test.' }],
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

const req = http.request(options, (res) => {
  console.log(`STATUS: ${res.statusCode}`);
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  res.on('end', () => {
    console.log('✅ Test Passed: Proxy server received the request and responded.');
    console.log('Response body snippet:', data.substring(0, 200));
    // We expect an error or a response, either is fine for this test.
    // The goal is just to confirm the server is listening and receiving.
    process.exit(0);
  });
});

req.on('error', (e) => {
  console.error(`❌ Test Failed: Could not connect to the proxy server.`);
  console.error(e.message);
  console.error('Please ensure the main application is running with ./start-dev.sh');
  process.exit(1);
});

req.write(postData);
req.end();
