import TokenManager from '../services/TokenManager';
import TokenRefreshMiddleware from '../middleware/tokenRefresh';
import { log } from './log';

/**
 * Token utility functions
 */
export class TokenUtils {
  /**
   * 手动刷新所有token
   */
  static async refreshTokens(): Promise<void> {
    try {
      console.log('🔄 Manually refreshing all tokens...');
      await TokenRefreshMiddleware.forceRefreshTokens();
      console.log('✅ Manual token refresh completed');
    } catch (error) {
      console.error('❌ Manual token refresh failed:', error);
      throw error;
    }
  }

  /**
   * 获取当前token状态
   */
  static async getTokenStatus(): Promise<any> {
    try {
      const token = await TokenManager.getNextToken();
      if (!token) {
        return { status: 'no_token', message: 'No token available' };
      }

      return {
        status: 'available',
        tokenId: token.id,
        healthy: token.healthy,
        activeRequests: token.activeRequests,
        expiresAt: token.data.expiresAt,
        lastRefreshed: token.lastRefreshed ? new Date(token.lastRefreshed).toISOString() : 'never'
      };
    } catch (error) {
      return { status: 'error', message: error.message };
    }
  }

  /**
   * 重置token刷新检查
   */
  static resetTokenCheck(): void {
    TokenRefreshMiddleware.resetRefreshCheck();
    console.log('🔄 Token refresh check has been reset');
  }

  /**
   * 检查token是否需要刷新
   */
  static async checkTokenHealth(): Promise<boolean> {
    try {
      const token = await TokenManager.getNextToken();
      return token ? token.healthy : false;
    } catch (error) {
      log('❌ Error checking token health:', error);
      return false;
    }
  }
}

export default TokenUtils;