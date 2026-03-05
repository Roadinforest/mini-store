import { ModelConfig } from "../../core/types";
import { BaseAgent } from "../base-agent";
import { searchAgentPrompts } from "./prompt";
import { TOOL_NAMES } from "../../tools";


const modelConfig: ModelConfig = {
    model: "qwen-max",
    temperature: 0.1,
    max_tokens: 2048,
    max_turns: 10,
};

export class SearchAgent extends BaseAgent {
  constructor() {
    super('SearchAgent', {
      name: 'Search Agent',
      description: 'A specialized agent for searching and finding products based on user queries.',
      systemPrompt: searchAgentPrompts,
      tools: [
        TOOL_NAMES.SEARCH_PRODUCTS_BY_NAME,
        TOOL_NAMES.HYBRID_SEARCH_PRODUCTS,
        TOOL_NAMES.GET_ALL_PRODUCT_NAMES,
      ],
      modelConfig: modelConfig,
    });
  }

  // 简化的搜索方法，专门用于被其他Agent调用
  async search(query: string, options?: { limit?: number; method?: 'name' | 'rag' | 'auto' }) {
    const { limit = 10, method = 'auto' } = options || {};
    
    const searchMessage = {
      role: 'user',
      content: `搜索产品: ${query}. 搜索方式: ${method}, 返回结果数量: ${limit}`
    };

    const results = [];
    for await (const chunk of this.run([searchMessage])) {
      if (chunk.type === 'complete' && chunk.content) {
        results.push(chunk.content);
      }
    }

    return results.join('');
  }
}

// 导出函数名用于工具定义
export const search_agent_function_name = 'search_agent';