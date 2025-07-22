/**
 * Retry utility with exponential backoff for third-party API calls
 */

import { log } from './log';

interface RetryOptions {
  maxAttempts?: number;
  initialDelayMs?: number;
  maxDelayMs?: number;
  backoffFactor?: number;
}

const DEFAULT_RETRY_OPTIONS: Required<RetryOptions> = {
  maxAttempts: 10,
  initialDelayMs: 1000,
  maxDelayMs: 30000,
  backoffFactor: 2,
};

/**
 * Check if an error should trigger a retry
 */
function isRetryableError(error: any): boolean {
  // Network errors
  if (error?.code === 'ECONNRESET' || 
      error?.code === 'ECONNREFUSED' || 
      error?.code === 'ETIMEDOUT' ||
      error?.code === 'ENOTFOUND') {
    return true;
  }

  // HTTP errors - retry all server errors and rate limiting
  if (error?.statusCode || error?.status) {
    const statusCode = error.statusCode || error.status;
    return statusCode >= 500 || statusCode === 429;
  }

  // Fetch API errors
  if (error?.name === 'TypeError' && error?.message?.includes('fetch')) {
    return true;
  }

  // AbortSignal timeout
  if (error?.name === 'AbortError' || error?.name === 'TimeoutError') {
    return true;
  }

  return false;
}

/**
 * Create a simple error message based on status code, always returning clean messages
 */
function createSimpleError(error: any, operationName: string): Error {
  const statusCode = error?.statusCode || error?.status;
  let message: string;
  let code: string;
  
  // Check if error message contains HTML (common for proxy/gateway errors)
  const errorMessage = error?.message || '';
  const isHtmlError = errorMessage.includes('<!DOCTYPE') || errorMessage.includes('<html');
  
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
        message = `Server error (${statusCode})`;
        code = 'server_error';
    }
  } else if (error?.code) {
    switch (error.code) {
      case 'ECONNRESET':
      case 'ECONNREFUSED':
      case 'ETIMEDOUT':
      case 'ENOTFOUND':
        message = 'Network connection failed';
        code = 'network_error';
        break;
      default:
        message = 'Network error';
        code = 'network_error';
    }
  } else if (isHtmlError) {
    // Handle HTML error responses (like Cloudflare error pages)
    message = 'Service temporarily unavailable';
    code = 'service_unavailable';
  } else {
    message = 'Request failed';
    code = 'request_failed';
  }

  // Create a completely clean error with minimal structure
  const simpleError = new Error(message);
  (simpleError as any).statusCode = statusCode || 502;
  (simpleError as any).code = code;
  (simpleError as any).type = 'api_error';
  
  return simpleError;
}

/**
 * Calculate delay with exponential backoff and jitter
 */
function calculateDelay(attempt: number, options: Required<RetryOptions>): number {
  const baseDelay = options.initialDelayMs * Math.pow(options.backoffFactor, attempt);
  const jitteredDelay = baseDelay * (0.5 + Math.random() * 0.5); // Add 50% jitter
  return Math.min(jitteredDelay, options.maxDelayMs);
}

/**
 * Sleep for specified milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Retry a function with exponential backoff
 */
export async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  operationName: string,
  options: RetryOptions = {}
): Promise<T> {
  const config = { ...DEFAULT_RETRY_OPTIONS, ...options };
  let lastError: any;

  for (let attempt = 0; attempt < config.maxAttempts; attempt++) {
    try {
      const result = await operation();
      
      // Log successful retry if it wasn't the first attempt
      if (attempt > 0) {
        log(`✅ ${operationName} succeeded after ${attempt + 1} attempts`);
      }
      
      return result;
    } catch (error: any) {
      lastError = error;
      
      // Check if error is retryable
      if (!isRetryableError(error)) {
        log(`❌ ${operationName} failed with non-retryable error:`, error.message);
        // Still return simple error for non-retryable errors
        throw createSimpleError(error, operationName);
      }
      
      // If this was the last attempt, don't retry
      if (attempt === config.maxAttempts - 1) {
        break;
      }
      
      // Calculate delay and log retry attempt
      const delay = calculateDelay(attempt, config);
      log(`🔄 ${operationName} failed (attempt ${attempt + 1}/${config.maxAttempts}): ${error.message}. Retrying in ${delay}ms...`);
      
      await sleep(delay);
    }
  }

  // All attempts failed - return simple error
  log(`❌ ${operationName} failed after ${config.maxAttempts} attempts. Last error:`, lastError?.message);
  throw createSimpleError(lastError, operationName);
}

/**
 * Wrap a fetch request with retry logic
 */
export async function retryFetch(
  url: string | URL,
  init?: RequestInit,
  options: RetryOptions = {}
): Promise<Response> {
  return retryWithBackoff(
    () => fetch(url, init),
    `fetch ${url}`,
    options
  );
}