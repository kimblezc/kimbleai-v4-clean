'use client';
// Trigger deployment

import React, { useState } from 'react';
import { signIn, signOut, useSession } from 'next-auth/react';
import FormattedMessage from '../components/FormattedMessage';
import GoogleServicesPanel from '../components/GoogleServicesPanel';
import LoadingScreen from '../components/LoadingScreen';
import D20Dice from '../components/D20Dice';
import UnifiedSearch from '../components/search/UnifiedSearch';
import KimbleAILogo from '../components/KimbleAILogo';
import { ModelSelector, type AIModel } from '../components/model-selector/ModelSelector';
import versionData from '../version.json';

// Dynamic version info - commit hash auto-generated from Vercel environment
const versionInfo = {
  version: versionData.version,
  commit: process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA?.substring(0, 7) || versionData.commit || 'dev',
  lastUpdated: versionData.lastUpdated
};

interface Message {
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

export default function Home() {
  const { data: session, status } = useSession();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState<'zach' | 'rebecca'>('zach');
  const [currentProject, setCurrentProject] = useState('');
  const [projects, setProjects] = useState<any[]>([]);
  const [suggestedTags, setSuggestedTags] = useState<string[]>([]);
  const [showTags, setShowTags] = useState(false);
  const [conversationTitle, setConversationTitle] = useState('');
  const [conversationHistory, setConversationHistory] = useState<any[]>([]);
  const [isLoadingConversations, setIsLoadingConversations] = useState(false);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [selectedPhoto, setSelectedPhoto] = useState<File | null>(null);
  const [photoAnalysisType, setPhotoAnalysisType] = useState('general');
  const [isAnalyzingPhoto, setIsAnalyzingPhoto] = useState(false);
  const [pastedImage, setPastedImage] = useState<string | null>(null);
  const [selectedAudio, setSelectedAudio] = useState<File | null>(null);
  const [isTranscribingAudio, setIsTranscribingAudio] = useState(false);
  const [audioProgress, setAudioProgress] = useState<{
    progress: number;
    eta: number;
    status: string;
    jobId?: string;
  }>({ progress: 0, eta: 0, status: 'idle' });
  const [batchFiles, setBatchFiles] = useState<File[]>([]);
  const [batchProgress, setBatchProgress] = useState<{
    total: number;
    completed: number;
    current?: string;
    status: 'idle' | 'processing' | 'completed';
  }>({ total: 0, completed: 0, status: 'idle' });
  const pollingIntervalRef = React.useRef<NodeJS.Timeout | null>(null);
  const completedJobsRef = React.useRef<Set<string>>(new Set());
  const initialProjectSetRef = React.useRef<boolean>(false);
  const messagesEndRef = React.useRef<HTMLDivElement>(null);
  const [showGoogleServices, setShowGoogleServices] = useState(false);
  const [moveToProjectConvId, setMoveToProjectConvId] = useState<string | null>(null);
  const [showProjectDropdown, setShowProjectDropdown] = useState<string | null>(null);
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set());
  const [showProjectSelector, setShowProjectSelector] = useState(false);
  const [pendingTranscriptionId, setPendingTranscriptionId] = useState<string | null>(null);
  const [newProjectName, setNewProjectName] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [costStats, setCostStats] = useState<{
    hourly: { used: number; limit: number; percentage: number };
    daily: { used: number; limit: number; percentage: number };
    monthly: { used: number; limit: number; percentage: number };
  } | null>(null);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [activeTagFilters, setActiveTagFilters] = useState<string[]>([]);
  const [collapsedDateGroups, setCollapsedDateGroups] = useState<Set<string>>(
    new Set(['older']) // Collapse "older" by default
  );

  // NEW FEATURES: Pinning and Sorting
  const [pinnedConversations, setPinnedConversations] = useState<Set<string>>(new Set());
  const [sortBy, setSortBy] = useState<'date-new' | 'date-old' | 'name' | 'count'>('date-new');
  const [showManageTags, setShowManageTags] = useState(false);
  const newChatButtonRef = React.useRef<HTMLButtonElement>(null);

  // AI Model Selection
  const [selectedModel, setSelectedModel] = useState<AIModel>('gpt-4o');
  const [showModelSelector, setShowModelSelector] = useState(false);

  // Helper function to group conversations by date
  // UPDATED: Now separates pinned conversations into a separate group
  const groupConversationsByDate = React.useCallback((conversations: any[]) => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterdayStart = new Date(todayStart.getTime() - 86400000);
    const thisWeekStart = new Date(todayStart.getTime() - (now.getDay() * 86400000));

    const groups = {
      pinned: [] as any[], // NEW: Pinned conversations group
      today: [] as any[],
      yesterday: [] as any[],
      thisWeek: [] as any[],
      older: [] as any[]
    };

    // Separate pinned and unpinned conversations
    const pinnedConvs: any[] = [];
    const unpinnedConvs: any[] = [];

    conversations.forEach(conv => {
      if (conv.pinned || pinnedConversations.has(conv.id)) {
        pinnedConvs.push(conv);
      } else {
        unpinnedConvs.push(conv);
      }
    });

    // Sort pinned by pinned_at date (most recent first)
    groups.pinned = pinnedConvs.sort((a, b) => {
      const dateA = new Date(a.pinned_at || a.updated_at || a.created_at).getTime();
      const dateB = new Date(b.pinned_at || b.updated_at || b.created_at).getTime();
      return dateB - dateA;
    });

    // Group unpinned conversations by date
    unpinnedConvs.forEach(conv => {
      const convDate = new Date(conv.updated_at || conv.created_at);
      if (convDate >= todayStart) {
        groups.today.push(conv);
      } else if (convDate >= yesterdayStart) {
        groups.yesterday.push(conv);
      } else if (convDate >= thisWeekStart) {
        groups.thisWeek.push(conv);
      } else {
        groups.older.push(conv);
      }
    });

    return groups;
  }, [pinnedConversations]);

  // Get welcome message based on time of day and user
  const welcomeMessage = React.useMemo(() => {
    const hour = new Date().getHours();

    // Custom greetings for Rebecca
    if (currentUser === 'rebecca') {
      if (hour >= 6 && hour < 12) {
        return 'Good Morning my lovely dear Rebecca';
      } else if (hour >= 12 && hour < 17) {
        return 'Afternoon pretty Rebecca';
      } else if (hour >= 17 && hour < 22) {
        return 'Good evening my darling dear';
      } else {
        return 'I love you, I cherish you, please go to sleep';
      }
    }

    // Standard greetings for Zachary
    if (hour >= 5 && hour < 12) {
      return 'Good Morning, Zachary';
    } else if (hour >= 12 && hour < 17) {
      return 'Good Afternoon, Zachary';
    } else if (hour >= 17 && hour < 21) {
      return 'Good Evening, Zachary';
    } else {
      return 'Welcome Back, Zachary';
    }
  }, [currentUser]);

  // Redirect to sign-in if not authenticated
  React.useEffect(() => {
    if (status === 'unauthenticated') {
      window.location.href = '/auth/signin';
    }
  }, [status]);

  // Load cost stats
  React.useEffect(() => {
    const loadCosts = async () => {
      if (!session) return;

      try {
        // Use currentUser directly (same userId used for chat API cost tracking)
        const response = await fetch(`/api/costs?action=summary&userId=${currentUser}`);
        const data = await response.json();

        if (data.error) {
          console.error('[CostTracker] Error loading costs:', data.error);
          return;
        }

        if (!data.error) {
          setCostStats({
            hourly: data.hourly,
            daily: data.daily,
            monthly: data.monthly
          });
        }
      } catch (err) {
        console.error('[CostTracker] Failed to load costs:', err);
      }
    };

    if (session) {
      loadCosts();
      const interval = setInterval(loadCosts, 60000); // Refresh every 60s
      return () => clearInterval(interval);
    }
  }, [session, currentUser]);

  // Auto-scroll to bottom when messages change
  React.useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  }, [messages, loading]);

  // NEW: Keyboard shortcuts
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const modKey = isMac ? e.metaKey : e.ctrlKey;

      // Cmd/Ctrl + K: Focus search
      if (modKey && e.key === 'k') {
        e.preventDefault();
        setIsSearchOpen(true);
        // Focus will be handled by UnifiedSearch component
      }

      // Cmd/Ctrl + N: New Chat
      if (modKey && e.key === 'n') {
        e.preventDefault();
        if (newChatButtonRef.current) {
          newChatButtonRef.current.click();
        }
      }

      // Cmd/Ctrl + B: Toggle Sidebar
      if (modKey && e.key === 'b') {
        e.preventDefault();
        setIsMobileSidebarOpen(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Removed: Deep Research & Agent Mode (non-functional, will rebuild properly)

  // Load projects from database (separate from conversations)
  const loadProjects = React.useCallback(async () => {
    try {
      const response = await fetch(`/api/projects?userId=${currentUser}&action=list`);
      const data = await response.json();

      if (data.success && data.projects) {
        // Sort projects by conversation count and name
        const sortedProjects = [...data.projects].sort((a, b) => {
          // First by conversation count (descending)
          const countDiff = (b.stats?.total_conversations || 0) - (a.stats?.total_conversations || 0);
          if (countDiff !== 0) return countDiff;
          // Then alphabetically by name
          return a.name.localeCompare(b.name);
        });

        setProjects(sortedProjects);

        // Set first project as current if none selected - only do this once on initial load
        if (!initialProjectSetRef.current && sortedProjects.length > 0) {
          setCurrentProject(sortedProjects[0].id);
          initialProjectSetRef.current = true;
        }
      } else {
        console.error('Failed to load projects:', data.error);
        setProjects([]);
      }
    } catch (error) {
      console.error('Error loading projects:', error);
      setProjects([]);
    }
  }, [currentUser]);

  // Load conversations for current project (simplified - no project computation)
  const loadConversations = React.useCallback(async (projectId: string = '') => {
    setIsLoadingConversations(true);
    try {
      const response = await fetch(`/api/conversations?userId=${currentUser}&limit=50`);
      const data = await response.json();

      if (data.success) {
        // Filter conversations by project if specified
        const filteredConversations = projectId
          ? data.conversations.filter((conv: any) => conv.project === projectId)
          : data.conversations;

        setConversationHistory(filteredConversations.slice(0, 10));
      } else {
        console.error('Failed to load conversations:', data.error);
        setConversationHistory([]);
      }
    } catch (error) {
      console.error('Error loading conversations:', error);
      setConversationHistory([]);
    } finally {
      setIsLoadingConversations(false);
    }
  }, [currentUser]);

  // Helper function to format project names
  const formatProjectName = (id: string): string => {
    const nameMap: Record<string, string> = {
      development: 'Development',
      business: 'Business',
      automotive: 'Automotive',
      personal: 'Personal',
      travel: 'Travel',
      gaming: 'Gaming & DND',
      cooking: 'Cooking & Recipes',
      legal: 'Legal'
    };
    return nameMap[id] || id.charAt(0).toUpperCase() + id.slice(1);
  };

  // Load specific conversation
  const loadConversation = async (conversationId: string) => {
    try {
      const response = await fetch('/api/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversationId, userId: currentUser })
      });
      const data = await response.json();

      if (data.success) {
        setMessages(data.conversation.messages);
        setConversationTitle(data.conversation.title);
        setCurrentProject(data.conversation.project);
        setCurrentConversationId(conversationId);
      }
    } catch (error) {
      console.error('Error loading conversation:', error);
    }
  };

  // Move conversation to a different project
  const moveConversationToProject = async (conversationId: string, projectId: string) => {
    try {
      const response = await fetch('/api/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'assign_project',
          conversationId,
          projectId,
          userId: currentUser
        })
      });
      const data = await response.json();

      if (data.success) {
        // Refresh conversation list to reflect the change
        await loadConversations();
        setShowProjectDropdown(null);
        alert(`Conversation moved to ${formatProjectName(projectId)} successfully!`);
      } else {
        alert('Failed to move conversation: ' + data.error);
      }
    } catch (error) {
      console.error('Error moving conversation:', error);
      alert('Failed to move conversation');
    }
  };

  // Load projects and conversations on initial mount and user change
  // Note: We intentionally omit loadConversations and loadProjects from deps to prevent infinite loop
  // eslint-disable-next-line react-hooks/exhaustive-deps
  React.useEffect(() => {
    initialProjectSetRef.current = false; // Reset when user changes
    loadProjects();
    loadConversations();
  }, [currentUser]);

  // Persist currentProject to localStorage and restore on load
  React.useEffect(() => {
    const savedProject = localStorage.getItem(`kimbleai_project_${currentUser}`);
    if (savedProject && projects.some(p => p.id === savedProject)) {
      setCurrentProject(savedProject);
    }
  }, [projects, currentUser]);

  React.useEffect(() => {
    if (currentProject) {
      localStorage.setItem(`kimbleai_project_${currentUser}`, currentProject);
    }
  }, [currentProject, currentUser]);

  // Setup global functions for transcription export
  React.useEffect(() => {
    (window as any).downloadTranscription = async (transcriptionId: string, format: string) => {
      try {
        const response = await fetch('/api/transcribe/export', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ transcriptionId, format })
        });

        if (!response.ok) throw new Error('Export failed');

        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `transcript_${transcriptionId}.${format}`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } catch (error) {
        console.error('Download failed:', error);
        alert('Failed to download transcription');
      }
    };

    (window as any).saveToDrive = async (transcriptionId: string) => {
      // Open project selector modal
      setPendingTranscriptionId(transcriptionId);
      setShowProjectSelector(true);
    };
  }, []);

  // Load conversations when project changes
  const handleProjectChange = (projectId: string) => {
    setCurrentProject(projectId);
    loadConversations(projectId);
  };

  // Handle export with selected project
  const handleExportWithProject = async (projectId: string) => {
    if (!pendingTranscriptionId) return;

    try {
      const response = await fetch('/api/transcribe/save-to-drive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transcriptionId: pendingTranscriptionId,
          category: projectId,
          multiFormat: true  // Export all 4 formats
        })
      });

      const data = await response.json();

      if (!response.ok) throw new Error(data.error || 'Save failed');

      // Show success message with all exported files
      let message = `✅ ${data.message}\n\n`;
      if (data.files && data.files.length > 0) {
        message += 'Files created:\n';
        data.files.forEach((file: any) => {
          message += `• ${file.format}: ${file.webViewLink}\n`;
        });
      }

      alert(message);

      // Close modal and reset
      setShowProjectSelector(false);
      setPendingTranscriptionId(null);
    } catch (error: any) {
      console.error('Save to Drive failed:', error);
      alert('Failed to save to Google Drive: ' + error.message);
    }
  };

  // Create new project
  const handleCreateProject = async () => {
    const projectName = newProjectName.trim();

    if (!projectName) {
      alert('Please enter a project name');
      return;
    }

    const projectId = projectName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

    if (projects.some(p => p.id === projectId)) {
      alert('A project with this name already exists');
      return;
    }

    try {
      // Create project in database via API
      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create',
          userId: currentUser,
          projectData: {
            name: projectName,
            description: '',
            priority: 'medium',
            status: 'active',
            tags: [],
            metadata: {}
          }
        })
      });

      const data = await response.json();

      if (data.success) {
        // Reload projects from database (cache will be invalidated by API)
        await loadProjects();

        // Reload conversations
        loadConversations();

        // Clear input
        setNewProjectName('');

        // Automatically select the new project and export
        handleExportWithProject(data.project.id);
      } else {
        throw new Error(data.error || 'Failed to create project');
      }
    } catch (error: any) {
      console.error('Error creating project:', error);
      alert('Failed to create project: ' + error.message);
    }
  };

  // Clear any old localStorage entries from previous deletion tracking system
  React.useEffect(() => {
    localStorage.removeItem(`kimbleai_deleted_projects_${currentUser}`);
    localStorage.removeItem(`kimbleai_created_projects_${currentUser}`);
  }, [currentUser]);

  // Delete project function - completely removes project with persistent storage
  const deleteProject = async (projectId: string) => {
    const projectName = formatProjectName(projectId);
    const confirmMessage = `Are you sure you want to DELETE "${projectName}" project?\n\nThis will:\n- Remove the project completely\n- Move all conversations to unassigned\n- This action cannot be undone\n\nProceed?`;

    if (!confirm(confirmMessage)) {
      return;
    }

    try {
      // Call the API to properly delete the project from database
      const response = await fetch('/api/projects/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          userId: currentUser
        })
      });

      const data = await response.json();

      if (data.success) {
        // Reload projects from database (no client-side tracking needed)
        await loadProjects();

        // Switch to first available project if deleting current project
        if (currentProject === projectId) {
          const remainingProjects = projects.filter(p => p.id !== projectId);
          setCurrentProject(remainingProjects.length > 0 ? remainingProjects[0].id : '');
        }

        // Reload conversations to get updated data from server
        setTimeout(() => loadConversations(), 200);

        alert(`Project "${projectName}" deleted successfully!\n${data.conversationsMoved} conversations moved to unassigned.`);
      } else {
        throw new Error(data.error || 'Failed to delete project');
      }
    } catch (error: any) {
      console.error('Error deleting project:', error);
      alert(`Failed to delete project: ${error.message}`);
    }
  };

  // Function to restore deleted projects (for debugging)
  const restoreDeletedProjects = () => {
    setDeletedProjects(new Set());
    localStorage.removeItem(`kimbleai_deleted_projects_${currentUser}`);
    loadConversations();
  };

  // NEW: Pin/Unpin conversation handler
  const togglePinConversation = async (conversationId: string, currentlyPinned: boolean) => {
    const newPinnedState = !currentlyPinned;

    try {
      // Optimistically update UI
      setPinnedConversations(prev => {
        const newSet = new Set(prev);
        if (newPinnedState) {
          newSet.add(conversationId);
        } else {
          newSet.delete(conversationId);
        }
        return newSet;
      });

      // Call API
      const response = await fetch('/api/conversations/pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId,
          pinned: newPinnedState
        })
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to update pin status');
      }

      // Reload conversations to get updated data from server
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
      alert(`Failed to ${newPinnedState ? 'pin' : 'unpin'} conversation: ${error.message}`);
    }
  };

  // Handle photo upload and analysis
  const handlePhotoAnalysis = React.useCallback(async (file: File) => {
    setIsAnalyzingPhoto(true);
    try {
      const formData = new FormData();
      formData.append('photo', file);
      formData.append('analysisType', photoAnalysisType);
      formData.append('userId', currentUser);

      console.log('📸 Starting photo analysis:', {
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
        analysisType: photoAnalysisType,
        userId: currentUser
      });

      const response = await fetch('/api/photo', {
        method: 'POST',
        body: formData,
        credentials: 'include', // Ensure cookies are sent for authentication
      });

      console.log('📡 Photo API response status:', response.status, response.statusText);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Photo API error response:', errorText);
        throw new Error(`API returned ${response.status}: ${errorText.substring(0, 200)}`);
      }

      const data = await response.json();
      console.log('✅ Photo analysis successful:', {
        photoId: data.photoId,
        tags: data.autoTags,
        project: data.suggestedProject
      });

      if (data.success) {
        // Add photo analysis as a message
        const photoMessage: Message = {
          role: 'user',
          content: `📸 Photo uploaded: ${file.name}`,
          timestamp: new Date().toISOString(),
          projectId: data.suggestedProject,
          tags: data.autoTags
        };

        const analysisMessage: Message = {
          role: 'assistant',
          content: `## Photo Analysis Results\n\n**File:** ${file.name}\n**Analysis Type:** ${photoAnalysisType}\n**Suggested Project:** ${data.suggestedProject}\n**Auto Tags:** ${data.autoTags.join(', ')}\n\n### Analysis:\n${data.analysis}\n\n---\n*Photo ID: ${data.photoId}*`,
          timestamp: new Date().toISOString(),
          projectId: data.suggestedProject,
          tags: data.autoTags
        };

        setMessages(prev => [...prev, photoMessage, analysisMessage]);

        // Update suggested tags
        setSuggestedTags(data.autoTags);
        setShowTags(true);

        // Clear selected photo
        setSelectedPhoto(null);
      } else {
        throw new Error(data.error || 'Photo analysis failed');
      }
    } catch (error: any) {
      console.error('🚨 Photo analysis error:', error);

      let errorDetails = error.message;

      // Provide more specific error messages
      if (error.message === 'Failed to fetch') {
        errorDetails = 'Network error: Unable to reach the server. Please check your internet connection and try again.';
      } else if (error.message.includes('401')) {
        errorDetails = 'Authentication required: Please refresh the page and sign in again.';
      } else if (error.message.includes('403')) {
        errorDetails = 'Access denied: Your account may not have permission to use this feature.';
      } else if (error.message.includes('413')) {
        errorDetails = 'File too large: Please use an image under 20MB.';
      } else if (error.message.includes('415')) {
        errorDetails = 'Invalid file type: Please use JPEG, PNG, or WebP images only.';
      }

      const errorMessage: Message = {
        role: 'assistant',
        content: `❌ **Photo Analysis Failed**\n\n${errorDetails}\n\n**Technical Details:** ${error.message}\n\nIf this issue persists, please contact support.`,
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsAnalyzingPhoto(false);
    }
  }, [currentUser, photoAnalysisType]);

  // Handle file selection
  const handlePhotoSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedPhoto(file);
      handlePhotoAnalysis(file);
    }
  };

  // Handle audio file selection
  const handleAudioSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);

    if (files.length === 0) return;

    if (files.length === 1) {
      // Single file - use existing flow
      setSelectedAudio(files[0]);
      handleAudioTranscription(files[0]);
    } else {
      // Multiple files - use batch upload
      setBatchFiles(files);
      handleBatchAudioTranscription(files);
    }
  };

  // Poll progress for audio transcription
  const pollAudioProgress = React.useCallback(async (jobId: string) => {
    try {
      // Prevent duplicate processing
      if (completedJobsRef.current.has(jobId)) {
        console.log('[AUDIO] Job already completed, skipping:', jobId);
        return;
      }

      const response = await fetch(`/api/transcribe/assemblyai?jobId=${jobId}`);
      const data = await response.json();

      if (data.success) {
        setAudioProgress({
          progress: data.progress,
          eta: data.eta,
          status: data.status,
          jobId
        });

        if (data.status === 'completed' && data.result) {
          // Mark as completed to prevent duplicates
          completedJobsRef.current.add(jobId);

          // Clear polling interval
          if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
            pollingIntervalRef.current = null;
          }
          // Show completion message
          const audioMessage: Message = {
            role: 'user',
            content: `🎵 Audio uploaded: ${data.result.filename} (${(data.result.fileSize / 1024 / 1024).toFixed(1)} MB)`,
            timestamp: new Date().toISOString(),
            projectId: currentProject
          };

          // Build feature summary
          const features = [];
          if (data.result.speakers > 1) features.push(`${data.result.speakers} speakers identified`);
          if (data.result.chapters > 0) features.push(`${data.result.chapters} chapters detected`);
          if (data.result.summary) features.push('auto-generated summary');
          if (data.result.sentiment) features.push('sentiment analysis');
          if (data.result.entities?.length > 0) features.push(`${data.result.entities.length} entities detected`);

          let content = `## 🎵 Audio Transcription Complete\n\n**File:** ${data.result.filename}\n**Duration:** ${Math.round(data.result.duration || 0)} seconds\n**Service:** AssemblyAI (Premium Features)\n`;

          if (features.length > 0) {
            content += `**AI Features:** ${features.join(', ')}\n`;
          }

          if (data.result.summary) {
            content += `\n### 📋 Auto-Generated Summary:\n${data.result.summary}\n`;
          }

          // Format transcription with speakers and timestamps
          content += `\n### 📝 Full Transcription:\n\n`;

          // Check if we have utterances (speaker diarization)
          if (data.result.utterances && data.result.utterances.length > 0) {
            // Group by speaker for better readability
            data.result.utterances.forEach((utterance: any) => {
              const startTime = Math.floor(utterance.start / 1000); // Convert ms to seconds
              const minutes = Math.floor(startTime / 60);
              const seconds = startTime % 60;
              const timestamp = `${minutes}:${seconds.toString().padStart(2, '0')}`;

              content += `**[${timestamp}] Speaker ${utterance.speaker}:** ${utterance.text}\n\n`;
            });
          } else {
            // Fallback to plain text if no utterances
            content += `${data.result.text}\n\n`;
          }

          const transcriptionId = data.result.metadata?.assemblyai_id || data.result.id;
          console.log('[AUDIO] AssemblyAI ID from metadata:', data.result.metadata?.assemblyai_id);
          console.log('[AUDIO] Database ID:', data.result.id);
          console.log('[AUDIO] Final transcriptionId:', transcriptionId);

          const transcriptionMessage: Message = {
            role: 'assistant',
            content,
            timestamp: new Date().toISOString(),
            projectId: currentProject,
            metadata: {
              transcriptionId: transcriptionId,
              googleDriveFileId: data.result.googleDriveFileId,
              type: 'transcription',
              filename: data.result.filename
            }
          };

          // Add export button message immediately after
          const exportMessage: Message = {
            role: 'assistant',
            content: `📤 **Ready to export!** Click below to save all formats to Google Drive:\n\n🔵 Reply with "export" to save to: **kimbleai-transcriptions/${currentProject}/${data.result.filename.replace(/\.[^/.]+$/, '')}/**`,
            timestamp: new Date().toISOString(),
            projectId: currentProject,
            metadata: {
              transcriptionId: transcriptionId,  // Use the same ID from above
              googleDriveFileId: data.result.googleDriveFileId,
              type: 'export-prompt',
              filename: data.result.filename
            }
          };

          setMessages(prev => [...prev, audioMessage, transcriptionMessage, exportMessage]);
          setIsTranscribingAudio(false);
          setAudioProgress({ progress: 0, eta: 0, status: 'idle' });

          console.log('[AUDIO] Transcription successful:', data.result);
        } else if (data.status === 'failed') {
          // Mark as completed to prevent duplicates
          completedJobsRef.current.add(jobId);

          // Clear polling interval
          if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
            pollingIntervalRef.current = null;
          }

          const errorMessage: Message = {
            role: 'assistant',
            content: `❌ **Audio Transcription Failed**\n\nError: ${data.error || 'Unknown error'}\n\nPlease try again with a different audio file or contact support if the issue persists.`,
            timestamp: new Date().toISOString()
          };
          setMessages(prev => [...prev, errorMessage]);
          setIsTranscribingAudio(false);
          setAudioProgress({ progress: 0, eta: 0, status: 'idle' });
        }
      }
    } catch (err) {
      console.error('[AUDIO] Progress poll error:', err);
    }
  }, [currentProject]);

  // Handle audio transcription with progress tracking
  // Handle chunked audio transcription for large files
  const handleChunkedAudioTranscription = async (file: File) => {
    setIsTranscribingAudio(true);
    setAudioProgress({ progress: 0, eta: 0, status: 'preparing_chunks' });

    try {
      const chunkSize = 4 * 1024 * 1024; // 4MB chunks (well under Vercel limits)
      const totalChunks = Math.ceil(file.size / chunkSize);
      const chunks = [];

      console.log(`Splitting ${file.name} into ${totalChunks} chunks of ~4MB each`);

      // Split file into chunks
      for (let i = 0; i < totalChunks; i++) {
        const start = i * chunkSize;
        const end = Math.min(start + chunkSize, file.size);
        const chunk = file.slice(start, end);
        chunks.push({
          data: chunk,
          index: i,
          filename: `${file.name.split('.')[0]}_chunk_${i + 1}.${file.name.split('.').pop()}`
        });
      }

      setAudioProgress({ progress: 10, eta: totalChunks * 30, status: 'processing_chunks' });

      // Process chunks sequentially
      const results = [];
      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        console.log(`Processing chunk ${i + 1}/${chunks.length}: ${chunk.filename}`);

        const formData = new FormData();
        formData.append('audio', chunk.data, chunk.filename);
        formData.append('userId', currentUser);
        formData.append('projectId', currentProject);
        formData.append('chunkIndex', i.toString());
        formData.append('totalChunks', chunks.length.toString());
        formData.append('isChunked', 'true');

        const response = await fetch('/api/transcribe', {
          method: 'POST',
          body: formData,
        });

        const responseText = await response.text();
        let data;
        try {
          data = JSON.parse(responseText);
        } catch (jsonError) {
          throw new Error(`Chunk ${i + 1} failed: Server returned non-JSON response (${response.status}): ${responseText.substring(0, 100)}...`);
        }

        if (!response.ok) {
          throw new Error(`Chunk ${i + 1} failed: ${data.error || 'Unknown error'}`);
        }

        results.push({
          chunk: i + 1,
          transcription: data.transcription,
          duration: data.duration
        });

        // Update progress
        const progressPercent = ((i + 1) / chunks.length) * 80 + 10; // 10-90%
        const remainingChunks = chunks.length - (i + 1);
        const eta = remainingChunks * 30; // ~30 seconds per chunk estimate
        setAudioProgress({ progress: progressPercent, eta: eta, status: `processing_chunk_${i + 1}` });
      }

      // Combine results
      setAudioProgress({ progress: 95, eta: 5, status: 'combining_results' });

      const combinedTranscription = results.map(r => r.transcription).join(' ');
      const totalDuration = results.reduce((sum, r) => sum + (r.duration || 0), 0);

      console.log(`Chunked transcription completed: ${results.length} chunks, ${combinedTranscription.length} characters`);

      // Add success message
      const successMessage: Message = {
        role: 'assistant',
        content: `🎵 **Audio Transcribed Successfully** (${totalChunks} chunks)\n\n**File:** ${file.name} (${(file.size / 1024 / 1024).toFixed(1)} MB)\n**Duration:** ${Math.round(totalDuration)}s\n**Chunks Processed:** ${results.length}\n\n**Transcription:**\n${combinedTranscription}`,
        timestamp: new Date().toISOString()
      };

      setMessages(prev => [...prev, successMessage]);
      setAudioProgress({ progress: 100, eta: 0, status: 'completed' });
      setIsTranscribingAudio(false);

    } catch (error: any) {
      console.error('Chunked audio transcription error:', error);
      const errorMessage: Message = {
        role: 'assistant',
        content: `❌ **Chunked Audio Transcription Failed**\n\nError: ${error.message}\n\nPlease try again or contact support if the issue persists.`,
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, errorMessage]);
      setIsTranscribingAudio(false);
      setAudioProgress({ progress: 0, eta: 0, status: 'idle' });
    }
  };

  const handleAudioTranscription = async (file: File) => {
    setIsTranscribingAudio(true);
    setAudioProgress({ progress: 0, eta: 0, status: 'initializing' });

    try {
      console.log(`[AUDIO-PAGE] Starting transcription for file: ${file.name} (${file.size} bytes)`);

      const fileSizeMB = file.size / (1024 * 1024);
      const fileSizeGB = fileSizeMB / 1024;

      // For large files (>4MB), upload directly to AssemblyAI from browser
      // This bypasses Vercel's 4.5MB body limit
      console.log(`[AUDIO-PAGE] Using direct browser upload for ${file.name} (${fileSizeMB.toFixed(1)}MB)`);

      // Step 1: Upload file directly to AssemblyAI from browser
      setAudioProgress({ progress: 5, eta: Math.round(fileSizeMB * 2), status: 'uploading_to_assemblyai' });

      const arrayBuffer = await file.arrayBuffer();

      setAudioProgress({ progress: 10, eta: Math.round(fileSizeMB * 2), status: 'uploading_to_assemblyai' });

      // Retry logic for large file uploads (handles network timeouts)
      let uploadUrl: string | null = null;
      let lastError: Error | null = null;
      const maxRetries = 3;

      // Calculate dynamic timeout based on file size
      // Assume minimum speed of 200 KB/s (very slow connection)
      // Add 5 minute buffer for network overhead
      const minSpeedKBps = 200; // 200 KB/s = very slow connection
      const fileSizeKB = fileSizeMB * 1024;
      const estimatedUploadSeconds = Math.ceil(fileSizeKB / minSpeedKBps);
      const timeoutSeconds = Math.max(300, estimatedUploadSeconds + 300); // At least 5 min, or upload time + 5 min buffer
      const timeoutMs = timeoutSeconds * 1000;

      console.log(`[AUDIO-PAGE] Upload timeout set to ${Math.round(timeoutSeconds / 60)} minutes for ${fileSizeMB.toFixed(1)}MB file`);

      // Get secure upload credentials from backend (never expose API key in frontend)
      console.log('[AUDIO-PAGE] Getting secure upload credentials...');
      console.log('[AUDIO-PAGE] File details:', {
        name: file.name,
        size: `${fileSizeMB.toFixed(2)}MB`,
        type: file.type
      });

      const credentialsResponse = await fetch('/api/transcribe/upload-url', {
        method: 'POST',
      });

      if (!credentialsResponse.ok) {
        const errorText = await credentialsResponse.text();
        console.error('[AUDIO-PAGE] Failed to get credentials:', errorText);
        throw new Error(`Failed to get upload credentials (HTTP ${credentialsResponse.status}). Please check API key configuration.`);
      }

      const credentialsData = await credentialsResponse.json();
      console.log('[AUDIO-PAGE] Credentials response:', credentialsData);

      // Check if we should use Whisper fallback
      if (credentialsData.fallback === 'whisper') {
        console.log('[AUDIO-PAGE] AssemblyAI unavailable, using Whisper fallback');
        console.log('[AUDIO-PAGE] Reason:', credentialsData.message);

        // Show user a warning about the fallback
        const fallbackMessage: Message = {
          role: 'assistant',
          content: `ℹ️ **Transcription Service Notice**\n\n${credentialsData.message}\n\n**File:** ${file.name} (${fileSizeMB.toFixed(1)}MB)\n\nStarting Whisper transcription...`,
          timestamp: new Date().toISOString()
        };
        setMessages(prev => [...prev, fallbackMessage]);

        // Use Whisper API directly (25MB limit)
        if (fileSizeMB > 24) {
          throw new Error(
            `File too large for Whisper API (${fileSizeMB.toFixed(1)}MB). Whisper supports up to 25MB files.\n\n` +
            `To enable large file support:\n` +
            `1. Enable billing on your AssemblyAI account\n` +
            `2. Visit: ${credentialsData.troubleshooting?.step1 || 'https://www.assemblyai.com/app/account'}`
          );
        }

        // Call Whisper API via our backend
        setAudioProgress({ progress: 10, eta: Math.round(fileSizeMB * 2), status: 'uploading_to_whisper' });

        const formData = new FormData();
        formData.append('audio', file);
        formData.append('userId', currentUser);
        formData.append('projectId', currentProject);

        const whisperResponse = await fetch('/api/transcribe', {
          method: 'POST',
          body: formData,
        });

        if (!whisperResponse.ok) {
          const errorData = await whisperResponse.json();
          throw new Error(errorData.error || 'Whisper transcription failed');
        }

        const whisperData = await whisperResponse.json();

        // Show success message
        const successMessage: Message = {
          role: 'assistant',
          content: `✅ **Transcription Complete (Whisper API)**\n\n**File:** ${file.name} (${fileSizeMB.toFixed(1)}MB)\n**Duration:** ${Math.round(whisperData.duration || 0)}s\n**Characters:** ${whisperData.transcription.length}\n\n### Transcription:\n${whisperData.transcription}`,
          timestamp: new Date().toISOString()
        };
        setMessages(prev => [...prev, successMessage]);
        setIsTranscribingAudio(false);
        setAudioProgress({ progress: 100, eta: 0, status: 'completed' });

        return; // Exit early, don't continue with AssemblyAI flow
      }

      // AssemblyAI is available - continue with normal flow
      const { upload_url: assemblyAIUploadUrl, auth_token } = credentialsData;
      console.log('[AUDIO-PAGE] Upload credentials received');
      console.log('[AUDIO-PAGE] Upload URL:', assemblyAIUploadUrl);
      console.log('[AUDIO-PAGE] Auth token length:', auth_token?.length || 0);

      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          console.log(`[AUDIO-PAGE] Upload attempt ${attempt}/${maxRetries} for ${file.name}`);

          // Use AbortController with dynamic timeout based on file size
          const controller = new AbortController();
          const timeoutId = setTimeout(() => {
            console.log(`[AUDIO-PAGE] Upload timed out after ${Math.round(timeoutSeconds / 60)} minutes`);
            controller.abort();
          }, timeoutMs);

          const uploadResponse = await fetch(assemblyAIUploadUrl, {
            method: 'POST',
            headers: {
              'Authorization': auth_token,
              'Content-Type': 'application/octet-stream',
            },
            body: arrayBuffer,
            signal: controller.signal,
            // @ts-ignore - keepalive helps with HTTP/2 issues
            keepalive: false, // Disable keepalive for large uploads
          });

          clearTimeout(timeoutId);

          if (!uploadResponse.ok) {
            const errorText = await uploadResponse.text();
            console.error('[AUDIO-PAGE] Upload failed with status:', uploadResponse.status);
            console.error('[AUDIO-PAGE] Error response:', errorText);

            // Check for specific AssemblyAI errors
            if (uploadResponse.status === 401 && errorText.includes('Invalid API key')) {
              throw new Error(
                `AssemblyAI API Key Error: The upload endpoint requires a billing-enabled account. ` +
                `This is an AssemblyAI account limitation, not a code issue. ` +
                `The API key works for reading data but not for uploading files. ` +
                `Please check your AssemblyAI account billing status at https://www.assemblyai.com/app/account`
              );
            }

            throw new Error(`Upload failed (HTTP ${uploadResponse.status}): ${errorText}`);
          }

          const uploadData = await uploadResponse.json();
          uploadUrl = uploadData.upload_url;

          console.log(`[AUDIO-PAGE] Upload successful on attempt ${attempt}: ${uploadUrl}`);
          break; // Success - exit retry loop

        } catch (error: any) {
          lastError = error;
          console.error(`[AUDIO-PAGE] Upload attempt ${attempt} failed:`, error.message);
          console.error('[AUDIO-PAGE] Error details:', {
            name: error.name,
            message: error.message,
            stack: error.stack?.split('\n')[0]
          });

          // Check if it's a network error that's worth retrying
          const isRetryable =
            error.name === 'AbortError' ||
            error.message?.includes('fetch') ||
            error.message?.includes('network') ||
            error.message?.includes('ERR_HTTP2') ||
            error.message?.includes('PING_FAILED') ||
            error.message?.includes('timeout');

          if (!isRetryable || attempt === maxRetries) {
            // Don't retry or max retries reached
            console.error(`[AUDIO-PAGE] Upload failed after ${attempt} attempt(s), not retrying`);
            break;
          }

          // Exponential backoff: wait 2^attempt seconds before retry
          const waitTime = Math.pow(2, attempt) * 1000;
          console.log(`[AUDIO-PAGE] Retrying upload in ${waitTime/1000} seconds...`);
          setAudioProgress({
            progress: 10 + (attempt * 2),
            eta: Math.round(fileSizeMB * 2),
            status: 'uploading_to_assemblyai'
          });
          await new Promise(resolve => setTimeout(resolve, waitTime));
        }
      }

      // Check if upload succeeded
      if (!uploadUrl) {
        throw new Error(
          `Upload failed after ${maxRetries} attempts. ` +
          `${lastError?.message || 'Unknown error'}. ` +
          `This can happen with large files on slow connections. ` +
          `Try: 1) Compress the audio file, 2) Use a faster internet connection, or 3) Upload when network is stable.`
        );
      }

      console.log(`[AUDIO-PAGE] File uploaded to AssemblyAI: ${uploadUrl}`);

      // Step 2: Start transcription with the uploaded URL
      setAudioProgress({ progress: 20, eta: Math.round(fileSizeMB * 1.5), status: 'starting_transcription' });

      const startResponse = await fetch('/api/transcribe/assemblyai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          audioUrl: uploadUrl,
          userId: currentUser,
          projectId: currentProject,
          filename: file.name,
          fileSize: file.size
        }),
      });

      const data = await startResponse.json();

      if (!startResponse.ok) {
        throw new Error(data.error || 'Failed to start transcription');
      }

      // Start polling for progress
      const jobId = data.jobId;
      const estimatedMinutes = Math.max(5, Math.round(fileSizeMB * 0.5)); // ~30 sec per MB for transcription
      setAudioProgress({
        progress: 25,
        eta: estimatedMinutes * 60,
        status: 'transcribing',
        jobId
      });

      // Clear any existing polling interval
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }

      // Poll using the existing pollAudioProgress function
      pollingIntervalRef.current = setInterval(() => {
        pollAudioProgress(jobId);
      }, 5000); // Poll every 5 seconds

      // Store interval for cleanup (longer timeout for big files)
      setTimeout(() => {
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current);
          pollingIntervalRef.current = null;
        }
      }, 4 * 60 * 60 * 1000); // 4 hour timeout - supports large audio files

      console.log(`[AUDIO] Started transcription job ${jobId} for ${file.name} (ETA: ~${estimatedMinutes}min)`);

    } catch (error: any) {
      console.error('[AUDIO-PAGE] Audio transcription error:', error);
      console.error('[AUDIO-PAGE] Full error object:', {
        name: error.name,
        message: error.message,
        cause: error.cause,
        stack: error.stack
      });

      // Provide detailed, actionable error messages
      let errorContent = `❌ **Audio Transcription Failed**\n\n`;

      if (error.message?.includes('billing-enabled account')) {
        errorContent += `**Root Cause:** AssemblyAI Account Limitation\n\n`;
        errorContent += `Your AssemblyAI API key works for reading data but not for uploading files. This indicates:\n\n`;
        errorContent += `1. The account may be in a trial or free tier that doesn't allow uploads\n`;
        errorContent += `2. Billing may need to be enabled on the AssemblyAI account\n`;
        errorContent += `3. The API key may have read-only permissions\n\n`;
        errorContent += `**Solution:**\n`;
        errorContent += `1. Visit https://www.assemblyai.com/app/account\n`;
        errorContent += `2. Check your billing status and enable billing if needed\n`;
        errorContent += `3. Verify your API key has full permissions\n\n`;
        errorContent += `**Note:** This key successfully transcribed files before (including a 109MB file), so the account permissions may have changed.`;
      } else if (error.message?.includes('timeout') || error.message?.includes('AbortError')) {
        errorContent += `**Root Cause:** Upload Timeout\n\n`;
        errorContent += `The file took too long to upload. This can happen with:\n`;
        errorContent += `- Very large files on slow internet connections\n`;
        errorContent += `- Network instability\n\n`;
        errorContent += `**Solutions:**\n`;
        errorContent += `1. Compress the audio file to reduce size\n`;
        errorContent += `2. Use a faster/more stable internet connection\n`;
        errorContent += `3. Try uploading during off-peak hours\n`;
        errorContent += `4. Split long recordings into smaller chunks`;
      } else {
        errorContent += `**Error Details:**\n${error.message}\n\n`;
        errorContent += `**Troubleshooting:**\n`;
        errorContent += `1. Check your internet connection\n`;
        errorContent += `2. Verify the file is a valid audio format (M4A, MP3, WAV, etc.)\n`;
        errorContent += `3. Try a smaller file first to test the system\n`;
        errorContent += `4. Check browser console for detailed error logs`;
      }

      const errorMessage: Message = {
        role: 'assistant',
        content: errorContent,
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, errorMessage]);
      setIsTranscribingAudio(false);
      setAudioProgress({ progress: 0, eta: 0, status: 'idle' });
    }
  };

  // Handle batch audio transcription
  const handleBatchAudioTranscription = async (files: File[]) => {
    setBatchProgress({ total: files.length, completed: 0, status: 'processing' });
    setIsTranscribingAudio(true);

    const results: { file: string; success: boolean; transcriptionId?: string; error?: string }[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      setBatchProgress(prev => ({ ...prev, current: file.name, completed: i }));

      try {
        console.log(`[BATCH] Processing file ${i + 1}/${files.length}: ${file.name}`);

        // Use the same transcription logic as single files
        await handleAudioTranscription(file);

        // Wait for transcription to complete before moving to next file
        // This is a simplified version - ideally we'd wait for the actual completion
        await new Promise(resolve => setTimeout(resolve, 2000));

        results.push({ file: file.name, success: true });
      } catch (error: any) {
        console.error(`[BATCH] Failed to transcribe ${file.name}:`, error);
        results.push({ file: file.name, success: false, error: error.message });
      }
    }

    setBatchProgress({ total: files.length, completed: files.length, status: 'completed' });
    setIsTranscribingAudio(false);

    // Show batch completion message
    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;

    let content = `## 📊 Batch Transcription Complete\n\n`;
    content += `**Total Files:** ${files.length}\n`;
    content += `**✅ Successful:** ${successCount}\n`;
    content += `**❌ Failed:** ${failCount}\n\n`;

    if (failCount > 0) {
      content += `### Failed Files:\n`;
      results.filter(r => !r.success).forEach(r => {
        content += `- ${r.file}: ${r.error}\n`;
      });
    }

    const batchMessage: Message = {
      role: 'assistant',
      content,
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, batchMessage]);
  };

  // Progress persistence - save to localStorage and restore on refresh
  React.useEffect(() => {
    const savedProgress = localStorage.getItem('kimbleai_audio_progress');
    if (savedProgress) {
      try {
        const progress = JSON.parse(savedProgress);
        if (progress.jobId && progress.status !== 'completed' && progress.status !== 'failed') {
          setAudioProgress(progress);
          setIsTranscribingAudio(true);

          // Resume polling
          const pollInterval = setInterval(() => {
            pollAudioProgress(progress.jobId);
          }, 2000);

          setTimeout(() => clearInterval(pollInterval), 10 * 60 * 1000);
        }
      } catch (e) {
        localStorage.removeItem('kimbleai_audio_progress');
      }
    }
  }, [pollAudioProgress]);

  // Save progress to localStorage
  React.useEffect(() => {
    if (audioProgress.jobId && audioProgress.status !== 'idle') {
      localStorage.setItem('kimbleai_audio_progress', JSON.stringify(audioProgress));
    } else {
      localStorage.removeItem('kimbleai_audio_progress');
    }
  }, [audioProgress]);


  // Handle clipboard paste for screenshots
  const handlePaste = async (event: React.ClipboardEvent) => {
    console.log('Paste event triggered');
    const items = event.clipboardData?.items;
    if (!items) {
      console.log('No clipboard items found');
      return;
    }

    console.log('Clipboard items:', items.length);
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      console.log('Item type:', item.type);
      if (item.type.startsWith('image/')) {
        event.preventDefault();
        console.log('Image found in clipboard');
        const blob = item.getAsFile();
        if (blob) {
          console.log('Blob created:', blob.size, 'bytes');
          // Create a preview URL for the pasted image
          const imageUrl = URL.createObjectURL(blob);
          setPastedImage(imageUrl);

          // Create a File object from the blob
          const file = new File([blob], 'pasted-screenshot.png', { type: blob.type });
          setSelectedPhoto(file);
          handlePhotoAnalysis(file);
        }
        break;
      }
    }
  };

  // Also handle paste on window for better compatibility
  React.useEffect(() => {
    const handleWindowPaste = (event: ClipboardEvent) => {
      console.log('Window paste event triggered');
      const items = event.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.type.startsWith('image/')) {
          event.preventDefault();
          console.log('Image found in window paste');
          const blob = item.getAsFile();
          if (blob) {
            const imageUrl = URL.createObjectURL(blob);
            setPastedImage(imageUrl);
            const file = new File([blob], 'pasted-screenshot.png', { type: blob.type });
            setSelectedPhoto(file);
            handlePhotoAnalysis(file);
          }
          break;
        }
      }
    };

    window.addEventListener('paste', handleWindowPaste);
    return () => window.removeEventListener('paste', handleWindowPaste);
  }, [handlePhotoAnalysis]);

  // Clear pasted image when analysis is complete
  React.useEffect(() => {
    if (!isAnalyzingPhoto && pastedImage) {
      setTimeout(() => {
        URL.revokeObjectURL(pastedImage);
        setPastedImage(null);
      }, 3000); // Clear after 3 seconds
    }
  }, [isAnalyzingPhoto, pastedImage]);

  // Drag and drop handlers for image upload
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Only set to false if we're leaving the drop zone entirely
    if (e.currentTarget === e.target) {
      setIsDragging(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    console.log('Files dropped:', files.length);

    // Filter for image files
    const imageFiles = files.filter(file => file.type.startsWith('image/'));

    if (imageFiles.length === 0) {
      console.log('No image files found in drop');
      return;
    }

    // Process the first image file
    const file = imageFiles[0];
    console.log('Processing dropped image:', file.name, file.type);

    // Create preview URL
    const imageUrl = URL.createObjectURL(file);
    setPastedImage(imageUrl);

    // Set as selected photo and analyze
    setSelectedPhoto(file);
    handlePhotoAnalysis(file);
  };

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [showSearch, setShowSearch] = useState(false);

  const sendMessage = async () => {
    if (!input.trim() || loading) return;

    // Handle simple "export" command
    if (input.trim().toLowerCase() === 'export') {
      // Find the most recent export-prompt message with metadata
      const exportPromptMessage = [...messages].reverse().find(
        m => m.metadata?.type === 'export-prompt' && m.metadata?.transcriptionId
      );

      if (!exportPromptMessage) {
        const errorMsg: Message = {
          role: 'assistant',
          content: '❌ No transcription found to export. Please transcribe an audio file first.',
          timestamp: new Date().toISOString()
        };
        setMessages(prev => [...prev, errorMsg]);
        setInput('');
        return;
      }

      const transcriptionId = exportPromptMessage.metadata.transcriptionId;

      console.log('[EXPORT] Transcription ID from metadata:', transcriptionId);
      console.log('[EXPORT] Export prompt metadata:', exportPromptMessage.metadata);

      // Open project selector modal instead of direct export
      setInput('');
      setPendingTranscriptionId(transcriptionId);
      setShowProjectSelector(true);
      return;
    }

    // Handle export command
    if (input.startsWith('/export-all')) {
      const parts = input.trim().split(' ');
      const transcriptionId = parts[1];
      const googleDriveFileId = parts[2] || null;

      if (!transcriptionId) {
        const errorMsg: Message = {
          role: 'assistant',
          content: '❌ Please provide a transcription ID. Example: `/export-all 123`',
          timestamp: new Date().toISOString()
        };
        setMessages(prev => [...prev, errorMsg]);
        setInput('');
        return;
      }

      setInput('');
      setLoading(true);

      try {
        const response = await fetch('/api/transcribe/save-to-drive', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ transcriptionId, googleDriveFileId })
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Export failed');
        }

        let content = `✅ **Exported to Google Drive!**\n\n`;
        content += `📁 **Folder:** [Open Folder](${data.folderUrl})\n`;
        content += `📍 **Location:** ${data.message}\n\n`;
        content += `**Files created:**\n`;
        data.files.forEach((file: any) => {
          content += `- [${file.name}](${file.url})\n`;
        });

        const successMsg: Message = {
          role: 'assistant',
          content,
          timestamp: new Date().toISOString()
        };
        setMessages(prev => [...prev, successMsg]);
      } catch (error: any) {
        const errorMsg: Message = {
          role: 'assistant',
          content: `❌ **Export failed:** ${error.message}\n\nPlease try again or check your Google Drive connection.`,
          timestamp: new Date().toISOString()
        };
        setMessages(prev => [...prev, errorMsg]);
      } finally {
        setLoading(false);
      }
      return;
    }

    const userMessage: Message = {
      role: 'user',
      content: input,
      timestamp: new Date().toISOString()
    };

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);

    // Get tag suggestions for the message
    try {
      const tagResponse = await fetch('/api/projects/tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: input,
          userId: currentUser,
          projectId: currentProject
        })
      });
      const tagData = await tagResponse.json();
      if (tagData.success) {
        setSuggestedTags(tagData.suggestedTags);
        setShowTags(tagData.suggestedTags.length > 0);
      }
    } catch (error) {
      console.error('Tag suggestion failed:', error);
    }

    setInput('');
    setLoading(true);

    try {
      // NORMAL CHAT MODE
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMessages,
          userId: currentUser,
          projectId: currentProject,
          conversationId: currentConversationId || `conv_${Date.now()}`,
          preferredModel: selectedModel
        }),
      });

      // Check if response is OK before parsing JSON
      if (!response.ok) {
        let errorData;
        try {
          errorData = await response.json();
        } catch (jsonError) {
          // If JSON parsing fails, it's likely an HTML error page (504, etc.)
          throw new Error(`Server error (${response.status}): The request took too long to process. Please try a more specific query.`);
        }

        // Throw with the error details from the API
        const errorMsg = errorData.details || errorData.error || 'Unknown error';
        const suggestion = errorData.suggestion ? `\n\n${errorData.suggestion}` : '';
        throw new Error(`${errorMsg}${suggestion}`);
      }

      const data = await response.json();

      const assistantMessage: Message = {
        role: 'assistant',
        content: data.response || 'I apologize, but I could not generate a response.',
        timestamp: new Date().toISOString(),
        modelInfo: data.modelUsed
      };

      setMessages([...newMessages, assistantMessage]);

      // Auto-refresh conversations to show the newly saved chat
      setTimeout(() => loadConversations(currentProject), 1000);
    } catch (error: any) {
      console.error('Chat error:', error);
      const errorMessage: Message = {
        role: 'assistant',
        content: `**Error:** ${error.message}\n\nPlease try:\n• Breaking your query into smaller, specific requests\n• Searching one data source at a time (Gmail, Drive, or uploaded files)\n• Being more specific about what you're looking for`,
        timestamp: new Date().toISOString()
      };
      setMessages([...newMessages, errorMessage]);
    } finally {
      setLoading(false);
    }

    // Auto-generate title after first exchange
    if (newMessages.length === 2) {
      setTimeout(() => {
        const firstUserMessage = newMessages[0].content;
        let autoTitle = firstUserMessage.substring(0, 50);
        if (firstUserMessage.length > 50) autoTitle += '...';
        setConversationTitle(autoTitle);
      }, 2000);
    }
  };

  const performSearch = async (query: string) => {
    const results = [];

    // Search conversations
    const matchingConversations = conversationHistory.filter(conv =>
      conv.title.toLowerCase().includes(query.toLowerCase()) ||
      conv.project.toLowerCase().includes(query.toLowerCase())
    );

    results.push(...matchingConversations.map(conv => ({
      type: 'conversation',
      id: conv.id,
      title: conv.title,
      project: conv.project,
      preview: `${conv.lastMessage}${conv.project ? ` • ${conv.project}` : ''}`
    })));

    // Search projects
    const matchingProjects = projects.filter(project =>
      project.name.toLowerCase().includes(query.toLowerCase())
    );

    results.push(...matchingProjects.map(project => ({
      type: 'project',
      id: project.id,
      title: project.name,
      preview: `${project.conversations} conversations • ${project.status}`
    })));

    // Search tags (simulated - would normally query your knowledge base)
    const commonTags = ['react', 'frontend', 'bug', 'urgent', 'client', 'design', 'api', 'database'];
    const matchingTags = commonTags.filter(tag =>
      tag.toLowerCase().includes(query.toLowerCase())
    );

    results.push(...matchingTags.map(tag => ({
      type: 'tag',
      id: tag,
      title: `#${tag}`,
      preview: 'Click to filter conversations with this tag'
    })));

    setSearchResults(results.slice(0, 10)); // Limit to 10 results
  };

  // Show loading screen while checking authentication
  if (status === 'loading' || status === 'unauthenticated') {
    return (
      <LoadingScreen
        message={status === 'loading' ? 'Loading KimbleAI...' : 'Redirecting to sign in...'}
        fullScreen={true}
      />
    );
  }

  return (
    <>
      <style jsx global>{`
        /* Mobile Responsive Optimizations */
        @media (max-width: 768px) {
          /* Hide sidebar on mobile, make it a modal/drawer */
          .sidebar {
            width: 100% !important;
            max-width: 280px !important;
            position: fixed !important;
            left: -100% !important;
            z-index: 1000 !important;
            transition: left 0.3s ease !important;
            height: 100vh !important;
            top: 0 !important;
            box-shadow: 2px 0 8px rgba(0,0,0,0.3);
          }
          .sidebar.open {
            left: 0 !important;
          }
          /* Mobile hamburger button */
          .mobile-menu-btn {
            display: flex !important;
            position: fixed !important;
            top: 16px !important;
            left: 16px !important;
            z-index: 999 !important;
            background-color: #2a2a2a !important;
            border: 1px solid #444 !important;
            border-radius: 6px !important;
            padding: 8px 12px !important;
            cursor: pointer !important;
            color: #fff !important;
          }
          /* Overlay when sidebar is open */
          .sidebar-overlay {
            display: block !important;
          }
          /* Mobile close button in sidebar */
          .mobile-close-btn {
            display: block !important;
          }
          /* Adjust header for mobile */
          .main-header {
            padding-left: 60px !important;
          }
          /* Adjust cost display for mobile */
          .cost-display {
            font-size: 9px !important;
            padding: 3px 6px !important;
          }
          .cost-display span {
            font-size: 8px !important;
          }
          /* Stack elements vertically on small screens */
          .top-bar {
            flex-direction: column !important;
            align-items: flex-end !important;
            gap: 6px !important;
          }
        }

        @media (min-width: 769px) {
          /* Hide mobile controls on desktop */
          .mobile-menu-btn {
            display: none !important;
          }
          .sidebar-overlay {
            display: none !important;
          }
        }

        @media (max-width: 480px) {
          /* Extra small screens (phones in portrait) */
          .cost-display {
            font-size: 8px !important;
            padding: 2px 4px !important;
            gap: 3px !important;
          }
          .main-header h1 {
            font-size: 18px !important;
          }
        }
      `}</style>
      <div style={{
        display: 'flex',
        height: '100vh',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
        backgroundColor: '#0f0f0f',
        color: '#ffffff'
      }}>
        {/* Mobile Menu Button */}
        <button
          className="mobile-menu-btn"
          onClick={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
          style={{
            display: 'none',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          <span style={{ fontSize: '18px' }}>☰</span>
          <span style={{ fontSize: '12px', fontWeight: '500' }}>Menu</span>
        </button>

        {/* Sidebar Overlay (mobile only) */}
        {isMobileSidebarOpen && (
          <div
            className="sidebar-overlay"
            onClick={() => setIsMobileSidebarOpen(false)}
            style={{
              display: 'none',
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
              zIndex: 999
            }}
          />
        )}

        {/* Sidebar */}
        <div className={`sidebar ${isMobileSidebarOpen ? 'open' : ''}`} style={{
          width: '260px',
          backgroundColor: '#171717',
          borderRight: '1px solid #333',
          display: 'flex',
          flexDirection: 'column',
          padding: '16px'
        }}>
        {/* Mobile Close Button */}
        {isMobileSidebarOpen && (
          <button
            onClick={() => setIsMobileSidebarOpen(false)}
            style={{
              display: 'none',
              position: 'absolute',
              top: '16px',
              right: '16px',
              background: 'none',
              border: 'none',
              color: '#888',
              fontSize: '24px',
              cursor: 'pointer',
              padding: '4px',
              lineHeight: '1'
            }}
            className="mobile-close-btn"
          >
            ✕
          </button>
        )}

        {/* User Selector */}
        <div style={{ marginBottom: '16px' }}>
          <select
            value={currentUser}
            onChange={(e) => setCurrentUser(e.target.value as 'zach' | 'rebecca')}
            style={{
              width: '100%',
              padding: '10px 12px',
              backgroundColor: '#2a2a2a',
              border: '1px solid #444',
              borderRadius: '6px',
              color: '#ffffff',
              fontSize: '13px',
              fontWeight: '600',
              outline: 'none',
              cursor: 'pointer'
            }}
          >
            <option value="zach">🎲 Zachary (DM)</option>
            <option value="rebecca">✨ Rebecca (Player)</option>
          </select>
        </div>

        {/* AI Model Selector Button */}
        <div style={{ marginBottom: '16px' }}>
          <button
            onClick={() => setShowModelSelector(!showModelSelector)}
            style={{
              width: '100%',
              padding: '10px 12px',
              backgroundColor: '#2a2a2a',
              border: '1px solid #444',
              borderRadius: '6px',
              color: '#ffffff',
              fontSize: '13px',
              fontWeight: '600',
              outline: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#333';
              e.currentTarget.style.borderColor = '#666';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#2a2a2a';
              e.currentTarget.style.borderColor = '#444';
            }}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {selectedModel.startsWith('gpt') ? '⚡' : '🧠'}
              <span>{
                selectedModel === 'gpt-4o' ? 'GPT-4o' :
                selectedModel === 'gpt-4o-mini' ? 'GPT-4o mini' :
                selectedModel === 'claude-opus-4-1' ? 'Claude Opus 4.1' :
                selectedModel === 'claude-sonnet-4-5' ? 'Claude Sonnet 4.5' :
                selectedModel === 'claude-haiku-4-5' ? 'Claude Haiku 4.5' :
                selectedModel === 'claude-3-5-haiku' ? 'Claude 3.5 Haiku' :
                selectedModel === 'claude-3-haiku' ? 'Claude 3 Haiku' :
                selectedModel
              }</span>
            </span>
            <span style={{ fontSize: '10px', color: '#888' }}>▼</span>
          </button>
        </div>

        {/* New Chat Button - UPDATED: Added ref and keyboard shortcut hint */}
        <button
          ref={newChatButtonRef}
          onClick={() => {
            setMessages([]);
            setCurrentConversationId(null);
            setConversationTitle('');
            setSuggestedTags([]);
            setShowTags(false);
            setIsMobileSidebarOpen(false);
          }}
          style={{
            width: '100%',
            padding: '12px',
            backgroundColor: '#2a2a2a',
            border: '1px solid #444',
            borderRadius: '8px',
            color: '#ffffff',
            fontSize: '14px',
            cursor: 'pointer',
            marginBottom: '12px'
          }}
          title="New Chat (Cmd/Ctrl + N)"
        >
          + New Chat
        </button>

        {/* Search Bar */}
        <div style={{ marginBottom: '12px' }}>
          <input
            type="text"
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              if (e.target.value.length > 2) {
                performSearch(e.target.value);
                setShowSearch(true);
              } else {
                setShowSearch(false);
                setSearchResults([]);
              }
            }}
            style={{
              width: '100%',
              padding: '12px',
              backgroundColor: '#2a2a2a',
              border: '1px solid #444',
              borderRadius: '8px',
              color: '#ffffff',
              fontSize: '14px',
              outline: 'none'
            }}
          />
          {showSearch && searchResults.length > 0 && (
            <div style={{
              position: 'absolute',
              top: '60px',
              left: 0,
              right: 0,
              backgroundColor: '#1a1a1a',
              border: '1px solid #444',
              borderRadius: '6px',
              marginTop: '4px',
              maxHeight: '200px',
              overflowY: 'auto',
              zIndex: 1000
            }}>
              {searchResults.map((result, index) => (
                <div
                  key={index}
                  onClick={() => {
                    if (result.type === 'conversation') {
                      setCurrentConversationId(result.id);
                      setCurrentProject(result.project);
                    } else if (result.type === 'project') {
                      setCurrentProject(result.id);
                    }
                    setShowSearch(false);
                    setSearchQuery('');
                  }}
                  style={{
                    padding: '8px 12px',
                    borderBottom: '1px solid #333',
                    cursor: 'pointer'
                  }}
                >
                  <div style={{
                    fontSize: '12px',
                    color: result.type === 'conversation' ? '#4a9eff' : result.type === 'project' ? '#10a37f' : '#ffa500',
                    fontWeight: '500'
                  }}>
                    {result.type === 'conversation' ? '💬' : result.type === 'project' ? '📋' : '🏷️'} {result.title}
                  </div>
                  {result.preview && (
                    <div style={{
                      fontSize: '11px',
                      color: '#888',
                      marginTop: '2px'
                    }}>
                      {result.preview}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Projects Section */}
        <div style={{ marginBottom: '20px' }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '12px'
          }}>
            <h3 style={{
              fontSize: '14px',
              fontWeight: '600',
              color: '#aaa',
              margin: 0
            }}>
              Projects
            </h3>
            <button
              onClick={async () => {
                const name = prompt('Enter project name (e.g., "DND Campaign", "Work Projects"):');
                if (name && name.trim()) {
                  try {
                    const projectId = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

                    // Check if project already exists locally
                    if (projects.find(p => p.id === projectId)) {
                      alert('Project with this name already exists!');
                      return;
                    }

                    // Create project in database via API
                    const response = await fetch('/api/projects', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        action: 'create',
                        userId: currentUser,
                        projectData: {
                          name: name.trim(),
                          description: '',
                          priority: 'medium',
                          status: 'active',
                          tags: [],
                          metadata: {}
                        }
                      })
                    });

                    const data = await response.json();

                    if (data.success) {
                      // Reload projects from database (cache will be invalidated by API)
                      await loadProjects();

                      setCurrentProject(data.project.id);
                      alert(`Project "${name}" created successfully!`);
                    } else {
                      throw new Error(data.error || 'Failed to create project');
                    }
                  } catch (error: any) {
                    console.error('Error creating project:', error);
                    alert('Failed to create project: ' + error.message);
                  }
                }
              }}
              style={{
                background: 'none',
                border: '1px solid #444',
                borderRadius: '4px',
                color: '#888',
                cursor: 'pointer',
                fontSize: '12px',
                padding: '2px 6px'
              }}
            >
              +
            </button>
          </div>

          <div style={{
            maxHeight: '200px',
            overflowY: 'auto',
            overflowX: 'hidden',
            scrollbarWidth: 'thin',
            scrollbarColor: '#666 #2a2a2a',
            marginBottom: '12px'
          }}>
            {projects.map((project) => {
              const isExpanded = expandedProjects.has(project.id);
              const projectConversations = conversationHistory.filter(
                conv => conv.project === project.id
              );

              return (
                <div key={project.id} style={{ marginBottom: '8px' }}>
                  {/* Project Header */}
                  <div
                    style={{
                      padding: '8px 12px',
                      backgroundColor: currentProject === project.id ? '#2a2a2a' : '#1a1a1a',
                      borderRadius: '6px',
                      fontSize: '13px',
                      color: currentProject === project.id ? '#fff' : '#ccc',
                      border: currentProject === project.id ? '1px solid #4a9eff' : '1px solid transparent',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flex: 1 }}>
                      {/* Expand/Collapse toggle */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setExpandedProjects(prev => {
                            const newSet = new Set(prev);
                            if (newSet.has(project.id)) {
                              newSet.delete(project.id);
                            } else {
                              newSet.add(project.id);
                            }
                            return newSet;
                          });
                        }}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#888',
                          cursor: 'pointer',
                          fontSize: '10px',
                          padding: '2px'
                        }}
                      >
                        {isExpanded ? '▼' : '▶'}
                      </button>

                      <div
                        onClick={() => {
                          handleProjectChange(project.id);
                          setMessages([]);
                          setCurrentConversationId(null);
                          setConversationTitle('');
                        }}
                        style={{
                          flex: 1,
                          cursor: 'pointer',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center'
                        }}
                      >
                        <span style={{ fontWeight: '500' }}>{project.name}</span>
                        <span style={{
                          fontSize: '10px',
                          color: '#666',
                          backgroundColor: '#333',
                          padding: '2px 6px',
                          borderRadius: '10px'
                        }}>
                          {project.conversations}
                        </span>
                      </div>

                      {/* Delete button */}
                      <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteProject(project.id);
                          }}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: '#666',
                            cursor: 'pointer',
                            fontSize: '11px',
                            padding: '4px',
                            borderRadius: '4px'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.color = '#ff4444';
                            e.currentTarget.style.backgroundColor = '#2a1a1a';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.color = '#666';
                            e.currentTarget.style.backgroundColor = 'transparent';
                          }}
                          title={`Delete ${project.name} project`}
                        >
                          🗑️
                        </button>
                    </div>
                  </div>

                  {/* Nested Conversations */}
                  {isExpanded && projectConversations.length > 0 && (
                    <div style={{
                      marginTop: '4px',
                      marginLeft: '20px',
                      borderLeft: '2px solid #333',
                      paddingLeft: '8px'
                    }}>
                      {projectConversations.slice(0, 10).map((conv) => (
                        <div
                          key={conv.id}
                          style={{
                            position: 'relative',
                            marginBottom: '3px'
                          }}
                        >
                          <div
                            onClick={() => {
                              setCurrentConversationId(conv.id);
                              setCurrentProject(conv.project || 'general');
                              loadConversation(conv.id);
                            }}
                            style={{
                              padding: '6px 8px',
                              backgroundColor: currentConversationId === conv.id ? '#2a2a2a' : 'transparent',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              borderLeft: currentConversationId === conv.id ? '2px solid #4a9eff' : '2px solid transparent',
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center'
                            }}
                          >
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{
                                fontSize: '11px',
                                color: currentConversationId === conv.id ? '#fff' : '#aaa',
                                fontWeight: currentConversationId === conv.id ? '500' : '400',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap'
                              }}>
                                {conv.title}
                              </div>
                              <div style={{
                                fontSize: '9px',
                                color: '#666',
                                marginTop: '2px'
                              }}>
                                {conv.lastMessage}
                              </div>
                            </div>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setShowProjectDropdown(showProjectDropdown === conv.id ? null : conv.id);
                              }}
                              style={{
                                padding: '4px 6px',
                                backgroundColor: '#1a1a1a',
                                border: '1px solid #444',
                                borderRadius: '4px',
                                color: '#888',
                                fontSize: '10px',
                                cursor: 'pointer',
                                marginLeft: '8px',
                                flexShrink: 0
                              }}
                              title="Move to Project"
                            >
                              📁
                            </button>
                          </div>
                          {showProjectDropdown === conv.id && (
                            <div style={{
                              position: 'absolute',
                              right: 0,
                              top: '100%',
                              zIndex: 1000,
                              backgroundColor: '#1a1a1a',
                              border: '1px solid #444',
                              borderRadius: '4px',
                              padding: '8px',
                              minWidth: '150px',
                              maxHeight: '200px',
                              overflowY: 'auto',
                              boxShadow: '0 4px 6px rgba(0, 0, 0, 0.3)'
                            }}>
                              <div style={{
                                fontSize: '10px',
                                color: '#888',
                                marginBottom: '6px',
                                fontWeight: '600'
                              }}>
                                Move to Project:
                              </div>
                              {projects.map((project) => (
                                <div
                                  key={project.id}
                                  onClick={() => moveConversationToProject(conv.id, project.id)}
                                  style={{
                                    padding: '6px 8px',
                                    backgroundColor: conv.project === project.id ? '#2a2a2a' : 'transparent',
                                    borderRadius: '3px',
                                    cursor: 'pointer',
                                    fontSize: '11px',
                                    color: '#ccc',
                                    marginBottom: '2px'
                                  }}
                                  onMouseEnter={(e) => {
                                    e.currentTarget.style.backgroundColor = '#2a2a2a';
                                  }}
                                  onMouseLeave={(e) => {
                                    e.currentTarget.style.backgroundColor = conv.project === project.id ? '#2a2a2a' : 'transparent';
                                  }}
                                >
                                  {formatProjectName(project.id)}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Current Project Info */}
          <div style={{
            padding: '10px',
            backgroundColor: '#0a0a0a',
            borderRadius: '6px',
            border: '1px solid #333'
          }}>
            <div style={{
              fontSize: '11px',
              color: '#888',
              marginBottom: '4px'
            }}>
              Current Project
            </div>
            <div style={{
              fontSize: '13px',
              color: '#4a9eff',
              fontWeight: '600'
            }}>
              {projects.find(p => p.id === currentProject)?.name || 'No Project'}
            </div>
          </div>
        </div>

        {/* Recent Chats Section - UPDATED: Added sort dropdown */}
        <div style={{ marginBottom: '20px' }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '8px',
            gap: '8px'
          }}>
            <h3 style={{
              fontSize: '14px',
              fontWeight: '600',
              color: '#aaa',
              margin: 0
            }}>
              Recent Chats
            </h3>
            <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
              {/* NEW: Sort Dropdown */}
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'date-new' | 'date-old' | 'name' | 'count')}
                style={{
                  padding: '3px 6px',
                  fontSize: '10px',
                  backgroundColor: '#2a2a2a',
                  border: '1px solid #444',
                  borderRadius: '4px',
                  color: '#aaa',
                  cursor: 'pointer',
                  outline: 'none'
                }}
                title="Sort conversations"
              >
                <option value="date-new">Date (Newest)</option>
                <option value="date-old">Date (Oldest)</option>
                <option value="name">Name (A-Z)</option>
                <option value="count">Message Count</option>
              </select>
              {activeTagFilters.length > 0 && (
                <button
                  onClick={() => setActiveTagFilters([])}
                  style={{
                    padding: '2px 6px',
                    fontSize: '10px',
                    backgroundColor: 'transparent',
                    border: '1px solid #666',
                    borderRadius: '4px',
                    color: '#666',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = '#4a9eff';
                    e.currentTarget.style.color = '#4a9eff';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = '#666';
                    e.currentTarget.style.color = '#666';
                  }}
                  title="Clear all tag filters"
                >
                  Clear filters
                </button>
              )}
            </div>
          </div>
          {/* UPDATED: Active tag filters with X button to remove */}
          {activeTagFilters.length > 0 && (
            <div style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '4px',
              marginBottom: '8px'
            }}>
              {activeTagFilters.map(tag => (
                <span
                  key={tag}
                  style={{
                    padding: '2px 6px',
                    fontSize: '9px',
                    backgroundColor: '#4a9eff',
                    color: '#000',
                    borderRadius: '8px',
                    fontWeight: '600',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    cursor: 'pointer'
                  }}
                  onClick={() => {
                    setActiveTagFilters(prev => prev.filter(t => t !== tag));
                  }}
                  title={`Remove "${tag}" filter`}
                >
                  #{tag}
                  <span style={{ fontSize: '10px', fontWeight: 'bold' }}>×</span>
                </span>
              ))}
            </div>
          )}
          <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
            {(() => {
              // Filter conversations by tags first
              let filteredConvs = conversationHistory.filter(conv => {
                if (activeTagFilters.length === 0) return true;
                if (conv.tags && Array.isArray(conv.tags)) {
                  return conv.tags.some((tag: string) => activeTagFilters.includes(tag));
                }
                return false;
              });

              // NEW: Apply sorting before grouping by date
              filteredConvs = [...filteredConvs].sort((a, b) => {
                switch (sortBy) {
                  case 'date-new':
                    return new Date(b.updated_at || b.created_at).getTime() - new Date(a.updated_at || a.created_at).getTime();
                  case 'date-old':
                    return new Date(a.updated_at || a.created_at).getTime() - new Date(b.updated_at || b.created_at).getTime();
                  case 'name':
                    return (a.title || 'Untitled').localeCompare(b.title || 'Untitled');
                  case 'count':
                    return (b.messageCount || 0) - (a.messageCount || 0);
                  default:
                    return 0;
                }
              });

              // Group conversations by date (now includes pinned group)
              const groups = groupConversationsByDate(filteredConvs);

              // UPDATED: Render conversation item with pin icon
              const renderConversation = (conv: any) => {
                const isPinned = conv.pinned || pinnedConversations.has(conv.id);

                return (
                  <div
                    key={conv.id}
                    style={{
                      padding: '8px 12px',
                      backgroundColor: currentConversationId === conv.id ? '#2a2a2a' : 'transparent',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      borderLeft: `3px solid ${conv.project ? '#4a9eff' : '#666'}`,
                      marginBottom: '4px',
                      transition: 'all 0.2s',
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '8px'
                    }}
                    onMouseEnter={(e) => {
                      if (currentConversationId !== conv.id) {
                        e.currentTarget.style.backgroundColor = '#1a1a1a';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (currentConversationId !== conv.id) {
                        e.currentTarget.style.backgroundColor = 'transparent';
                      }
                    }}
                  >
                    {/* NEW: Pin icon */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        togglePinConversation(conv.id, isPinned);
                      }}
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        fontSize: '12px',
                        padding: '0',
                        marginTop: '2px',
                        color: isPinned ? '#ffd700' : '#666',
                        transition: 'color 0.2s'
                      }}
                      title={isPinned ? 'Unpin conversation' : 'Pin conversation'}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.color = '#ffd700';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.color = isPinned ? '#ffd700' : '#666';
                      }}
                    >
                      {isPinned ? '★' : '☆'}
                    </button>

                    {/* Conversation content */}
                    <div
                      onClick={() => {
                        setCurrentConversationId(conv.id);
                        setCurrentProject(conv.project || '');
                        loadConversation(conv.id);
                        setIsMobileSidebarOpen(false);
                      }}
                      style={{ flex: 1, minWidth: 0 }}
                    >
                      <div style={{
                        fontSize: '12px',
                        color: '#ccc',
                        fontWeight: '500',
                        marginBottom: '2px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}>
                        {conv.title || 'Untitled Chat'}
                      </div>
                      <div style={{
                        fontSize: '10px',
                        color: '#666'
                      }}>
                        {conv.lastMessage ? conv.lastMessage.substring(0, 30) + '...' : 'No messages'}{conv.project ? ` • ${formatProjectName(conv.project)}` : ''}
                      </div>
                    </div>
                  </div>
                );
              };

              // Render date group
              const renderGroup = (groupName: string, groupLabel: string, conversations: any[]) => {
                if (conversations.length === 0) return null;
                const isCollapsed = collapsedDateGroups.has(groupName);

                return (
                  <div key={groupName} style={{ marginBottom: '8px' }}>
                    <div
                      onClick={() => {
                        setCollapsedDateGroups(prev => {
                          const newSet = new Set(prev);
                          if (newSet.has(groupName)) {
                            newSet.delete(groupName);
                          } else {
                            newSet.add(groupName);
                          }
                          return newSet;
                        });
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '4px 8px',
                        cursor: 'pointer',
                        fontSize: '11px',
                        fontWeight: '600',
                        color: '#888',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px'
                      }}
                    >
                      <span style={{ fontSize: '9px' }}>{isCollapsed ? '▶' : '▼'}</span>
                      <span>{groupLabel}</span>
                      <span style={{ color: '#666', fontSize: '10px' }}>({conversations.length})</span>
                    </div>
                    {!isCollapsed && (
                      <div style={{ marginLeft: '12px' }}>
                        {conversations.map(renderConversation)}
                      </div>
                    )}
                  </div>
                );
              };

              if (filteredConvs.length === 0) {
                return (
                  <div style={{
                    padding: '16px',
                    textAlign: 'center',
                    color: '#666',
                    fontSize: '12px'
                  }}>
                    No recent chats
                  </div>
                );
              }

              return (
                <>
                  {/* NEW: Pinned conversations group at top */}
                  {renderGroup('pinned', 'Pinned', groups.pinned)}
                  {renderGroup('today', 'Today', groups.today)}
                  {renderGroup('yesterday', 'Yesterday', groups.yesterday)}
                  {renderGroup('thisWeek', 'This Week', groups.thisWeek)}
                  {renderGroup('older', 'Older', groups.older)}
                </>
              );
            })()}
          </div>
        </div>

        {/* Divider */}
        <div style={{
          height: '1px',
          backgroundColor: '#333',
          marginBottom: '16px'
        }}></div>

        {/* Archie Link */}
        <button
          onClick={() => window.location.href = '/archie'}
          style={{
            width: '100%',
            padding: '12px',
            backgroundColor: '#2a2a2a',
            border: '1px solid #444',
            borderRadius: '8px',
            color: '#ffffff',
            fontSize: '14px',
            cursor: 'pointer',
            marginBottom: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px'
          }}
        >
          🦉 Archie
        </button>

        {/* Code Editor Button */}
        <button
          onClick={() => window.location.href = '/code'}
          style={{
            width: '100%',
            padding: '12px',
            backgroundColor: '#2a2a2a',
            border: '1px solid #444',
            borderRadius: '8px',
            color: '#ffffff',
            fontSize: '14px',
            fontWeight: '600',
            cursor: 'pointer',
            marginBottom: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px'
          }}
        >
          <span style={{ fontSize: '16px' }}>💻</span>
          Code Editor
        </button>

        {/* Google Workspace - Minimal Status */}
        <div style={{
          padding: '10px 12px',
          backgroundColor: '#0a0a0a',
          borderRadius: '6px',
          border: '1px solid #333',
          marginBottom: '12px'
        }}>
          <div style={{
            fontSize: '11px',
            color: '#888',
            marginBottom: '6px',
            fontWeight: '500'
          }}>
            Google Workspace
          </div>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <div style={{
              fontSize: '12px',
              color: session ? '#4ade80' : '#666'
            }}>
              {session ? '✓ Connected' : '○ Not Connected'}
            </div>
            <button
              onClick={() => {
                setShowGoogleServices(!showGoogleServices);
                setIsMobileSidebarOpen(false);
              }}
              style={{
                background: 'none',
                border: 'none',
                color: '#888',
                cursor: 'pointer',
                fontSize: '11px',
                padding: '2px 6px'
              }}
            >
              {showGoogleServices ? '◀' : '▶'}
            </button>
          </div>
        </div>

        {/* Audio Transcription Link */}
        <button
          onClick={() => window.location.href = '/transcribe'}
          style={{
            width: '100%',
            padding: '10px 12px',
            backgroundColor: '#0a0a0a',
            border: '1px solid #333',
            borderRadius: '6px',
            color: '#10b981',
            fontSize: '12px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '8px'
          }}
        >
          <span>🎤 Transcribe from Drive</span>
          <span>→</span>
        </button>

        {/* Device Continuity Link */}
        <button
          onClick={() => window.location.href = '/devices'}
          style={{
            width: '100%',
            padding: '10px 12px',
            backgroundColor: '#0a0a0a',
            border: '1px solid #333',
            borderRadius: '6px',
            color: '#10b981',
            fontSize: '12px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '8px'
          }}
        >
          <span>🔄 Device Sync</span>
          <span>→</span>
        </button>

        {/* Drive Intelligence Link */}
        <button
          onClick={() => window.location.href = '/drive'}
          style={{
            width: '100%',
            padding: '10px 12px',
            backgroundColor: '#0a0a0a',
            border: '1px solid #333',
            borderRadius: '6px',
            color: '#4a9eff',
            fontSize: '12px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '12px'
          }}
        >
          <span>📁 Drive Intelligence</span>
          <span>→</span>
        </button>

      </div>

      {/* Main Content Area */}
      {showGoogleServices ? (
        /* Google Services Panel */
        <div style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: '#0f0f0f',
          padding: '24px'
        }}>
          <GoogleServicesPanel />
        </div>
      ) : (
        /* Main Chat Area */
        <div style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: '#0f0f0f'
        }}>
        {/* Header */}
        <div className="main-header" style={{
          padding: '16px 24px',
          borderBottom: '1px solid #333',
          backgroundColor: '#171717',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          position: 'relative'
        }}>
          {/* D20 Logo - Center */}
          <div style={{
            display: 'flex',
            gap: '12px',
            alignItems: 'center'
          }}>
            <D20Dice size={96} spinning={true} />
            <span style={{
              fontSize: '24px',
              fontWeight: '700',
              fontFamily: '"Cinzel", serif',
              letterSpacing: '2px',
              background: 'linear-gradient(135deg, #4a9eff 0%, #00d4aa 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text'
            }}>
              KimbleAI
            </span>
          </div>

          {/* System Status & Cost Monitor - Top Right */}
          <div className="top-bar" style={{
            position: 'absolute',
            right: '24px',
            display: 'flex',
            gap: '12px',
            fontSize: '11px',
            color: '#888',
            fontWeight: '500',
            alignItems: 'center'
          }}>
            {/* Version Badge */}
            <div
              style={{
                padding: '4px 8px',
                backgroundColor: '#1a1a1a',
                border: '1px solid #10b981',
                borderRadius: '4px',
                fontSize: '12px',
                color: '#10b981',
                fontWeight: '600',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                cursor: 'pointer'
              }}
              title={`Version ${versionInfo.version} - Commit ${versionInfo.commit}\nUpdated: ${new Date(versionInfo.lastUpdated).toLocaleString()}`}
            >
              <span>v{versionInfo.version}</span>
              <span style={{ color: '#666', fontWeight: '400' }}>@</span>
              <span style={{ fontSize: '11px', color: '#10b981', opacity: 0.8 }}>{versionInfo.commit}</span>
            </div>

            {/* Cost Display - Hourly, Daily, Monthly */}
            {session && costStats && (() => {
              // Check if ANY limit is exceeded
              const isExceeded = costStats.hourly.percentage >= 100 ||
                                costStats.daily.percentage >= 100 ||
                                costStats.monthly.percentage >= 100;

              return (
                <div
                  className="cost-display"
                  onClick={() => window.location.href = '/costs'}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '1px',
                    padding: '3px 6px',
                    backgroundColor: isExceeded ? '#7f1d1d' : '#2a2a2a',
                    border: `1px solid ${isExceeded ? '#ef4444' : '#10b981'}`,
                    borderRadius: '4px',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = isExceeded ? '#991b1b' : '#333';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = isExceeded ? '#7f1d1d' : '#2a2a2a';
                  }}
                  title={`Hourly: ${costStats.hourly.percentage.toFixed(0)}%\nDaily: ${costStats.daily.percentage.toFixed(0)}%\nMonthly: ${costStats.monthly.percentage.toFixed(0)}%`}
                >
                  {/* Hourly */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '3px', fontSize: '10px' }}>
                    <span style={{ color: '#666', width: '18px' }}>Hr</span>
                    <span style={{ color: isExceeded ? '#fca5a5' : '#ccc', fontWeight: '600' }}>
                      ${costStats.hourly.used.toFixed(2)}
                    </span>
                    <span style={{ color: '#555' }}>/</span>
                    <span style={{ color: '#888' }}>
                      ${costStats.hourly.limit.toFixed(0)}
                    </span>
                  </div>

                  {/* Daily */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '3px', fontSize: '10px' }}>
                    <span style={{ color: '#666', width: '18px' }}>Day</span>
                    <span style={{ color: isExceeded ? '#fca5a5' : '#ccc', fontWeight: '600' }}>
                      ${costStats.daily.used.toFixed(2)}
                    </span>
                    <span style={{ color: '#555' }}>/</span>
                    <span style={{ color: '#888' }}>
                      ${costStats.daily.limit.toFixed(0)}
                    </span>
                  </div>

                  {/* Monthly */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '3px', fontSize: '10px' }}>
                    <span style={{ color: '#666', width: '18px' }}>Mon</span>
                    <span style={{ color: isExceeded ? '#fca5a5' : '#ccc', fontWeight: '600' }}>
                      ${costStats.monthly.used.toFixed(2)}
                    </span>
                    <span style={{ color: '#555' }}>/</span>
                    <span style={{ color: '#888' }}>
                      ${costStats.monthly.limit.toFixed(0)}
                    </span>
                  </div>
                </div>
              );
            })()}

            {status === 'loading' ? (
              <span style={{ color: '#888' }}>Auth...</span>
            ) : session ? (
              <>
                <span style={{ color: '#4ade80' }}>Google ✅</span>

                {/* User Selector Toggle */}
                <div style={{
                  display: 'flex',
                  gap: '4px',
                  padding: '2px',
                  backgroundColor: '#1a1a1a',
                  border: '1px solid #444',
                  borderRadius: '4px'
                }}>
                  <button
                    onClick={() => {
                      setCurrentUser('zach');
                      setMessages([]);
                      setCurrentConversationId(null);
                      loadConversations();
                    }}
                    style={{
                      padding: '4px 10px',
                      backgroundColor: currentUser === 'zach' ? '#4a9eff' : 'transparent',
                      border: 'none',
                      borderRadius: '3px',
                      color: currentUser === 'zach' ? '#000' : '#888',
                      fontSize: '10px',
                      cursor: 'pointer',
                      fontWeight: '600',
                      transition: 'all 0.2s'
                    }}
                  >
                    Zach
                  </button>
                  <button
                    onClick={() => {
                      setCurrentUser('rebecca');
                      setMessages([]);
                      setCurrentConversationId(null);
                      loadConversations();
                    }}
                    style={{
                      padding: '4px 10px',
                      backgroundColor: currentUser === 'rebecca' ? '#ff6b9d' : 'transparent',
                      border: 'none',
                      borderRadius: '3px',
                      color: currentUser === 'rebecca' ? '#000' : '#888',
                      fontSize: '10px',
                      cursor: 'pointer',
                      fontWeight: '600',
                      transition: 'all 0.2s'
                    }}
                  >
                    Rebecca
                  </button>
                </div>

                <button
                  onClick={() => signOut()}
                  style={{
                    padding: '4px 8px',
                    backgroundColor: 'transparent',
                    border: '1px solid #444',
                    borderRadius: '4px',
                    color: '#888',
                    fontSize: '10px',
                    cursor: 'pointer',
                    fontWeight: '500',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = '#ef4444';
                    e.currentTarget.style.color = '#ef4444';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = '#444';
                    e.currentTarget.style.color = '#888';
                  }}
                >
                  Sign Out
                </button>
              </>
            ) : (
              <button
                onClick={() => signIn('google')}
                style={{
                  padding: '4px 8px',
                  backgroundColor: '#4285f4',
                  border: 'none',
                  borderRadius: '4px',
                  color: 'white',
                  fontSize: '10px',
                  cursor: 'pointer',
                  fontWeight: '600'
                }}
              >
                Connect
              </button>
            )}
          </div>
        </div>

        {/* Messages Area */}
        <div style={{
          flex: 1,
          overflow: 'auto',
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px'
        }}>
          {messages.length === 0 && (
            <div style={{
              textAlign: 'center',
              color: '#666',
              marginTop: '50px'
            }}>
              <h2 style={{
                fontSize: '32px',
                marginBottom: '16px',
                fontFamily: '"Cinzel", serif',
                fontWeight: '600',
                letterSpacing: '3px',
                background: 'linear-gradient(135deg, #8b7355 0%, #d4af37 50%, #8b7355 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text'
              }}>
                {welcomeMessage}
              </h2>
              <p style={{
                fontSize: '16px',
                margin: 0,
                color: '#888',
                fontStyle: 'italic'
              }}>
                Where AI meets adventure
              </p>
            </div>
          )}

          {messages.map((message, index) => (
            <div key={index} style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
              padding: '16px',
              borderRadius: '12px',
              backgroundColor: message.role === 'user' ? '#2a2a2a' : '#1a1a1a',
              border: '1px solid #333'
            }}>
              <div style={{
                fontSize: '12px',
                fontWeight: '600',
                color: message.role === 'user' ? '#4a9eff' : '#00d4aa',
                textTransform: 'uppercase'
              }}>
                {message.role === 'user' ? currentUser : 'KimbleAI'}
              </div>
              <FormattedMessage
                content={message.content}
                role={message.role}
              />
              {message.modelInfo && (
                <div style={{
                  marginTop: '8px',
                  padding: '8px 12px',
                  backgroundColor: '#0a0a0a',
                  borderRadius: '6px',
                  border: '1px solid #444',
                  fontSize: '11px',
                  color: '#888'
                }}>
                  <div style={{ marginBottom: '4px', fontWeight: '600', color: '#aaa' }}>
                    🤖 Model: {message.modelInfo.model}
                    {message.modelInfo.reasoningLevel !== 'none' && (
                      <span style={{ marginLeft: '8px' }}>
                        ⚡ Reasoning: {message.modelInfo.reasoningLevel}
                      </span>
                    )}
                    <span style={{ marginLeft: '8px' }}>
                      💰 Cost: {message.modelInfo.costMultiplier}x
                    </span>
                  </div>
                  <div style={{ fontSize: '10px', color: '#666' }}>
                    {message.modelInfo.explanation}
                  </div>
                </div>
              )}
            </div>
          ))}

          {loading && (
            <div style={{
              padding: '16px',
              borderRadius: '12px',
              backgroundColor: '#1a1a1a',
              border: '1px solid #333',
              color: '#888'
            }}>
              KimbleAI is thinking...
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div
          style={{
            padding: '24px',
            borderTop: '1px solid #333',
            backgroundColor: isDragging ? '#2a2a2a' : '#171717',
            transition: 'background-color 0.2s ease',
            position: 'relative'
          }}
          onPaste={handlePaste}
          onDragOver={handleDragOver}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          {/* Active Model Indicator */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '12px',
            padding: '8px 12px',
            backgroundColor: '#0a0a0a',
            borderRadius: '8px',
            border: '1px solid #333',
            fontSize: '12px',
            color: '#888'
          }}>
            <span style={{ fontSize: '16px' }}>
              {selectedModel.startsWith('gpt') ? '⚡' : '🧠'}
            </span>
            <span style={{ color: '#aaa', fontWeight: '500' }}>
              Using:
            </span>
            <span style={{
              color: selectedModel.startsWith('gpt') ? '#10b981' : '#a855f7',
              fontWeight: '600'
            }}>
              {
                selectedModel === 'gpt-4o' ? 'GPT-4o' :
                selectedModel === 'gpt-4o-mini' ? 'GPT-4o mini' :
                selectedModel === 'claude-opus-4-1' ? 'Claude Opus 4.1' :
                selectedModel === 'claude-sonnet-4-5' ? 'Claude Sonnet 4.5' :
                selectedModel === 'claude-haiku-4-5' ? 'Claude Haiku 4.5' :
                selectedModel === 'claude-3-5-haiku' ? 'Claude 3.5 Haiku' :
                selectedModel === 'claude-3-haiku' ? 'Claude 3 Haiku' :
                selectedModel
              }
            </span>
            <span style={{
              marginLeft: 'auto',
              fontSize: '11px',
              color: '#666',
              fontStyle: 'italic'
            }}>
              {selectedModel.startsWith('gpt') ? 'OpenAI' : 'Anthropic'}
            </span>
          </div>

          {/* Drag overlay indicator */}
          {isDragging && (
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(74, 158, 255, 0.1)',
              border: '2px dashed #4a9eff',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              pointerEvents: 'none',
              zIndex: 10
            }}>
              <div style={{
                color: '#4a9eff',
                fontSize: '18px',
                fontWeight: 600
              }}>
                📸 Drop image to analyze
              </div>
            </div>
          )}
          <div style={{
            display: 'flex',
            gap: '12px',
            alignItems: 'flex-end'
          }}>
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage();
                }
              }}
              placeholder="Type your message, paste a screenshot, or drag & drop an image..."
              disabled={loading}
              style={{
                flex: 1,
                minHeight: '20px',
                maxHeight: '120px',
                padding: '12px 16px',
                backgroundColor: '#2a2a2a',
                border: '1px solid #444',
                borderRadius: '12px',
                color: '#ffffff',
                fontSize: '15px',
                resize: 'none',
                outline: 'none'
              }}
              rows={1}
            />
            <button
              onClick={() => setShowTags(!showTags)}
              style={{
                padding: '12px',
                backgroundColor: showTags ? '#4a9eff' : '#333',
                border: 'none',
                borderRadius: '12px',
                color: '#ffffff',
                fontSize: '12px',
                cursor: 'pointer',
                marginRight: '8px'
              }}
              title="Toggle tags"
            >
              🏷️
            </button>

            {/* Photo Upload Button */}
            <label
              style={{
                padding: '12px',
                backgroundColor: '#333',
                border: 'none',
                borderRadius: '12px',
                color: '#ffffff',
                fontSize: '12px',
                cursor: isAnalyzingPhoto ? 'not-allowed' : 'pointer',
                marginRight: '8px',
                display: 'inline-block',
                opacity: isAnalyzingPhoto ? 0.6 : 1
              }}
              title="Upload and analyze photo"
            >
              {isAnalyzingPhoto ? '⏳' : '📸'}
              <input
                type="file"
                accept="image/*"
                onChange={handlePhotoSelect}
                disabled={isAnalyzingPhoto}
                style={{ display: 'none' }}
              />
            </label>

            {/* Audio Upload Button */}
            <label
              style={{
                padding: '12px',
                backgroundColor: '#333',
                border: 'none',
                borderRadius: '12px',
                color: '#ffffff',
                fontSize: '12px',
                cursor: isTranscribingAudio ? 'not-allowed' : 'pointer',
                marginRight: '8px',
                display: 'inline-block',
                opacity: isTranscribingAudio ? 0.6 : 1,
                position: 'relative'
              }}
              title="Upload and transcribe audio (M4A, MP3, WAV, etc.) - Hold Ctrl/Cmd to select multiple files"
            >
              {isTranscribingAudio ? '⏳' : '🎵'}
              <span style={{
                position: 'absolute',
                top: '-4px',
                right: '-4px',
                backgroundColor: '#10b981',
                color: '#fff',
                fontSize: '8px',
                padding: '2px 4px',
                borderRadius: '4px',
                fontWeight: 'bold',
                pointerEvents: 'none'
              }}>
                MULTI
              </span>
              <input
                type="file"
                accept="audio/*,.m4a,.mp3,.wav,.ogg,.aac"
                onChange={handleAudioSelect}
                disabled={isTranscribingAudio}
                multiple
                style={{ display: 'none' }}
              />
            </label>

            {/* Audio Transcription Progress */}
            {isTranscribingAudio && audioProgress.status !== 'idle' && (
              <div style={{
                marginLeft: '8px',
                padding: '4px 8px',
                backgroundColor: '#1a1a1a',
                border: '1px solid #333',
                borderRadius: '6px',
                fontSize: '11px',
                color: '#4a9eff',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <div style={{ marginBottom: '2px' }}>
                  {audioProgress.status === 'initializing' && '🔄 Initializing...'}
                  {audioProgress.status === 'preparing_file' && '📁 Preparing...'}
                  {audioProgress.status === 'uploading_to_assemblyai' && '⬆️ Uploading (large files take time)...'}
                  {audioProgress.status === 'starting_transcription' && '🚀 Starting transcription...'}
                  {audioProgress.status === 'uploading_to_whisper' && '⬆️ Uploading...'}
                  {audioProgress.status === 'transcribing' && '🎯 Transcribing...'}
                  {audioProgress.status === 'queued' && '⏳ Queued...'}
                  {audioProgress.status === 'processing' && '⚙️ Processing...'}
                  {audioProgress.status === 'saving' && '💾 Saving...'}
                  {audioProgress.status === 'saving_to_database' && '💾 Saving...'}
                  {audioProgress.status === 'generating_embeddings' && '🧠 Embedding...'}
                  {audioProgress.status === 'starting' && '🚀 Starting...'}
                </div>
                {audioProgress.progress > 0 && (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}>
                    <div style={{
                      width: '60px',
                      height: '3px',
                      backgroundColor: '#333',
                      borderRadius: '2px',
                      overflow: 'hidden'
                    }}>
                      <div style={{
                        width: `${audioProgress.progress}%`,
                        height: '100%',
                        backgroundColor: '#4a9eff',
                        transition: 'width 0.3s ease'
                      }} />
                    </div>
                    <span style={{ fontSize: '10px' }}>
                      {audioProgress.progress}%
                      {audioProgress.eta > 0 && ` • ${audioProgress.eta < 60
                        ? `${audioProgress.eta}s`
                        : audioProgress.eta < 3600
                          ? `${Math.floor(audioProgress.eta / 60)}m`
                          : `${Math.floor(audioProgress.eta / 3600)}h${Math.floor((audioProgress.eta % 3600) / 60)}m`}`}
                    </span>
                  </div>
                )}
                <button
                  onClick={() => {
                    setIsTranscribingAudio(false);
                    setAudioProgress({ progress: 0, eta: 0, status: 'idle' });
                    localStorage.removeItem('kimbleai_audio_progress');
                    // Clear polling interval
                    if (pollingIntervalRef.current) {
                      clearInterval(pollingIntervalRef.current);
                      pollingIntervalRef.current = null;
                    }
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#666',
                    cursor: 'pointer',
                    fontSize: '14px',
                    padding: '0 4px',
                    lineHeight: '1'
                  }}
                  title="Cancel transcription"
                >
                  ✕
                </button>
              </div>
            )}

            {/* Batch Upload Progress */}
            {batchProgress.status === 'processing' && (
              <div style={{
                marginLeft: '8px',
                padding: '6px 12px',
                backgroundColor: '#1a1a1a',
                border: '1px solid #333',
                borderRadius: '6px',
                fontSize: '12px',
                color: '#10b981',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '10px'
              }}>
                <div>📊 Batch: {batchProgress.completed + 1}/{batchProgress.total}</div>
                {batchProgress.current && (
                  <div style={{ fontSize: '10px', color: '#666' }}>
                    {batchProgress.current}
                  </div>
                )}
                <div style={{
                  width: '80px',
                  height: '3px',
                  backgroundColor: '#333',
                  borderRadius: '2px',
                  overflow: 'hidden'
                }}>
                  <div style={{
                    width: `${(batchProgress.completed / batchProgress.total) * 100}%`,
                    height: '100%',
                    backgroundColor: '#10b981',
                    transition: 'width 0.3s ease'
                  }} />
                </div>
              </div>
            )}

            {/* Pasted Image Preview */}
            {pastedImage && (
              <div style={{
                position: 'absolute',
                bottom: '80px',
                left: '24px',
                backgroundColor: '#1a1a1a',
                border: '2px solid #4a9eff',
                borderRadius: '8px',
                padding: '8px',
                maxWidth: '200px'
              }}>
                <div
                  style={{
                    backgroundImage: `url(${pastedImage})`,
                    backgroundSize: 'contain',
                    backgroundRepeat: 'no-repeat',
                    backgroundPosition: 'center',
                    width: '100%',
                    height: '150px',
                    borderRadius: '4px'
                  }}
                />
                <div style={{
                  fontSize: '11px',
                  color: '#4a9eff',
                  marginTop: '4px',
                  textAlign: 'center'
                }}>
                  📸 Screenshot pasted - analyzing...
                </div>
              </div>
            )}

            {/* Photo Analysis Type Selector */}
            {selectedPhoto && (
              <select
                value={photoAnalysisType}
                onChange={(e) => setPhotoAnalysisType(e.target.value)}
                style={{
                  padding: '8px',
                  backgroundColor: '#2a2a2a',
                  border: '1px solid #444',
                  borderRadius: '8px',
                  color: '#ffffff',
                  fontSize: '12px',
                  marginRight: '8px'
                }}
              >
                <option value="general">General Analysis</option>
                <option value="dnd">D&D / Gaming</option>
                <option value="document">Document / Text</option>
                <option value="technical">Technical / Code</option>
                <option value="automotive">Automotive</option>
                <option value="recipe">Recipe / Food</option>
              </select>
            )}
            <button
              onClick={sendMessage}
              disabled={loading || !input.trim()}
              style={{
                padding: '12px 20px',
                backgroundColor: input.trim() && !loading ? '#4a9eff' : '#333',
                border: 'none',
                borderRadius: '12px',
                color: '#ffffff',
                fontSize: '14px',
                fontWeight: '600',
                cursor: input.trim() && !loading ? 'pointer' : 'not-allowed',
                transition: 'background-color 0.2s'
              }}
            >
              Send
            </button>
          </div>

          {/* Tag Suggestions */}
          {showTags && suggestedTags.length > 0 && (
            <div style={{
              padding: '12px 24px 0 24px'
            }}>
              <div style={{
                fontSize: '12px',
                color: '#888',
                marginBottom: '8px'
              }}>
                Suggested tags for this conversation:
              </div>
              <div style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '6px',
                marginBottom: '12px'
              }}>
                {suggestedTags.map((tag, index) => {
                  const isActive = activeTagFilters.includes(tag);
                  return (
                    <span
                      key={index}
                      style={{
                        padding: '4px 8px',
                        backgroundColor: isActive ? '#4a9eff' : '#2a2a2a',
                        border: `1px solid ${isActive ? '#4a9eff' : '#444'}`,
                        borderRadius: '12px',
                        fontSize: '11px',
                        color: isActive ? '#000' : '#ccc',
                        cursor: 'pointer',
                        fontWeight: isActive ? '600' : 'normal',
                        transition: 'all 0.2s'
                      }}
                      onClick={() => {
                        setActiveTagFilters(prev =>
                          prev.includes(tag)
                            ? prev.filter(t => t !== tag)
                            : [...prev, tag]
                        );
                        // Reload conversations with tag filter
                        loadConversations();
                      }}
                      title={isActive ? `Click to remove "${tag}" filter` : `Click to filter by "${tag}"`}
                    >
                      #{tag}
                    </span>
                  );
                })}
              </div>
            </div>
          )}
        </div>
        </div>
      )}

      {/* Project Selector Modal for Export */}
      {showProjectSelector && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
          onClick={() => {
            setShowProjectSelector(false);
            setPendingTranscriptionId(null);
          }}
        >
          <div
            style={{
              backgroundColor: '#1e1e1e',
              border: '1px solid #333',
              borderRadius: '8px',
              padding: '24px',
              maxWidth: '500px',
              width: '90%',
              maxHeight: '80vh',
              overflow: 'auto',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ margin: '0 0 16px 0', color: '#fff' }}>
              📁 Select Project for Export
            </h3>
            <p style={{ margin: '0 0 16px 0', color: '#aaa', fontSize: '14px' }}>
              Choose a project to organize your transcription files in Google Drive.
              Files will be saved to: <code>kimbleai-transcriptions/[project]/</code>
            </p>

            {/* Existing Projects */}
            <div style={{ marginBottom: '16px' }}>
              <div style={{ color: '#aaa', fontSize: '12px', marginBottom: '8px', textTransform: 'uppercase' }}>
                Existing Projects
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '200px', overflow: 'auto' }}>
                {projects.length === 0 ? (
                  <div style={{ color: '#666', fontSize: '14px', padding: '16px', textAlign: 'center' }}>
                    No projects yet. Create one below!
                  </div>
                ) : (
                  projects.map((project) => (
                      <button
                        key={project.id}
                        onClick={() => handleExportWithProject(project.id)}
                        style={{
                          padding: '12px 16px',
                          backgroundColor: '#2a2a2a',
                          border: '1px solid #444',
                          borderRadius: '4px',
                          color: '#fff',
                          cursor: 'pointer',
                          textAlign: 'left',
                          transition: 'all 0.2s',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = '#333';
                          e.currentTarget.style.borderColor = '#0ea5e9';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = '#2a2a2a';
                          e.currentTarget.style.borderColor = '#444';
                        }}
                      >
                        <div style={{ fontWeight: 500 }}>{project.name}</div>
                        {project.conversations > 0 && (
                          <div style={{ fontSize: '12px', color: '#888', marginTop: '4px' }}>
                            {project.conversations} conversation{project.conversations !== 1 ? 's' : ''}
                          </div>
                        )}
                      </button>
                    ))
                )}
              </div>
            </div>

            {/* Create New Project */}
            <div style={{ marginTop: '24px', paddingTop: '16px', borderTop: '1px solid #333' }}>
              <div style={{ color: '#aaa', fontSize: '12px', marginBottom: '8px', textTransform: 'uppercase' }}>
                Create New Project
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="text"
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      handleCreateProject();
                    }
                  }}
                  placeholder="Project name..."
                  style={{
                    flex: 1,
                    padding: '10px 12px',
                    backgroundColor: '#2a2a2a',
                    border: '1px solid #444',
                    borderRadius: '4px',
                    color: '#fff',
                    fontSize: '14px',
                  }}
                />
                <button
                  onClick={handleCreateProject}
                  disabled={!newProjectName.trim()}
                  style={{
                    padding: '10px 20px',
                    backgroundColor: newProjectName.trim() ? '#0ea5e9' : '#333',
                    border: 'none',
                    borderRadius: '4px',
                    color: '#fff',
                    cursor: newProjectName.trim() ? 'pointer' : 'not-allowed',
                    fontWeight: 500,
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    if (newProjectName.trim()) {
                      e.currentTarget.style.backgroundColor = '#0284c7';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (newProjectName.trim()) {
                      e.currentTarget.style.backgroundColor = '#0ea5e9';
                    }
                  }}
                >
                  Create & Export
                </button>
              </div>
            </div>

            {/* Cancel Button */}
            <button
              onClick={() => {
                setShowProjectSelector(false);
                setPendingTranscriptionId(null);
                setNewProjectName('');
              }}
              style={{
                marginTop: '16px',
                width: '100%',
                padding: '10px',
                backgroundColor: 'transparent',
                border: '1px solid #444',
                borderRadius: '4px',
                color: '#aaa',
                cursor: 'pointer',
                fontSize: '14px',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#666';
                e.currentTarget.style.color = '#fff';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = '#444';
                e.currentTarget.style.color = '#aaa';
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Model Selector Modal */}
      {showModelSelector && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 2000,
            backdropFilter: 'blur(4px)',
            padding: '20px'
          }}
          onClick={() => setShowModelSelector(false)}
        >
          <div
            style={{
              backgroundColor: '#0f0f0f',
              border: '1px solid #333',
              borderRadius: '12px',
              padding: '24px',
              maxWidth: '1200px',
              width: '100%',
              maxHeight: '90vh',
              overflow: 'auto',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '20px'
            }}>
              <h2 style={{
                margin: 0,
                fontSize: '24px',
                fontWeight: 'bold',
                background: 'linear-gradient(to right, #a855f7, #ec4899)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text'
              }}>
                Select AI Model
              </h2>
              <button
                onClick={() => setShowModelSelector(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#888',
                  fontSize: '28px',
                  cursor: 'pointer',
                  padding: '0',
                  lineHeight: '1',
                  transition: 'color 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.color = '#fff'}
                onMouseLeave={(e) => e.currentTarget.style.color = '#888'}
              >
                ×
              </button>
            </div>
            <ModelSelector
              selectedModel={selectedModel}
              onSelect={(model) => {
                setSelectedModel(model);
                setShowModelSelector(false);
              }}
              estimatedTokens={{ input: 1000, output: 500 }}
            />
          </div>
        </div>
      )}

      {/* Unified Search Modal */}
      <UnifiedSearch
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
      />
    </div>
    </>
  );
}