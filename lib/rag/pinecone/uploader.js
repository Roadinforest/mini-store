import { pineconeClient, CONFIG } from './client.js';

/**
 * Pinecone 向量上传器
 */
class PineconeUploader {
  /**
   * 带重试的上传向量
   * @param {Object} vector - 向量数据
   * @param {number} maxRetries - 最大重试次数
   */
  static async uploadWithRetry(vector, maxRetries = CONFIG.MAX_RETRIES) {
    const index = pineconeClient.getIndex();
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        await index.upsert([vector]);
        return;
      } catch (error) {
        if (attempt === maxRetries) {
          throw new Error(`Failed after ${maxRetries} attempts: ${error.message}`);
        }
        console.warn(`⚠️ Upload attempt ${attempt} failed, retrying... (${error.message})`);
        await new Promise(resolve => setTimeout(resolve, attempt * 1000));
      }
    }
  }

  /**
   * 上传单个产品到Pinecone
   * @param {string} productId - 产品ID
   * @param {string} title - 产品标题
   * @param {string} content - 产品内容
   * @param {number[]} embedding - embedding向量
   * @param {Object} metadata - 额外的元数据
   */
  static async uploadProduct(productId, title, content, embedding, metadata = {}) {
    if (!productId || !embedding || !Array.isArray(embedding)) {
      throw new Error('Invalid product data: missing required fields');
    }
    
    try {
      const vector = {
        id: productId,
        values: embedding,
        metadata: {
          title: title.trim(),
          content: content,
          type: 'product',
          timestamp: Date.now(),
          contentLength: content.length,
          ...metadata
        }
      };
      
      await this.uploadWithRetry(vector);
      console.log(`✅ Uploaded product ${productId}: ${title.substring(0, 50)}${title.length > 50 ? '...' : ''}`);
    } catch (error) {
      console.error(`❌ Error uploading product ${productId}:`, error.message);
      throw error;
    }
  }

  /**
   * 上传单个评论组到Pinecone
   * @param {string} parentAsin - 父产品ASIN
   * @param {string} batch - 批次信息
   * @param {string} content - 评论内容
   * @param {number[]} embedding - embedding向量
   * @param {Object} metadata - 额外的元数据
   */
  static async uploadComments(parentAsin, batch, content, embedding, metadata = {}) {
    if (!parentAsin || !embedding || !Array.isArray(embedding)) {
      throw new Error('Invalid comments data: missing required fields');
    }
    
    try {
      const commentId = batch === '1' ? `comments_${parentAsin}` : `comments_${parentAsin}_batch_${batch}`;
      
      const vector = {
        id: commentId,
        values: embedding,
        metadata: {
          parent_asin: parentAsin,
          batch: batch,
          content: content,
          type: 'comments',
          timestamp: Date.now(),
          contentLength: content.length,
          ...metadata
        }
      };
      
      await this.uploadWithRetry(vector);
      console.log(`✅ Uploaded comments ${commentId} (${metadata.reviewCount || 0} reviews)`);
    } catch (error) {
      console.error(`❌ Error uploading comments ${parentAsin}_${batch}:`, error.message);
      throw error;
    }
  }

  /**
   * 批量上传向量
   * @param {Array} vectors - 向量数组
   * @param {number} batchSize - 批处理大小
   */
  static async uploadBatch(vectors, batchSize = CONFIG.BATCH_SIZE) {
    if (!vectors || !Array.isArray(vectors) || vectors.length === 0) {
      throw new Error('Invalid vectors array');
    }

    const totalBatches = Math.ceil(vectors.length / batchSize);
    let successCount = 0;
    let failedCount = 0;

    for (let i = 0; i < vectors.length; i += batchSize) {
      const batch = vectors.slice(i, i + batchSize);
      const batchNum = Math.floor(i / batchSize) + 1;
      
      console.log(`📦 Uploading batch ${batchNum}/${totalBatches} (${batch.length} vectors)`);
      
      const results = await Promise.allSettled(
        batch.map(vector => this.uploadWithRetry(vector))
      );
      
      // 统计结果
      results.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          successCount++;
        } else {
          failedCount++;
          console.error(`❌ Failed to upload vector ${batch[index].id}: ${result.reason.message}`);
        }
      });
      
      // 批次间延迟
      if (i + batchSize < vectors.length) {
        console.log(`⏳ Waiting ${CONFIG.BATCH_DELAY}ms before next batch...`);
        await new Promise(resolve => setTimeout(resolve, CONFIG.BATCH_DELAY));
      }
    }

    return { success: successCount, failed: failedCount };
  }

  /**
   * 删除向量
   * @param {string|Array} ids - 要删除的向量ID（单个或数组）
   */
  static async deleteVectors(ids) {
    try {
      const index = pineconeClient.getIndex();
      const idsArray = Array.isArray(ids) ? ids : [ids];
      
      await index.deleteMany(idsArray);
      console.log(`✅ Deleted ${idsArray.length} vectors`);
    } catch (error) {
      console.error('❌ Error deleting vectors:', error.message);
      throw error;
    }
  }

  /**
   * 清空索引中的所有向量
   */
  static async clearIndex() {
    try {
      const index = pineconeClient.getIndex();
      await index.deleteAll();
      console.log('✅ Index cleared successfully');
    } catch (error) {
      console.error('❌ Error clearing index:', error.message);
      throw error;
    }
  }
}

export {
  PineconeUploader
};