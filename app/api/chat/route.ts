import { NextRequest, NextResponse } from 'next/server';
import { SupervisorAgent } from '@/lib/ai/agent/supervisor';
import { chatInputSchema } from '@/lib/trpc/schemas';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { messages } = chatInputSchema.parse(body);

    const agent = new SupervisorAgent();
    let finalAnswer = '';

    for await (const chunk of agent.run(messages)) {
      if (chunk.type === 'complete') {
        finalAnswer = chunk.content ?? '';
      }
      if (chunk.type === 'error') {
        throw new Error(chunk.content ?? 'Agent error');
      }
    }

    return NextResponse.json({ 
      role: "assistant", 
      content: finalAnswer 
    });
  } catch (error) {
    console.error('Chat API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
