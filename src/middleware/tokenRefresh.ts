import TokenManager from '../services/TokenManager';
import { log } from '../utils/log';
import { getTokenConfig } from '../config/tokenConfig';

/**
 * Token refresh middleware
 * 确保每次请求前都检查和刷新token
 */
export class TokenRefreshMiddleware {
  private static instance: TokenRefreshMiddleware;
  private lastRefreshCheck = 0;
  private config = getTokenConfig();

  private constructor() {}

  static getInstance(): TokenRefreshMiddleware {
    if (!TokenRefreshMiddleware.instance) {
      TokenRefreshMiddleware.instance = new TokenRefreshMiddleware();
    }
    return TokenRefreshMiddleware.instance;
  }

  /**
   * 在每次API请求前调用，确保token是最新的
   */
  async ensureTokenFresh(): Promise<void> {
    const now = Date.now();
    
    // 如果距离上次检查时间不足间隔时间，跳过检查
    if (now - this.lastRefreshCheck < this.config.refreshCheckIntervalMs) {
      return;
    }

    try {
      log('🔄 TokenRefreshMiddleware: Checking token freshness...');
      
      // 获取当前token并检查是否需要刷新
      const currentToken = await TokenManager.getNextToken();
      
      if (!currentToken) {
        log('⚠️ TokenRefreshMiddleware: No token available');
        return;
      }

      // 更新最后检查时间
      this.lastRefreshCheck = now;
      
      log('✅ TokenRefreshMiddleware: Token check completed');
      
    } catch (error) {
      console.error('❌ TokenRefreshMiddleware: Error during token refresh:', error);
      // 不抛出错误，让请求继续进行
    }
  }

  /**
   * 强制刷新所有token
   */
  async forceRefreshTokens(): Promise<void> {
    try {
      log('🔄 TokenRefreshMiddleware: Force refreshing all tokens...');
      await TokenManager.refreshAllTokens();
      this.lastRefreshCheck = Date.now();
      log('✅ TokenRefreshMiddleware: Force refresh completed');
    } catch (error) {
      console.error('❌ TokenRefreshMiddleware: Force refresh failed:', error);
      throw error;
    }
  }

  /**
   * 重置刷新检查时间，强制下次检查
   */
  resetRefreshCheck(): void {
    this.lastRefreshCheck = 0;
    log('🔄 TokenRefreshMiddleware: Refresh check reset');
  }
}

export default TokenRefreshMiddleware.getInstance();