import { ModelConfig } from "../../core/types";
import { BaseAgent } from "../base-agent";
import { shopAgentPrompts } from "./prompt";
import { TOOL_NAMES } from "../../tools";

const modelConfig : ModelConfig = {
    model: "qwen-max",
    temperature: 0.0,
    max_tokens: 2048,
    max_turns: 15,
};

export class SupervisorAgent extends BaseAgent {
  constructor() {
    super('SupervisorAgent', {
      name: 'Supervisor Agent',
      description: 'An agent that supervises and manages other agents.',
      systemPrompt: shopAgentPrompts,
      tools: Object.values(TOOL_NAMES),
      modelConfig: modelConfig,
    });
  }
}   