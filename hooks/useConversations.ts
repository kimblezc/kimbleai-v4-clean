import { useState, useEffect, useCallback } from 'react';
import { groupConversationsByDate } from '@/lib/chat-utils';
import toast from 'react-hot-toast';

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

export interface ConversationsByProject {
  [projectId: string]: Conversation[];
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
  const [conversationsByProject, setConversationsByProject] = useState<ConversationsByProject>({});
  const [loading, setLoading] = useState(false);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [pinnedConversations, setPinnedConversations] = useState<Set<string>>(new Set());
  const [recentConversations, setRecentConversations] = useState<Conversation[]>([]);

  // Load recent conversation IDs from localStorage
  useEffect(() => {
    const stored = localStorage.getItem('recent-conversations');
    if (stored) {
      try {
        const recentIds = JSON.parse(stored) as string[];
        // Filter conversations that match recent IDs
        const recent = conversations.filter(c => recentIds.includes(c.id))
          .sort((a, b) => recentIds.indexOf(a.id) - recentIds.indexOf(b.id))
          .slice(0, 5);
        setRecentConversations(recent);
      } catch (e) {
        console.error('Failed to parse recent conversations:', e);
      }
    }
  }, [conversations]);

  const loadConversations = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/conversations?userId=${userId}&limit=100`);
      if (response.ok) {
        const data = await response.json();
        const rawConvs = data.conversations || [];

        // Filter out test/invalid conversations
        const convs = rawConvs.filter((c: Conversation) => {
          // Skip conversations with test IDs
          if (c.id.includes('test-') || c.id.includes('-test')) {
            return false;
          }
          // Skip conversations with invalid ID formats
          if (c.id.length < 10) {
            return false;
          }
          return true;
        });

        setConversations(convs);

        // Group conversations by date
        const grouped = groupConversationsByDate(convs);
        setGroupedConversations(grouped);

        // Group conversations by project
        const byProject: ConversationsByProject = {};
        convs.forEach((conv: Conversation) => {
          const projectId = conv.project_id || 'unassigned';
          if (!byProject[projectId]) {
            byProject[projectId] = [];
          }
          byProject[projectId].push(conv);
        });

        // Sort conversations within each project by updated_at
        Object.keys(byProject).forEach(projectId => {
          byProject[projectId].sort((a, b) => {
            const dateA = new Date(a.updated_at || a.created_at).getTime();
            const dateB = new Date(b.updated_at || b.created_at).getTime();
            return dateB - dateA; // Most recent first
          });
        });

        setConversationsByProject(byProject);

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
    console.log('[useConversations] selectConversation called with ID:', conversationId);
    setCurrentConversationId(conversationId);

    // Track in recent conversations
    const stored = localStorage.getItem('recent-conversations');
    let recentIds: string[] = [];
    if (stored) {
      try {
        recentIds = JSON.parse(stored);
      } catch (e) {
        console.error('Failed to parse recent conversations:', e);
      }
    }

    // Remove if already exists and add to front
    recentIds = recentIds.filter(id => id !== conversationId);
    recentIds.unshift(conversationId);

    // Keep only last 5
    recentIds = recentIds.slice(0, 5);

    localStorage.setItem('recent-conversations', JSON.stringify(recentIds));
  }, []);

  const deleteConversation = useCallback(async (conversationId: string) => {
    try {
      const response = await fetch(`/api/conversations/${conversationId}?userId=${userId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Failed to delete conversation:', errorData);
        toast.error('Failed to delete conversation');
        throw new Error(errorData.error || 'Failed to delete conversation');
      }

      setConversations(prev => prev.filter(c => c.id !== conversationId));
      if (currentConversationId === conversationId) {
        setCurrentConversationId(null);
      }
      toast.success('Conversation deleted');
      await loadConversations();
    } catch (error) {
      console.error('Failed to delete conversation:', error);
      toast.error('Failed to delete conversation');
      throw error;
    }
  }, [userId, currentConversationId, loadConversations]);

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
    toast.success('New conversation created');
  }, []);

  const removeOrphanedConversation = useCallback((conversationId: string) => {
    console.log('[useConversations] Removing orphaned conversation:', conversationId);

    // Remove from local state immediately
    setConversations(prev => prev.filter(c => c.id !== conversationId));

    // Clear current conversation if it's the orphaned one
    if (currentConversationId === conversationId) {
      setCurrentConversationId(null);
    }

    // Trigger reload to get fresh data from server
    loadConversations();
  }, [currentConversationId, loadConversations]);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  return {
    conversations,
    groupedConversations,
    conversationsByProject,
    recentConversations,
    loading,
    currentConversationId,
    pinnedConversations,
    loadConversations,
    selectConversation,
    deleteConversation,
    togglePin,
    createNewConversation,
    removeOrphanedConversation,
  };
}
