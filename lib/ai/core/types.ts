import { z } from "zod";

// Agent 的配置接口
export interface AgentConfig {
  name: string;
  description: string;
  systemPrompt: string;
  tools: string[]; // 允许使用的工具集合
  modelConfig: ModelConfig;
}

// 统一的 Agent 接口
export interface IAgent {
  name: string;
  agentConfig: AgentConfig;
  run(messages: any[]): AsyncGenerator<StreamChunk, void, unknown>;
}

export const ModelConfigSchema = z.object({
  model: z.enum(['qwen-max', 'text-embedding-v3']).default('qwen-max'),
  temperature: z.number().min(0).max(1).default(0.0),
  max_tokens: z.number().default(2048), 
  max_turns: z.number().default(5),
});


export type ModelConfig = z.infer<typeof ModelConfigSchema>;

// 定义返回类型
export interface AgentResponse {
  type?: 'navigation' | 'text';
  action?: string;
  url?: string;
  message?: string;
  content?: string;
  shouldExecuteNavigation?: boolean;
}

// 流式输出的数据块类型
export interface StreamChunk {
  type: 'partial' | 'complete' | 'navigation' | 'error' | 'tool_call' | 'thinking';
  content?: string;
  url?: string;
  message?: string;
  toolName?: string;
  toolArgs?: any;
  delta?: string;
}
