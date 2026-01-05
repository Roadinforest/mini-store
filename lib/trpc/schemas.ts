import { z } from 'zod';

export const chatMessageSchema = z.object({
  role: z.union([z.literal('user'), z.literal('assistant'), z.literal('system')]),
  content: z.string(),
  url: z.string().optional(),
});

export const chatInputSchema = z.object({
  messages: z.array(chatMessageSchema),
});

// 流式输出的数据块类型
export const streamChunkSchema = z.object({
  type: z.union([
    z.literal('partial'), 
    z.literal('complete'), 
    z.literal('navigation'), 
    z.literal('error'), 
    z.literal('tool_call'),
    z.literal('thinking')
  ]),
  content: z.string().optional(),
  url: z.string().optional(),
  message: z.string().optional(),
  toolName: z.string().optional(),
  toolArgs: z.any().optional(),
  delta: z.string().optional(),
});


export type ChatMessage = z.infer<typeof chatMessageSchema>;
export type StreamChunk = z.infer<typeof streamChunkSchema>;


