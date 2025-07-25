// TokenManager implementation for k2cc transformer
// Reads real kiro tokens from ~/.aws/sso/cache/kiro-auth-token.json

import { readFileSync, existsSync, writeFileSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';
import { getTokenConfig, TokenConfig } from '../config/tokenConfig';

interface TokenData {
  accessToken: string;
  refreshToken: string;
  expiresAt?: string;
  expiresIn?: number;
}

interface TokenInfo {
  id: string;
  data: TokenData;
  healthy: boolean;
  activeRequests: number;
  lastRefreshed?: number;
}

interface RefreshTokenResponse {
  // K2CC API格式 (优先)
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: string;
  
  // 标准OAuth格式 (fallback)
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
}

class TokenManagerService {
  private tokens: Map<string, TokenInfo> = new Map();
  private initialized = false;
  private config: TokenConfig;
  private tokenPath: string;
  private refreshInProgress = false;

  constructor() {
    this.config = getTokenConfig();
    this.tokenPath = this.config.tokenPath.startsWith('~') 
      ? join(homedir(), this.config.tokenPath.slice(2))
      : this.config.tokenPath;
    console.log(`🔄 TokenManager: Will read tokens from ${this.tokenPath}`);
    console.log(`🔄 TokenManager: Refresh endpoint: ${this.config.refreshEndpoint}`);
  }

  async loadTokens(): Promise<void> {
    console.log('🔄 TokenManager: Loading real kiro tokens...');
    
    try {
      if (!existsSync(this.tokenPath)) {
        console.warn(`⚠️ TokenManager: Token file not found at ${this.tokenPath}`);
        console.warn('⚠️ TokenManager: Please run kiro2cc first to authenticate');
        this.loadDummyToken();
        return;
      }

      const tokenData = readFileSync(this.tokenPath, 'utf-8');
      const parsedToken: TokenData = JSON.parse(tokenData);
      
      if (!parsedToken.accessToken || !parsedToken.refreshToken) {
        throw new Error('Invalid token format - missing accessToken or refreshToken');
      }

      // Add the real token
      this.tokens.set('kiro-token', {
        id: 'kiro-token',
        data: parsedToken,
        healthy: true,
        activeRequests: 0
      });

      console.log('✅ TokenManager: Real kiro token loaded successfully');
      this.initialized = true;
      
    } catch (error) {
      console.error(`❌ TokenManager: Failed to load real token: ${error}`);
      console.warn('⚠️ TokenManager: Falling back to dummy token');
      this.loadDummyToken();
    }
  }

  private loadDummyToken(): void {
    // Fallback to dummy token for testing
    this.tokens.set('dummy-token', {
      id: 'dummy-token',
      data: {
        accessToken: 'dummy-access-token',
        refreshToken: 'dummy-refresh-token',
        expiresAt: new Date(Date.now() + 3600000).toISOString()
      },
      healthy: true,
      activeRequests: 0
    });
    this.initialized = true;
    console.log('⚠️ TokenManager: Using dummy token (for testing only)');
  }

  async refreshAllTokens(): Promise<void> {
    if (this.refreshInProgress) {
      console.log('🔄 TokenManager: Refresh already in progress, waiting...');
      // 等待当前刷新完成
      while (this.refreshInProgress) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      return;
    }

    this.refreshInProgress = true;
    console.log('🔄 TokenManager: Starting token refresh...');

    try {
      for (const [tokenId, tokenInfo] of this.tokens.entries()) {
        if (tokenId === 'dummy-token') continue; // 跳过虚拟token
        
        await this.refreshSingleToken(tokenId, tokenInfo);
      }
      console.log('✅ TokenManager: All tokens refreshed successfully');
    } catch (error) {
      console.error('❌ TokenManager: Failed to refresh tokens:', error);
    } finally {
      this.refreshInProgress = false;
    }
  }

  private async refreshSingleToken(tokenId: string, tokenInfo: TokenInfo): Promise<void> {
    let lastError: Error | null = null;
    
    for (let attempt = 1; attempt <= this.config.maxRetryAttempts; attempt++) {
      try {
        console.log(`🔄 TokenManager: Refreshing token ${tokenId} (attempt ${attempt}/${this.config.maxRetryAttempts})...`);
        
        const response = await fetch(this.config.refreshEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            refreshToken: tokenInfo.data.refreshToken
          })
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const refreshData: RefreshTokenResponse = await response.json();
        
        // 更新token数据 - 使用K2CC API返回的格式
        const newTokenData: TokenData = {
          accessToken: refreshData.accessToken || refreshData.access_token,
          refreshToken: refreshData.refreshToken || refreshData.refresh_token || tokenInfo.data.refreshToken,
          expiresIn: refreshData.expires_in,
          expiresAt: refreshData.expiresAt || (refreshData.expires_in 
            ? new Date(Date.now() + refreshData.expires_in * 1000).toISOString()
            : undefined)
        };

        // 更新内存中的token
        tokenInfo.data = newTokenData;
        tokenInfo.lastRefreshed = Date.now();
        tokenInfo.healthy = true;

        // 保存到文件
        await this.saveTokenToFile(newTokenData);
        
        console.log(`✅ TokenManager: Token ${tokenId} refreshed successfully`);
        return; // 成功，退出重试循环
        
      } catch (error) {
        lastError = error as Error;
        console.error(`❌ TokenManager: Failed to refresh token ${tokenId} (attempt ${attempt}):`, error);
        
        if (attempt < this.config.maxRetryAttempts) {
          console.log(`⏳ TokenManager: Waiting ${this.config.retryDelayMs}ms before retry...`);
          await new Promise(resolve => setTimeout(resolve, this.config.retryDelayMs));
        }
      }
    }
    
    // 所有重试都失败了
    tokenInfo.healthy = false;
    throw lastError || new Error(`Failed to refresh token ${tokenId} after ${this.config.maxRetryAttempts} attempts`);
  }

  private async saveTokenToFile(tokenData: TokenData): Promise<void> {
    try {
      const tokenJson = JSON.stringify(tokenData, null, 2);
      writeFileSync(this.tokenPath, tokenJson, 'utf-8');
      console.log('💾 TokenManager: Token saved to file');
    } catch (error) {
      console.error('❌ TokenManager: Failed to save token to file:', error);
    }
  }

  private isTokenExpired(tokenInfo: TokenInfo): boolean {
    if (!tokenInfo.data.expiresAt) {
      return false; // 如果没有过期时间，假设未过期
    }
    
    const expiresAt = new Date(tokenInfo.data.expiresAt).getTime();
    const now = Date.now();
    
    return now >= (expiresAt - this.config.expirationBufferMs);
  }

  private shouldRefreshToken(tokenInfo: TokenInfo): boolean {
    // 如果token过期了，需要刷新
    if (this.isTokenExpired(tokenInfo)) {
      return true;
    }
    
    // 如果距离上次刷新超过配置的间隔时间，也刷新一次
    if (tokenInfo.lastRefreshed) {
      const timeSinceLastRefresh = Date.now() - tokenInfo.lastRefreshed;
      return timeSinceLastRefresh > this.config.forceRefreshIntervalMs;
    }
    
    return false;
  }

  async getNextToken(): Promise<TokenInfo | null> {
    if (!this.initialized) {
      console.warn('⚠️ TokenManager: Not initialized, loading tokens...');
      await this.loadTokens();
    }

    // 检查是否需要刷新token
    for (const tokenInfo of this.tokens.values()) {
      if (tokenInfo.id !== 'dummy-token' && this.shouldRefreshToken(tokenInfo)) {
        console.log(`🔄 TokenManager: Token ${tokenInfo.id} needs refresh`);
        try {
          await this.refreshSingleToken(tokenInfo.id, tokenInfo);
        } catch (error) {
          console.error(`❌ TokenManager: Failed to refresh token ${tokenInfo.id}:`, error);
        }
      }
    }

    // Find the token with the least active requests
    let bestToken: TokenInfo | null = null;
    let minRequests = Infinity;

    for (const token of this.tokens.values()) {
      if (token.healthy && token.activeRequests < minRequests) {
        bestToken = token;
        minRequests = token.activeRequests;
      }
    }

    if (bestToken) {
      console.log(`🎯 TokenManager: Selected token ${bestToken.id} (active requests: ${bestToken.activeRequests})`);
    }

    return bestToken;
  }

  startRequest(tokenId: string): void {
    const token = this.tokens.get(tokenId);
    if (token) {
      token.activeRequests++;
      console.log(`🔄 TokenManager: Started request for ${tokenId} (active: ${token.activeRequests})`);
    }
  }

  finishRequest(tokenId: string): void {
    const token = this.tokens.get(tokenId);
    if (token && token.activeRequests > 0) {
      token.activeRequests--;
      console.log(`🔄 TokenManager: Finished request for ${tokenId} (active: ${token.activeRequests})`);
    }
  }

  markTokenResult(tokenId: string, success: boolean, isOverload?: boolean): void {
    const token = this.tokens.get(tokenId);
    if (token) {
      if (!success) {
        if (isOverload) {
          console.log(`⚠️ TokenManager: Token ${tokenId} overloaded`);
          // In real implementation, might temporarily disable token
        } else {
          console.log(`❌ TokenManager: Token ${tokenId} failed`);
          token.healthy = false;
        }
      } else {
        console.log(`✅ TokenManager: Token ${tokenId} succeeded`);
        token.healthy = true;
      }
    }
  }
}

// Export singleton instance
export default new TokenManagerService();