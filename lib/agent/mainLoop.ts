import OpenAI from "openai";
import { toolsDefinition, toolsMap } from "./registry";

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

export async function runAgent(messages: any[]) {
  let currentMessages = [...messages];
  let turnCount = 0;

  while (turnCount < config.MAX_TURNS) {
    turnCount++;

    // A. 调用大模型
    const response = await client.chat.completions.create({
      model: config.model,
      messages: currentMessages,
      tools: toolsDefinition as any,
      tool_choice: "auto",
    });

    const responseMessage = response.choices[0].message;
    console.log("🤖 Agent Response:", responseMessage);

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
            if (!toolFunction) throw new Error("Tool not found");
            toolOutput = await toolFunction(args);
        } catch (e: any) {
            toolOutput = { error: e.message };
        }

        // F. 将工具执行结果作为 Tool Message 塞回历史
        currentMessages.push({
          tool_call_id: toolCall.id,
          role: "tool",
          name: functionName,
          content: JSON.stringify(toolOutput),
        });
      }
      // 循环继续，带着工具结果再次请求 LLM
    } else {
      // G. 如果没有 tool_calls，说明模型已经生成了最终回复，直接返回
      return responseMessage.content;
    }
  }

  return "Agent 思考步数过多，请重试。";
}