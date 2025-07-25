const http = require('http');
const fs = require('fs');
const path = require('path');

console.log('🧪 Test Step 4: Transformer Invocation');
console.log('=======================================');

const logFile = '/tmp/ccr-dev.log';
// Clear log file before test
if (fs.existsSync(logFile)) {
    fs.truncateSync(logFile, 0);
}

const postData = JSON.stringify({
  model: 'claude-sonnet-4-20250514',
  messages: [{ role: 'user', content: 'test' }],
});

const options = {
  hostname: 'localhost',
  port: 3457, // Always test against dev server
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
      const requestInCalled = logContent.includes('K2CC TRANSFORM REQUEST IN CALLED');
      const responseOutCalled = logContent.includes('K2CC TRANSFORM RESPONSE OUT CALLED');

      if (requestInCalled && responseOutCalled) {
        console.log('✅ Test Passed: Transformer In and Out methods were called.');
        process.exit(0);
      } else {
        console.log('❌ Test Failed: Transformer methods not found in log.');
        if (!requestInCalled) console.log('   - REQUEST IN was NOT called.');
        if (!responseOutCalled) console.log('   - RESPONSE OUT was NOT called.');
        process.exit(1);
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
