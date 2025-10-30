import { useState, useCallback, useRef, useEffect } from 'react';
import { scrollToBottom } from '@/lib/chat-utils';

export interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp?: string;
  projectId?: string;
  tags?: string[];
  modelInfo?: {
    model: string;
    reasoningLevel: string;
    costMultiplier: number;
    explanation: string;
  };
  metadata?: {
    transcriptionId?: string;
    googleDriveFileId?: string;
    type?: string;
    filename?: string;
    [key: string]: any;
  };
}

export function useMessages(conversationId: string | null, userId: string) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom(messagesEndRef.current);
  }, [messages]);

  const loadMessages = useCallback(async (convId: string) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/conversations/${convId}`);
      if (response.ok) {
        const data = await response.json();
        if (data.conversation && data.conversation.messages) {
          const formattedMessages = data.conversation.messages.map((msg: any) => ({
            role: msg.role,
            content: msg.content,
            timestamp: msg.created_at,
            modelInfo: msg.metadata?.modelInfo,
            metadata: msg.metadata,
          }));
          setMessages(formattedMessages);
        }
      }
    } catch (error) {
      console.error('Failed to load messages:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const sendMessage = useCallback(
    async (
      content: string,
      options?: {
        selectedModel?: string;
        currentProject?: string;
        suggestedTags?: string[];
        conversationTitle?: string;
      }
    ) => {
      if (!content.trim()) return;

      const userMessage: Message = {
        role: 'user',
        content,
        timestamp: new Date().toISOString(),
      };

      setMessages(prev => [...prev, userMessage]);
      setSending(true);

      try {
        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: [
              { role: 'user', content, projectId: options?.currentProject }
            ],
            conversationId,
            userId,
            preferredModel: options?.selectedModel,
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to send message');
        }

        const reader = response.body?.getReader();
        const decoder = new TextDecoder();
        let assistantMessage = '';

        if (reader) {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value);
            const lines = chunk.split('\n');

            for (const line of lines) {
              if (line.startsWith('data: ')) {
                try {
                  const data = JSON.parse(line.slice(6));
                  if (data.content) {
                    assistantMessage += data.content;
                    setMessages(prev => {
                      const newMessages = [...prev];
                      const lastMessage = newMessages[newMessages.length - 1];
                      if (lastMessage && lastMessage.role === 'assistant') {
                        lastMessage.content = assistantMessage;
                      } else {
                        newMessages.push({
                          role: 'assistant',
                          content: assistantMessage,
                          timestamp: new Date().toISOString(),
                        });
                      }
                      return newMessages;
                    });
                  }
                } catch (e) {
                  // Ignore JSON parse errors for incomplete chunks
                }
              }
            }
          }
        }
      } catch (error) {
        console.error('Error sending message:', error);
        setMessages(prev => [
          ...prev,
          {
            role: 'assistant',
            content: 'Sorry, there was an error processing your message. Please try again.',
            timestamp: new Date().toISOString(),
          },
        ]);
      } finally {
        setSending(false);
      }
    },
    [conversationId, userId]
  );

  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  return {
    messages,
    loading,
    sending,
    messagesEndRef,
    loadMessages,
    sendMessage,
    clearMessages,
    setMessages,
  };
}
