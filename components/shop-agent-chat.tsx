'use client';

import { useState, useRef, useEffect } from 'react';
import { X, Send, Loader2, SquarePlus, Wrench } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import ReactMarkdown from 'react-markdown';
import type { ChatMessage } from '@/lib/trpc/schemas';
import { parseStreamChunk } from '@/lib/streaming-utils';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';

type Message = ChatMessage;

interface ShopAgentChatProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ShopAgentChat({ isOpen, onClose }: ShopAgentChatProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: '你好！我是Mini-Store智能购物助手，有什么可以帮助你的吗？',
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus();
    }
  }, [isOpen]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      role: 'user',
      content: input.trim(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    // 添加一个占位符消息用于显示流式内容
    let assistantMessageIndex: number;
    setMessages((prev) => {
      assistantMessageIndex = prev.length;
      return [...prev, { role: 'assistant', content: '' }];
    });

    try {
      const apiMessages: Message[] = [...messages, userMessage];

      const response = await fetch('/api/chat/stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ messages: apiMessages }),
      });

      if (!response.body) {
        throw new Error('No response body');
      }

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
            if (data === '[DONE]') {
              continue;
            }

            try {
              const chunk = parseStreamChunk(data);
              if (!chunk) continue;

              if (chunk.type === 'partial' && chunk.content) {
                // 更新助手消息内容
                setMessages((prev) => {
                  const newMessages = [...prev];
                  if (newMessages[assistantMessageIndex]) {
                    newMessages[assistantMessageIndex] = {
                      ...newMessages[assistantMessageIndex],
                      content: chunk.content!,
                    };
                  }
                  return newMessages;
                });
              } else if (chunk.type === 'complete' && chunk.content) {
                // 最终内容
                setMessages((prev) => {
                  const newMessages = [...prev];
                  if (newMessages[assistantMessageIndex]) {
                    newMessages[assistantMessageIndex] = {
                      ...newMessages[assistantMessageIndex],
                      content: chunk.content!,
                    };
                  }
                  return newMessages;
                });
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
              } else if (chunk.type === 'tool_call') {
                // 显示工具调用状态
                setMessages((prev) => {
                  const newMessages = [...prev];
                  if (newMessages[assistantMessageIndex]) {
                    newMessages[assistantMessageIndex] = {
                      ...newMessages[assistantMessageIndex],
                      content: chunk.content || `正在使用工具: ${chunk.toolName}`,
                      messageType: 'tool_call',
                      toolName: chunk.toolName,
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

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const onNewChat = () => {
    setMessages([
      {
        role: 'assistant',
        content: '你好！我是Mini-Store智能购物助手，有什么可以帮助你的吗？',
      },
    ]);
    setInput('');
    inputRef.current?.focus();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed bottom-24 right-6 z-50 flex flex-col bg-white dark:bg-gray-900 rounded-lg shadow-2xl border border-gray-200 dark:border-gray-700 w-[380px] h-[600px] max-h-[80vh]">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b bg-gradient-to-r from-gray-600 to-gray-700 rounded-t-lg">
        <div className="flex items-center gap-2">
          {/* <div className="w-3 h-3 bg-yellow-300 rounded-full animate-pulse"></div> */}
          <h3 className="font-semibold text-white">Shop Helper</h3>
        </div>
        <div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onNewChat}
            className="h-8 w-8 text-white hover:bg-gray-600"
          >
            <SquarePlus className="h-4 w-4 text-white" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-8 w-8 text-white hover:bg-gray-600"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-white dark:bg-gray-900">
        {messages.map((message, index) => (
          <div
            key={index}
            className={cn('flex', message.role === 'user' ? 'justify-end' : 'justify-start')}
          >
            <div
              className={cn(
                'max-w-[80%] rounded-lg p-3 text-sm',
                message.role === 'user'
                  ? 'bg-gray-500 text-white'
                  : '',
              )}
            >
              {message.messageType === 'tool_call' ? (
                <div className="flex items-start gap-2">
                  <Wrench className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <div className="text-xs font-semibold text-blue-700 dark:text-blue-300 mb-1">
                      {message.toolName || '工具调用'}
                    </div>
                    <div className="text-gray-700 dark:text-gray-300">{message.content}</div>
                  </div>
                </div>
              ) : message.role === 'assistant' ? (
                <div className="whitespace-pre-wrap break-words">
                  <ReactMarkdown
                    components={{
                      // 自定义 Markdown 组件样式
                      p: ({ children }) => <p className="mb-0">{children}</p>,
                      ul: ({ children }) => (
                        <ul className="list-disc list-inside mb-0 space-y-0">{children}</ul>
                      ),
                      ol: ({ children }) => (
                        <ol className="list-decimal list-inside mb-0 space-y-0">{children}</ol>
                      ),
                      li: ({ children }) => <li className="mb-0 leading-tight">{children}</li>,
                      strong: ({ children }) => (
                        <strong className="font-semibold">{children}</strong>
                      ),
                      em: ({ children }) => <em className="italic">{children}</em>,
                      pre: ({ children }) => (
                        <pre className="bg-gray-200 dark:bg-gray-700 p-2 rounded overflow-x-auto text-xs font-mono mb-2 last:mb-0">
                          {children}
                        </pre>
                      ),
                      blockquote: ({ children }) => (
                        <blockquote className="border-l-4 border-gray-300 dark:border-gray-600 pl-3 italic mb-2 last:mb-0">
                          {children}
                        </blockquote>
                      ),
                      a: ({ children, href }) => (
                        <a
                          href={href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-gray-600 dark:text-gray-400 underline hover:text-gray-800 dark:hover:text-gray-300"
                        >
                          {children}
                        </a>
                      ),
                    }}
                  >
                    {message.content}
                  </ReactMarkdown>
                </div>
              ) : (
                <p className="whitespace-pre-wrap break-words">{message.content}</p>
              )}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-3">
              <Loader2 className="h-5 w-5 animate-spin text-gray-500 dark:text-gray-400" />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t border-gray-200 dark:border-gray-700 p-4 bg-gray-50 dark:bg-gray-800 rounded-b-lg">
        <div className="flex gap-2">
          <Input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="输入你的问题..."
            disabled={isLoading}
            className="flex-1"
          />
          <Button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            size="icon"
            className="bg-transparent"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4 text-black dark:text-white" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
