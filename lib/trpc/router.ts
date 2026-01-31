import { initTRPC } from '@trpc/server';
import { chatInputSchema, ChatMessage } from './schemas';
import { z } from 'zod';

const t = initTRPC.create();

export const appRouter = t.router({
  // 简单的健康检查端点
  health: t.procedure
    .query(() => {
      return { status: 'ok', timestamp: new Date() };
    }),
  
  // 验证聊天输入（可用于预检查）
  validateChat: t.procedure
    .input(chatInputSchema)
    .mutation(({ input }) => {
      return { valid: true, messageCount: input.messages.length };
    }),
});

export type AppRouter = typeof appRouter;
