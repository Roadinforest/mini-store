import { getSlugById } from "@/lib/actions/product.actions";
import { z } from "zod";
import { Tool, ToolDefinition, ToolHandler } from '../types';

const jumpProductPageSchema = z.object({
  productId: z.string().describe("要跳转到的产品页面的产品ID"),
});

type JumpProductPageArgs = z.infer<typeof jumpProductPageSchema>;

const handler: ToolHandler<JumpProductPageArgs> = async (args: JumpProductPageArgs) => {
  const slug = await getSlugById(args.productId);
  if (!slug) {
    return `未找到ID为 ${args.productId} 的产品，无法跳转`;
  }
  const productUrl = `/product/${slug}`;

  // 在服务端环境中返回跳转指令，由客户端处理
  return {
    type: "navigation",
    action: "redirect",
    url: productUrl,
    message: `正在跳转到产品页面: ${productUrl}`,
    // 提供多种跳转方式的支持
    methods: {
      windowLocation: `window.location.href = '${productUrl}';`,
      nextRouter: `router.push('${productUrl}');`,
      linkClick: `<a href="${productUrl}">跳转到产品页面</a>`,
    },
  };
};

const definition : ToolDefinition = {
  type: "function",
  function: {
    name: "jump_product_page",
    description:
      "跳转到指定产品页面的工具。输入产品ID后会直接跳转到对应的产品详情页面。",
    parameters: jumpProductPageSchema.toJSONSchema(),
  },
};

const hintFunction = (args: JumpProductPageArgs): string => {
  return `正在跳转到ID为 ${args.productId} 的产品页面`;
}

const JumpProductPage_Tool: Tool<JumpProductPageArgs> = {
  definition: definition,
  handler: handler,
  hintFunction: hintFunction,
}

export default JumpProductPage_Tool;