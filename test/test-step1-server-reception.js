const http = require('http');

console.log('🧪 Test Step 1: Server Reception');
console.log('=================================');

const options = {
  hostname: 'localhost',
  port: process.env.NODE_ENV === 'development' ? 3457 : 3456,
  path: '/health',
  method: 'GET',
  timeout: 2000,
};

const req = http.request(options, (res) => {
  console.log(`STATUS: ${res.statusCode}`);
  if (res.statusCode === 200 || res.statusCode === 404) {
    console.log('✅ Test Passed: Server is running and responding.');
    process.exit(0);
  } else {
    console.log(`❌ Test Failed: Server returned status ${res.statusCode}`);
    process.exit(1);
  }
});

req.on('error', (e) => {
  console.error(`❌ Test Failed: Could not connect to server.`);
  console.error(e.message);
  process.exit(1);
});

req.end();
