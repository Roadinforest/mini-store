import { z } from 'zod';
import { PineconeQuery,generateEmbedding } from '@/lib/rag/pinecone';


const ragSearchProductsSchema = z.object({
  query: z.string().describe('产品搜索查询文本(需要翻译为英文)'),
  topK: z.number().optional().default(5).describe('返回结果数量，默认为5'),
});

export type RagSearchProductsArgs = z.infer<typeof ragSearchProductsSchema>;

const RagSearchProducts_Tool = async (args: RagSearchProductsArgs) => {
  try {
    const { query, topK = 5 } = args;
    
    if (!query.trim()) {
      return {
        success: false,
        message: '搜索查询不能为空'
      };
    }

    console.log(`🔍 RAG搜索产品: "${query}" (返回${topK}个结果)`);

    // 使用 PineconeQuery 根据文本查询产品
    const queryResults = await PineconeQuery.queryByText(
      query, 
      generateEmbedding,
      {
        topK,
        filter: { type: 'product' },
        includeValues: false,
        includeMetadata: true
      }
    );

    if (!queryResults.matches || queryResults.matches.length === 0) {
      return {
        success: false,
        message: `没有找到与"${query}"相关的产品`,
        results: []
      };
    }

    // 格式化结果
    const formattedResults = queryResults.matches.map((match: any, index: number) => {
      const metadata = match.metadata || {};
      return {
        rank: index + 1,
        score: match.score?.toFixed(4) || '0.0000',
        id: match.id,
        title: metadata.title || '未知产品',
        content: metadata.content || '暂无描述',
        type: metadata.type || 'product',
        reviewCount: metadata.reviewCount || 0,
        contentLength: metadata.contentLength || 0,
        timestamp: metadata.timestamp ? new Date(metadata.timestamp).toISOString() : '未知时间'
      };
    });

    return {
      success: true,
      message: `找到${formattedResults.length}个相关产品`,
      query: query,
      topK: topK,
      results: formattedResults
    };

  } catch (error) {
    console.error('❌ RAG搜索产品出错:', (error as Error).message);
    return {
      success: false,
      message: `搜索失败: ${(error as Error).message}`,
      results: []
    };
  }
};

export const rag_search_products_function_definition = {
  type: "function" as const,
  function: {
    name: "rag_search_products",
    description: "使用RAG(检索增强生成)技术在向量数据库中搜索相关产品信息",
    parameters: ragSearchProductsSchema.toJSONSchema(),
  },
}

export default RagSearchProducts_Tool;