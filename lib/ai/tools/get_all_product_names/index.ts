import { z } from 'zod';
import { getAllProductNames } from '@/lib/actions/product.actions';

const getAllProductNamesSchema = z.object({});

export type GetAllProductNamesArgs = z.infer<typeof getAllProductNamesSchema>;

const GetAllProductNames_Tool = async (args: GetAllProductNamesArgs) => {
  try {
    const products = await getAllProductNames();

    if (!products || products.length === 0) {
      return '当前商店中没有产品';
    }

    const productsText = products.map((product, index) => {
      return `${index + 1}. ${product.name} (ID: ${product.id}) - 分类: ${product.category}, 品牌: ${product.brand}`;
    }).join('\n');

    return `当前商店中所有产品名称 (共${products.length}个产品):\n\n${productsText}`;
  } catch (error) {
    return `获取产品名称时发生错误: ${error instanceof Error ? error.message : '未知错误'}`;
  }
}

export const get_all_product_names_function_definition = {
  type: "function",
  function: {
    name: "get_all_product_names",
    description: "获取商店中所有产品的名称、ID、分类和品牌信息",
    parameters: getAllProductNamesSchema.toJSONSchema(),
  },
}

export const get_all_product_names_function_name = "get_all_product_names";
export default GetAllProductNames_Tool;