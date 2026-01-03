import { initTRPC } from '@trpc/server';
import { runAgent } from '@/lib/agent/mainLoop';
import { chatInputSchema, ChatMessage } from './schemas';

const t = initTRPC.create();

export const appRouter = t.router({
  chat: t.procedure
    .input(chatInputSchema)
    .mutation(async ({ input }) : Promise<ChatMessage> => {
      const finalAnswer = await runAgent(input.messages);
      return { role: 'assistant', content: finalAnswer || ""};
    }),
});

export type AppRouter = typeof appRouter;
