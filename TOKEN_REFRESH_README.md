# Token自动刷新功能

## 概述

Claude Code Router Enhanced现在支持自动token刷新功能，确保每次使用前都有最新的有效token。

## 功能特性

### 🔄 自动刷新机制
- **启动时刷新**: 服务启动时立即刷新所有token
- **请求前检查**: 每次API请求前检查token有效性
- **定期刷新**: 每30分钟自动刷新token（可配置）
- **过期前刷新**: token过期前5分钟自动刷新（可配置）

### 🛡️ 错误处理
- **重试机制**: 刷新失败时自动重试（默认3次）
- **优雅降级**: 刷新失败时使用现有token继续服务
- **健康检查**: 实时监控token健康状态

### ⚙️ 配置选项
- **灵活配置**: 通过环境变量自定义所有刷新参数
- **多种间隔**: 支持不同的检查和刷新间隔设置
- **自定义端点**: 可配置token刷新API端点

## 使用方法

### 基本命令

```bash
# 启动服务（自动初始化token）
ccr start

# 手动刷新token
ccr token refresh

# 查看token状态
ccr token status

# 重置token检查
ccr token reset
```

### 环境变量配置

创建 `.env` 文件并配置以下变量：

```bash
# Token文件路径
TOKEN_PATH=~/.aws/sso/cache/kiro-auth-token.json

# 刷新API端点
TOKEN_REFRESH_ENDPOINT=https://api.kiro.ai/auth/refresh

# 过期缓冲时间（5分钟）
TOKEN_EXPIRATION_BUFFER_MS=300000

# 强制刷新间隔（30分钟）
TOKEN_FORCE_REFRESH_INTERVAL_MS=1800000

# 定期刷新间隔（30分钟）
TOKEN_PERIODIC_REFRESH_INTERVAL_MS=1800000

# 刷新检查间隔（5分钟）
TOKEN_REFRESH_CHECK_INTERVAL_MS=300000

# 重试配置
TOKEN_MAX_RETRY_ATTEMPTS=3
TOKEN_RETRY_DELAY_MS=1000
```

## 工作流程

### 1. 服务启动
```
🚀 启动服务
├── 🔄 加载现有token
├── 🔄 立即刷新token
├── ⏰ 设置定期刷新
└── ✅ 服务就绪
```

### 2. 请求处理
```
📨 收到API请求
├── 🔍 检查token有效性
├── 🔄 必要时刷新token
├── 🎯 选择最佳token
└── 📤 发送请求
```

### 3. 定期维护
```
⏰ 定期检查（每30分钟）
├── 🔍 检查所有token状态
├── 🔄 刷新即将过期的token
└── 📊 更新健康状态
```

## Token状态监控

### 查看token状态
```bash
ccr token status
```

输出示例：
```json
{
  "status": "available",
  "tokenId": "kiro-token",
  "healthy": true,
  "activeRequests": 0,
  "expiresAt": "2025-01-25T15:30:00.000Z",
  "lastRefreshed": "2025-01-25T14:00:00.000Z"
}
```

### 状态说明
- `available`: token可用
- `no_token`: 没有可用token
- `error`: token系统错误
- `healthy`: token健康状态
- `activeRequests`: 当前活跃请求数
- `expiresAt`: token过期时间
- `lastRefreshed`: 上次刷新时间

## 故障排除

### 常见问题

1. **Token文件不存在**
   ```
   ⚠️ Token file not found at ~/.aws/sso/cache/kiro-auth-token.json
   ⚠️ Please run kiro2cc first to authenticate
   ```
   解决方案：运行 `kiro2cc` 进行身份验证

2. **刷新端点无响应**
   ```
   ❌ Failed to refresh token: HTTP 500: Internal Server Error
   ```
   解决方案：检查 `TOKEN_REFRESH_ENDPOINT` 配置

3. **Token格式错误**
   ```
   ❌ Invalid token format - missing accessToken or refreshToken
   ```
   解决方案：重新运行 `kiro2cc` 获取新token

### 调试模式

启用详细日志：
```bash
ccr start --dev
```

## 最佳实践

1. **定期监控**: 使用 `ccr token status` 定期检查token状态
2. **合理配置**: 根据使用频率调整刷新间隔
3. **备份token**: 定期备份token文件
4. **监控日志**: 关注token刷新相关的日志信息
5. **测试刷新**: 定期使用 `ccr token refresh` 测试刷新功能

## 安全注意事项

- Token文件包含敏感信息，请妥善保管
- 不要在公共环境中暴露token文件路径
- 定期更换refresh token
- 监控异常的token使用模式