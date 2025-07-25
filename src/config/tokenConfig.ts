/**
 * Token管理配置
 */
export interface TokenConfig {
  // Token文件路径
  tokenPath: string;
  
  // 刷新端点URL
  refreshEndpoint: string;
  
  // Token过期前的缓冲时间（毫秒）
  expirationBufferMs: number;
  
  // 强制刷新间隔（毫秒）
  forceRefreshIntervalMs: number;
  
  // 定期刷新间隔（毫秒）
  periodicRefreshIntervalMs: number;
  
  // 刷新检查间隔（毫秒）
  refreshCheckIntervalMs: number;
  
  // 最大重试次数
  maxRetryAttempts: number;
  
  // 重试延迟（毫秒）
  retryDelayMs: number;
}

export const defaultTokenConfig: TokenConfig = {
  tokenPath: '~/.aws/sso/cache/kiro-auth-token.json',
  refreshEndpoint: process.env.TOKEN_REFRESH_ENDPOINT || 'https://prod.us-east-1.auth.desktop.kiro.dev/refreshToken',
  expirationBufferMs: 5 * 60 * 1000, // 5分钟
  forceRefreshIntervalMs: 30 * 60 * 1000, // 30分钟
  periodicRefreshIntervalMs: 30 * 60 * 1000, // 30分钟
  refreshCheckIntervalMs: 5 * 60 * 1000, // 5分钟
  maxRetryAttempts: 3,
  retryDelayMs: 1000
};

/**
 * 从环境变量获取token配置
 */
export function getTokenConfig(): TokenConfig {
  return {
    ...defaultTokenConfig,
    tokenPath: process.env.TOKEN_PATH || defaultTokenConfig.tokenPath,
    refreshEndpoint: process.env.TOKEN_REFRESH_ENDPOINT || defaultTokenConfig.refreshEndpoint,
    expirationBufferMs: parseInt(process.env.TOKEN_EXPIRATION_BUFFER_MS || '') || defaultTokenConfig.expirationBufferMs,
    forceRefreshIntervalMs: parseInt(process.env.TOKEN_FORCE_REFRESH_INTERVAL_MS || '') || defaultTokenConfig.forceRefreshIntervalMs,
    periodicRefreshIntervalMs: parseInt(process.env.TOKEN_PERIODIC_REFRESH_INTERVAL_MS || '') || defaultTokenConfig.periodicRefreshIntervalMs,
    refreshCheckIntervalMs: parseInt(process.env.TOKEN_REFRESH_CHECK_INTERVAL_MS || '') || defaultTokenConfig.refreshCheckIntervalMs,
    maxRetryAttempts: parseInt(process.env.TOKEN_MAX_RETRY_ATTEMPTS || '') || defaultTokenConfig.maxRetryAttempts,
    retryDelayMs: parseInt(process.env.TOKEN_RETRY_DELAY_MS || '') || defaultTokenConfig.retryDelayMs
  };
}