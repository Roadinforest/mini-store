import OpenAI from "openai";
import { toolsDefinition, toolsMap } from "./tools";
import { shopAgentPrompts } from "./prompts";

const client = new OpenAI({
  apiKey: process.env.QWEN_API_KEY,
  baseURL: process.env.QWEN_BASE_URL || "https://dashscope.aliyuncs.com/compatible-mode/v1", // 阿里云 Endpoint
});

const config = {
    model: "qwen-max",
    temperature: 0.0,
    max_tokens: 2048,
    MAX_TURNS: 5,
};

// 定义返回类型
interface AgentResponse {
  type?: 'navigation' | 'text';
  action?: string;
  url?: string;
  message?: string;
  content?: string;
  shouldExecuteNavigation?: boolean;
}

// 流式输出的数据块类型
interface StreamChunk {
  type: 'partial' | 'complete' | 'navigation' | 'error' | 'tool_call' | 'thinking';
  content?: string;
  url?: string;
  message?: string;
  toolName?: string;
  toolArgs?: any;
  delta?: string;
}

export async function runAgent(messages: any[]): Promise<string | AgentResponse> {
  let currentMessages = [...messages];

  const systemPromptMessage = {
    role: 'system',
    content: shopAgentPrompts,
  };

  if(currentMessages[0]?.role !== 'system'){
    currentMessages.unshift(systemPromptMessage);
    console.log('🤖 Initializing with system prompt.', systemPromptMessage);
  }
  console.log('🤖 Messages Length:', currentMessages.length);

  let turnCount = 0;

  while (turnCount < config.MAX_TURNS) {
    turnCount++;

    // A. 调用大模型
    let response;
    try {
      response = await client.chat.completions.create({
        model: config.model,
        messages: currentMessages,
        tools: toolsDefinition as any,
        tool_choice: 'auto',
      });
    } catch (e: any) {
      console.error('❌ Error during LLM call:', e.message);
      return 'Agent encountered an error while processing your request. Please try again later.';
    }

    const responseMessage = response.choices[0].message;
    console.log('🤖 Agent Response:', responseMessage);
    // console.log("🤖 Agent Response:");
    // console.dir(response, { depth: null, colors: true });

    // B. 把模型的回复（可能包含 tool_calls）加入历史
    currentMessages.push(responseMessage);

    // C. 判断模型是否想调用工具
    if (responseMessage.tool_calls && responseMessage.tool_calls.length > 0) {
      // D. 遍历所有工具调用 (Qwen 可能一次调用多个)
      for (const toolCall of responseMessage.tool_calls as any) {
        const functionName = toolCall.function.name;
        const args = JSON.parse(toolCall.function.arguments);

        console.log(`🤖 Agent calling: ${functionName}`, args);

        // E. 执行实际的 TypeScript 函数
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
          // 如果是跳转工具，直接返回跳转指令，不继续对话循环
          return {
            type: 'navigation',
            action: 'redirect',
            url:
              toolOutput.url || (typeof toolOutput === 'string' ? toolOutput : toolOutput.message),
            message: toolOutput.message || `正在跳转到产品页面...`,
            shouldExecuteNavigation: true,
          } as AgentResponse;
        }

        // F. 将工具执行结果作为 Tool Message 塞回历史
        currentMessages.push({
          tool_call_id: toolCall.id,
          role: 'tool',
          name: functionName,
          content: JSON.stringify(toolOutput),
        });
      }
      // 循环继续，带着工具结果再次请求 LLM
    } else {
      // G. 如果没有 tool_calls，说明模型已经生成了最终回复，直接返回
      return normalizeText(responseMessage.content || '');
    }
  }

  return 'Agent 思考步数过多，请重试。';
}

// 流式输出函数
export async function* runAgentStream(messages: any[]): AsyncGenerator<StreamChunk, void, unknown> {
  let currentMessages = [...messages];

  const systemPromptMessage = {
    role: 'system',
    content: shopAgentPrompts,
  };

  if(currentMessages[0]?.role !== 'system'){
    currentMessages.unshift(systemPromptMessage);
    console.log('🤖 Initializing with system prompt.');
  }

  yield { type: 'thinking', content: '正在思考...' };

  let turnCount = 0;

  while (turnCount < config.MAX_TURNS) {
    turnCount++;

    // A. 调用大模型
    let response;
    try {
      response = await client.chat.completions.create({
        model: config.model,
        messages: currentMessages,
        tools: toolsDefinition as any,
        tool_choice: 'auto',
        stream: true, // 启用流式响应
      });
    } catch (e: any) {
      console.error('❌ Error during LLM call:', e.message);
      yield { 
        type: 'error', 
        content: 'Agent encountered an error while processing your request. Please try again later.' 
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
          content: fullContent 
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
                function: { name: '', arguments: '' }
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

        yield { 
          type: 'tool_call', 
          content: `正在调用工具: ${functionName}`,
          toolName: functionName,
          toolArgs: args
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
            url: toolOutput.url || (typeof toolOutput === 'string' ? toolOutput : toolOutput.message),
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
        content: normalizeText(fullContent || '') 
      };
      return;
    }
  }

  yield { 
    type: 'error', 
    content: 'Agent 思考步数过多，请重试。' 
  };
}

// 辅助函数：规范化文本格式
function normalizeText(text: string): string {
  if (!text) return '';

  return text
    .replace(/(-\s[^\n]+)\n+(-\s)/g, '$1\n$2') // 列表项之间只保留一个换行符
    .replace(/\n+$/, '') // 去掉结尾的多余换行符
    .replace(/^\n+/, ''); // 去掉开头的多余换行符
}