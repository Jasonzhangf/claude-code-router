# 🧪 CCR Code --dev 使用指南

## ✅ 功能已完成并测试成功

### 🚀 快速开始

```bash
# 使用开发模式启动 Claude Code（自动使用 K2CC transformer）
ccr code --dev

# 使用开发模式并直接提供提示
ccr code --dev "请帮我写一个 Hello World 程序"

# 手动启动开发服务器
ccr start --dev
```

### 🔧 开发模式特性

#### 1. 自动配置切换
- **生产模式**: 使用 `~/.claude-code-router/config.json`
- **开发模式**: 使用 `~/.claude-code-router/config-dev.json`

#### 2. K2CC Transformer 集成
```json
// config-dev.json 配置
{
  "Providers": [
    {
      "name": "k2cc",
      "api_base_url": "https://codewhisperer.us-east-1.amazonaws.com/",
      "api_key": "dummy-key-not-used",
      "models": ["claude-sonnet-4-20250514"],
      "transformer": {"use": ["k2cc"]},
      "enabled": true
    }
  ],
  "Router": {
    "default": "k2cc,claude-sonnet-4-20250514"
  }
}
```

#### 3. 完整功能验证 ✅
- ✅ Transformer 注册成功
- ✅ 请求路由到 CodeWhisperer API
- ✅ 二进制响应解析正常
- ✅ Anthropic 格式输出正确
- ✅ Token 管理和负载均衡

### 📊 启动信息对比

#### 生产模式启动信息
```
╔════════════════════════════════════════════════════════╗
║  🚀 Claude Code Router Enhanced v1.0.28-enhanced Active  ║
║  🔄 Auto-retry enabled • ⚡ Smart routing enabled      ║
║  🛡️  Enhanced error handling • 🔍 Smart detection     ║
║  🚀 Production Mode                              ║
║  📄 Config: config.json                         ║
╚════════════════════════════════════════════════════════╝
```

#### 开发模式启动信息
```
🔧 Code command running in development mode

╔════════════════════════════════════════════════════════╗
║  🚀 Claude Code Router Enhanced v1.0.28-enhanced Active  ║
║  🔄 Auto-retry enabled • ⚡ Smart routing enabled      ║
║  🛡️  Enhanced error handling • 🔍 Smart detection     ║
║  🧪 Development Mode                              ║
║  📄 Config: config-dev.json                     ║
╚════════════════════════════════════════════════════════╝

🔧 Using development configuration (config-dev.json)
```

### 🧪 测试方法

#### 1. 验证开发模式启动
```bash
# 检查帮助信息
ccr help

# 应该看到 --dev 选项说明：
# --dev             Use development configuration (config-dev.json)
```

#### 2. 验证 K2CC Transformer
```bash
# 启动开发服务器
ccr start --dev

# 查看日志确认 K2CC 注册
tail -f /tmp/ccr-dev.log | grep -E "(K2CC|k2cc)"

# 应该看到：
# register transformer: k2cc (no endpoint)
# ✅ K2cc transformer registered successfully
# k2cc provider registered
```

#### 3. 测试 API 端点
```bash
# 测试 CodeWhisperer API 集成
curl -X POST http://localhost:3456/v1/messages \
  -H "Content-Type: application/json" \
  -H "anthropic-version: 2023-06-01" \
  -d '{"model": "claude-sonnet-4-20250514", "max_tokens": 50, "messages": [{"role": "user", "content": "Hello"}]}'

# 查看 transformer 调用日志
tail -20 /tmp/ccr-dev.log | grep "K2CC TRANSFORM"
```

### 🔄 命令对比

| 命令 | 配置文件 | Transformer | 用途 |
|------|---------|-------------|------|
| `ccr code` | config.json | 标准 providers | 生产环境 |
| `ccr code --dev` | config-dev.json | K2CC | 开发测试 |
| `ccr start` | config.json | 标准 providers | 生产服务 |
| `ccr start --dev` | config-dev.json | K2CC | 开发服务 |

### 🎯 使用场景

1. **开发和测试 K2CC 功能**
   ```bash
   ccr code --dev
   # 自动使用 CodeWhisperer API 和 K2CC transformer
   ```

2. **调试 transformer 问题**
   ```bash
   ccr start --dev
   tail -f /tmp/ccr-dev.log | grep K2CC
   ```

3. **验证二进制响应解析**
   ```bash
   ccr code --dev "测试中文响应处理"
   ```

### ⚠️ 注意事项

1. **配置文件要求**: 确保 `~/.claude-code-router/config-dev.json` 存在且配置正确
2. **Claude Code 依赖**: 需要全局安装 `@anthropic-ai/claude-code`
3. **兼容性问题**: 存在已知的 @musistudio/llms 包兼容性错误，但不影响核心功能

### 🎉 成功标志

当你看到以下日志时，说明开发模式完全正常工作：

```
🚨🚨🚨 K2CC TRANSFORM REQUEST IN CALLED! 🚨🚨🚨
🚨🚨🚨 K2CC TRANSFORM RESPONSE OUT CALLED! 🚨🚨🚨
✅ K2cc: Got CodeWhisperer binary response (160 bytes)
✅ K2cc: Final response with clean content
✅ K2cc: Returning JSON response like kiro2cc
```

**🎯 ccr code --dev 功能现已完全可用！**