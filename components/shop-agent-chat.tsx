'use client';

import { useState } from 'react';
import { ChatHeader } from './chat/ChatHeader';
import { ChatMessageList } from './chat/ChatMessageList';
import { ChatInput } from './chat/ChatInput';
import { useChatStream } from '@/hooks/use-chat-stream';

interface ShopAgentChatProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ShopAgentChat({ isOpen, onClose }: ShopAgentChatProps) {
  const [input, setInput] = useState('');
  const { messages, isLoading, sendMessage, resetChat } = useChatStream();

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;
    await sendMessage(input);
    setInput('');
  };

  const handleNewChat = () => {
    resetChat();
    setInput('');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed bottom-24 right-6 z-50 flex flex-col bg-white dark:bg-gray-900 rounded-lg shadow-2xl border border-gray-200 dark:border-gray-700 w-[380px] h-[600px] max-h-[80vh]">
      <ChatHeader onNewChat={handleNewChat} onClose={onClose} />
      <ChatMessageList messages={messages} isLoading={isLoading} />
      <ChatInput
        value={input}
        onChange={setInput}
        onSend={handleSend}
        isLoading={isLoading}
        isOpen={isOpen}
      />
    </div>
  );
}
