import { ModelConfig } from "../../core/types";
import { BaseAgent } from "../base-agent";
import { reviewAgentPrompts } from "./prompt";

import { get_product_reviews_function_name } from "../../tools/get_product_reviews";
import { get_product_details_function_name } from "../../tools/get_product_details";

const modelConfig: ModelConfig = {
    model: "qwen-max",
    temperature: 0.1,
    max_tokens: 2048,
    max_turns: 10,
};

export class ReviewAgent extends BaseAgent {
  constructor() {
    super('ReviewAgent', {
      name: 'Review Agent',
      description: 'A specialized agent for analyzing and retrieving product reviews and ratings.',
      systemPrompt: reviewAgentPrompts,
      tools: [
        get_product_reviews_function_name,
        get_product_details_function_name,
      ],
      modelConfig: modelConfig,
    });
  }

  // 简化的评论查询方法，专门用于被其他Agent调用
  async getReviews(productId: string, options?: { analysis?: boolean; summary?: boolean }) {
    const { analysis = false, summary = false } = options || {};
    
    let query = `获取产品ID ${productId} 的评论信息`;
    if (analysis) query += "，并分析评论内容";
    if (summary) query += "，提供评论摘要";

    const reviewMessage = {
      role: 'user',
      content: query
    };

    const results = [];
    for await (const chunk of this.run([reviewMessage])) {
      if (chunk.type === 'complete' && chunk.content) {
        results.push(chunk.content);
      }
    }

    return results.join('');
  }
}

// 导出函数名用于工具定义
export const review_agent_function_name = 'review_agent';