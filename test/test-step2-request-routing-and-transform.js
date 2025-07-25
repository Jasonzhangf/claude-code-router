
const assert = require('assert');
const { spawn } = require('child_process');
const path = require('path');

console.log('🧪 Test Step 2: Request Routing and Transformation');
console.log('==================================================');
console.log('Verifying request is routed to k2cc and transformRequestIn is called.');

// We need to temporarily modify the transformer to signal it was called.
// This is a common pattern in testing to add instrumentation.
const transformerPath = path.resolve(__dirname, '../src/transformers/k2cc.ts');
const fs = require('fs');
const originalContent = fs.readFileSync(transformerPath, 'utf8');

try {
    // Add a log to transformRequestIn to prove it's called
    let modifiedContent = originalContent.replace(
        'export const transformRequestIn: CCROp<CodeWhispererRequest> = async (req, res, c) => {',
        'export const transformRequestIn: CCROp<CodeWhispererRequest> = async (req, res, c) => { console.log("TRANSFORMER_CALLED_SUCCESSFULLY");'
    );
    fs.writeFileSync(transformerPath, modifiedContent, 'utf8');

    // Run the main app, which will build and start the server
    const app = spawn('node', [path.resolve(__dirname, '../dist/cli.js'), 'start'], { stdio: 'pipe' });

    let output = '';
    app.stdout.on('data', (data) => output += data.toString());
    app.stderr.on('data', (data) => output += data.toString());

    // Give the server time to start
    setTimeout(() => {
        // Run the test script from step 1 to send a request
        const test = spawn('node', [path.resolve(__dirname, './test-step1-proxy-reception.js')]);
        test.on('close', () => {
            // Give a moment for logs to flush
            setTimeout(() => {
                app.kill('SIGINT');

                console.log('--- Server Output ---');
                console.log(output);
                console.log('--- End Server Output ---');

                try {
                    assert(output.includes('TRANSFORMER_CALLED_SUCCESSFULLY'), 'transformRequestIn was not called!');
                    console.log('✅ Test Passed: transformRequestIn was successfully called.');
                    process.exit(0);
                } catch (e) {
                    console.error(`❌ Test Failed: ${e.message}`);
                    process.exit(1);
                } finally {
                    // Clean up: restore original transformer file
                    fs.writeFileSync(transformerPath, originalContent, 'utf8');
                }
            }, 1000);
        });
    }, 5000); // Wait 5s for build and server start

} catch (e) {
    console.error('An error occurred during test setup:', e);
    // Clean up if something went wrong
    fs.writeFileSync(transformerPath, originalContent, 'utf8');
    process.exit(1);
}
