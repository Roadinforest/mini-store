import { getSlugById } from "@/lib/actions/product.actions";
import { z } from "zod";

const jumpProductPageSchema = z.object({
  productId: z.string().describe("要跳转到的产品页面的产品ID"),
});

export type JumpProductPageArgs = z.infer<typeof jumpProductPageSchema>;

const Jump_Product_Page = async (args: JumpProductPageArgs) => {
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

export const jump_product_page_function_definition = {
  type: "function",
  function: {
    name: "jump_product_page",
    description:
      "跳转到指定产品页面的工具。输入产品ID后会直接跳转到对应的产品详情页面。",
    parameters: jumpProductPageSchema.toJSONSchema(),
  },
};

export default Jump_Product_Page;
