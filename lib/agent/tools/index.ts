import Hello_Tool, { hello_tool_function_definition } from "./hello_tool";
import GetProductDetails_Tool, { get_product_details_function_definition } from "./get_product_details";
import GetProductReviews_Tool, { get_product_reviews_function_definition } from "./get_product_reviews";
import SearchProductsByName_Tool, { search_products_by_name_function_definition } from "./search_products_by_name";
import Jump_Product_Page, {jump_product_page_function_definition} from "./jump_product_page";

// 1. 定义工具结构
const toolsDefinition = [
    hello_tool_function_definition,
    get_product_details_function_definition,
    get_product_reviews_function_definition,
    search_products_by_name_function_definition,
    jump_product_page_function_definition,
];

// 2. 建立映射关系 (Name -> Function)
const toolsMap: Record<string, Function> = {
  hello_tool: Hello_Tool,
  get_product_details: GetProductDetails_Tool,
  get_product_reviews: GetProductReviews_Tool,
  search_products_by_name: SearchProductsByName_Tool,
  jump_product_page: Jump_Product_Page,
};

export { toolsDefinition, toolsMap };
