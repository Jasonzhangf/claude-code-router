import Server from "@musistudio/llms";
import { retryWithBackoff } from "./utils/retry";
import { log } from "./utils/log";

export const createServer = (config: any): Server => {
  const server = new Server(config);
  
  // Add retry logic with reduced attempts (3 max) to handle network issues
  // without disrupting conversation flow
  const originalFetch = global.fetch;
  global.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const url = typeof input === 'string' ? input : input.toString();
    
    // Skip retry for local/internal requests
    if (url.includes('localhost') || url.includes('127.0.0.1') || url.includes('::1')) {
      return originalFetch(input, init);
    }
    
    // Apply retry logic for external API calls with conservative settings
    return retryWithBackoff(
      () => originalFetch(input, init),
      `API request to ${url}`,
      {
        maxAttempts: 3,
        initialDelayMs: 1000,
        maxDelayMs: 5000,
        backoffFactor: 2
      }
    );
  };
  
  return server;
};
