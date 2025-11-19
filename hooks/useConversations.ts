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
      console.log('[useConversations] Loading conversations for user:', userId);
      setLoading(true);
      const response = await fetch(`/api/conversations?userId=${userId}&limit=100`);
      console.log('[useConversations] API response status:', response.status);
      if (response.ok) {
        const data = await response.json();
        console.log('[useConversations] Raw API response:', data);
        const rawConvs = data.conversations || [];
        console.log('[useConversations] Raw conversations count:', rawConvs.length);

        // Filter out test/invalid conversations
        const convs = rawConvs.filter((c: Conversation) => {
          // Skip conversations with test IDs
          if (c.id.includes('test-') || c.id.includes('-test')) {
            return false;
          }
          // Skip conversations with invalid ID formats
          // FIXED: Proper UUID validation - UUIDs are 36 chars with hyphens
          // Accept both standard UUIDs (36 chars) and compact UUIDs (32 chars without hyphens)
          const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
          const compactUuidRegex = /^[0-9a-f]{32}$/i;
          if (!uuidRegex.test(c.id) && !compactUuidRegex.test(c.id)) {
            console.warn('[useConversations] Filtering invalid ID:', c.id);
            return false;
          }
          return true;
        });

        console.log('[useConversations] Filtered conversations count:', convs.length);
        console.log('[useConversations] Setting conversations state');
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

  const renameConversation = useCallback(async (conversationId: string, newTitle: string) => {
    try {
      const response = await fetch(`/api/conversations/${conversationId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          title: newTitle
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Failed to rename conversation:', errorData);
        toast.error('Failed to rename conversation');
        throw new Error(errorData.error || 'Failed to rename conversation');
      }

      // Update local state
      setConversations(prev => prev.map(c =>
        c.id === conversationId ? { ...c, title: newTitle } : c
      ));
      toast.success('Conversation renamed');
      await loadConversations();
    } catch (error) {
      console.error('Failed to rename conversation:', error);
      toast.error('Failed to rename conversation');
      throw error;
    }
  }, [userId, loadConversations]);

  const mergeConversations = useCallback(async (
    conversationIds: string[],
    newTitle?: string,
    deleteOriginals: boolean = false
  ) => {
    try {
      const response = await fetch('/api/conversations/merge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationIds,
          userId,
          newTitle,
          deleteOriginals
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Failed to merge conversations:', errorData);
        toast.error('Failed to merge conversations');
        throw new Error(errorData.error || 'Failed to merge conversations');
      }

      const data = await response.json();
      toast.success(`Merged ${conversationIds.length} conversations`);
      await loadConversations();

      // Select the newly merged conversation
      if (data.conversation?.id) {
        setCurrentConversationId(data.conversation.id);
      }

      return data.conversation;
    } catch (error) {
      console.error('Failed to merge conversations:', error);
      toast.error('Failed to merge conversations');
      throw error;
    }
  }, [userId, loadConversations]);

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
    console.log('[useConversations] Initial load triggered for userId:', userId);
    loadConversations();
    // FIXED: Use userId as dependency instead of loadConversations
    // Using loadConversations caused potential infinite loop since callback is recreated
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  return {
    conversations,
    groupedConversations,
    conversationsByProject,
    recentConversations,
    loading,
    currentConversationId,
    setCurrentConversationId,
    pinnedConversations,
    loadConversations,
    selectConversation,
    deleteConversation,
    togglePin,
    createNewConversation,
    removeOrphanedConversation,
    renameConversation,
    mergeConversations,
  };
}
