import { PineconeClient, pineconeClient, CONFIG } from './client';
import { PineconeUploader, VectorData, UploadResult } from './uploader';
import { PineconeQuery, VectorQueryOptions, VectorQueryResponse } from './query';
import { generateEmbedding } from './utils';

export interface EmbeddingFunction {
  (text: string): Promise<number[]>;
}

/**
 * Pinecone 工具类 - 统一接口
 */
export class PineconeUtils {
  /**
   * 初始化 Pinecone
   * @returns {{ client: any, index: any }} { client, index }
   */
  static initialize(): any {
    return pineconeClient.initialize();
  }

  /**
   * 获取客户端实例
   * @returns {any} - Pinecone 客户端
   */
  static getClient(): any {
    return pineconeClient.getClient();
  }

  /**
   * 获取索引实例
   * @returns {any} - Pinecone 索引
   */
  static getIndex(): any {
    return pineconeClient.getIndex();
  }

  /**
   * 上传产品向量
   * @param {string} productId - 产品ID
   * @param {string} title - 产品标题
   * @param {string} content - 产品内容
   * @param {number[]} embedding - embedding向量
   * @param {Record<string, any>} metadata - 额外的元数据
   */
  static async uploadProduct(
    productId: string, 
    title: string, 
    content: string, 
    embedding: number[], 
    metadata: Record<string, any> = {}
  ): Promise<void> {
    return await PineconeUploader.uploadProduct(productId, title, content, embedding, metadata);
  }

  /**
   * 上传评论向量
   * @param {string} parentAsin - 父产品ASIN
   * @param {string} batch - 批次信息
   * @param {string} content - 评论内容
   * @param {number[]} embedding - embedding向量
   * @param {Record<string, any>} metadata - 额外的元数据
   */
  static async uploadComments(
    parentAsin: string, 
    batch: string, 
    content: string, 
    embedding: number[], 
    metadata: Record<string, any> = {}
  ): Promise<void> {
    return await PineconeUploader.uploadComments(parentAsin, batch, content, embedding, metadata);
  }

  /**
   * 批量上传向量
   * @param {VectorData[]} vectors - 向量数组
   * @param {number} batchSize - 批处理大小
   */
  static async uploadBatch(vectors: VectorData[], batchSize: number = CONFIG.BATCH_SIZE): Promise<UploadResult> {
    return await PineconeUploader.uploadBatch(vectors, batchSize);
  }

  /**
   * 查询向量
   * @param {number[]} queryVector - 查询向量
   * @param {VectorQueryOptions} options - 查询选项
   * @returns {Promise<VectorQueryResponse>} - 查询结果
   */
  static async query(queryVector: number[], options: VectorQueryOptions = {}): Promise<VectorQueryResponse> {
    return await PineconeQuery.queryByVector(queryVector, options);
  }

  /**
   * 根据文本查询
   * @param {string} queryText - 查询文本
   * @param {EmbeddingFunction} embeddingFunction - embedding生成函数
   * @param {VectorQueryOptions} options - 查询选项
   * @returns {Promise<VectorQueryResponse>} - 查询结果
   */
  static async queryByText(
    queryText: string, 
    embeddingFunction: EmbeddingFunction, 
    options: VectorQueryOptions = {}
  ): Promise<VectorQueryResponse> {
    return await PineconeQuery.queryByText(queryText, embeddingFunction, options);
  }

  /**
   * 查询产品
   * @param {number[]} queryVector - 查询向量
   * @param {number} topK - 返回结果数量
   * @returns {Promise<VectorQueryResponse>} - 查询结果
   */
  static async queryProducts(queryVector: number[], topK: number = CONFIG.DEFAULT_TOP_K): Promise<VectorQueryResponse> {
    return await PineconeQuery.queryProducts(queryVector, topK);
  }

  /**
   * 查询评论
   * @param {number[]} queryVector - 查询向量
   * @param {number} topK - 返回结果数量
   * @param {string | null} parentAsin - 可选的父产品ASIN过滤
   * @returns {Promise<VectorQueryResponse>} - 查询结果
   */
  static async queryComments(
    queryVector: number[], 
    topK: number = CONFIG.DEFAULT_TOP_K, 
    parentAsin: string | null = null
  ): Promise<VectorQueryResponse> {
    return await PineconeQuery.queryComments(queryVector, topK, parentAsin);
  }

  /**
   * 删除向量
   * @param {string | string[]} ids - 要删除的向量ID（单个或数组）
   */
  static async deleteVectors(ids: string | string[]): Promise<void> {
    return await PineconeUploader.deleteVectors(ids);
  }

  /**
   * 清空索引
   */
  static async clearIndex(): Promise<void> {
    return await PineconeUploader.clearIndex();
  }

  /**
   * 获取索引统计信息
   * @returns {Promise<any>} - 统计信息
   */
  static async getStats(): Promise<any> {
    return await PineconeQuery.getStats();
  }

  /**
   * 格式化查询结果
   * @param {VectorQueryResponse} results - 查询结果
   * @param {boolean} showContent - 是否显示内容
   * @param {number} contentLength - 内容截断长度
   */
  static formatResults(
    results: VectorQueryResponse, 
    showContent: boolean = true, 
    contentLength: number = 500
  ): void {
    return PineconeQuery.formatResults(results, showContent, contentLength);
  }

  /**
   * 重置客户端
   */
  static reset(): void {
    return pineconeClient.reset();
  }
}

// 导出所有模块
export {
  // 主要工具类
  PineconeUtils as default,
  
  // 单独的类（如果需要更细粒度的控制）
  PineconeClient,
  PineconeUploader,
  PineconeQuery,
  
  // 单例客户端
  pineconeClient,
  
  // 配置
  CONFIG,

  generateEmbedding,
};

// 向后兼容的别名
export const uploadProduct = PineconeUtils.uploadProduct;
export const uploadComments = PineconeUtils.uploadComments;
export const queryProducts = PineconeUtils.queryByText;
export const initialize = PineconeUtils.initialize;