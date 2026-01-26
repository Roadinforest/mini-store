import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { ChatMessage } from '@/lib/trpc/schemas';
import { parseStreamChunk } from '@/lib/streaming-utils';

export function useChatStream() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      content: '你好！我是Mini-Store智能购物助手，有什么可以帮助你的吗？',
    },
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

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
              if (!chunk) continue;

              if (chunk.type === 'tool_call') {
                // 为工具调用创建新消息
                setMessages((prev) => {
                  const newMessages = [...prev];
                  const currentMsg = newMessages[assistantMessageIndex];
                  // 如果当前消息是空的或临时状态，替换它；否则插入新消息
                  if (!currentMsg?.content || currentMsg.content === '正在思考...') {
                    // 替换当前消息为工具调用
                    newMessages[assistantMessageIndex] = {
                      role: 'assistant',
                      content: chunk.content || `正在使用工具: ${chunk.toolName}`,
                      messageType: 'tool_call',
                      toolName: chunk.toolName,
                    };
                    // 添加新的空助手消息用于后续响应
                    newMessages.splice(assistantMessageIndex + 1, 0, {
                      role: 'assistant',
                      content: '',
                    });
                  } else {
                    // 在当前消息之前插入工具调用消息
                    newMessages.splice(assistantMessageIndex, 0, {
                      role: 'assistant',
                      content: chunk.content || `正在使用工具: ${chunk.toolName}`,
                      messageType: 'tool_call',
                      toolName: chunk.toolName,
                    });
                  }
                  return newMessages;
                });
                // 更新助手消息索引到响应消息位置
                assistantMessageIndex++;
                // 有内容返回后关闭加载状态
                setIsLoading(false);
              } else if (chunk.type === 'partial') {
                // 更新助手消息内容
                setMessages((prev) => {
                  const newMessages = [...prev];
                  if (newMessages[assistantMessageIndex]) {
                    newMessages[assistantMessageIndex] = {
                      ...newMessages[assistantMessageIndex],
                      content: chunk.content || '',
                    };
                  }
                  return newMessages;
                });
                // 有内容返回后关闭加载状态
                setIsLoading(false);
              } else if (chunk.type === 'complete') {
                // 最终内容
                setMessages((prev) => {
                  const newMessages = [...prev];
                  if (newMessages[assistantMessageIndex]) {
                    newMessages[assistantMessageIndex] = {
                      ...newMessages[assistantMessageIndex],
                      content: chunk.content || '',
                    };
                  }
                  return newMessages;
                });
                // 有内容返回后关闭加载状态
                setIsLoading(false);
              } else if (chunk.type === 'navigation' && chunk.url) {
                // 处理导航
                console.log('Navigating to:', chunk.url);
                router.push(chunk.url);

                setMessages((prev) => {
                  const newMessages = [...prev];
                  if (newMessages[assistantMessageIndex]) {
                    newMessages[assistantMessageIndex] = {
                      ...newMessages[assistantMessageIndex],
                      content: chunk.message || '正在跳转...',
                      url: chunk.url,
                    };
                  }
                  return newMessages;
                });
              } else if (chunk.type === 'thinking') {
                // 显示思考状态
                setMessages((prev) => {
                  const newMessages = [...prev];
                  if (newMessages[assistantMessageIndex]) {
                    newMessages[assistantMessageIndex] = {
                      ...newMessages[assistantMessageIndex],
                      content: chunk.content || '正在思考...',
                    };
                  }
                  return newMessages;
                });
                // 有内容返回后关闭加载状态
                setIsLoading(false);
              } else if (chunk.type === 'error') {
                // 错误处理
                setMessages((prev) => {
                  const newMessages = [...prev];
                  if (newMessages[assistantMessageIndex]) {
                    newMessages[assistantMessageIndex] = {
                      ...newMessages[assistantMessageIndex],
                      content: chunk.content || '抱歉，我遇到了一些问题。请稍后再试。',
                    };
                  }
                  return newMessages;
                });
              }
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
