#!/usr/bin/env node

/**
 * Debug script for analyzing the "Cannot read properties of undefined (reading '0')" error
 * in @musistudio/llms routes.js line 117: return finalResponse.json()
 */

const path = require('path');
const fs = require('fs');

console.log('🔍 Analyzing @musistudio/llms Response.json() Error');
console.log('===============================================\n');

// 1. Check the routes.js implementation
const routesPath = path.join(__dirname, 'node_modules/@musistudio/llms/dist/api/routes.js');
if (fs.existsSync(routesPath)) {
    console.log('✅ Found routes.js at:', routesPath);
    
    // Read the specific problematic line
    const routesContent = fs.readFileSync(routesPath, 'utf8');
    const lines = routesContent.split('\n');
    
    console.log('\n📍 Problematic code around line 117:');
    for (let i = 110; i < 125; i++) {
        if (lines[i]) {
            const lineNum = i + 1;
            const marker = lineNum === 117 ? '❌' : '  ';
            console.log(`${marker} ${lineNum}: ${lines[i]}`);
        }
    }
    
    console.log('\n🔍 Analysis of the error:');
    console.log('Line 117: return finalResponse.json();');
    console.log('- This calls .json() method on finalResponse');
    console.log('- If finalResponse is undefined or malformed, this will fail');
    console.log('- The error suggests accessing [0] on undefined, which might happen inside .json() parsing');
    
} else {
    console.log('❌ routes.js not found at expected location');
}

// 2. Analyze the transformer pipeline
console.log('\n🔄 Transformer Pipeline Analysis:');
console.log('Line 80-89: finalResponse goes through transformResponseOut');
console.log('Line 103-105: finalResponse goes through transformResponseIn');
console.log('Line 117: finalResponse.json() is called');

console.log('\n💡 Potential Issues:');
console.log('1. transformResponseOut might return undefined/null');
console.log('2. transformResponseIn might return undefined/null'); 
console.log('3. finalResponse.json() might be parsing malformed JSON');
console.log('4. The JSON parsing might try to access array[0] on undefined');

// 3. Check our K2CC transformer
const k2ccPath = path.join(__dirname, 'src/transformers/k2cc.ts');
if (fs.existsSync(k2ccPath)) {
    console.log('\n🔍 Checking K2CC Transformer:');
    const k2ccContent = fs.readFileSync(k2ccPath, 'utf8');
    
    // Look for transformResponseOut implementation
    const responseOutMatch = k2ccContent.match(/transformResponseOut[\s\S]*?(?=async|\}|\n\s*[a-zA-Z])/);
    if (responseOutMatch) {
        console.log('✅ Found transformResponseOut implementation');
        console.log('Preview:', responseOutMatch[0].substring(0, 200) + '...');
    }
    
    // Check what it returns
    if (k2ccContent.includes('return ')) {
        console.log('✅ K2CC transformer has return statements');
        const returns = k2ccContent.match(/return [^;]+;/g);
        if (returns) {
            console.log('Return statements found:', returns.length);
            returns.forEach((ret, i) => {
                console.log(`  ${i+1}. ${ret}`);
            });
        }
    }
} else {
    console.log('❌ K2CC transformer not found');
}

// 4. Suggest debugging approach
console.log('\n🛠️  Debugging Recommendations:');
console.log('1. Add logging before line 117 in routes.js to check finalResponse state');
console.log('2. Verify transformResponseOut returns a proper Response object');
console.log('3. Check if finalResponse.json() method exists and works');
console.log('4. Add try-catch around finalResponse.json() call');

console.log('\n🎯 Most Likely Cause:');
console.log('The K2CC transformResponseOut is returning a custom response object');
console.log('that doesnt have a proper .json() method implementation, or the');
console.log('.json() method is trying to parse data that contains undefined values.');

console.log('\n📝 Next Steps:');
console.log('1. Check what transformResponseOut actually returns');
console.log('2. Ensure it has a working .json() method');
console.log('3. Test the .json() method directly');