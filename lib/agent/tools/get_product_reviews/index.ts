import z from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { getReviews } from '@/lib/actions/review.actions';

const getProductReviewsSchema = z.object({
  productId: z.string().describe('产品ID，用于获取该产品的所有评论'),
});

export type GetProductReviewsArgs = z.infer<typeof getProductReviewsSchema>;

const GetProductReviews_Tool = async (args: GetProductReviewsArgs) => {
  try {
    const result = await getReviews({ productId: args.productId });
    const reviews = result.data;
    
    if (!reviews || reviews.length === 0) {
      return `产品ID ${args.productId} 暂无评论`;
    }

    const reviewsText = reviews.map((review, index) => {
      return `评论 ${index + 1}:
用户: ${review.user?.name || '匿名用户'}
评分: ${review.rating}/5 星
标题: ${review.title}
内容: ${review.description}
创建时间: ${review.createdAt}`;
    }).join('\n\n');

    return `产品评论 (共${reviews.length}条):\n\n${reviewsText}`;
  } catch (error) {
    return `获取产品评论时发生错误: ${error instanceof Error ? error.message : '未知错误'}`;
  }
}

export const get_product_reviews_function_definition = {
  type: "function",
  function: {
    name: "get_product_reviews",
    description: "根据产品ID获取该产品的所有用户评论",
    parameters: zodToJsonSchema(getProductReviewsSchema),
  },
}

export default GetProductReviews_Tool;