import Hello from "./hello_tool";
import GetProductDetails from "./get_product_details";
import GetProductReviews from "./get_product_reviews";
import SearchProductsByName from "./search_products_by_name";
import JumpProductPage from "./jump_product_page";
import HybridSearchProducts from "./hybrid_search_products";
import GetAllProductNames from "./get_all_product_names";
import SearchAgent from "./search_agent";
import ReviewAgent from "./review_agent";
import { Tool } from "./types";

// Array of all tool instances
const tools : Tool[]= [
  Hello,
  GetProductDetails,
  GetProductReviews,
  SearchProductsByName,
  JumpProductPage,
  HybridSearchProducts,
  GetAllProductNames,
  SearchAgent,
  ReviewAgent,
] as const;

const TOOL_NAMES = {
  HELLO: tools[0].definition.function.name,
  GET_PRODUCT_DETAILS: tools[1].definition.function.name,
  GET_PRODUCT_REVIEWS: tools[2].definition.function.name,
  SEARCH_PRODUCTS_BY_NAME: tools[3].definition.function.name,
  JUMP_PRODUCT_PAGE: tools[4].definition.function.name,
  HYBRID_SEARCH_PRODUCTS: tools[5].definition.function.name,
  GET_ALL_PRODUCT_NAMES: tools[6].definition.function.name,
  SEARCH_AGENT: tools[7].definition.function.name,
  REVIEW_AGENT: tools[8].definition.function.name,
} as const;

// 1. Automatically extract definitions
const toolsDefinition = tools.map((tool) => tool.definition);

// 2. Automatically build the map
const toolsMap: Record<string, Function> = tools.reduce((acc, tool) => {
  if (tool.definition?.function?.name && tool.handler) {
    acc[tool.definition.function.name] = tool.handler;
  }
  return acc;
}, {} as Record<string, Function>);


export { toolsDefinition, toolsMap, TOOL_NAMES};
