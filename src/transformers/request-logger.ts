/**
 * 请求日志记录transformer
 * 用于记录Claude Code发送的原始请求格式
 */

import { writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';

export class RequestLoggerTransformer {
  name = 'request-logger';
  
  private logDir = join(process.cwd(), 'test');
  private logFile = join(this.logDir, 'claude-code-requests.json');
  private requests: any[] = [];

  constructor() {
    console.log('🔍 RequestLogger transformer constructed!');
    
    // 确保日志目录存在
    if (!existsSync(this.logDir)) {
      mkdirSync(this.logDir, { recursive: true });
    }
    
    // 读取已有的请求记录
    if (existsSync(this.logFile)) {
      try {
        const data = require(this.logFile);
        this.requests = Array.isArray(data) ? data : [];
        console.log(`📄 RequestLogger: 已加载 ${this.requests.length} 个历史请求`);
      } catch (error) {
        console.log('⚠️ RequestLogger: 无法读取历史请求记录');
        this.requests = [];
      }
    }
  }

  // 记录请求格式
  async transformRequestIn(request: any, provider: any): Promise<any> {
    console.log('\n🚨🚨🚨 REQUEST LOGGER TRANSFORM REQUEST IN CALLED! 🚨🚨🚨');
    console.log('📥 原始请求:', JSON.stringify(request, null, 2));
    console.log('🔧 Provider信息:', JSON.stringify(provider, null, 2));
    
    // 记录请求信息
    const logEntry = {
      timestamp: new Date().toISOString(),
      source: 'claude-code',
      provider: provider?.name || 'unknown',
      request: request,
      providerConfig: provider
    };
    
    this.requests.push(logEntry);
    
    // 保存到文件
    try {
      writeFileSync(this.logFile, JSON.stringify(this.requests, null, 2));
      console.log(`💾 RequestLogger: 请求已记录到 ${this.logFile}`);
      console.log(`📊 RequestLogger: 总计 ${this.requests.length} 个请求记录`);
    } catch (error) {
      console.error('❌ RequestLogger: 保存失败:', error);
    }
    
    // 分析Claude Code请求格式
    console.log('\n📋 Claude Code 请求格式分析:');
    console.log('=================================');
    console.log(`模型: ${request.model}`);
    console.log(`最大token: ${request.max_tokens}`);
    console.log(`消息数量: ${request.messages?.length || 0}`);
    
    if (request.messages && request.messages.length > 0) {
      console.log('消息结构:');
      request.messages.forEach((msg: any, index: number) => {
        console.log(`  ${index + 1}. 角色: ${msg.role}, 内容类型: ${typeof msg.content}`);
        if (typeof msg.content === 'string') {
          console.log(`     内容预览: "${msg.content.substring(0, 50)}..."`);
        } else if (Array.isArray(msg.content)) {
          console.log(`     内容块数: ${msg.content.length}`);
        }
      });
    }
    
    // 检查其他字段
    const otherFields = Object.keys(request).filter(key => 
      !['model', 'max_tokens', 'messages'].includes(key)
    );
    
    if (otherFields.length > 0) {
      console.log('其他字段:', otherFields.join(', '));
    }
    
    console.log('=================================\n');
    
    // 原样返回请求，不做修改
    return request;
  }

  // 不需要处理响应
  async transformResponseOut(response: Response): Promise<Response> {
    console.log('📤 RequestLogger: 响应通过，不做处理');
    return response;
  }
}

// 导出实例
export default new RequestLoggerTransformer();