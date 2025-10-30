import { useState, useEffect, useCallback } from 'react';
import { groupConversationsByDate } from '@/lib/chat-utils';

export interface Conversation {
  id: string;
  title: string;
  user_id: string;
  project_id?: string;
  category_id?: string;
  summary?: string;
  is_pinned: boolean;
  created_at: string;
  updated_at: string;
  metadata?: any;
  messages?: any[];
}

export interface ConversationGroups {
  today: Conversation[];
  yesterday: Conversation[];
  thisWeek: Conversation[];
  thisMonth: Conversation[];
  older: Conversation[];
}

export function useConversations(userId: string) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [groupedConversations, setGroupedConversations] = useState<ConversationGroups>({
    today: [],
    yesterday: [],
    thisWeek: [],
    thisMonth: [],
    older: [],
  });
  const [loading, setLoading] = useState(false);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [pinnedConversations, setPinnedConversations] = useState<Set<string>>(new Set());

  const loadConversations = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/conversations?userId=${userId}&limit=100`);
      if (response.ok) {
        const data = await response.json();
        const convs = data.conversations || [];
        setConversations(convs);

        // Group conversations by date
        const grouped = groupConversationsByDate(convs);
        setGroupedConversations(grouped);

        // Track pinned conversations
        const pinned = new Set(convs.filter((c: Conversation) => c.is_pinned).map((c: Conversation) => c.id));
        setPinnedConversations(pinned);
      }
    } catch (error) {
      console.error('Failed to load conversations:', error);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  const selectConversation = useCallback((conversationId: string) => {
    setCurrentConversationId(conversationId);
  }, []);

  const deleteConversation = useCallback(async (conversationId: string) => {
    try {
      const response = await fetch(`/api/conversations/${conversationId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setConversations(prev => prev.filter(c => c.id !== conversationId));
        if (currentConversationId === conversationId) {
          setCurrentConversationId(null);
        }
        await loadConversations();
      }
    } catch (error) {
      console.error('Failed to delete conversation:', error);
      throw error;
    }
  }, [currentConversationId, loadConversations]);

  const togglePin = useCallback(async (conversationId: string, currentlyPinned: boolean) => {
    const newPinnedState = !currentlyPinned;

    try {
      // Optimistic update
      setPinnedConversations(prev => {
        const newSet = new Set(prev);
        if (newPinnedState) {
          newSet.add(conversationId);
        } else {
          newSet.delete(conversationId);
        }
        return newSet;
      });

      const response = await fetch('/api/conversations/pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId,
          pinned: newPinnedState,
        }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to update pin status');
      }

      await loadConversations();
    } catch (error: any) {
      console.error('Error toggling pin:', error);
      // Revert optimistic update
      setPinnedConversations(prev => {
        const newSet = new Set(prev);
        if (currentlyPinned) {
          newSet.add(conversationId);
        } else {
          newSet.delete(conversationId);
        }
        return newSet;
      });
      throw error;
    }
  }, [loadConversations]);

  const createNewConversation = useCallback(() => {
    setCurrentConversationId(null);
  }, []);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  return {
    conversations,
    groupedConversations,
    loading,
    currentConversationId,
    pinnedConversations,
    loadConversations,
    selectConversation,
    deleteConversation,
    togglePin,
    createNewConversation,
  };
}
