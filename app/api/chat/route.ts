import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

// 使用 OpenAI 兼容接口连接 qwen-max
const client = new OpenAI({
  apiKey: process.env.QWEN_API_KEY,
  baseURL: process.env.QWEN_BASE_URL || 'https://dashscope.aliyuncs.com/compatible-mode/v1',
});

export async function POST(req: NextRequest) {
  try {
    const { messages } = await req.json();

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { error: 'Messages array is required' },
        { status: 400 }
      );
    }

    // 调用 qwen-max 模型
    const response = await client.chat.completions.create({
      model: 'qwen-max',
      messages: messages,
      temperature: 0.7,
      max_tokens: 2000,
      stream: false,
    });

    const assistantMessage = response.choices[0]?.message;

    if (!assistantMessage) {
      return NextResponse.json(
        { error: 'No response from model' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: assistantMessage,
      usage: response.usage,
    });
  } catch (error) {
    console.error('Chat API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
