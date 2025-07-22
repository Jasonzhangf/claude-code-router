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

