#!/bin/bash
# CodeWhisperer API直接测试脚本
# 生成时间: 2025-07-25T12:54:52.051Z

TOKEN="aoaAAAAAGiDizYCfsJXrdi_5Lor6zdY_h5Rih1FuKbG598DPDt5aMdxdkUnko-4yGDS3zrpQ-sehH5jJ38Y0fG21UBkc0:MGUCMBkxa6gKoDouRTnch8HPfYweDWGocjiMkFH4STbc936dfQ65MtXaxMcriHSZzzxDuQIxAKFdMA60SmCapvLrytIgmJm6JUo7K3xlLYGzTcd3rVlUzoI3sD4qR90T2VqJAfvbSw"

curl -X POST "https://codewhisperer.us-east-1.amazonaws.com/generateAssistantResponse" \\
  -H "Content-Type: application/x-amz-json-1.1" \\
  -H "X-Amz-Target: CodeWhispererService.GenerateAssistantResponse" \\
  -H "Authorization: Bearer $TOKEN" \\
  -H "User-Agent: k2cc-transformer/1.0.0" \\
  -d '{
  "conversationState": {
    "chatTriggerType": "MANUAL",
    "conversationId": "test-uuid-123",
    "currentMessage": {
      "userInputMessage": {
        "content": "Hello, test message",
        "modelId": "CLAUDE_SONNET_4_20250514_V1_0",
        "origin": "AI_EDITOR",
        "userInputMessageContext": {
          "tools": [],
          "toolResults": []
        }
      }
    },
    "history": []
  },
  "profileArn": "arn:aws:codewhisperer:us-east-1:699475941385:profile/EHGA3GRVQMUK"
}' \\
  -v
