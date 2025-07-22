# Claude Code Router Enhanced

> **Fork of [musistudio/claude-code-router](https://github.com/musistudio/claude-code-router)** with enhanced retry functionality for improved reliability.

## ✨ Enhanced Features

-   **Automatic Retry**: Added exponential backoff retry mechanism (max 3 attempts) for third-party API failures
-   **Simplified Error Messages**: Clean, user-friendly error responses without exposing detailed third-party errors
-   **All Original Features**: Maintains all functionality from the original project including model routing, multi-provider support, transformers, and dynamic model switching

## 🚀 Installation

### Prerequisites

```shell
npm install -g @anthropic-ai/claude-code
```

### Install Enhanced Version

```shell
npm install -g @jasonzhangf/claude-code-router-enhanced
```

### Usage

```shell
# Configure (copy and edit config.example.json to ~/.claude-code-router/config.json)
ccr code  # Start using Claude Code with retry functionality
```

## 🔧 Configuration

For detailed configuration instructions, please refer to the original project documentation: [musistudio/claude-code-router](https://github.com/musistudio/claude-code-router)

Basic setup:
1. Copy `config.example.json` to `~/.claude-code-router/config.json`
2. Add your API keys and configure providers
3. The enhanced version will automatically apply retry logic to all external API calls

## 🔄 Retry Enhancement Details

- **Max Attempts**: 3 retries for failed requests
- **Backoff Strategy**: Exponential backoff (1s, 2s, 4s)
- **Retryable Errors**: Network timeouts, 5xx server errors, rate limits (429)
- **Error Simplification**: Returns clean error messages instead of detailed third-party error responses

## 📚 Original Project

For complete documentation, configuration examples, and advanced features, please visit:
**[musistudio/claude-code-router](https://github.com/musistudio/claude-code-router)**

## 📝 License

MIT License - Same as original project

## ❤️ Support & Sponsoring

If you find this project helpful, please consider sponsoring its development. Your support is greatly appreciated!

[![ko-fi](https://ko-fi.com/img/githubbutton_sm.svg)](https://ko-fi.com/F1F31GN2GM)

<table>
  <tr>
    <td><img src="/blog/images/alipay.jpg" width="200" alt="Alipay" /></td>
    <td><img src="/blog/images/wechat.jpg" width="200" alt="WeChat Pay" /></td>
  </tr>
</table>

### Our Sponsors

A huge thank you to all our sponsors for their generous support!

- @Simon Leischnig
- [@duanshuaimin](https://github.com/duanshuaimin)
- [@vrgitadmin](https://github.com/vrgitadmin)
- @*o
- [@ceilwoo](https://github.com/ceilwoo)
- @*说
- @*更
- @K*g
- @R*R
- [@bobleer](https://github.com/bobleer)
- @*苗
- @*划
- [@Clarence-pan](https://github.com/Clarence-pan)
- [@carter003](https://github.com/carter003)
- @S*r
- @*晖
- @*敏
- @Z*z
- @*然
- [@cluic](https://github.com/cluic)
- @*苗
- [@PromptExpert](https://github.com/PromptExpert)
- @*应
- [@yusnake](https://github.com/yusnake)
- @*飞
- @董*
- @*汀
- @*涯
- @*:-）
- @**磊   
- @*琢
- @*成
- @Z*o

(If your name is masked, please contact me via my homepage email to update it with your GitHub username.)