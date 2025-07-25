#!/bin/bash

# Claude Code Router Enhanced - Build Script
# 统一构建脚本

set -e

echo "🔄 Claude Code Router Enhanced - Build Process"
echo "============================================="

# 1. 清理旧的构建文件
echo "🧹 Cleaning previous build..."
rm -rf dist/
rm -f *.tgz

# 2. 运行构建
echo "🔨 Building TypeScript..."
npm run build

# 3. 验证构建结果
if [ ! -f "dist/cli.js" ]; then
  echo "❌ Build failed - dist/cli.js not found"
  exit 1
fi

echo "✅ Build completed successfully"
echo "📄 Build artifacts:"
ls -la dist/

echo ""
echo "🚀 Next steps:"
echo "   ./start-dev.sh      # Start development server"
echo "   ./install-local.sh  # Install locally for testing"
echo "   ./test-all.sh       # Run all tests"