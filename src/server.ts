import Server from "@musistudio/llms";
import { retryWithBackoff } from "./utils/retry";
import { log } from "./utils/log";
import TokenRefreshMiddleware from "./middleware/tokenRefresh";
import TokenManager from "./services/TokenManager";
import * as fs from 'fs';
import * as path from 'path';

/**
 * Log API requests to conversation log file
 */
function logAPIRequest(input: RequestInfo | URL, init?: RequestInit): void {
  try {
    const logDir = path.join(require('os').homedir(), '.claude-code-router');
    const logFile = path.join(logDir, 'api-requests.log');
    
    const logEntry = {
      timestamp: new Date().toISOString(),
      type: 'API_REQUEST',
      url: typeof input === 'string' ? input : input.toString(),
      method: init?.method || 'GET',
      headers: init?.headers || {},
      body: init?.body ? (typeof init.body === 'string' ? init.body : '[Binary Data]') : null
    };
    
    fs.appendFileSync(logFile, JSON.stringify(logEntry) + '\n');
    console.log(`📝 API request logged: ${logEntry.url}`);
  } catch (error) {
    console.error('❌ Failed to log API request:', error);
  }
}

/**
 * Setup conversation logging to capture all requests and responses
 */
function setupConversationLogging(server: Server): void {
  const logDir = path.join(require('os').homedir(), '.claude-code-router');
  const logFile = path.join(logDir, 'conversations.log');
  const failedRequestsDir = path.join(logDir, 'failed-requests');
  
  // Ensure directories exist
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }
  if (!fs.existsSync(failedRequestsDir)) {
    fs.mkdirSync(failedRequestsDir, { recursive: true });
  }
  
  console.log('📝 Conversation logging enabled');
  console.log(`📄 Log file: ${logFile}`);
  console.log(`📁 Failed requests: ${failedRequestsDir}`);
  
  // Patch fetch to intercept all API requests/responses
  const originalFetch = global.fetch;
  let requestCounter = 0;
  
  // Function to log entries
  function logEntry(entry: any) {
    try {
      fs.appendFileSync(logFile, JSON.stringify(entry) + '\n');
    } catch (error) {
      console.error('❌ Failed to write log:', error);
    }
  }
  
  // Function to handle 400 errors
  function handle400Error(requestId: string, responseData: any) {
    console.log('🚨 400错误捕获！');
    console.log('详细信息已记录到会话日志');
    
    // Save failed request to separate file for analysis
    const failedRequestFile = path.join(failedRequestsDir, `400-error-${requestId}.json`);
    try {
      fs.writeFileSync(failedRequestFile, JSON.stringify(responseData, null, 2));
    } catch (error) {
      console.error('❌ Failed to save failed request:', error);
    }
    
    // Analyze error type
    if (responseData.error && responseData.error.message) {
      const errorMsg = responseData.error.message;
      
      if (errorMsg.includes('Improperly formed request')) {
        console.log('🔍 错误类型: CodeWhisperer API请求格式错误');
        console.log('说明: K2CC transformer发送给CodeWhisperer的请求格式不正确');
      } else if (errorMsg.includes('解析请求体失败')) {
        console.log('🔍 错误类型: Anthropic请求解析失败'); 
        console.log('说明: Claude Code发送的请求格式有问题');
      } else {
        console.log('🔍 错误类型: 其他400错误');
        console.log('详细信息:', errorMsg);
      }
    }
  }
  
  // Override server's after hook or create our own logging
  // Since we can't easily hook into @musistudio/llms, we'll create a simple HTTP interceptor
  try {
    // Try to access the server instance after it's started
    setTimeout(() => {
      console.log('📝 Conversation logging middleware initialized');
      console.log('📋 Logs will capture all API interactions');
    }, 1000);
  } catch (error) {
    console.log('⚠️ Cannot add advanced conversation logging:', error);
  }
}

/**
 * Simplify any error for user-friendly display
 */
function simplifyError(error: any): Error {
  const statusCode = error?.statusCode || error?.status || error?.response?.status;
  const errorMessage = error?.message || error?.response?.data?.message || '';
  
  // Check for HTML content in error message
  const isHtmlError = errorMessage.includes('<!DOCTYPE') || errorMessage.includes('<html');
  
  let message: string;
  let code: string;
  
  if (statusCode) {
    switch (statusCode) {
      case 429:
        message = 'Rate limit exceeded';
        code = 'rate_limit_exceeded';
        break;
      case 500:
        message = 'Internal server error';
        code = 'internal_server_error';
        break;
      case 502:
        message = 'Bad gateway';
        code = 'bad_gateway';
        break;
      case 503:
        message = 'Service unavailable';
        code = 'service_unavailable';
        break;
      case 504:
        message = 'Gateway timeout';
        code = 'gateway_timeout';
        break;
      default:
        message = `Error ${statusCode}`;
        code = 'api_error';
    }
  } else if (isHtmlError) {
    message = 'Service temporarily unavailable';
    code = 'service_unavailable';
  } else if (error?.code) {
    message = 'Network connection failed';
    code = 'network_error';
  } else {
    message = 'Request failed';
    code = 'request_failed';
  }

  const simpleError = new Error(message);
  (simpleError as any).statusCode = statusCode || 502;
  (simpleError as any).code = code;
  (simpleError as any).type = 'api_error';
  
  return simpleError;
}

export const createServer = (config: any): Server => {
  const server = new Server(config);
  
  // Initialize conversation logging
  setupConversationLogging(server);
  
  // Initialize TokenManager
  TokenManager.loadTokens().catch(error => {
    console.error('❌ Failed to initialize TokenManager:', error);
  });
  
  // Get retry attempts from environment variable or use default
  const retryAttempts = parseInt(process.env.RETRY_ATTEMPTS || '3');
  const retryEnabled = retryAttempts > 0;
  
  // Always show retry configuration (not just when logging is enabled)
  console.log(`🔄 Retry configuration: ${retryEnabled ? `${retryAttempts} attempts` : 'disabled'}`);
  log(`🔄 Retry configuration: ${retryEnabled ? `${retryAttempts} attempts` : 'disabled'}`);
  
  // Add retry logic with configurable attempts to handle network issues
  // without disrupting conversation flow
  const originalFetch = global.fetch;
  global.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const url = typeof input === 'string' ? input : input.toString();
    
    // Skip retry for local/internal requests
    if (url.includes('localhost') || url.includes('127.0.0.1') || url.includes('::1')) {
      return originalFetch(input, init);
    }

    // 在每次外部API请求前确保token是最新的
    try {
      await TokenRefreshMiddleware.ensureTokenFresh();
    } catch (error) {
      log('⚠️ Token refresh failed, continuing with existing token:', error);
    }
    
    // Log API requests if conversation logging is enabled
    if (process.env.CCR_CONVERSATION_LOGGING === 'enabled') {
      logAPIRequest(input, init);
    }
    
    // If retry is disabled, just make the request directly
    if (!retryEnabled) {
      try {
        return await originalFetch(input, init);
      } catch (error) {
        throw simplifyError(error);
      }
    }
    
    try {
      // Apply retry logic for external API calls with configurable settings
      return await retryWithBackoff(
        () => originalFetch(input, init),
        `API request to ${url}`,
        {
          maxAttempts: retryAttempts,
          initialDelayMs: 1000,
          maxDelayMs: 5000,
          backoffFactor: 2
        }
      );
    } catch (error) {
      // Ensure all errors are simplified before being thrown
      throw simplifyError(error);
    }
  };
  
  return server;
};
