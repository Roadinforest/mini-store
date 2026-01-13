import { z } from 'zod';
import { getProductById } from '@/lib/actions/product.actions';
import { Tool, ToolDefinition, ToolHandler } from '../types';

const getProductDetailsSchema = z.object({
  productId: z.string().describe('产品ID，用于获取产品详情'),
});

type GetProductDetailsArgs = z.infer<typeof getProductDetailsSchema>;

const handler: ToolHandler<GetProductDetailsArgs> = async (args: GetProductDetailsArgs) => {
  try {
    const product = await getProductById(args.productId);
    
    if (!product) {
      return `未找到ID为 ${args.productId} 的产品`;
    }

    return `产品详情：
名称: ${product.name}
描述: ${product.description}
价格: $${product.price}
分类: ${product.category}
库存: ${product.stock}
评分: ${product.rating}
评论数: ${product.numReviews}
是否特色产品: ${product.isFeatured ? '是' : '否'}
品牌: ${product.brand}
图片: ${product.images?.join(', ') || '无'}
创建时间: ${product.createdAt}`;
  } catch (error) {
    return `获取产品详情时发生错误: ${error instanceof Error ? error.message : '未知错误'}`;
  }
}

const definition : ToolDefinition= {
  type: "function",
  function: {
    name: "get_product_details",
    description: "根据产品ID获取详细的产品信息",
    parameters: getProductDetailsSchema.toJSONSchema(),
  },
}

const GetProductDetails_Tool:Tool<GetProductDetailsArgs> = {
  definition: definition,
  handler: handler,
}

export default GetProductDetails_Tool;