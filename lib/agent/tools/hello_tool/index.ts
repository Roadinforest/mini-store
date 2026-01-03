import z from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';

const helloToolSchema = z.object({
  query: z.string().describe('输入的query,用于生成问候语'),
});

export type HelloToolArgs = z.infer<typeof helloToolSchema>;

const Hello_Tool = async (args: HelloToolArgs) => {
  return `Hello World ${args.query}`;
}

export const hello_tool_function_definition = {
  type: "function",
  function: {
    name: "hello_tool",
    description: "生成问候语的工具",
    parameters: zodToJsonSchema(helloToolSchema),
  },
}

export default Hello_Tool;