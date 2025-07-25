#!/bin/bash

# Claude Code Router Enhanced - Fix and Test Script
# 修复问题并完整测试的一体化脚本

set -e

echo "🔄 Claude Code Router Enhanced - Fix and Test"
echo "============================================="

echo "Step 1: Build project..."
./build.sh

echo ""
echo "Step 2: Start development server..."
./start-dev.sh

echo ""
echo "Step 3: Wait for service to be ready..."
# Wait for the service to be fully available by polling the health endpoint
ATTEMPTS=0
MAX_ATTEMPTS=15
SUCCESS=false
until [ $ATTEMPTS -ge $MAX_ATTEMPTS ]; do
  if curl -s -f -o /dev/null http://localhost:3457/health; then
    SUCCESS=true
    break
  fi
  echo "Waiting for service at http://localhost:3457/health... (Attempt $((ATTEMPTS+1))/${MAX_ATTEMPTS})"
  sleep 2
  ATTEMPTS=$((ATTEMPTS+1))
done

if [ "$SUCCESS" != "true" ]; then
  echo "❌ Service did not become available in time."
  exit 1
fi
echo "✅ Service is ready!"

echo ""
echo "Step 4: Run comprehensive tests..."
./test-all.sh

echo ""
echo "🎉 Fix and test completed!"
echo ""
echo "🚀 If all tests passed, you can install locally:"
echo "   ./install-local.sh"
echo ""
echo "📄 Monitor live logs:"
echo "   tail -f /tmp/ccr-dev.log"