import Hello_Tool, { hello_tool_function_definition } from "./hello_tool";


// 1. 定义工具结构
const toolsDefinition = [
    hello_tool_function_definition,
];

// 2. 建立映射关系 (Name -> Function)
const toolsMap: Record<string, Function> = {
  hello_tool: Hello_Tool,
};

export { toolsDefinition, toolsMap };
