export interface ToolDefinition {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: any;
  };
}

export type ToolHandler<T = any> = (args: T) => Promise<any>;

export interface Tool<T = any> {
  definition: ToolDefinition;
  handler: ToolHandler<T>;
  hintFunction?: (args: T) => string;
}
