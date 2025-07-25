const http = require('http');
const fs = require('fs');
const path = require('path');

console.log('🧪 Test Step 5: Non-Interference');
console.log('==================================');

const logFile = '/tmp/ccr-dev.log';
// This test runs against the production server config
if (process.env.NODE_ENV === 'development') {
    console.log('⚠️ This test must be run in production mode. Skipping.');
    process.exit(0);
}

// Clear log file before test
if (fs.existsSync(logFile)) {
    fs.truncateSync(logFile, 0);
}

const postData = JSON.stringify({
  model: 'qwen3-coder', // A model that should route to shuaihong
  messages: [{ role: 'user', content: 'test' }],
});

const options = {
  hostname: 'localhost',
  port: 3456, // Production port
  path: '/v1/messages',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'anthropic-version': '2023-06-01',
    'Content-Length': Buffer.byteLength(postData),
  },
};

const req = http.request(options, (res) => {
  res.on('data', () => {});
  res.on('end', () => {
    console.log(`Received response with status: ${res.statusCode}`);
    try {
      const logContent = fs.readFileSync(logFile, 'utf8');
      if (logContent.includes('K2CC')) {
        console.log('❌ Test Failed: K2CC transformer was called in production mode for a non-k2cc route.');
        process.exit(1);
      } else {
        console.log('✅ Test Passed: K2CC transformer was not called.');
        process.exit(0);
      }
    } catch (error) {
      console.error('❌ Test Failed: Could not read or parse log file.');
      console.error(error.message);
      process.exit(1);
    }
  });
});

req.on('error', (e) => {
  console.error(`❌ Test Failed: Request failed: ${e.message}`);
  process.exit(1);
});

req.write(postData);
req.end();
