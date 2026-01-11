import { pineconeClient, CONFIG } from './client.ts';

export interface VectorQueryMatch {
  id: string;
  score: number;
  values?: number[];
  metadata: Record<string, any>;
}

export interface VectorQueryResponse {
  matches: VectorQueryMatch[];
}

export interface VectorQueryOptions {
  topK?: number;
  filter?: Record<string, any>;
  includeValues?: boolean;
  includeMetadata?: boolean;
}

export interface EmbeddingFunction {
  (text: string): Promise<number[]>;
}

/**
 * Pinecone 查询器
 */
class PineconeQuery {
  /**
   * 查询向量
   * @param {number[]} queryVector - 查询向量
   * @param {VectorQueryOptions} options - 查询选项
   * @returns {Promise<VectorQueryResponse>} - 查询结果
   */
  static async queryByVector(queryVector: number[], options: VectorQueryOptions = {}): Promise<VectorQueryResponse> {
    try {
      if (!queryVector || !Array.isArray(queryVector)) {
        throw new Error('Invalid query vector');
      }

      const {
        topK = CONFIG.DEFAULT_TOP_K,
        filter = {},
        includeValues = false,
        includeMetadata = true
      } = options;

      const index = pineconeClient.getIndex();

      const queryOptions = {
        vector: queryVector,
        topK: Math.min(topK, CONFIG.MAX_TOP_K), // Pinecone限制
        includeValues,
        includeMetadata,
        ...(Object.keys(filter).length > 0 ? { filter } : {})
      };

      const queryResponse = await index.query(queryOptions);

      console.log(`✅ Found ${queryResponse.matches?.length || 0} results`);
      return queryResponse;
    } catch (error) {
      console.error('❌ Error querying vectors:', (error as Error).message);
      throw error;
    }
  }

  /**
   * 根据文本查询（需要embedding函数）
   * @param {string} queryText - 查询文本
   * @param {EmbeddingFunction} embeddingFunction - embedding生成函数
   * @param {VectorQueryOptions} options - 查询选项
   * @returns {Promise<VectorQueryResponse>} - 查询结果
   */
  static async queryByText(queryText: string, embeddingFunction: EmbeddingFunction, options: VectorQueryOptions = {}): Promise<VectorQueryResponse> {
    try {
      if (!queryText || typeof queryText !== 'string') {
        throw new Error('Invalid query text');
      }

      if (!embeddingFunction || typeof embeddingFunction !== 'function') {
        throw new Error('Embedding function is required');
      }

      console.log(`🔍 Querying for: "${queryText}" (top ${options.topK || CONFIG.DEFAULT_TOP_K})`);

      const queryEmbedding = await embeddingFunction(queryText);
      return await this.queryByVector(queryEmbedding, options);
    } catch (error) {
      console.error('❌ Error querying by text:', (error as Error).message);
      throw error;
    }
  }

  /**
   * 根据产品类型查询
   * @param {number[]} queryVector - 查询向量
   * @param {number} topK - 返回结果数量
   * @returns {Promise<VectorQueryResponse>} - 查询结果
   */
  static async queryProducts(queryVector: number[], topK: number = CONFIG.DEFAULT_TOP_K): Promise<VectorQueryResponse> {
    return await this.queryByVector(queryVector, {
      topK,
      filter: { type: 'product' }
    });
  }

  /**
   * 根据评论类型查询
   * @param {number[]} queryVector - 查询向量
   * @param {number} topK - 返回结果数量
   * @param {string | null} parentAsin - 可选的父产品ASIN过滤
   * @returns {Promise<VectorQueryResponse>} - 查询结果
   */
  static async queryComments(queryVector: number[], topK: number = CONFIG.DEFAULT_TOP_K, parentAsin: string | null = null): Promise<VectorQueryResponse> {
    const filter: Record<string, any> = { type: 'comments' };
    if (parentAsin) {
      filter.parent_asin = parentAsin;
    }

    return await this.queryByVector(queryVector, {
      topK,
      filter
    });
  }

  /**
   * 获取向量统计信息
   * @returns {Promise<any>} - 统计信息
   */
  static async getStats(): Promise<any> {
    try {
      const index = pineconeClient.getIndex();
      const stats = await index.describeIndexStats();
      
      console.log('📊 Index Statistics:');
      console.log(`   Total vectors: ${stats.totalVectorCount || 0}`);
      console.log(`   Dimension: ${stats.dimension || 'Unknown'}`);
      console.log(`   Index fullness: ${stats.indexFullness || 0}`);
      
      if (stats.namespaces) {
        console.log('   Namespaces:');
        Object.entries(stats.namespaces).forEach(([namespace, data]: [string, any]) => {
          console.log(`     ${namespace}: ${data.vectorCount} vectors`);
        });
      }
      
      return stats;
    } catch (error) {
      console.error('❌ Error getting index stats:', (error as Error).message);
      throw error;
    }
  }

  /**
   * 格式化查询结果用于显示
   * @param {VectorQueryResponse} results - 查询结果
   * @param {boolean} showContent - 是否显示内容
   * @param {number} contentLength - 内容截断长度
   */
  static formatResults(results: VectorQueryResponse, showContent: boolean = true, contentLength: number = 500): void {
    if (!results.matches || results.matches.length === 0) {
      console.log('🔍 No results found.');
      return;
    }

    console.log('\n🔍 Query Results:');
    results.matches.forEach((match, index) => {
      const title = match.metadata.title || match.metadata.parent_asin || 'Unknown';
      console.log(`\n${'='.repeat(80)}`);
      console.log(`${index + 1}. ${title}`);
      console.log(`   📊 Score: ${match.score.toFixed(4)}`);
      console.log(`   🏷️  Type: ${match.metadata.type}`);
      console.log(`   🆔 ID: ${match.id}`);
      
      if (match.metadata.reviewCount) {
        console.log(`   📝 Reviews: ${match.metadata.reviewCount}`);
      }
      
      if (match.metadata.parent_asin) {
        console.log(`   🏷️  Parent ASIN: ${match.metadata.parent_asin}`);
      }
      
      if (match.metadata.batch) {
        console.log(`   📦 Batch: ${match.metadata.batch}`);
      }
      
      console.log(`   📄 Content Length: ${match.metadata.contentLength || 0} characters`);
      console.log(`   🕒 Timestamp: ${new Date(match.metadata.timestamp).toISOString()}`);
      
      if (showContent) {
        console.log(`\n📋 Content:`);
        console.log(`${'-'.repeat(40)}`);
        
        const content = match.metadata.content || 'No content available';
        const truncatedContent = content.length > contentLength ? 
          content.substring(0, contentLength) + '\n... (truncated)' : content;
        
        console.log(truncatedContent);
      }
      
      console.log(`\n${'='.repeat(80)}`);
    });
  }
}

export {
  PineconeQuery
};