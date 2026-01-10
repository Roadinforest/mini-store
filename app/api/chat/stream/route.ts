import { NextRequest } from 'next/server';
import { SupervisorAgent } from '@/lib/ai/agent/supervisor';
import { chatInputSchema } from '@/lib/trpc/schemas';
import { safeStreamProcessor, createErrorChunk } from '@/lib/streaming-utils';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { messages } = chatInputSchema.parse(body);

    // 创建流式响应
    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        const agent = new SupervisorAgent();
        
        try {
          const streamGenerator = safeStreamProcessor(
            agent.run(messages),
            (error) => createErrorChunk(`处理请求时出错: ${error.message}`)
          );
          
          for await (const chunk of streamGenerator) {
            // 发送数据块
            const data = `data: ${JSON.stringify(chunk)}\n\n`;
            controller.enqueue(encoder.encode(data));
          }
          
          // 发送结束标记
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
        } catch (error) {
          console.error('Streaming error:', error);
          const errorChunk = createErrorChunk('抱歉，我遇到了一些问题。请稍后再试。');
          const errorData = `data: ${JSON.stringify(errorChunk)}\n\n`;
          controller.enqueue(encoder.encode(errorData));
        } finally {
          controller.close();
        }
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
  } catch (error) {
    console.error('Stream API error:', error);
    return new Response(
      JSON.stringify({ error: 'Invalid request' }),
      {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}