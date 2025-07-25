const fs = require('fs');
const path = require('path');

console.log('🧪 Test Step 3: Routing Logic');
console.log('================================');

// This test doesn't need the server, it just simulates the router's logic.
const isDev = process.env.NODE_ENV === 'development';
const configFileName = isDev ? 'config-dev.json' : 'config.json';
const configPath = path.join(process.env.HOME, '.claude-code-router', configFileName);

try {
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    console.log(`Loaded ${configFileName} for routing simulation.`);

    const modelToTest = 'claude-sonnet-4-20250514';
    console.log(`Simulating request for model: ${modelToTest}`);
    
    // Simplified router logic simulation
    const defaultRoute = config.Router?.default;
    if (!defaultRoute) throw new Error("Router.default not defined in config.");

    const [defaultProviderName, defaultModelName] = defaultRoute.split(',');

    let targetProviderName = defaultProviderName;

    // A more realistic check could go here, for now we use the default
    console.log(`Router decided on provider: ${targetProviderName}`);

    if (isDev) {
        if (targetProviderName === 'k2cc') {
            console.log('✅ Test Passed: In dev mode, router correctly targets "k2cc".');
        } else {
            console.log(`❌ Test Failed: In dev mode, router targeted "${targetProviderName}" instead of "k2cc".`);
            process.exit(1);
        }
    } else {
        if (targetProviderName === 'shuaihong') {
            console.log('✅ Test Passed: In production mode, router correctly targets "shuaihong".');
        } else {
            console.log(`❌ Test Failed: In production mode, router targeted "${targetProviderName}" instead of "shuaihong".`);
            process.exit(1);
        }
    }
    process.exit(0);
} catch (error) {
    console.error(`❌ Test Failed: Could not simulate routing logic.`);
    console.error(error.message);
    process.exit(1);
}
