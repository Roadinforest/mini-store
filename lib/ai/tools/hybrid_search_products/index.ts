import { z } from 'zod';
import { searchProducts } from '@/lib/service/search';

const hybridSearchProductsSchema = z.object({
  query: z.string().describe('产品搜索查询文本'),
  limit: z.number().optional().default(10).describe('返回结果数量，默认为10，最大20'),
});

export type HybridSearchProductsArgs = z.infer<typeof hybridSearchProductsSchema>;

const HybridSearchProducts_Tool = async (args: HybridSearchProductsArgs) => {
  try {
    const { query, limit = 10 } = args;
    
    if (!query.trim()) {
      return {
        success: false,
        message: '搜索查询不能为空'
      };
    }

    console.log(`🔍 混合搜索产品: "${query}" (返回${Math.min(limit, 20)}个结果)`);

    // 使用混合搜索服务 (Vector + Text + RRF + Rerank)
    const searchResults = await searchProducts(query);

    if (!searchResults || searchResults.length === 0) {
      return {
        success: false,
        message: `没有找到与"${query}"相关的产品`,
        results: []
      };
    }

    // 格式化结果，限制返回数量
    const formattedResults = searchResults
      .slice(0, Math.min(limit, 20))
      .map((product: any, index: number) => {
        return {
          rank: index + 1,
          score: product._score?.toFixed(4) || '0.0000',
          id: product.id,
          name: product.name,
          brand: product.brand || '',
          category: product.category || '',
          price: product.price,
          slug: product.slug,
          description: product.description || '',
          image: product.image || '',
          isFeatured: product.isFeatured || false
        };
      });

    return {
      success: true,
      message: `找到${formattedResults.length}个相关产品`,
      query: query,
      limit: Math.min(limit, 20),
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

export const hybrid_search_products_function_definition = {
  type: "function" as const,
  function: {
    name: "hybrid_search_products",
    description: "使用混合搜索技术（向量搜索 + 全文检索 + RRF融合 + 重排序）搜索产品信息，提供最相关的搜索结果",
    parameters: hybridSearchProductsSchema.toJSONSchema(),
  },
}

export const hybrid_search_products_function_name = "hybrid_search_products";
export default HybridSearchProducts_Tool;