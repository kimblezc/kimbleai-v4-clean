/**
 * Main Chat Page
 *
 * Features:
 * - Streaming chat responses
 * - Multimodal input (text, images, files, voice)
 * - Model selection (auto/manual)
 * - Cost tracking display
 * - Conversation history
 */

'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { redirect } from 'next/navigation';
import Sidebar from '@/components/layout/Sidebar';
import MessageList from '@/components/chat/MessageList';
import ChatInput from '@/components/chat/ChatInput';
import ModelSelector from '@/components/chat/ModelSelector';
import CostDisplay from '@/components/chat/CostDisplay';
import BudgetStatus from '@/components/analytics/BudgetStatus';

export default function ChatPage() {
  const { data: session, status } = useSession();
  const [messages, setMessages] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedModel, setSelectedModel] = useState<string | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [totalCost, setTotalCost] = useState(0);

  // Redirect if not authenticated
  if (status === 'unauthenticated') {
    redirect('/api/auth/signin');
  }

  // Create new conversation on mount
  useEffect(() => {
    if (session?.user?.id && !conversationId) {
      createConversation();
    }
  }, [session]);

  const createConversation = async () => {
    try {
      const response = await fetch('/api/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'New Chat',
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setConversationId(data.id);
      }
    } catch (error) {
      console.error('Failed to create conversation:', error);
    }
  };

  const handleSendMessage = async (content: string, attachments?: any[]) => {
    if (!content.trim() && (!attachments || attachments.length === 0)) return;

    const userMessage = {
      role: 'user' as const,
      content,
      attachments,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, userMessage],
          conversationId,
          model: selectedModel,
          stream: true,
        }),
      });

      if (!response.ok) {
        throw new Error('Chat request failed');
      }

      // Handle streaming response
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let assistantMessage = '';

      const assistantMessageObj = {
        role: 'assistant' as const,
        content: '',
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, assistantMessageObj]);

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              if (data === '[DONE]') continue;

              try {
                const parsed = JSON.parse(data);
                if (parsed.content) {
                  assistantMessage += parsed.content;
                  setMessages(prev => {
                    const newMessages = [...prev];
                    newMessages[newMessages.length - 1].content = assistantMessage;
                    return newMessages;
                  });
                }

                if (parsed.costUsd) {
                  setTotalCost(prev => prev + parsed.costUsd);
                }
              } catch (e) {
                // Skip invalid JSON
              }
            }
          }
        }
      }
    } catch (error) {
      console.error('Chat error:', error);
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant' as const,
          content: 'Sorry, an error occurred. Please try again.',
          timestamp: new Date(),
          isError: true,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleModelChange = (model: string | null) => {
    setSelectedModel(model);
  };

  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <div className="flex-1 flex flex-col lg:ml-72">
        {/* Header */}
        <header className="flex items-center justify-between px-6 py-4 bg-gray-800/50 backdrop-blur-sm border-b border-gray-700">
          <div className="flex items-center gap-4">
            <ModelSelector
              selectedModel={selectedModel}
              onModelChange={handleModelChange}
            />
          </div>

          <div className="flex items-center gap-4">
            <CostDisplay cost={totalCost} />
            <BudgetStatus compact />
          </div>
        </header>

        {/* Main Chat Area */}
        <main className="flex-1 overflow-hidden">
          <MessageList messages={messages} isLoading={isLoading} />
        </main>

        {/* Input Area */}
        <footer className="border-t border-gray-700 bg-gray-800/50 backdrop-blur-sm">
          <ChatInput
            onSendMessage={handleSendMessage}
            disabled={isLoading}
            conversationId={conversationId}
          />
        </footer>
      </div>
    </div>
  );
}
