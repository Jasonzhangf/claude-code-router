import Server from "@musistudio/llms";
import { retryWithBackoff } from "./utils/retry";
import { log } from "./utils/log";

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
