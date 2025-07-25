#!/bin/bash

# Claude Code Router Enhanced - Local Installation Script
# 本地安装测试脚本

set -e

echo "🔄 Claude Code Router Enhanced - Local Installation"
echo "=================================================="

# 1. 构建项目
echo "🔨 Building project..."
./build.sh

# 2. 卸载旧版本
echo "🗑️ Uninstalling previous version..."
npm uninstall -g @jasonzhangf/claude-code-router-enhanced 2>/dev/null || echo "   No previous version found"

# 3. 打包当前版本
echo "📦 Packaging current version..."
npm pack

# 4. 获取打包文件名
PACKAGE_FILE=$(ls -t *.tgz | head -n1)
if [ -z "$PACKAGE_FILE" ]; then
  echo "❌ Package file not found"
  exit 1
fi

echo "📄 Package created: $PACKAGE_FILE"

# 5. 全局安装
echo "🌐 Installing globally..."
npm install -g "$PACKAGE_FILE"

# 6. 验证安装
echo "✅ Verifying installation..."
if command -v ccr >/dev/null 2>&1; then
  echo "✅ ccr command available"
  ccr -v
else
  echo "❌ ccr command not found in PATH"
  exit 1
fi

echo ""
echo "🎉 Local installation completed successfully!"
echo ""
echo "🚀 Usage:"
echo "   ccr start    # Start the service"
echo "   ccr status   # Check service status"  
echo "   ccr stop     # Stop the service"
echo "   ccr code     # Use with Claude Code"
echo ""
echo "🧪 Test installation:"
echo "   ccr start && sleep 3 && ccr status"