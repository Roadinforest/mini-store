import { ModelConfig } from "../../core/types";
import { get_product_reviews_function_name } from "../../tools/get_product_reviews";
import { BaseAgent } from "../base-agent";
import { shopAgentPrompts } from "./prompt";
import { get_product_details_function_name } from "../../tools/get_product_details";
import { hello_tool_function_name } from "../../tools/hello_tool";
import { jump_product_page_function_name } from "../../tools/jump_product_page";
import { rag_search_products_function_name } from "../../tools/rag_search_products";
import { search_products_by_name_function_name } from "../../tools/search_products_by_name";

const modelConfig : ModelConfig = {
    model: "qwen-max",
    temperature: 0.0,
    max_tokens: 2048,
    max_turns: 5,
};

export class SupervisorAgent extends BaseAgent {
  constructor() {
    super("SupervisorAgent", {
      name: "Supervisor Agent",
      description: "An agent that supervises and manages other agents.",
      systemPrompt: shopAgentPrompts,
      tools: [get_product_reviews_function_name,get_product_details_function_name,hello_tool_function_name,jump_product_page_function_name,rag_search_products_function_name,search_products_by_name_function_name],
      modelConfig: modelConfig,
    });
  }
}   