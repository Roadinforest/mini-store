import { initTRPC } from '@trpc/server';
import { runAgent } from '@/lib/ai/agent/mainLoop';
import { chatInputSchema, ChatMessage } from './schemas';

const t = initTRPC.create();

export const appRouter = t.router({
  chat: t.procedure
    .input(chatInputSchema)
    .mutation(async ({ input }) : Promise<ChatMessage> => {
      const finalAnswer = await runAgent(input.messages);
      if(finalAnswer && typeof finalAnswer === 'object' && 'type' in finalAnswer && finalAnswer.type === 'navigation') {
        // 如果是导航类型的响应，返回特定的信息给前端
        return {
          role: 'assistant',
          content: `跳转到产品页面: ${finalAnswer.url}`,
          url: finalAnswer.url,
        };
      }
      return { role: 'assistant', content: typeof finalAnswer === 'string' ? finalAnswer : ""};
    }),
});

export type AppRouter = typeof appRouter;
