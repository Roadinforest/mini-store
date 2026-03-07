import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { ChatMessage } from '@/lib/trpc/schemas';
import { parseStreamChunk } from '@/lib/streaming-utils';

// 类型定义
type MessageUpdater = React.Dispatch<React.SetStateAction<ChatMessage[]>>;
type LoadingUpdater = React.Dispatch<React.SetStateAction<boolean>>;

interface StreamHandlers {
  updateMessage: MessageUpdater;
  setLoading: LoadingUpdater;
  navigate: (url: string) => void;
}

// 更新消息内容的辅助函数
const updateMessageContent = (
  setMessages: MessageUpdater,
  messageIndex: number,
  updates: Partial<ChatMessage>
) => {
  setMessages((prev) => {
    const newMessages = [...prev];
    if (newMessages[messageIndex]) {
      newMessages[messageIndex] = {
        ...newMessages[messageIndex],
        ...updates,
      };
    }
    return newMessages;
  });
};

// 处理工具调用
const handleToolCall = (
  chunk: any,
  currentIndex: number,
  handlers: StreamHandlers
): number => {
  const { updateMessage, setLoading } = handlers;
  
  updateMessage((prev) => {
    const newMessages = [...prev];
    const currentMsg = newMessages[currentIndex];
    
    // 如果当前消息是空的或临时状态，替换它；否则插入新消息
    if (!currentMsg?.content || currentMsg.content === '正在思考...') {
      // 替换当前消息为工具调用
      newMessages[currentIndex] = {
        role: 'assistant',
        content: chunk.content || `正在使用工具: ${chunk.toolName}`,
        messageType: 'tool_call',
        toolName: chunk.toolName,
      };
      // 添加新的空助手消息用于后续响应
      newMessages.splice(currentIndex + 1, 0, {
        role: 'assistant',
        content: '',
      });
    } else {
      // 在当前消息之前插入工具调用消息
      newMessages.splice(currentIndex, 0, {
        role: 'assistant',
        content: chunk.content || `正在使用工具: ${chunk.toolName}`,
        messageType: 'tool_call',
        toolName: chunk.toolName,
      });
    }
    return newMessages;
  });
  
  return currentIndex + 1;
};

// 处理部分内容更新
const handlePartialContent = (
  chunk: any,
  messageIndex: number,
  handlers: StreamHandlers
) => {
  updateMessageContent(handlers.updateMessage, messageIndex, {
    content: chunk.content || '',
  });
};

// 处理完整内容
const handleCompleteContent = (
  chunk: any,
  messageIndex: number,
  handlers: StreamHandlers
) => {
  updateMessageContent(handlers.updateMessage, messageIndex, {
    content: chunk.content || '',
  });
};

// 处理导航
const handleNavigation = (
  chunk: any,
  messageIndex: number,
  handlers: StreamHandlers
) => {
  if (chunk.url) {
    console.log('Navigating to:', chunk.url);
    handlers.navigate(chunk.url);

    updateMessageContent(handlers.updateMessage, messageIndex, {
      content: chunk.message || '正在跳转...',
      url: chunk.url,
    });
  }
};

// 处理思考状态
const handleThinking = (
  chunk: any,
  messageIndex: number,
  handlers: StreamHandlers
) => {
  updateMessageContent(handlers.updateMessage, messageIndex, {
    content: chunk.content || '',
  });
};

// 处理错误
const handleError = (
  chunk: any,
  messageIndex: number,
  handlers: StreamHandlers
) => {
  updateMessageContent(handlers.updateMessage, messageIndex, {
    content: chunk.content || '抱歉，我遇到了一些问题。请稍后再试。',
  });
};

// 处理不同类型的流式响应 - 主调度函数
const handleStreamChunk = (
  chunk: ReturnType<typeof parseStreamChunk>,
  assistantMessageIndex: number,
  handlers: StreamHandlers
): number => {
  if (!chunk) return assistantMessageIndex;

  switch (chunk.type) {
    case 'tool_call':
      return handleToolCall(chunk, assistantMessageIndex, handlers);
    case 'partial':
      handlePartialContent(chunk, assistantMessageIndex, handlers);
      return assistantMessageIndex;
    case 'complete':
      handleCompleteContent(chunk, assistantMessageIndex, handlers);
      return assistantMessageIndex;
    case 'navigation':
      handleNavigation(chunk, assistantMessageIndex, handlers);
      return assistantMessageIndex;
    case 'thinking':
      handleThinking(chunk, assistantMessageIndex, handlers);
      return assistantMessageIndex;
    case 'error':
      handleError(chunk, assistantMessageIndex, handlers);
      return assistantMessageIndex;
    default:
      return assistantMessageIndex;
  }
};

export function useChatStream() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      content: '你好！我是Mini-Store智能购物助手，有什么可以帮助你的吗？',
    },
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  // 创建处理器对象
  const handlers: StreamHandlers = {
    updateMessage: setMessages,
    setLoading: setIsLoading,
    navigate: (url: string) => router.push(url),
  };

  const sendMessage = async (content: string) => {
    const userMessage: ChatMessage = {
      role: 'user',
      content: content.trim(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    // 添加一个占位符消息用于显示流式内容
    let assistantMessageIndex: number = messages.length + 1;
    setMessages((prev) => {
      assistantMessageIndex = prev.length;
      return [...prev, { role: 'assistant', content: '' }];
    });

    try {
      const apiMessages: ChatMessage[] = [...messages, userMessage];

      const response = await fetch('/api/chat/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: apiMessages }),
      });

      if (!response.body) throw new Error('No response body');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') continue;

            try {
              const chunk = parseStreamChunk(data);
              assistantMessageIndex = handleStreamChunk(chunk, assistantMessageIndex, handlers);
            } catch (parseError) {
              console.error('Error parsing streaming data:', parseError);
            }
          }
        }
      }
    } catch (error) {
      console.error('Chat error:', error);
      setMessages((prev) => {
        const newMessages = [...prev];
        if (newMessages[assistantMessageIndex]) {
          newMessages[assistantMessageIndex] = {
            ...newMessages[assistantMessageIndex],
            content: '抱歉，我遇到了一些问题。请稍后再试。',
          };
        }
        return newMessages;
      });
    } finally {
      setIsLoading(false);
    }
  };

  const resetChat = () => {
    setMessages([
      {
        role: 'assistant',
        content: '你好！我是Mini-Store智能购物助手，有什么可以帮助你的吗？',
      },
    ]);
  };

  return {
    messages,
    isLoading,
    sendMessage,
    resetChat,
  };
}
