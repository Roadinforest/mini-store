import type { StreamChunk } from '@/lib/trpc/schemas';

export class StreamingError extends Error {
  constructor(message: string, public chunk?: StreamChunk) {
    super(message);
    this.name = 'StreamingError';
  }
}

export async function* safeStreamProcessor<T>(
  generator: AsyncGenerator<T, void, unknown>,
  onError?: (error: Error) => T
): AsyncGenerator<T, void, unknown> {
  try {
    for await (const chunk of generator) {
      yield chunk;
    }
  } catch (error) {
    if (onError && error instanceof Error) {
      yield onError(error);
    } else {
      console.error('Unexpected streaming error:', error);
      throw error;
    }
  }
}

export function parseStreamChunk(data: string): StreamChunk | null {
  try {
    return JSON.parse(data) as StreamChunk;
  } catch (error) {
    console.error('Failed to parse stream chunk:', error);
    return null;
  }
}

export function createErrorChunk(message: string): StreamChunk {
  return {
    type: 'error',
    content: message,
  };
}