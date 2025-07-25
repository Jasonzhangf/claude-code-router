#!/bin/bash

# 生产环境API测试脚本
# 测试ccr code使用的3456端口

echo "🧪 测试生产环境API (端口3456)"
echo "============================="

# 检查服务器状态
echo "1️⃣ 检查服务器状态..."
SERVER_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3456/health 2>/dev/null || echo "connection_failed")

if [ "$SERVER_STATUS" = "200" ]; then
    echo "✅ 服务器运行正常"
elif [ "$SERVER_STATUS" = "connection_failed" ]; then
    echo "❌ 无法连接到服务器 (端口3456)"
    echo "请确保运行了: ccr start"
    exit 1
else
    echo "⚠️  服务器状态: $SERVER_STATUS"
fi

echo ""
echo "2️⃣ 发送测试请求..."

# 发送测试请求
RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}\nTIME:%{time_total}" \
  -X POST http://localhost:3456/v1/messages \
  -H "Content-Type: application/json" \
  -H "anthropic-version: 2023-06-01" \
  -d '{
    "model": "claude-sonnet-4-20250514",
    "max_tokens": 50,
    "messages": [
      {
        "role": "user",
        "content": "Hello, this is a production test"
      }
    ]
  }')

# 解析响应
HTTP_STATUS=$(echo "$RESPONSE" | grep "HTTP_STATUS:" | cut -d: -f2)
TIME_TOTAL=$(echo "$RESPONSE" | grep "TIME:" | cut -d: -f2)
RESPONSE_BODY=$(echo "$RESPONSE" | sed '/HTTP_STATUS:/,$d')

echo "📥 响应状态: $HTTP_STATUS"
echo "⏱️  响应时间: ${TIME_TOTAL}s"
echo ""

if [ "$HTTP_STATUS" = "200" ]; then
    echo "✅ 请求成功!"
    echo "📋 响应内容:"
    echo "$RESPONSE_BODY" | jq '.' 2>/dev/null || echo "$RESPONSE_BODY"
    
    # 验证响应格式
    if echo "$RESPONSE_BODY" | grep -q '"type":"message"' && echo "$RESPONSE_BODY" | grep -q '"content"'; then
        echo ""
        echo "✅ Anthropic格式验证通过"
        
        # 提取响应内容
        CONTENT=$(echo "$RESPONSE_BODY" | jq -r '.content[0].text' 2>/dev/null)
        if [ "$CONTENT" != "null" ] && [ -n "$CONTENT" ]; then
            echo "📝 AI响应: \"$CONTENT\""
            echo ""
            echo "🎉 生产环境测试完全成功!"
        else
            echo "⚠️  内容提取失败"
        fi
    else
        echo "❌ 响应格式验证失败"
    fi
    
elif [ "$HTTP_STATUS" = "404" ]; then
    echo "❌ 404错误 - API端点未找到"
    echo "📋 错误响应:"
    echo "$RESPONSE_BODY" | jq '.' 2>/dev/null || echo "$RESPONSE_BODY"
    
    # 检查是否是UnknownOperationException
    if echo "$RESPONSE_BODY" | grep -q "UnknownOperationException"; then
        echo ""
        echo "🔍 检测到UnknownOperationException错误"
        echo "这通常意味着CodeWhisperer API请求格式有问题"
        echo ""
        echo "💡 建议检查:"
        echo "  - API端点URL是否正确"
        echo "  - 请求头X-Amz-Target是否正确"
        echo "  - 请求体格式是否符合AWS格式"
    fi
    
else
    echo "❌ 请求失败 (状态码: $HTTP_STATUS)"
    echo "📋 错误响应:"
    echo "$RESPONSE_BODY" | jq '.' 2>/dev/null || echo "$RESPONSE_BODY"
fi

echo ""
echo "📄 完整服务器日志 (最后20行):"
echo "================================"

# 检查是否有日志文件
if [ -f "/tmp/ccr-prod.log" ]; then
    tail -n 20 /tmp/ccr-prod.log
elif command -v ccr >/dev/null 2>&1; then
    echo "使用ccr status查看状态..."
    ccr status
else
    echo "❌ 找不到日志文件，也无法运行ccr命令"
fi

echo ""
echo "🔚 测试完成"