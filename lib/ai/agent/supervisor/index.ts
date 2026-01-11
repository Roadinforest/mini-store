import { ModelConfig } from "../../core/types";
import { BaseAgent } from "../base-agent";
import { shopAgentPrompts } from "./prompt";

import { get_product_reviews_function_name } from "../../tools/get_product_reviews";
import { get_product_details_function_name } from "../../tools/get_product_details";
import { hello_tool_function_name } from "../../tools/hello_tool";
import { jump_product_page_function_name } from "../../tools/jump_product_page";
import { hybrid_search_products_function_name} from "../../tools/hybrid_search_products";
import { search_products_by_name_function_name } from "../../tools/search_products_by_name";
import { search_agent_function_name } from "../../tools/search_agent";
import { review_agent_function_name } from "../../tools/review_agent";

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
      tools: [
        get_product_reviews_function_name,
        get_product_details_function_name,
        hello_tool_function_name,
        jump_product_page_function_name,
        hybrid_search_products_function_name,
        search_products_by_name_function_name,
        search_agent_function_name,
        review_agent_function_name,
      ],
      modelConfig: modelConfig,
    });
  }
}   