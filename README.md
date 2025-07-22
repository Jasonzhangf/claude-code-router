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
# Basic usage with default settings (3 retries)
ccr code

# Configure retry attempts
ccr start --retry 5    # Max 5 retries
ccr start --retry 0    # Disable retry
ccr code --retry 2     # Use 2 retries for this session

# Check service status
ccr status
```

## 🔧 Configuration

For detailed configuration instructions, please refer to the original project documentation: [musistudio/claude-code-router](https://github.com/musistudio/claude-code-router)

Basic setup:
1. Copy `config.example.json` to `~/.claude-code-router/config.json`
2. Add your API keys and configure providers
3. The enhanced version will automatically apply retry logic to all external API calls

## 🔄 Retry Enhancement Details

- **Configurable Attempts**: Use `--retry N` to set retry attempts (default: 3, use 0 to disable)
- **Backoff Strategy**: Exponential backoff (1s, 2s, 4s, 8s...)
- **Retryable Errors**: Network timeouts, 5xx server errors, rate limits (429)
- **Error Simplification**: Returns clean error messages instead of detailed third-party error responses
- **HTML Error Detection**: Properly handles Cloudflare and proxy error pages

## 📚 Original Project

For complete documentation, configuration examples, and advanced features, please visit:
**[musistudio/claude-code-router](https://github.com/musistudio/claude-code-router)**

## 📝 License

MIT License - Same as original project

