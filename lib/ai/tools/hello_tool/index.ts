import { z } from 'zod';
import { Tool, ToolDefinition, ToolHandler } from '../types';

const helloToolSchema = z.object({
  query: z.string().describe('输入的query,用于生成问候语'),
});

type HelloToolArgs = z.infer<typeof helloToolSchema>;

const handler: ToolHandler<HelloToolArgs> = async (args: HelloToolArgs) => {
  return `Hello World ${args.query}`;
}

const definition: ToolDefinition = {
  type: "function",
  function: {
    name: "hello_tool",
    description: "生成问候语的工具",
    parameters: helloToolSchema.toJSONSchema(),
  },
}

const Hello_Tool: Tool<HelloToolArgs> = {
  definition: definition,
  handler: handler,
}

export default Hello_Tool;