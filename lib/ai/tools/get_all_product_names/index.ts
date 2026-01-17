import { z } from 'zod';
import { getAllProductNames } from '@/lib/actions/product.actions';
import { Tool, ToolDefinition, ToolHandler } from '../types';

const getAllProductNamesSchema = z.object({
  limit: z.number().optional().describe("要获取的产品名称的最大数量，默认为100"),
});

type GetAllProductNamesArgs = z.infer<typeof getAllProductNamesSchema>;

const handler: ToolHandler<GetAllProductNamesArgs> = async (args: GetAllProductNamesArgs) => {
  try {
    const products = await getAllProductNames(args.limit);

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

const definition : ToolDefinition = {
  type: "function",
  function: {
    name: "get_all_product_names",
    description: "获取商店中所有产品的名称、ID、分类和品牌信息",
    parameters: getAllProductNamesSchema.toJSONSchema(),
  },
}

const hintFunction = (args: GetAllProductNamesArgs): string => {
  if (args.limit) {
    return `正在获取所有产品的名称，最多 ${args.limit} 个`;
  }
  return '正在获取所有产品的名称';
}

const GetAllProductNames_Tool:Tool<GetAllProductNamesArgs> = {
  definition: definition,
  handler: handler,
  hintFunction: hintFunction,
}

export default GetAllProductNames_Tool;