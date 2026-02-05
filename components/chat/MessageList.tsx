/**
 * Message List Component
 *
 * Displays conversation messages with streaming support
 */

'use client';

import { useEffect, useRef } from 'react';
import { UserIcon, SparklesIcon } from '@heroicons/react/24/outline';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  model?: string;  // Task 6: Show model used for AI responses
  provider?: string;
  attachments?: Array<{
    type: 'image' | 'file' | 'audio';
    url: string;
    mimeType?: string;
    analysis?: string;
  }>;
  isError?: boolean;
}

interface MessageListProps {
  messages: Message[];
  isLoading?: boolean;
}

export default function MessageList({ messages, isLoading }: MessageListProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (messages.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-500 dark:text-gray-400">
        <SparklesIcon className="w-16 h-16 mb-4 opacity-50" />
        <p className="text-lg font-medium">Start a conversation</p>
        <p className="text-sm">Ask me anything or upload a file to analyze</p>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto px-4 py-6 space-y-6">
      {messages.map((message, index) => (
        <div
          key={index}
          className={`flex gap-4 ${
            message.role === 'user' ? 'justify-end' : 'justify-start'
          }`}
        >
          {message.role === 'assistant' && (
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
              <SparklesIcon className="w-5 h-5 text-white" />
            </div>
          )}

          <div
            className={`max-w-3xl ${
              message.role === 'user'
                ? 'bg-blue-600 text-white rounded-2xl rounded-tr-sm'
                : message.isError
                ? 'bg-red-100 dark:bg-red-900 text-red-900 dark:text-red-100 rounded-2xl rounded-tl-sm'
                : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-2xl rounded-tl-sm border border-gray-200 dark:border-gray-700'
            } px-6 py-4`}
          >
            {/* Attachments */}
            {message.attachments && message.attachments.length > 0 && (
              <div className="mb-4 space-y-2">
                {message.attachments.map((attachment, i) => (
                  <div key={i} className="rounded-lg overflow-hidden">
                    {attachment.type === 'image' && (
                      <img
                        src={attachment.url}
                        alt="Attachment"
                        className="max-w-full h-auto max-h-96 rounded-lg"
                      />
                    )}
                    {attachment.type === 'file' && (
                      <div className="flex items-center gap-2 p-3 bg-gray-100 dark:bg-gray-700 rounded-lg">
                        <svg
                          className="w-6 h-6"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                          />
                        </svg>
                        <span className="text-sm font-medium">File attachment</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Message Content */}
            <div className="prose dark:prose-invert max-w-none">
              <ReactMarkdown
                components={{
                  code({ node, className, children, ...props }: any) {
                    const match = /language-(\w+)/.exec(className || '');
                    const inline = !match;
                    return !inline && match ? (
                      <SyntaxHighlighter
                        style={vscDarkPlus}
                        language={match[1]}
                        PreTag="div"
                        {...props}
                      >
                        {String(children).replace(/\n$/, '')}
                      </SyntaxHighlighter>
                    ) : (
                      <code className={className} {...props}>
                        {children}
                      </code>
                    );
                  },
                }}
              >
                {message.content}
              </ReactMarkdown>
            </div>

            {/* Timestamp and Model Info (Task 6) */}
            <div
              className={`mt-2 flex items-center gap-2 text-xs ${
                message.role === 'user'
                  ? 'text-blue-100'
                  : 'text-gray-500 dark:text-gray-400'
              }`}
            >
              <span>{new Date(message.timestamp).toLocaleTimeString()}</span>
              {/* Show model used for assistant messages (Task 6) */}
              {message.role === 'assistant' && message.model && (
                <span className="px-2 py-0.5 bg-neutral-700 rounded-full text-neutral-300 text-[10px] font-mono">
                  {message.model}
                </span>
              )}
            </div>
          </div>

          {message.role === 'user' && (
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-700 dark:bg-gray-600 flex items-center justify-center">
              <UserIcon className="w-5 h-5 text-white" />
            </div>
          )}
        </div>
      ))}

      {/* Loading Indicator */}
      {isLoading && (
        <div className="flex gap-4 justify-start">
          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
            <SparklesIcon className="w-5 h-5 text-white animate-pulse" />
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-2xl rounded-tl-sm border border-gray-200 dark:border-gray-700 px-6 py-4">
            <div className="flex gap-2">
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        </div>
      )}

      <div ref={messagesEndRef} />
    </div>
  );
}
