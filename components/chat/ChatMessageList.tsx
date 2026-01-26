import { useRef, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { ChatMessage } from './ChatMessage';
import type { ChatMessage as MessageType } from '@/lib/trpc/schemas';

interface ChatMessageListProps {
  messages: MessageType[];
  isLoading: boolean;
}

export function ChatMessageList({ messages, isLoading }: ChatMessageListProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // const scrollToBottom = () => {
  //   messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  // };

  // useEffect(() => {
  //   scrollToBottom();
  // }, [messages]);

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-white dark:bg-gray-900">
      {messages.map((message, index) => (
        <ChatMessage key={index} message={message} />
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
  );
}
