'use client';

import { useState } from 'react';
import { MessageCircle, X } from 'lucide-react';
import ShopAgentChat from './shop-agent-chat';

export default function ShopAgentFloat() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* 聊天界面 */}
      <ShopAgentChat isOpen={isOpen} onClose={() => setIsOpen(false)} />

      {/* 悬浮球 */}
      <div className="fixed bottom-6 right-6 z-40">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`
            group relative
            w-14 h-14 
            rounded-full 
            bg-gradient-to-r from-blue-500 to-blue-600
            hover:from-blue-600 hover:to-blue-700
            shadow-lg hover:shadow-xl
            transition-all duration-300 ease-in-out
            flex items-center justify-center
            ${isOpen ? 'rotate-90' : 'hover:scale-110'}
          `}
          aria-label="Shop Agent"
        >
          {isOpen ? (
            <X className="h-6 w-6 text-white transition-transform duration-300" />
          ) : (
            <MessageCircle className="h-6 w-6 text-white transition-transform duration-300" />
          )}
          
          {/* 脉冲动画 */}
          {!isOpen && (
            <>
              <span className="absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75 animate-ping"></span>
              <span className="absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
            </>
          )}
        </button>

        {/* 工具提示 */}
        {!isOpen && (
          <div className="absolute bottom-16 right-0 px-3 py-1.5 bg-gray-900 text-white text-xs rounded-md opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none">
            店铺智能助手
            <div className="absolute top-full right-6 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
          </div>
        )}
      </div>
    </>
  );
}
