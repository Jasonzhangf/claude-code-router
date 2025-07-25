#!/bin/bash

# Token刷新功能测试脚本

echo "🧪 Claude Code Router Enhanced - Token Refresh Test"
echo "=================================================="

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 测试函数
test_command() {
    local cmd="$1"
    local description="$2"
    
    echo -e "\n${BLUE}🔍 Testing: $description${NC}"
    echo "Command: $cmd"
    
    if eval "$cmd"; then
        echo -e "${GREEN}✅ PASSED: $description${NC}"
        return 0
    else
        echo -e "${RED}❌ FAILED: $description${NC}"
        return 1
    fi
}

# 检查服务状态
echo -e "\n${YELLOW}📊 Checking service status...${NC}"
test_command "ccr status" "Service status check"

# 测试token状态
echo -e "\n${YELLOW}🔑 Testing token management...${NC}"
test_command "ccr token status" "Token status check"

# 测试token刷新
echo -e "\n${YELLOW}🔄 Testing token refresh...${NC}"
test_command "ccr token refresh" "Manual token refresh"

# 再次检查token状态
echo -e "\n${YELLOW}🔍 Verifying token after refresh...${NC}"
test_command "ccr token status" "Token status after refresh"

# 测试token重置
echo -e "\n${YELLOW}🔄 Testing token reset...${NC}"
test_command "ccr token reset" "Token refresh check reset"

# 测试服务重启（如果服务正在运行）
if ccr status | grep -q "running"; then
    echo -e "\n${YELLOW}🔄 Testing service restart...${NC}"
    test_command "ccr stop" "Service stop"
    sleep 2
    test_command "ccr start --dev" "Service start with dev mode"
    sleep 5
    test_command "ccr status" "Service status after restart"
fi

# 测试代码命令（如果服务正在运行）
if ccr status | grep -q "running"; then
    echo -e "\n${YELLOW}💻 Testing code command with token refresh...${NC}"
    test_command 'ccr code "console.log(\"Hello from CCR with token refresh!\")"' "Code execution with token refresh"
fi

echo -e "\n${BLUE}📋 Test Summary${NC}"
echo "==============="
echo "Token refresh functionality test completed."
echo "Check the output above for any failures."

# 显示当前token配置
echo -e "\n${YELLOW}⚙️ Current Token Configuration:${NC}"
echo "TOKEN_PATH: ${TOKEN_PATH:-~/.aws/sso/cache/kiro-auth-token.json}"
echo "TOKEN_REFRESH_ENDPOINT: ${TOKEN_REFRESH_ENDPOINT:-https://api.kiro.ai/auth/refresh}"
echo "TOKEN_EXPIRATION_BUFFER_MS: ${TOKEN_EXPIRATION_BUFFER_MS:-300000}"
echo "TOKEN_FORCE_REFRESH_INTERVAL_MS: ${TOKEN_FORCE_REFRESH_INTERVAL_MS:-1800000}"
echo "TOKEN_PERIODIC_REFRESH_INTERVAL_MS: ${TOKEN_PERIODIC_REFRESH_INTERVAL_MS:-1800000}"
echo "TOKEN_REFRESH_CHECK_INTERVAL_MS: ${TOKEN_REFRESH_CHECK_INTERVAL_MS:-300000}"
echo "TOKEN_MAX_RETRY_ATTEMPTS: ${TOKEN_MAX_RETRY_ATTEMPTS:-3}"
echo "TOKEN_RETRY_DELAY_MS: ${TOKEN_RETRY_DELAY_MS:-1000}"

echo -e "\n${GREEN}🎉 Token refresh test completed!${NC}"