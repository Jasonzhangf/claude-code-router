import TokenManager from '../services/TokenManager';
import TokenRefreshMiddleware from '../middleware/tokenRefresh';
import { log } from './log';
import { getTokenConfig } from '../config/tokenConfig';

/**
 * 启动时的初始化函数
 */
export async function initializeTokens(): Promise<void> {
  try {
    console.log('🚀 Initializing token system...');
    
    // 加载tokens
    await TokenManager.loadTokens();
    
    // 立即刷新一次tokens以确保它们是最新的
    console.log('🔄 Performing initial token refresh...');
    await TokenRefreshMiddleware.forceRefreshTokens();
    
    console.log('✅ Token system initialized successfully');
    
  } catch (error) {
    console.error('❌ Failed to initialize token system:', error);
    console.warn('⚠️ Continuing with existing tokens...');
  }
}

/**
 * 设置定期token刷新
 */
export function setupPeriodicTokenRefresh(): void {
  const config = getTokenConfig();
  
  setInterval(async () => {
    try {
      log('🔄 Periodic token refresh starting...');
      await TokenRefreshMiddleware.forceRefreshTokens();
      log('✅ Periodic token refresh completed');
    } catch (error) {
      console.error('❌ Periodic token refresh failed:', error);
    }
  }, config.periodicRefreshIntervalMs);
  
  console.log(`⏰ Periodic token refresh scheduled every ${config.periodicRefreshIntervalMs / 60000} minutes`);
}

/**
 * 优雅关闭时的清理函数
 */
export function cleanupTokens(): void {
  console.log('🧹 Cleaning up token system...');
  // 这里可以添加任何必要的清理逻辑
}