import { z } from 'zod';
import { getAllProducts } from '@/lib/actions/product.actions';
import { Tool, ToolDefinition, ToolHandler } from '../types';

const searchProductsByNameSchema = z.object({
  query: z.string().describe('搜索关键词，用于按产品名称搜索产品'),
  limit: z.number().optional().describe('返回结果的最大数量，默认为10'),
});

type SearchProductsByNameArgs = z.infer<typeof searchProductsByNameSchema>;

const handler: ToolHandler<SearchProductsByNameArgs> = async (args: SearchProductsByNameArgs) => {
  try {
    const { query, limit = 10 } = args;
    
    const result = await getAllProducts({
      query: query,
      page: 1,
      limit: limit,
    });

    if (!result.data || result.data.length === 0) {
      return `未找到与"${query}"相关的产品`;
    }

    const productsText = result.data.map((product, index) => {
      return `产品 ${index + 1}:
ID: ${product.id}
名称: ${product.name}
价格: $${product.price}
分类: ${product.category}
库存: ${product.stock}
评分: ${product.rating}/5 (${product.numReviews} 评论)
品牌: ${product.brand}`;
    }).join('\n\n');

    return `搜索结果 (共找到${result.data.length}个产品):\n\n${productsText}`;
  } catch (error) {
    return `搜索产品时发生错误: ${error instanceof Error ? error.message : '未知错误'}`;
  }
}

const definition : ToolDefinition = {
  type: "function",
  function: {
    name: "search_products_by_name",
    description: "根据产品名称搜索相关产品",
    parameters: searchProductsByNameSchema.toJSONSchema(),
  },
}

const SearchProductsByName_Tool: Tool<SearchProductsByNameArgs> = {
  definition: definition,
  handler: handler,
}

export default SearchProductsByName_Tool;