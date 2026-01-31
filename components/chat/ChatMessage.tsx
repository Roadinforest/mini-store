import { Wrench } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import type { ChatMessage as MessageType } from '@/lib/trpc/schemas';
import { cn } from '@/lib/utils';

interface ChatMessageProps {
  message: MessageType;
}

export function ChatMessage({ message }: ChatMessageProps) {
  return (
    <div className={cn('flex', message.role === 'user' ? 'justify-end' : 'justify-start')}>
      <div
        className={cn(
          'max-w-[80%] rounded-lg p-3 text-sm',
          message.role === 'user'
            ? 'bg-gray-500 text-white'
            : message.messageType === 'tool_call'
            ? ''
            : ''
        )}
      >
        {message.messageType === 'tool_call' ? (
          <ToolCallMessage message={message} />
        ) : message.role === 'assistant' ? (
          <AssistantMessage content={message.content} />
        ) : (
          <UserMessage content={message.content} />
        )}
      </div>
    </div>
  );
}

function ToolCallMessage({ message }: { message: MessageType }) {
  return (
    <div className="flex items-start gap-2">
      <div className="flex-1">
        <div className="p-1 bg-blue-50 dark:bg-blue-900/20 text-xs font-semibold text-blue-700 dark:text-blue-300 mb-1 border border-blue-200 dark:border-blue-800 flex rounded-sm">
          <Wrench className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0 mr-2" />
          {message.toolName || '工具调用'}
        </div>
        <div className="text-gray-700 dark:text-gray-300">{message.content}</div>
      </div>
    </div>
  );
}

function AssistantMessage({ content }: { content: string }) {
  return (
    <div className="whitespace-pre-wrap break-words">
      <ReactMarkdown
        components={{
          p: ({ children }) => <p className="mb-0">{children}</p>,
          ul: ({ children }) => (
            <ul className="list-disc list-inside mb-0 space-y-0">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal list-inside mb-0 space-y-0">{children}</ol>
          ),
          li: ({ children }) => <li className="mb-0 leading-tight">{children}</li>,
          strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
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
        {content}
      </ReactMarkdown>
    </div>
  );
}

function UserMessage({ content }: { content: string }) {
  return <p className="whitespace-pre-wrap break-words">{content}</p>;
}
