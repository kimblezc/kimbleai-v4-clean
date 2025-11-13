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

export function useMessages(
  conversationId: string | null,
  userId: string,
  onNotFound?: (conversationId: string) => void
) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const loadMessages = useCallback(async (convId: string) => {
    try {
      setLoading(true);
      console.log('[loadMessages] Starting load for conversation:', convId);

      // Skip loading if conversation ID looks invalid
      if (!convId || convId.includes('test-') || convId.includes('-test')) {
        console.warn('[loadMessages] Skipping invalid conversation ID:', convId);
        setMessages([]);
        return;
      }

      const url = `/api/conversations/${convId}?userId=${userId}`;
      console.log('[loadMessages] Fetching from URL:', url);
      const response = await fetch(url);
      console.log('[loadMessages] API response status:', response.status);

      if (response.ok) {
        const data = await response.json();
        console.log('[loadMessages] API response data:', data);

        if (data.conversation && data.conversation.messages) {
          console.log('[loadMessages] Found', data.conversation.messages.length, 'messages');
          const formattedMessages = data.conversation.messages.map((msg: any) => ({
            role: msg.role,
            content: msg.content,
            timestamp: msg.created_at,
            modelInfo: msg.metadata?.modelInfo,
            metadata: msg.metadata,
          }));
          console.log('[loadMessages] Setting', formattedMessages.length, 'formatted messages');
          setMessages(formattedMessages);
        } else {
          // Conversation exists but has no messages
          console.log('[loadMessages] Conversation exists but has no messages');
          setMessages([]);
        }
      } else if (response.status === 404) {
        // Conversation not found - clear messages and trigger orphan removal
        console.warn('[loadMessages] Conversation not found (404):', convId);
        setMessages([]);
        // Trigger orphaned conversation removal
        if (onNotFound) {
          onNotFound(convId);
        }
      } else {
        // Other error
        console.error('[loadMessages] Unexpected response status:', response.status);
        const errorText = await response.text();
        console.error('[loadMessages] Error response:', errorText);
        setMessages([]);
      }
    } catch (error) {
      console.error('[loadMessages] Failed to load messages:', error);
      setMessages([]);
    } finally {
      setLoading(false);
      console.log('[loadMessages] Finished loading messages');
    }
  }, [userId, onNotFound]);

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
        // CRITICAL FIX: Send full conversation history, not just current message
        // This enables proper context retention across multi-turn conversations
        const allMessages = [
          ...messages.map(msg => ({
            role: msg.role,
            content: msg.content,
            projectId: msg.projectId || options?.currentProject
          })),
          { role: 'user', content, projectId: options?.currentProject }
        ];

        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: allMessages,
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

  // Auto-load messages when conversation ID changes
  useEffect(() => {
    console.log('[useMessages] conversationId changed to:', conversationId);
    if (conversationId) {
      console.log('[useMessages] Loading messages for conversation:', conversationId);
      loadMessages(conversationId);
    } else {
      // Clear messages when no conversation is selected (new chat)
      console.log('[useMessages] No conversation selected, clearing messages');
      setMessages([]);
    }
  }, [conversationId, loadMessages]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom(messagesEndRef.current);
  }, [messages]);

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
