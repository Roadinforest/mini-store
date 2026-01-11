import { Pinecone } from '@pinecone-database/pinecone';

// 常量配置
export const CONFIG = {
  INDEX_NAME: 'mini-store',
  DEFAULT_TOP_K: 5,
  MAX_TOP_K: 100,
  BATCH_SIZE: 5,
  BATCH_DELAY: 1000, // ms
  MAX_RETRIES: 3
};

export interface PineconeInitResult {
  pc: Pinecone;
  index: any;
}

/**
 * Pinecone 客户端管理器
 */
export class PineconeClient {
  private pc: Pinecone | null = null;
  private index: any = null;
  private isInitialized: boolean = false;

  constructor() {
    this.pc = null;
    this.index = null;
    this.isInitialized = false;
  }

  /**
   * 验证环境变量
   * @throws {Error} 如果缺少必要的环境变量
   */
  validateEnvironment(): void {
    if (!process.env.PINECONE_API_KEY) {
      throw new Error('PINECONE_API_KEY is not set in environment variables.');
    }
  }

  /**
   * 初始化 Pinecone 客户端
   * @returns {PineconeInitResult} { pc, index } - Pinecone 客户端和索引实例
   */
  initialize(): PineconeInitResult {
    if (this.isInitialized && this.pc && this.index) {
      return { pc: this.pc, index: this.index };
    }

    this.validateEnvironment();

    this.pc = new Pinecone({
      apiKey: process.env.PINECONE_API_KEY!
    });

    this.index = this.pc.index(CONFIG.INDEX_NAME);
    this.isInitialized = true;

    console.log(`✅ Pinecone client initialized with index: ${CONFIG.INDEX_NAME}`);

    return { pc: this.pc, index: this.index };
  }

  /**
   * 获取初始化的索引
   * @returns {any} - Pinecone 索引实例
   */
  getIndex(): any {
    if (!this.isInitialized) {
      this.initialize();
    }
    return this.index;
  }

  /**
   * 获取初始化的客户端
   * @returns {Pinecone} - Pinecone 客户端实例
   */
  getClient(): Pinecone {
    if (!this.isInitialized) {
      this.initialize();
    }
    return this.pc!;
  }

  /**
   * 重置客户端实例
   */
  reset(): void {
    this.pc = null;
    this.index = null;
    this.isInitialized = false;
  }
}

// 单例实例
export const pineconeClient = new PineconeClient();