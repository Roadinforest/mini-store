const { PineconeClient, pineconeClient, CONFIG } = require('./client');
const { PineconeUploader } = require('./uploader');
const { PineconeQuery } = require('./query');

/**
 * Pinecone 工具类 - 统一接口
 */
class PineconeUtils {
  /**
   * 初始化 Pinecone
   * @returns {Object} { client, index }
   */
  static initialize() {
    return pineconeClient.initialize();
  }

  /**
   * 获取客户端实例
   * @returns {Object} - Pinecone 客户端
   */
  static getClient() {
    return pineconeClient.getClient();
  }

  /**
   * 获取索引实例
   * @returns {Object} - Pinecone 索引
   */
  static getIndex() {
    return pineconeClient.getIndex();
  }

  /**
   * 上传产品向量
   * @param {string} productId - 产品ID
   * @param {string} title - 产品标题
   * @param {string} content - 产品内容
   * @param {number[]} embedding - embedding向量
   * @param {Object} metadata - 额外的元数据
   */
  static async uploadProduct(productId, title, content, embedding, metadata = {}) {
    return await PineconeUploader.uploadProduct(productId, title, content, embedding, metadata);
  }

  /**
   * 上传评论向量
   * @param {string} parentAsin - 父产品ASIN
   * @param {string} batch - 批次信息
   * @param {string} content - 评论内容
   * @param {number[]} embedding - embedding向量
   * @param {Object} metadata - 额外的元数据
   */
  static async uploadComments(parentAsin, batch, content, embedding, metadata = {}) {
    return await PineconeUploader.uploadComments(parentAsin, batch, content, embedding, metadata);
  }

  /**
   * 批量上传向量
   * @param {Array} vectors - 向量数组
   * @param {number} batchSize - 批处理大小
   */
  static async uploadBatch(vectors, batchSize = CONFIG.BATCH_SIZE) {
    return await PineconeUploader.uploadBatch(vectors, batchSize);
  }

  /**
   * 查询向量
   * @param {number[]} queryVector - 查询向量
   * @param {Object} options - 查询选项
   * @returns {Promise<Object>} - 查询结果
   */
  static async query(queryVector, options = {}) {
    return await PineconeQuery.queryByVector(queryVector, options);
  }

  /**
   * 根据文本查询
   * @param {string} queryText - 查询文本
   * @param {Function} embeddingFunction - embedding生成函数
   * @param {Object} options - 查询选项
   * @returns {Promise<Object>} - 查询结果
   */
  static async queryByText(queryText, embeddingFunction, options = {}) {
    return await PineconeQuery.queryByText(queryText, embeddingFunction, options);
  }

  /**
   * 查询产品
   * @param {number[]} queryVector - 查询向量
   * @param {number} topK - 返回结果数量
   * @returns {Promise<Object>} - 查询结果
   */
  static async queryProducts(queryVector, topK = CONFIG.DEFAULT_TOP_K) {
    return await PineconeQuery.queryProducts(queryVector, topK);
  }

  /**
   * 查询评论
   * @param {number[]} queryVector - 查询向量
   * @param {number} topK - 返回结果数量
   * @param {string} parentAsin - 可选的父产品ASIN过滤
   * @returns {Promise<Object>} - 查询结果
   */
  static async queryComments(queryVector, topK = CONFIG.DEFAULT_TOP_K, parentAsin = null) {
    return await PineconeQuery.queryComments(queryVector, topK, parentAsin);
  }

  /**
   * 删除向量
   * @param {string|Array} ids - 要删除的向量ID（单个或数组）
   */
  static async deleteVectors(ids) {
    return await PineconeUploader.deleteVectors(ids);
  }

  /**
   * 清空索引
   */
  static async clearIndex() {
    return await PineconeUploader.clearIndex();
  }

  /**
   * 获取索引统计信息
   * @returns {Promise<Object>} - 统计信息
   */
  static async getStats() {
    return await PineconeQuery.getStats();
  }

  /**
   * 格式化查询结果
   * @param {Object} results - 查询结果
   * @param {boolean} showContent - 是否显示内容
   * @param {number} contentLength - 内容截断长度
   */
  static formatResults(results, showContent = true, contentLength = 500) {
    return PineconeQuery.formatResults(results, showContent, contentLength);
  }

  /**
   * 重置客户端
   */
  static reset() {
    return pineconeClient.reset();
  }
}

// 导出所有模块
module.exports = {
  // 主要工具类
  PineconeUtils,
  
  // 单独的类（如果需要更细粒度的控制）
  PineconeClient,
  PineconeUploader,
  PineconeQuery,
  
  // 单例客户端
  pineconeClient,
  
  // 配置
  CONFIG,
  
  // 向后兼容的别名
  uploadProduct: PineconeUtils.uploadProduct,
  uploadComments: PineconeUtils.uploadComments,
  queryProducts: PineconeUtils.queryByText,
  initialize: PineconeUtils.initialize
};