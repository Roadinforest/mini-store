import { z } from "zod";
import { Hello_Tool } from "./tools";

// 1. 定义工具结构
const toolsDefinition = [
  {
    type: "function",
    function: {
      name: "hello_tool",
      description: "输出Hello World {输入的query}",
      parameters: { query: String },
    },
  },
];

// 2. 建立映射关系 (Name -> Function)
const toolsMap: Record<string, Function> = {
  hello_tool: Hello_Tool,
};

export { toolsDefinition, toolsMap };
