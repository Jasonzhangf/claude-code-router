#!/bin/bash

# Claude Code Router Enhanced - Development Server Script
# 开发环境启动脚本

set -e

echo "🔄 Claude Code Router Enhanced - Development Mode"
echo "================================================"

# 1. 检查是否需要构建
if [ ! -f "dist/cli.js" ] || [ "src" -nt "dist/cli.js" ]; then
  echo "🔨 Source files changed, rebuilding..."
  ./build.sh
fi

# 2. 停止现有服务
echo "⏹️ Stopping existing service..."
node dist/cli.js stop --dev 2>/dev/null || echo "   No existing service found"

# 3. 启动开发服务器
echo "🚀 Starting development server..."
echo "📋 Logs will be saved to: /tmp/ccr-dev.log"
echo ""

# 启动服务并保存日志
NODE_ENV=development node dist/cli.js start --dev > /tmp/ccr-dev.log 2>&1 &
SERVER_PID=$!

# 等待服务启动
sleep 3

# 检查服务状态
if node dist/cli.js status > /dev/null 2>&1; then
  echo "✅ Development server started successfully"
  echo "🌐 API Endpoint: http://127.0.0.1:3457"
  echo "📄 Live logs: tail -f /tmp/ccr-dev.log"
  echo ""
  echo "🧪 Quick test:"
  echo '   curl -X POST http://localhost:3457/v1/messages '
  echo '     -H "Content-Type: application/json" '
  echo '     -H "anthropic-version: 2023-06-01" '
  echo '     -d '"'"'{"model": "claude-sonnet-4-20250514", "max_tokens": 20, "messages": [{"role": "user", "content": "Hello"}]}'"'"
else
  echo "❌ Failed to start development server"
  echo "📄 Check logs: cat /tmp/ccr-dev.log"
  exit 1
fi
