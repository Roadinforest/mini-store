import { NextRequest, NextResponse } from 'next/server';
import { runAgent } from '@/lib/agent/mainLoop';

export async function POST(req: NextRequest) {
  try {
    const { messages } = await req.json();

    const finalAnswer = await runAgent(messages);

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
