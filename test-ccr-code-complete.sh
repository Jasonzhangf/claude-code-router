#!/bin/bash

# CCR Code 完整功能测试脚本

echo "🧪 Claude Code Router Enhanced - Complete CCR Code Test"
echo "======================================================="

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# 测试计数器
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# 测试函数
test_command() {
    local cmd="$1"
    local description="$2"
    local expected_pattern="$3"
    
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    
    echo -e "\n${BLUE}🔍 Test $TOTAL_TESTS: $description${NC}"
    echo "Command: $cmd"
    
    # 执行命令并捕获输出
    local output
    local exit_code
    
    output=$(eval "$cmd" 2>&1)
    exit_code=$?
    
    echo "Output:"
    echo "$output"
    
    # 检查退出码和输出模式
    if [ $exit_code -eq 0 ]; then
        if [ -n "$expected_pattern" ]; then
            if echo "$output" | grep -q "$expected_pattern"; then
                echo -e "${GREEN}✅ PASSED: $description${NC}"
                PASSED_TESTS=$((PASSED_TESTS + 1))
                return 0
            else
                echo -e "${RED}❌ FAILED: $description (pattern not found: $expected_pattern)${NC}"
                FAILED_TESTS=$((FAILED_TESTS + 1))
                return 1
            fi
        else
            echo -e "${GREEN}✅ PASSED: $description${NC}"
            PASSED_TESTS=$((PASSED_TESTS + 1))
            return 0
        fi
    else
        echo -e "${RED}❌ FAILED: $description (exit code: $exit_code)${NC}"
        FAILED_TESTS=$((FAILED_TESTS + 1))
        return 1
    fi
}

# 等待函数
wait_for_service() {
    local max_wait=30
    local count=0
    
    echo -e "${YELLOW}⏳ Waiting for service to be ready...${NC}"
    
    while [ $count -lt $max_wait ]; do
        if ccr status 2>/dev/null | grep -q "running"; then
            echo -e "${GREEN}✅ Service is ready${NC}"
            return 0
        fi
        sleep 1
        count=$((count + 1))
        echo -n "."
    done
    
    echo -e "${RED}❌ Service failed to start within ${max_wait} seconds${NC}"
    return 1
}

# 清理函数
cleanup() {
    echo -e "\n${YELLOW}🧹 Cleaning up...${NC}"
    ccr stop 2>/dev/null || true
    sleep 2
}

# 设置陷阱以确保清理
trap cleanup EXIT

echo -e "\n${PURPLE}📋 Pre-test Setup${NC}"
echo "=================="

# 停止现有服务
echo -e "${YELLOW}🛑 Stopping any existing service...${NC}"
ccr stop 2>/dev/null || true
sleep 2

# 检查依赖
echo -e "\n${YELLOW}🔍 Checking dependencies...${NC}"
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js is not installed${NC}"
    exit 1
fi

if ! command -v npm &> /dev/null; then
    echo -e "${RED}❌ npm is not installed${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Dependencies check passed${NC}"

# 构建项目
echo -e "\n${YELLOW}🔨 Building project...${NC}"
if npm run build; then
    echo -e "${GREEN}✅ Build successful${NC}"
else
    echo -e "${RED}❌ Build failed${NC}"
    exit 1
fi

# 安装到全局（如果需要）
echo -e "\n${YELLOW}📦 Installing locally...${NC}"
if ./install-local.sh; then
    echo -e "${GREEN}✅ Local installation successful${NC}"
else
    echo -e "${RED}❌ Local installation failed${NC}"
    exit 1
fi

echo -e "\n${PURPLE}🚀 Starting Tests${NC}"
echo "================="

# 测试1: 基本服务启动
test_command "ccr start --dev" "Service startup in dev mode" "running"
wait_for_service

# 测试2: 服务状态检查
test_command "ccr status" "Service status check" "running"

# 测试3: Token状态检查
test_command "ccr token status" "Token status check" "status"

# 测试4: Token手动刷新
test_command "ccr token refresh" "Manual token refresh" ""

# 测试5: 简单代码执行
test_command 'ccr code "console.log(\"Hello World\")"' "Simple code execution" ""

# 测试6: JavaScript代码执行
test_command 'ccr code "function add(a, b) { return a + b; } console.log(add(2, 3));"' "JavaScript function execution" ""

# 测试7: 带参数的代码执行
test_command 'ccr code --dev "const message = \"Hello from CCR Enhanced\"; console.log(message);"' "Code execution with dev flag" ""

# 测试8: 多行代码执行
test_command 'ccr code "
const numbers = [1, 2, 3, 4, 5];
const sum = numbers.reduce((acc, num) => acc + num, 0);
console.log(\"Sum:\", sum);
"' "Multi-line code execution" ""

# 测试9: 错误处理测试
test_command 'ccr code "console.log(undefinedVariable);"' "Error handling test" ""

# 测试10: 长代码执行
test_command 'ccr code "
class Calculator {
    constructor() {
        this.result = 0;
    }
    
    add(num) {
        this.result += num;
        return this;
    }
    
    multiply(num) {
        this.result *= num;
        return this;
    }
    
    getResult() {
        return this.result;
    }
}

const calc = new Calculator();
const result = calc.add(5).multiply(3).add(2).getResult();
console.log(\"Calculator result:\", result);
"' "Complex code execution" ""

# 测试11: 异步代码执行
test_command 'ccr code "
async function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
    console.log(\"Starting async operation...\");
    await delay(100);
    console.log(\"Async operation completed!\");
}

main();
"' "Async code execution" ""

# 测试12: 重启服务后的代码执行
echo -e "\n${YELLOW}🔄 Testing service restart...${NC}"
ccr stop
sleep 3
test_command "ccr start --dev" "Service restart" "running"
wait_for_service
test_command 'ccr code "console.log(\"After restart test\")"' "Code execution after restart" ""

# 测试13: 并发代码执行测试
echo -e "\n${YELLOW}🔄 Testing concurrent code execution...${NC}"
{
    ccr code "console.log('Concurrent test 1')" &
    ccr code "console.log('Concurrent test 2')" &
    ccr code "console.log('Concurrent test 3')" &
    wait
} 2>/dev/null
echo -e "${GREEN}✅ Concurrent execution test completed${NC}"

# 测试14: Token系统压力测试
echo -e "\n${YELLOW}🔄 Testing token system under load...${NC}"
for i in {1..5}; do
    ccr code "console.log('Load test iteration $i')" &
done
wait
echo -e "${GREEN}✅ Token load test completed${NC}"

# 测试15: 最终状态检查
test_command "ccr status" "Final service status check" "running"
test_command "ccr token status" "Final token status check" "status"

echo -e "\n${PURPLE}📊 Test Results Summary${NC}"
echo "======================="
echo -e "Total Tests: ${CYAN}$TOTAL_TESTS${NC}"
echo -e "Passed: ${GREEN}$PASSED_TESTS${NC}"
echo -e "Failed: ${RED}$FAILED_TESTS${NC}"

if [ $FAILED_TESTS -eq 0 ]; then
    echo -e "\n${GREEN}🎉 All tests passed! CCR Code is working perfectly!${NC}"
    exit 0
else
    echo -e "\n${RED}❌ Some tests failed. Please check the output above.${NC}"
    exit 1
fi