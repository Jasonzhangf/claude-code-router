#!/usr/bin/env node

// 测试脚本1：检查本地Claude Code消息是否到达本地代理服务器
// 测试参数是否正确

const http = require('http');

console.log('🔍 测试1：Claude Code消息到达本地代理服务器');
console.log('监听端口3456，查看收到的请求...\n');

const server = http.createServer((req, res) => {
  let body = '';
  
  req.on('data', chunk => {
    body += chunk.toString();
  });
  
  req.on('end', () => {
    console.log('📥 收到请求：');
    console.log(`方法: ${req.method}`);
    console.log(`URL: ${req.url}`);
    console.log(`Headers:`, JSON.stringify(req.headers, null, 2));
    console.log(`Body:`, body);
    console.log('\n' + '='.repeat(50) + '\n');
    
    // 返回简单响应
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      message: "Test server received your request",
      timestamp: new Date().toISOString()
    }));
  });
});

server.listen(3456, () => {
  console.log('🚀 测试服务器启动在 http://localhost:3456');
  console.log('现在可以运行Claude Code命令来测试...');
  console.log('例如: echo "Hello" | claude --model claude-sonnet-4-20250514');
});

process.on('SIGINT', () => {
  console.log('\n👋 测试服务器关闭');
  process.exit(0);
});