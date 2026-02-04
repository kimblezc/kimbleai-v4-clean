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
      <div className="flex flex-col items-center justify-center h-full text-gray-500 dark:text-gray-400 px-4">
        <SparklesIcon className="w-12 h-12 sm:w-16 sm:h-16 mb-3 sm:mb-4 opacity-50" />
        <p className="text-base sm:text-lg font-medium text-center">Start a conversation</p>
        <p className="text-sm text-center">Ask me anything or upload a file to analyze</p>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto px-2 sm:px-4 py-4 sm:py-6 space-y-4 sm:space-y-6">
      {messages.map((message, index) => (
        <div
          key={index}
          className={`flex gap-2 sm:gap-4 ${
            message.role === 'user' ? 'justify-end' : 'justify-start'
          }`}
        >
          {message.role === 'assistant' && (
            <div className="flex-shrink-0 w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
              <SparklesIcon className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
            </div>
          )}

          <div
            className={`max-w-[85%] sm:max-w-3xl ${
              message.role === 'user'
                ? 'bg-blue-600 text-white rounded-2xl rounded-tr-sm'
                : message.isError
                ? 'bg-red-100 dark:bg-red-900 text-red-900 dark:text-red-100 rounded-2xl rounded-tl-sm'
                : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-2xl rounded-tl-sm border border-gray-200 dark:border-gray-700'
            } px-3 sm:px-6 py-3 sm:py-4`}
          >
            {/* Attachments */}
            {message.attachments && message.attachments.length > 0 && (
              <div className="mb-3 sm:mb-4 space-y-2">
                {message.attachments.map((attachment, i) => (
                  <div key={i} className="rounded-lg overflow-hidden">
                    {attachment.type === 'image' && (
                      <img
                        src={attachment.url}
                        alt="Attachment"
                        className="max-w-full h-auto max-h-64 sm:max-h-96 rounded-lg"
                      />
                    )}
                    {attachment.type === 'file' && (
                      <div className="flex items-center gap-2 p-2 sm:p-3 bg-gray-100 dark:bg-gray-700 rounded-lg">
                        <svg
                          className="w-5 h-5 sm:w-6 sm:h-6"
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
                        <span className="text-xs sm:text-sm font-medium">File attachment</span>
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

            {/* Timestamp */}
            <div
              className={`mt-2 text-xs ${
                message.role === 'user'
                  ? 'text-blue-100'
                  : 'text-gray-500 dark:text-gray-400'
              }`}
            >
              {new Date(message.timestamp).toLocaleTimeString()}
            </div>
          </div>

          {message.role === 'user' && (
            <div className="flex-shrink-0 w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-gray-700 dark:bg-gray-600 flex items-center justify-center">
              <UserIcon className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
            </div>
          )}
        </div>
      ))}

      {/* Loading Indicator */}
      {isLoading && (
        <div className="flex gap-2 sm:gap-4 justify-start">
          <div className="flex-shrink-0 w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
            <SparklesIcon className="w-4 h-4 sm:w-5 sm:h-5 text-white animate-pulse" />
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-2xl rounded-tl-sm border border-gray-200 dark:border-gray-700 px-4 sm:px-6 py-3 sm:py-4">
            <div className="flex gap-1.5 sm:gap-2">
              <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        </div>
      )}

      <div ref={messagesEndRef} />
    </div>
  );
}
