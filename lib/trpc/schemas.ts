import { z } from 'zod';

export const chatMessageSchema = z.object({
  role: z.union([z.literal('user'), z.literal('assistant'), z.literal('system')]),
  content: z.string(),
});

export const chatInputSchema = z.object({
  messages: z.array(chatMessageSchema),
});

export type ChatMessage = z.infer<typeof chatMessageSchema>;
