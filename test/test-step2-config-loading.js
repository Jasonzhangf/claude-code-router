const fs = require('fs');
const path = require('path');

console.log('🧪 Test Step 2: Config Loading');
console.log('=================================');

const isDev = process.env.NODE_ENV === 'development';
const expectedConfig = isDev ? 'config-dev.json' : 'config.json';
console.log(`Running in ${isDev ? 'development' : 'production'} mode. Expecting to load ${expectedConfig}.`);

const configFileName = isDev ? 'config-dev.json' : 'config.json';
const configPath = path.join(process.env.HOME, '.claude-code-router', configFileName);

try {
  const configRaw = fs.readFileSync(configPath, 'utf8');
  const config = JSON.parse(configRaw);
  console.log(`✅ Test Passed: Successfully loaded and parsed ${configFileName}.`);

  if(isDev) {
    const k2ccProvider = config.Providers?.find(p => p.name === 'k2cc');
    if (k2ccProvider) {
        console.log('✅ Test Passed: k2cc provider found in config-dev.json.');
    } else {
        console.log('❌ Test Failed: k2cc provider NOT found in config-dev.json.');
        process.exit(1);
    }
  } else {
    const shuaihongProvider = config.Providers?.find(p => p.name === 'shuaihong');
    if (shuaihongProvider) {
        console.log('✅ Test Passed: shuaihong provider found in config.json.');
    } else {
        console.log('❌ Test Failed: shuaihong provider NOT found in config.json.');
        process.exit(1);
    }
  }
  process.exit(0);
} catch (error) {
  console.error(`❌ Test Failed: Could not load or parse ${configPath}.`);
  console.error(error.message);
  process.exit(1);
}
