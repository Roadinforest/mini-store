import { AgentConfig, StreamChunk, IAgent, ModelConfigSchema, ModelConfig } from '../core/types';
import { OpenAI } from 'openai';
import { toolHintFunctions, toolsDefinition, toolsMap } from '../tools';
import { normalizeText } from '../utils';
import { z } from 'zod';

export class BaseAgent implements IAgent {
  name: string;
  client: OpenAI;
  modelConfig: ModelConfig;
  agentConfig: AgentConfig;
  toolList: typeof toolsDefinition;

  constructor(name: string, agentConfig: AgentConfig) {
    try {
      this.modelConfig = ModelConfigSchema.parse(agentConfig.modelConfig);
    } catch (error) {
      if (error instanceof z.ZodError) {
        console.error('配置校验失败:', error.message);
        throw new Error(`Agent 配置无效: ${error.message}`);
      }
      throw error;
    }
    this.name = name;
    this.agentConfig = agentConfig;
    this.client = new OpenAI({
      apiKey: process.env.QWEN_API_KEY,
      baseURL: process.env.QWEN_BASE_URL || 'https://dashscope.aliyuncs.com/compatible-mode/v1', // 阿里云 Endpoint
    });
    this.toolList = toolsDefinition.filter(tool => this.agentConfig.tools.includes(tool.function.name));
  }

  async *run(messages: any[]): AsyncGenerator<StreamChunk, void, unknown> {
    let currentMessages = [...messages];

    const systemPromptMessage = {
      role: 'system',
      content: this.agentConfig.systemPrompt,
    };

    if (currentMessages[0]?.role !== 'system') {
      currentMessages.unshift(systemPromptMessage);
      console.log(`🤖 Initializing ${this.name} with system prompt.`);
    }

    yield { type: 'thinking', content: '正在思考...' };

    let turnCount = 0;

    while (turnCount < this.modelConfig.max_turns) {
      turnCount++;

      // A. 调用大模型
      let response;
      try {
        response = await this.client.chat.completions.create({
          model: this.modelConfig.model,
          messages: currentMessages,
          tools: this.toolList as any,
          tool_choice: 'auto',
          stream: true, // 启用流式响应
        });
      } catch (e: any) {
        console.error('Message:', currentMessages);
        console.error('❌ Error during LLM call:', e.message);
        yield {
          type: 'error',
          content:
            'Agent encountered an error while processing your request. Please try again later.',
        };
        return;
      }

      let fullContent = '';
      let toolCalls: any[] = [];
      let currentToolCall: any = null;

      // 处理流式响应
      for await (const chunk of response) {
        const delta = chunk.choices[0]?.delta;

        if (delta?.content) {
          fullContent += delta.content;
          yield {
            type: 'partial',
            delta: delta.content,
            content: fullContent,
          };
        }

        // 处理工具调用
        if (delta?.tool_calls) {
          for (const toolCallDelta of delta.tool_calls) {
            if (toolCallDelta.index !== undefined) {
              if (!toolCalls[toolCallDelta.index]) {
                toolCalls[toolCallDelta.index] = {
                  id: toolCallDelta.id || '',
                  type: 'function',
                  function: { name: '', arguments: '' },
                };
                currentToolCall = toolCalls[toolCallDelta.index];
              } else {
                currentToolCall = toolCalls[toolCallDelta.index];
              }
            }

            if (toolCallDelta.function?.name) {
              currentToolCall.function.name += toolCallDelta.function.name;
            }
            if (toolCallDelta.function?.arguments) {
              currentToolCall.function.arguments += toolCallDelta.function.arguments;
            }
          }
        }
      }

      // 构建完整的响应消息
      const responseMessage: any = {
        role: 'assistant',
        content: fullContent || null,
      };

      if (toolCalls.length > 0) {
        responseMessage.tool_calls = toolCalls;
      }

      console.log('🤖 Agent Response:', responseMessage);
      currentMessages.push(responseMessage);

      // 判断模型是否想调用工具
      if (responseMessage.tool_calls && responseMessage.tool_calls.length > 0) {
        // 遍历所有工具调用
        for (const toolCall of responseMessage.tool_calls) {
          const functionName = toolCall.function.name;
          const args = JSON.parse(toolCall.function.arguments);

          const tool_hint_fn = toolHintFunctions[functionName];
          let hint = `正在调用工具: ${functionName}`;
          if (tool_hint_fn) {
            hint = tool_hint_fn(args);
          }

          yield {
            type: 'tool_call',
            content: hint,
            toolName: functionName,
            toolArgs: args,
          };

          // 执行实际的 TypeScript 函数
          const toolFunction = toolsMap[functionName];
          let toolOutput;

          try {
            if (!toolFunction) throw new Error('Tool not found');
            toolOutput = await toolFunction(args);
          } catch (e: any) {
            toolOutput = { error: e.message };
          }

          console.log(`🛠️ Tool ${functionName} output:`, toolOutput);

          // 特殊处理：检测跳转功能
          if (
            functionName === 'jump_product_page' ||
            (toolOutput && toolOutput.type === 'navigation')
          ) {
            console.log('🔄 Navigation detected, executing redirect...');
            yield {
              type: 'navigation',
              url:
                toolOutput.url ||
                (typeof toolOutput === 'string' ? toolOutput : toolOutput.message),
              message: toolOutput.message || `正在跳转到产品页面...`,
            };
            return;
          }

          // 将工具执行结果作为 Tool Message 塞回历史
          currentMessages.push({
            tool_call_id: toolCall.id,
            role: 'tool',
            name: functionName,
            content: JSON.stringify(toolOutput),
          });
        }
        // 循环继续，带着工具结果再次请求 LLM
      } else {
        // 如果没有 tool_calls，说明模型已经生成了最终回复
        yield {
          type: 'complete',
          content: normalizeText(fullContent || ''),
        };
        return;
      }
    }

    yield {
      type: 'error',
      content: 'Agent 思考步数过多，请重试。',
    };
  }
}
