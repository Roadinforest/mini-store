import { z } from 'zod';
import { Tool, ToolDefinition, ToolHandler } from '../types';

const reviewAgentSchema = z.object({
  productId: z.string().describe('产品ID，用于获取该产品的评论信息'),
  analysis: z.boolean().optional().describe('是否需要分析评论内容，包括情感分析和主题分析，默认为true'),
  summary: z.boolean().optional().describe('是否需要提供评论摘要和购买建议，默认为true'),
});

type ReviewAgentArgs = z.infer<typeof reviewAgentSchema>;

let reviewAgentInstance: any = null;

const handler: ToolHandler<ReviewAgentArgs> = async (args: ReviewAgentArgs) => {
  try {
    const { productId, analysis = true, summary = true } = args;
    
    // 动态导入 ReviewAgent 以避免循环依赖
    if (!reviewAgentInstance) {
      const { ReviewAgent } = await import('../../agent/review-agent');
      reviewAgentInstance = new ReviewAgent();
    }

    // 调用 ReviewAgent 的评论查询方法
    const result = await reviewAgentInstance.getReviews(productId, { analysis, summary });
    
    return result || `ReviewAgent 未能找到产品ID "${productId}" 的评论信息`;
    
  } catch (error) {
    console.error('ReviewAgent 工具执行错误:', error);
    return `ReviewAgent 执行评论分析时发生错误: ${error instanceof Error ? error.message : '未知错误'}`;
  }
}

const definition : ToolDefinition = {
  type: "function",
  function: {
    name: "review_agent",
    description: "调用专门的评论分析代理来获取和分析产品评论，提供评论摘要、情感分析和购买建议",
    parameters: reviewAgentSchema.toJSONSchema(),
  },
} as const;

const hintFunction = (args: ReviewAgentArgs): string => {
  // const { productId, analysis = true, summary = true } = args;
  // const parts = [`正在使用 ReviewAgent 获取评论：产品ID ${productId}`];
  // parts.push(analysis ? '包含评论分析' : '不含评论分析');
  // parts.push(summary ? '包含评论摘要' : '不含评论摘要');
  // return `${parts.join('，')}`;
  return `Review Agent为您服务，\n正在为您获取并分析产品ID为 ${args.productId} 的评论信息`;
}

const ReviewAgent_Tool:Tool<ReviewAgentArgs> = {
  definition: definition,
  handler: handler,
  hintFunction: hintFunction,
}

export default ReviewAgent_Tool;