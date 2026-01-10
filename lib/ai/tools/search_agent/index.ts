import { z } from 'zod';

const searchAgentSchema = z.object({
  query: z.string().describe('用户的搜索查询，描述想要寻找的产品'),
  limit: z.number().optional().describe('返回结果的最大数量，默认为10'),
  method: z.enum(['name', 'rag', 'auto']).optional().describe('搜索方法：name（按名称）、rag（语义搜索）、auto（自动选择，默认）'),
});

export type SearchAgentArgs = z.infer<typeof searchAgentSchema>;

let searchAgentInstance: any = null;

const SearchAgent_Tool = async (args: SearchAgentArgs) => {
  try {
    const { query, limit = 10, method = 'auto' } = args;
    
    // 动态导入 SearchAgent 以避免循环依赖
    if (!searchAgentInstance) {
      const { SearchAgent } = await import('../../agent/search-agent');
      searchAgentInstance = new SearchAgent();
    }

    // 调用 SearchAgent 的搜索方法
    const result = await searchAgentInstance.search(query, { limit, method });
    
    return result || `SearchAgent 未能找到与"${query}"相关的产品信息`;
    
  } catch (error) {
    console.error('SearchAgent 工具执行错误:', error);
    return `SearchAgent 执行搜索时发生错误: ${error instanceof Error ? error.message : '未知错误'}`;
  }
}

export const search_agent_function_definition = {
  type: "function",
  function: {
    name: "search_agent",
    description: "调用专门的搜索代理来执行复杂的产品搜索任务，能够智能选择最佳搜索策略",
    parameters: searchAgentSchema.toJSONSchema(),
  },
} as const;

export const search_agent_function_name = search_agent_function_definition.function.name;

export default SearchAgent_Tool;