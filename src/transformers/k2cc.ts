import { readFileSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';
import TokenManager from '../services/TokenManager';

// Types for k2cc transformer
interface TokenData {
  accessToken: string;
  refreshToken: string;
  expiresAt?: string;
}

// Available CodeWhisperer models - only 4.0 and 3.7 supported
// NOTE: Following k2cc Go server - all models map to CLAUDE_SONNET_4_20250514_V1_0
const AvailableModels: { [key: string]: string } = {
  "CLAUDE_SONNET_4_20250514_V1_0": "Claude Sonnet 4.0", // Only supported model
};

// Default model mapping - matches k2cc Go server exactly
const DefaultModelMap: { [key: string]: string } = {
  "claude-sonnet-4-20250514": "CLAUDE_SONNET_4_20250514_V1_0",
  "claude-3.7": "CLAUDE_SONNET_4_20250514_V1_0", // Same as Go version
};

export class K2ccTransformer {
  name = 'k2cc';
  // Remove endpoint to work as provider transformer only, avoiding route conflicts
  // endPoint = '/v1/messages';
  
  private currentTokenId: string | null = null;
  private isTokenManagerInitialized: boolean = false;
  
  constructor() {
    console.log('🔄 K2cc transformer constructed!');
    // Check if k2cc is enabled in router config before initializing tokens
    if (this.shouldInitializeTokens()) {
      this.initializeTokenManager();
    }
  }
  
  private shouldInitializeTokens(): boolean {
    try {
      // Simple check - don't initialize tokens during constructor
      // They will be initialized when actually needed in transform methods
      return false;
    } catch (error) {
      return false;
    }
  }
  
  private get tokenPath(): string {
    return join(homedir(), '.aws', 'sso', 'cache', 'kiro-auth-token.json');
  }

  // Lazy initialize token manager only when k2cc is actually used (async version)
  private async ensureTokenManagerInitialized(): Promise<void> {
    if (this.isTokenManagerInitialized) {
      return; // Already initialized
    }
    
    console.log('🔄 K2cc: Initializing token manager (lazy load)...');
    await this.initializeTokenManager();
    this.isTokenManagerInitialized = true;
  }

  // Sync version for use in transformRequestIn
  private ensureTokenManagerInitializedSync(): void {
    if (this.isTokenManagerInitialized) {
      return; // Already initialized
    }
    
    console.log('🔄 K2cc: Initializing token manager (sync lazy load)...');
    // Initialize synchronously by calling loadTokens and refresh in background
    this.initializeTokenManagerSync();
    this.isTokenManagerInitialized = true;
  }

  // Sync version of token manager initialization
  private initializeTokenManagerSync(): void {
    try {
      // Load tokens synchronously in background - don't wait for refresh
      TokenManager.loadTokens().catch(error => {
        console.error('❌ K2cc: Background token loading failed:', error);
      });
      
      console.log('✅ K2cc: Token manager initialized (sync mode)');
    } catch (error) {
      console.error('❌ K2cc: Token manager sync initialization failed:', error);
    }
  }

  // Initialize token manager
  private async initializeTokenManager(): Promise<void> {
    try {
      console.log('🔄 K2cc: Initializing token manager...');
      
      // Load existing tokens
      await TokenManager.loadTokens();
      
      // Refresh all tokens
      await TokenManager.refreshAllTokens();
      
      console.log('✅ K2cc: Token manager initialized successfully');
      
    } catch (error) {
      console.error(`⚠️ K2cc: Token manager initialization failed: ${error}`);
      console.error('Will attempt to use fallback token if available');
    }
  }

  // Check if token needs refresh and do it
  private async refreshTokenIfNeeded(): Promise<void> {
    const now = Date.now();
    const shouldRefresh = !this.tokenCache || (now - this.lastTokenRefresh) > this.TOKEN_REFRESH_INTERVAL;
    
    if (shouldRefresh) {
      console.log('🔄 K2cc: Token refresh needed...');
      
      try {
        await this.refreshTokenWithKiro2ccAPI();
        this.lastTokenRefresh = now;
        
        // Update cache
        const data = readFileSync(this.tokenPath, 'utf-8');
        this.tokenCache = JSON.parse(data);
        
        // Validate refreshed token
        const isValid = await this.validateToken(this.tokenCache);
        if (!isValid) {
          console.error('❌ K2cc: Refreshed token validation failed');
          this.tokenCache = null;
          throw new Error('Refreshed token is not valid');
        }
        
        console.log('✅ K2cc: Token refresh and validation completed');
        
      } catch (error) {
        console.error(`❌ K2cc: Token refresh failed: ${error}`);
        throw error;
      }
    }
  }

  // Get fallback token from traditional location
  private getFallbackToken(): TokenData {
    try {
      const data = readFileSync(this.tokenPath, 'utf-8');
      return JSON.parse(data);
    } catch (error) {
      throw new Error(`Failed to read fallback token from ${this.tokenPath}: ${(error as Error).message}`);
    }
  }

  // Refresh token using kiro2cc API (like the original kiro2cc does)
  private async refreshTokenWithKiro2ccAPI(): Promise<void> {
    try {
      // First, read existing token to get refreshToken
      let existingToken: TokenData;
      try {
        const data = readFileSync(this.tokenPath, 'utf-8');
        existingToken = JSON.parse(data);
      } catch (error) {
        throw new Error('No existing token found - need to authenticate first');
      }

      if (!existingToken.refreshToken) {
        throw new Error('No refresh token available');
      }

      console.log('🔄 K2cc: Refreshing token via kiro2cc API...');

      // Call kiro2cc refresh API
      const response = await fetch('https://prod.us-east-1.auth.desktop.kiro.dev/refreshToken', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          refreshToken: existingToken.refreshToken
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Token refresh API failed with status ${response.status}: ${errorText}`);
      }

      const refreshResponse = await response.json();
      
      // Validate response structure
      if (!refreshResponse.accessToken || !refreshResponse.refreshToken) {
        throw new Error('Invalid refresh response - missing required tokens');
      }

      // Update token data
      const newTokenData: TokenData = {
        accessToken: refreshResponse.accessToken,
        refreshToken: refreshResponse.refreshToken,
        expiresAt: refreshResponse.expiresAt
      };

      // Save to file with proper permissions (600 like kiro2cc does)
      const { writeFileSync } = require('fs');
      writeFileSync(this.tokenPath, JSON.stringify(newTokenData, null, 2), { mode: 0o600 });
      
      console.log('✅ K2cc: Token refresh completed via kiro2cc API');
      
    } catch (error) {
      console.error(`❌ K2cc: Token refresh failed: ${error}`);
      throw error;
    }
  }

  // Validate token by testing with CodeWhisperer API (like kiro2cc does)
  private async validateToken(token: TokenData): Promise<boolean> {
    try {
      console.log('🔄 K2cc: Validating token with CodeWhisperer API...');

      // Test request to CodeWhisperer API
      const testResponse = await fetch('https://codewhisperer.us-east-1.amazonaws.com/generateAssistantResponse', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token.accessToken}`,
          'Content-Type': 'application/x-amz-json-1.1',
          'X-Amz-Target': 'CodeWhispererService.GenerateAssistantResponse',
          'User-Agent': 'k2cc-transformer/1.0.0'
        },
        body: JSON.stringify({
          profileArn: "arn:aws:codewhisperer:us-east-1:699475941385:profile/EHGA3GRVQMUK",
          conversationState: {
            chatTriggerType: "MANUAL",
            conversationId: this.generateUUID(),
            currentMessage: {
              userInputMessage: {
                content: "test",
                modelId: "CLAUDE_SONNET_4_20250514_V1_0",
                origin: "AI_EDITOR",
                userInputMessageContext: {
                  tools: [],
                  toolResults: []
                }
              }
            },
            history: []
          }
        })
      });

      // Any status other than 403 (auth failure) means token is working
      // Even 400/500 errors mean we got past authentication
      if (testResponse.status === 403) {
        console.error('❌ K2cc: Token validation failed - authentication error');
        return false;
      }

      console.log(`✅ K2cc: Token validation successful (status: ${testResponse.status})`);
      return true;

    } catch (error) {
      console.error(`❌ K2cc: Token validation error: ${error}`);
      return false;
    }
  }

  // Generate UUID for conversation ID (from kiro2cc)
  private generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  // Extract message content from various formats (from kiro2cc)
  private getMessageContent(content: any): string {
    if (typeof content === 'string') {
      return content || "answer for user question";
    }
    if (Array.isArray(content)) {
      const texts = content
        .filter(block => block.type === 'text' || block.type === 'tool_result')
        .map(block => block.text || block.content)
        .filter(Boolean);
      return texts.length > 0 ? texts.join('\n') : "answer for user question";
    }
    return "answer for user question";
  }

  // Get the appropriate CodeWhisperer model based on request and config
  private getCodeWhispererModel(requestedModel: string, config?: any): string {
    console.log(`🔄 K2cc: Resolving model for: ${requestedModel}`);
    
    // Check if config has k2cc-specific model mapping
    if (config?.K2cc?.modelMapping && config.K2cc.modelMapping[requestedModel]) {
      const mappedModel = config.K2cc.modelMapping[requestedModel];
      if (AvailableModels[mappedModel]) {
        console.log(`🔄 K2cc: Using config mapped model: ${requestedModel} -> ${mappedModel}`);
        return mappedModel;
      }
    }
    
    // Check default mapping
    if (DefaultModelMap[requestedModel]) {
      const mappedModel = DefaultModelMap[requestedModel];
      console.log(`🔄 K2cc: Using default mapped model: ${requestedModel} -> ${mappedModel}`);
      return mappedModel;
    }
    
    // Default to Sonnet 4.0 for unsupported models
    console.log(`🔄 K2cc: Model '${requestedModel}' not supported, defaulting to Sonnet 4.0`);
    return "CLAUDE_SONNET_4_20250514_V1_0";
  }

  // Convert Anthropic request to CodeWhisperer format
  private buildCodeWhispererRequest(anthropicReq: any, config?: any): any {
    console.log(`🔄 K2cc: Building CodeWhisperer request for model: ${anthropicReq?.model}`);
    
    // Ensure messages array exists
    if (!anthropicReq.messages || !Array.isArray(anthropicReq.messages) || anthropicReq.messages.length === 0) {
      throw new Error('Invalid request: messages array is required');
    }
    
    const lastMessage = anthropicReq.messages[anthropicReq.messages.length - 1];
    if (!lastMessage) {
      throw new Error('Invalid request: no messages found');
    }
    
    // Get the appropriate CodeWhisperer model
    const modelId = this.getCodeWhispererModel(anthropicReq.model, config);
    
    const cwReq: any = {
      profileArn: "arn:aws:codewhisperer:us-east-1:699475941385:profile/EHGA3GRVQMUK",
      conversationState: {
        chatTriggerType: "MANUAL",
        conversationId: this.generateUUID(),
        currentMessage: {
          userInputMessage: {
            content: this.getMessageContent(lastMessage.content),
            modelId: modelId,
            origin: "AI_EDITOR",
            userInputMessageContext: {
              tools: [],
              toolResults: [] // Initialize as empty array matching Go struct
            }
          }
        },
        history: []
      }
    };

    // Handle tools - @musistudio/llms transforms Anthropic format to OpenAI format
    if (anthropicReq.tools && anthropicReq.tools.length > 0) {
      console.log('🔧 K2cc: Processing tools:', JSON.stringify(anthropicReq.tools, null, 2));
      
      cwReq.conversationState.currentMessage.userInputMessage.userInputMessageContext.tools = 
        anthropicReq.tools.map((tool: any) => {
          // Handle both Anthropic native format and OpenAI format (from @musistudio/llms transformation)
          let toolName, toolDescription, toolSchema;
          
          if (tool.type === 'function' && tool.function) {
            // OpenAI format (after @musistudio/llms transformation)
            toolName = tool.function.name;
            toolDescription = tool.function.description;
            toolSchema = tool.function.parameters;
          } else {
            // Anthropic native format (direct)
            toolName = tool.name;
            toolDescription = tool.description;
            toolSchema = tool.input_schema;
          }
          
          const cwTool = {
            toolSpecification: {
              name: toolName,
              description: toolDescription,
              inputSchema: {
                json: toolSchema
              }
            }
          };
          
          console.log('🔧 K2cc: Mapped tool:', JSON.stringify(cwTool, null, 2));
          return cwTool;
        });
    }

    // Handle history
    console.log(`🔧 K2cc: Checking history conditions - system: ${anthropicReq.system ? anthropicReq.system.length : 0}, messages: ${anthropicReq.messages.length}`);
    if (anthropicReq.system && anthropicReq.system.length > 0 || anthropicReq.messages.length > 1) {
      console.log('🔧 K2cc: Processing conversation history');
      const history: any[] = [];

      // Add system messages
      if (anthropicReq.system) {
        for (const sysMsg of anthropicReq.system) {
          history.push({
            userInputMessage: {
              content: sysMsg.text,
              modelId: this.getCodeWhispererModel(anthropicReq.model, config),
              origin: "AI_EDITOR"
            }
          });
          history.push({
            assistantResponseMessage: {
              content: "I will follow these instructions",
              toolUses: []
            }
          });
        }
      }

      // Add regular messages (excluding the last one which is current)
      console.log(`🔧 K2cc: Processing ${anthropicReq.messages.length - 1} historical messages`);
      for (let i = 0; i < anthropicReq.messages.length - 1; i++) {
        console.log(`🔧 K2cc: Processing message ${i}: role=${anthropicReq.messages[i].role}`);
        if (anthropicReq.messages[i].role === 'user') {
          console.log(`🔧 K2cc: Adding user message to history: "${this.getMessageContent(anthropicReq.messages[i].content)}"`);
          history.push({
            userInputMessage: {
              content: this.getMessageContent(anthropicReq.messages[i].content),
              modelId: this.getCodeWhispererModel(anthropicReq.model, config),
              origin: "AI_EDITOR"
            }
          });

          // Check if next message exists and is an assistant response (but not the current/last message)
          if (i + 1 < anthropicReq.messages.length - 1 && anthropicReq.messages[i + 1].role === 'assistant') {
            console.log(`🔧 K2cc: Adding assistant message to history: "${this.getMessageContent(anthropicReq.messages[i + 1].content)}"`);
            history.push({
              assistantResponseMessage: {
                content: this.getMessageContent(anthropicReq.messages[i + 1].content),
                toolUses: []
              }
            });
            i++;
          }
        }
      }

      console.log(`🔧 K2cc: Built history with ${history.length} entries`);
      cwReq.conversationState.history = history;
    } else {
      console.log('🔧 K2cc: No history to process - single message or no system messages');
    }

    return cwReq;
  }

  // Transform request in - convert Anthropic to CodeWhisperer format (like gemini)
  async transformRequestIn(request: any, provider: any): Promise<Record<string, any>> {
    console.log('\n🚨🚨🚨 K2CC TRANSFORM REQUEST IN CALLED! 🚨🚨🚨');
    console.log(`🔄 K2cc: Provider: ${JSON.stringify(provider)}`);
    console.log(`🔄 K2cc: Request Model: ${request?.model}`);
    console.log(`🔄 K2cc: Full Request:`, JSON.stringify(request, null, 2));
    
    try {
      // Ensure token manager is initialized before use (sync version)
      this.ensureTokenManagerInitializedSync();
      
      // Get next available token from TokenManager (sync version)
      const tokenInfo = await TokenManager.getNextToken();
      if (!tokenInfo) {
        throw new Error('No healthy tokens available or all at capacity');
      }
      
      this.currentTokenId = tokenInfo.id;
      
      // Start tracking this request
      TokenManager.startRequest(tokenInfo.id);
      console.log(`✅ K2cc: Using token: ${tokenInfo.id}`);
      
      // Convert Anthropic request to CodeWhisperer format
      const cwRequest = this.buildCodeWhispererRequest(request, provider?.config);
      console.log('✅ K2cc: CodeWhisperer request built');
      
      // Return CodeWhisperer request format directly
      console.log('✅ K2cc: Request transformed to CodeWhisperer format');
      console.log(`🔧 K2cc: CW Body preview: ${JSON.stringify(cwRequest).substring(0, 100)}...`);
      console.log(`🔧 K2cc: Token: ${tokenInfo.data.accessToken.substring(0, 20)}...`);
      
      // For CodeWhisperer provider, return with custom headers
      return {
        body: cwRequest,
        config: {
          headers: {
            'Content-Type': 'application/x-amz-json-1.1',
            'X-Amz-Target': 'CodeWhispererService.GenerateAssistantResponse',
            'User-Agent': 'k2cc-transformer/1.0.0',
            'Authorization': `Bearer ${tokenInfo.data.accessToken}`
          },
        }
      };
      
    } catch (error) {
      console.error(`❌ K2cc transform error: ${error}`);
      
      // Try fallback to single token if TokenManager fails
      try {
        const fallbackToken = this.getFallbackToken();
        console.log('⚠️ K2cc: Using fallback token');
        
        const cwRequest = this.buildCodeWhispererRequest(request, null);
        
        return {
          body: cwRequest,
          config: {
            headers: {
              'Content-Type': 'application/x-amz-json-1.1',
              'X-Amz-Target': 'CodeWhispererService.GenerateAssistantResponse',
              'User-Agent': 'k2cc-transformer/1.0.0',
              'Authorization': `Bearer ${fallbackToken.accessToken}`
            },
          }
        };
      } catch (fallbackError) {
        console.error(`❌ K2cc fallback failed: ${fallbackError}`);
        return {
          body: { error: { message: 'No tokens available', type: 'api_error', code: 'no_tokens' } },
          config: {
            url: new URL('generateAssistantResponse', provider.baseUrl),
            headers: { 'Content-Type': 'application/json' },
          }
        };
      }
    }
  }

  // Transform request out - not needed since transformRequestIn handles everything
  transformRequestOut(request: any): any {
    console.log('\n🚨🚨🚨 K2CC TRANSFORM REQUEST OUT CALLED! 🚨🚨🚨');
    console.log('✅ K2cc: Request already formatted in transformRequestIn, passing through');
    return request;
  }

  // Parse CodeWhisperer SSE binary response based on kiro2cc (sse_parser.go)
  private parseSSEEvents(responseBuffer: Buffer): any[] {
    const events: any[] = [];
    let offset = 0;
    
    console.log(`🔄 K2cc: Parsing buffer of ${responseBuffer.length} bytes using kiro2cc algorithm`);
    
    while (offset < responseBuffer.length - 12) {
      try {
        // Read total length and header length (big endian) - from kiro2cc line 36-41
        const totalLen = responseBuffer.readUInt32BE(offset);
        const headerLen = responseBuffer.readUInt32BE(offset + 4);
        
        console.log(`🔄 K2cc: Frame - totalLen: ${totalLen}, headerLen: ${headerLen}, offset: ${offset}`);
        
        // Validate frame length like kiro2cc line 43-46
        if (totalLen > responseBuffer.length - offset + 8) {
          console.log('🔄 K2cc: Frame length invalid, breaking');
          break;
        }
        
        // Skip header like kiro2cc line 48-52
        const headerStart = offset + 8;
        const headerEnd = headerStart + headerLen;
        
        // Read payload like kiro2cc line 54-58
        const payloadLen = totalLen - headerLen - 12;
        const payloadStart = headerEnd;
        const payloadEnd = payloadStart + payloadLen;
        
        if (payloadEnd > responseBuffer.length || payloadLen <= 0) {
          console.log('🔄 K2cc: Invalid payload bounds');
          offset += 1; // Try next byte
          continue;
        }
        
        const payload = responseBuffer.slice(payloadStart, payloadEnd);
        
        // Remove "vent" prefix like kiro2cc line 65
        let payloadStr = payload.toString('utf8');
        payloadStr = payloadStr.replace(/^vent/, '');
        
        console.log(`🔄 K2cc: Processing payload (${payloadLen} bytes): ${payloadStr.substring(0, 200)}...`);
        
        // Parse JSON like kiro2cc line 67-68
        try {
          const evt = JSON.parse(payloadStr);
          console.log(`🔄 K2cc: Parsed assistantResponseEvent: ${JSON.stringify(evt)}`);
          
          // Convert to SSE event like kiro2cc line 70
          const sseEvent = this.convertAssistantEventToSSE(evt);
          if (sseEvent.event) { // Only add if valid event
            events.push(sseEvent);
          }
          
          // Handle tool use completion like kiro2cc line 72-85
          if (evt.toolUseId && evt.name && evt.stop) {
            events.push({
              event: 'message_delta',
              data: {
                type: 'message_delta',
                delta: {
                  stop_reason: 'tool_use',
                  stop_sequence: null,
                },
                usage: { output_tokens: 0 }
              }
            });
          }
          
        } catch (parseError) {
          console.log('🔄 K2cc: JSON unmarshal error:', parseError);
        }
        
        // Move to next frame (skip CRC32) like kiro2cc line 61-63
        offset = payloadEnd + 4;
        
      } catch (error) {
        console.log('🔄 K2cc: Frame parsing error:', error);
        offset += 1; // Try next byte
      }
    }
    
    console.log(`🔄 K2cc: Parsed ${events.length} SSE events total`);
    return events;
  }
  
  // Convert assistant event to SSE format (ported from kiro2cc Go logic)
  private convertAssistantEventToSSE(evt: any): any {
    if (evt.content) {
      return {
        event: 'content_block_delta',
        data: {
          type: 'content_block_delta',
          index: 0,
          delta: {
            type: 'text_delta',
            text: evt.content,
          },
        },
      };
    } else if (evt.toolUseId && evt.name && !evt.stop) {
      if (!evt.input) {
        return {
          event: 'content_block_start',
          data: {
            type: 'content_block_start',
            index: 1,
            content_block: {
              type: 'tool_use',
              id: evt.toolUseId,
              name: evt.name,
              input: {},
            },
          },
        };
      } else {
        return {
          event: 'content_block_delta',
          data: {
            type: 'content_block_delta',
            index: 1,
            delta: {
              type: 'input_json_delta',
              id: evt.toolUseId,
              name: evt.name,
              partial_json: evt.input,
            },
          },
        };
      }
    } else if (evt.stop) {
      return {
        event: 'content_block_stop',
        data: {
          type: 'content_block_stop',
          index: 1,
        },
      };
    }
    
    return {};
  }
  
  // Transform response - parse CodeWhisperer binary and convert to Anthropic format
  async transformResponseOut(response: Response): Promise<Response> {
    console.log('\n🚨🚨🚨 K2CC TRANSFORM RESPONSE OUT CALLED! 🚨🚨🚨');
    console.log(`🔄 K2cc: Response status: ${response.status}`);
    
    try {
      if (!response.ok) {
        console.error(`❌ K2cc: CodeWhisperer API error: ${response.status}`);
        
        // Finish tracking the request and mark as failure
        if (this.currentTokenId) {
          TokenManager.finishRequest(this.currentTokenId);
          const isOverload = response.status === 429 || response.status === 503;
          TokenManager.markTokenResult(this.currentTokenId, false, isOverload);
        }
        
        if (response.status === 403) {
          console.log('⚠️ K2cc: Token might be expired - triggering refresh');
        }
        return response;
      }
      
      // Get response as buffer for binary parsing (CodeWhisperer uses binary format)
      const responseBuffer = Buffer.from(await response.arrayBuffer());
      console.log(`✅ K2cc: Got CodeWhisperer binary response (${responseBuffer.length} bytes)`);
      
      // Enhanced SSE parser implementation based on kiro2cc (sse_parser.go)
      console.log(`🔄 K2cc: Parsing binary SSE response using kiro2cc algorithm`);
      
      let fullContent = '';
      const events = this.parseSSEEvents(responseBuffer);
      
      console.log(`🔄 K2cc: Parsed ${events.length} SSE events`);
      
      // Extract content from parsed events (matching kiro2cc structure)
      for (const event of events) {
        if (event.event === 'content_block_delta' && event.data) {
          const delta = event.data.delta;
          if (delta && delta.type === 'text_delta' && delta.text) {
            fullContent += delta.text;
            console.log(`🔄 K2cc: Content fragment: "${delta.text}"`);
          }
        }
      }
      
      console.log(`✅ K2cc: Complete extracted content: "${fullContent}"`);
      
      const messageId = `msg_${Date.now()}`;
      
      // Create OpenAI-compatible response (NOT Anthropic) to match @musistudio/llms expectations
      const openaiResponse = {
        id: messageId,
        object: 'chat.completion',
        created: Math.floor(Date.now() / 1000),
        model: 'claude-sonnet-4-20250514',
        choices: [{
          index: 0,
          message: {
            role: 'assistant',
            content: fullContent || 'Response processed through k2cc transformer'
          },
          finish_reason: 'stop'
        }],
        usage: {
          prompt_tokens: 10,
          completion_tokens: Math.max(Math.floor(fullContent.length / 4), 1),
          total_tokens: 10 + Math.max(Math.floor(fullContent.length / 4), 1)
        }
      };
      
      console.log(`✅ K2cc: Final response with clean content: "${fullContent}"`);
      console.log(`🔧 K2cc: OpenAI response structure:`, JSON.stringify(openaiResponse, null, 2));
      
      // Mark successful completion
      if (this.currentTokenId) {
        TokenManager.finishRequest(this.currentTokenId);
        TokenManager.markTokenResult(this.currentTokenId, true);
      }
      
      // Create standard Response object for @musistudio/llms compatibility
      const responseJson = JSON.stringify(openaiResponse);
      console.log('✅ K2cc: Returning OpenAI-format JSON response');
      
      // Create simple Response object - let @musistudio/llms handle it normally
      const finalResponse = new Response(responseJson, {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      return finalResponse;
      
    } catch (error) {
      console.error(`❌ K2cc transformResponseOut error: ${error}`);
      
      // Mark error completion
      if (this.currentTokenId) {
        TokenManager.finishRequest(this.currentTokenId);
        TokenManager.markTokenResult(this.currentTokenId, false);
      }
      
      return new Response(JSON.stringify({
        error: {
          type: 'api_error',
          message: `K2cc transformation error: ${(error as Error).message}`
        }
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }

  // Endpoint handler method for direct API handling
  async handle(req: any, res: any): Promise<void> {
    try {
      console.log('\n🚨🚨🚨 K2CC ENDPOINT HANDLER CALLED! 🚨🚨🚨');
      
      // Parse request body
      const body = JSON.parse(req.body);
      console.log('🔄 K2cc: Received request:', JSON.stringify(body, null, 2));
      
      // Ensure token manager is initialized before use
      await this.ensureTokenManagerInitialized();
      
      // Get next available token from TokenManager (sync version)
      const tokenInfo = await TokenManager.getNextToken();
      if (!tokenInfo) {
        throw new Error('No healthy tokens available or all at capacity');
      }
      
      this.currentTokenId = tokenInfo.id;
      TokenManager.startRequest(tokenInfo.id);
      console.log(`✅ K2cc: Using token: ${tokenInfo.id}`);
      
      // Convert Anthropic request to CodeWhisperer format
      const cwRequest = this.buildCodeWhispererRequest(body, null);
      console.log('✅ K2cc: CodeWhisperer request built');
      
      // Make request to CodeWhisperer API
      const response = await fetch('https://codewhisperer.us-east-1.amazonaws.com/generateAssistantResponse', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${tokenInfo.data.accessToken}`,
          'Content-Type': 'application/x-amz-json-1.1',
          'X-Amz-Target': 'CodeWhispererService.GenerateAssistantResponse',
          'User-Agent': 'k2cc-transformer/1.0.0'
        },
        body: JSON.stringify(cwRequest)
      });
      
      console.log(`🔄 K2cc: Response status: ${response.status}`);
      
      if (!response.ok) {
        if (response.status === 403) {
          console.log('⚠️ K2cc: Token might be expired - triggering refresh');
        }
        throw new Error(`CodeWhisperer API error: ${response.status}`);
      }
      
      // Get response as buffer for binary parsing
      const responseBuffer = Buffer.from(await response.arrayBuffer());
      console.log(`✅ K2cc: Got CodeWhisperer binary response (${responseBuffer.length} bytes)`);
      
      // Extract content using regex directly from binary buffer
      const responseText = responseBuffer.toString('utf8');
      console.log(`🔄 K2cc: Converting to string for regex extraction`);
      
      // Extract all JSON content objects
      const contentMatches = responseText.match(/"content"\s*:\s*"([^"]*)"/g) || [];
      let fullContent = '';
      
      for (const match of contentMatches) {
        const contentMatch = match.match(/"content"\s*:\s*"([^"]*)"/);
        if (contentMatch && contentMatch[1]) {
          fullContent += contentMatch[1];
        }
      }
      
      console.log(`✅ K2cc: Extracted content: "${fullContent}"`);
      
      const messageId = `msg_${Date.now()}`;
      
      // Create OpenAI-compatible response (NOT Anthropic) to match @musistudio/llms expectations
      const openaiResponse = {
        id: messageId,
        object: 'chat.completion',
        created: Math.floor(Date.now() / 1000),
        model: 'claude-sonnet-4-20250514',
        choices: [{
          index: 0,
          message: {
            role: 'assistant',
            content: fullContent || 'Response processed through k2cc transformer'
          },
          finish_reason: 'stop'
        }],
        usage: {
          prompt_tokens: 10,
          completion_tokens: Math.max(Math.floor(fullContent.length / 4), 1),
          total_tokens: 10 + Math.max(Math.floor(fullContent.length / 4), 1)
        }
      };
      
      console.log(`✅ K2cc: Final response with clean content: "${fullContent}"`);
      console.log(`🔧 K2cc: OpenAI response structure:`, JSON.stringify(openaiResponse, null, 2));
      
      // Mark successful completion
      if (this.currentTokenId) {
        TokenManager.finishRequest(this.currentTokenId);
        TokenManager.markTokenResult(this.currentTokenId, true);
      }
      
      // Send response directly like kiro2cc
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify(openaiResponse));
      
    } catch (error) {
      console.error(`❌ K2cc endpoint handler error: ${error}`);
      
      // Mark error completion
      if (this.currentTokenId) {
        TokenManager.finishRequest(this.currentTokenId);
        TokenManager.markTokenResult(this.currentTokenId, false);
      }
      
      res.setHeader('Content-Type', 'application/json');
      res.statusCode = 500;
      res.end(JSON.stringify({
        error: {
          type: 'api_error',
          message: `K2cc handler error: ${(error as Error).message}`
        }
      }));
    }
  }
}

// Export transformer instance (like gemini)
export default new K2ccTransformer();