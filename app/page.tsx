'use client';

import React, { useState } from 'react';
import { signIn, signOut, useSession } from 'next-auth/react';
import FormattedMessage from '../components/FormattedMessage';
import GoogleServicesPanel from '../components/GoogleServicesPanel';

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
}

export default function Home() {
  const { data: session, status } = useSession();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState<'zach' | 'rebecca'>('zach');
  const [currentProject, setCurrentProject] = useState('general');
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
  const [deletedProjects, setDeletedProjects] = useState<Set<string>>(new Set());
  const [createdProjects, setCreatedProjects] = useState<Set<string>>(new Set());
  const [showGoogleServices, setShowGoogleServices] = useState(false);

  // Load conversations for current project
  // Load conversations and update projects dynamically
  const loadConversations = React.useCallback(async (projectId: string = '') => {
    setIsLoadingConversations(true);
    try {
      const response = await fetch(`/api/conversations?userId=${currentUser}&limit=50`);
      const data = await response.json();

      if (data.success) {
        // Update projects based on actual conversation data
        const projectCounts: Record<string, number> = {};
        data.conversations.forEach((conv: any) => {
          const project = conv.project || 'general';
          projectCounts[project] = (projectCounts[project] || 0) + 1;
        });

        // Create dynamic project list
        const dynamicProjects = Object.entries(projectCounts).map(([id, count]) => ({
          id,
          name: formatProjectName(id),
          conversations: count,
          status: 'active'
        }));

        // Add any manually created projects that don't exist in conversation data yet
        const existingProjectIds = new Set(dynamicProjects.map(p => p.id));
        const createdProjectsToAdd = Array.from(createdProjects)
          .filter(projectId => !existingProjectIds.has(projectId) && !deletedProjects.has(projectId))
          .map(projectId => ({
            id: projectId,
            name: formatProjectName(projectId),
            conversations: 0,
            status: 'active' as const
          }));

        // Combine dynamic and created projects
        const allProjects = [...createdProjectsToAdd, ...dynamicProjects];

        // Filter out deleted projects and sort
        const filteredProjects = allProjects.filter(project => !deletedProjects.has(project.id));
        filteredProjects.sort((a, b) => {
          // Created projects with 0 conversations go to top
          if (a.conversations === 0 && b.conversations > 0) return -1;
          if (b.conversations === 0 && a.conversations > 0) return 1;
          return b.conversations - a.conversations;
        });
        setProjects(filteredProjects);

        // Filter conversations by project if specified
        const filteredConversations = projectId
          ? data.conversations.filter((conv: any) => (conv.project || 'general') === projectId)
          : data.conversations;

        setConversationHistory(filteredConversations.slice(0, 10));

        // Set first project as current if none selected
        if (!projectId && dynamicProjects.length > 0) {
          setCurrentProject(dynamicProjects[0].id);
        }
      } else {
        console.error('Failed to load conversations:', data.error);
        setConversationHistory([]);
        setProjects([]);
      }
    } catch (error) {
      console.error('Error loading conversations:', error);
      setConversationHistory([]);
      setProjects([]);
    } finally {
      setIsLoadingConversations(false);
    }
  }, [currentUser, createdProjects, deletedProjects]);

  // Helper function to format project names
  const formatProjectName = (id: string): string => {
    const nameMap: Record<string, string> = {
      general: 'General',
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

  // Load conversations on initial mount and user change
  React.useEffect(() => {
    loadConversations();
  }, [currentUser, loadConversations]);

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

  // Load conversations when project changes
  const handleProjectChange = (projectId: string) => {
    setCurrentProject(projectId);
    loadConversations(projectId);
  };

  // Persist deleted projects to localStorage
  React.useEffect(() => {
    const savedDeletedProjects = localStorage.getItem(`kimbleai_deleted_projects_${currentUser}`);
    if (savedDeletedProjects) {
      try {
        const deletedArray = JSON.parse(savedDeletedProjects);
        setDeletedProjects(new Set(deletedArray));
      } catch (error) {
        console.error('Error loading deleted projects:', error);
      }
    }

    const savedCreatedProjects = localStorage.getItem(`kimbleai_created_projects_${currentUser}`);
    if (savedCreatedProjects) {
      try {
        const createdArray = JSON.parse(savedCreatedProjects);
        setCreatedProjects(new Set(createdArray));
      } catch (error) {
        console.error('Error loading created projects:', error);
      }
    }
  }, [currentUser]);

  React.useEffect(() => {
    if (deletedProjects.size > 0) {
      const deletedArray = Array.from(deletedProjects);
      localStorage.setItem(`kimbleai_deleted_projects_${currentUser}`, JSON.stringify(deletedArray));
    }
  }, [deletedProjects, currentUser]);

  React.useEffect(() => {
    if (createdProjects.size > 0) {
      const createdArray = Array.from(createdProjects);
      localStorage.setItem(`kimbleai_created_projects_${currentUser}`, JSON.stringify(createdArray));
    }
  }, [createdProjects, currentUser]);

  // Delete project function - completely removes project with persistent storage
  const deleteProject = async (projectId: string) => {
    const projectName = formatProjectName(projectId);
    const confirmMessage = projectId === 'general'
      ? `Cannot delete the General project.`
      : `Are you sure you want to DELETE "${projectName}" project?\n\nThis will:\n- Remove the project completely\n- Move all conversations to General\n- This action cannot be undone\n\nProceed?`;

    if (projectId === 'general') {
      alert('Cannot delete the General project.');
      return;
    }

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
        // Add to local deleted projects set for immediate UI update
        setDeletedProjects(prev => {
          const newSet = new Set(prev);
          newSet.add(projectId);
          return newSet;
        });

        // Switch to general if deleting current project
        if (currentProject === projectId) {
          setCurrentProject('general');
        }

        // Reload conversations to get updated data from server
        setTimeout(() => loadConversations(), 200);

        alert(`Project "${projectName}" deleted successfully!\n${data.conversationsMoved} conversations moved to General.`);
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

  // Handle photo upload and analysis
  const handlePhotoAnalysis = React.useCallback(async (file: File) => {
    setIsAnalyzingPhoto(true);
    try {
      const formData = new FormData();
      formData.append('photo', file);
      formData.append('analysisType', photoAnalysisType);
      formData.append('userId', currentUser);

      const response = await fetch('/api/photo', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

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
      console.error('Photo analysis error:', error);
      const errorMessage: Message = {
        role: 'assistant',
        content: `❌ **Photo Analysis Failed**\n\nError: ${error.message}\n\nPlease try again with a different image or contact support if the issue persists.`,
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
    const file = event.target.files?.[0];
    if (file) {
      setSelectedAudio(file);
      handleAudioTranscription(file);
    }
  };

  // Poll progress for audio transcription
  const pollAudioProgress = React.useCallback(async (jobId: string) => {
    try {
      const response = await fetch(`/api/audio/transcribe-progress?jobId=${jobId}`);
      const data = await response.json();

      if (data.success) {
        setAudioProgress({
          progress: data.progress,
          eta: data.eta,
          status: data.status,
          jobId
        });

        if (data.status === 'completed' && data.result) {
          // Show completion message
          const audioMessage: Message = {
            role: 'user',
            content: `🎵 Audio uploaded: ${data.result.filename} (${(data.result.fileSize / 1024 / 1024).toFixed(1)} MB)`,
            timestamp: new Date().toISOString(),
            projectId: currentProject
          };

          const transcriptionMessage: Message = {
            role: 'assistant',
            content: `## 🎵 Audio Transcription Complete\n\n**File:** ${data.result.filename}\n**Duration:** ${Math.round(data.result.duration || 0)} seconds\n**Language:** ${data.result.language || 'en'}\n\n### Transcription:\n${data.result.text}\n\n---\n*Transcription ID: ${data.result.id}*`,
            timestamp: new Date().toISOString(),
            projectId: currentProject
          };

          setMessages(prev => [...prev, audioMessage, transcriptionMessage]);
          setIsTranscribingAudio(false);
          setAudioProgress({ progress: 0, eta: 0, status: 'idle' });

          console.log('[AUDIO] Transcription successful:', data.result);
        } else if (data.status === 'failed') {
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
  const handleAudioTranscription = async (file: File) => {
    setIsTranscribingAudio(true);
    setAudioProgress({ progress: 0, eta: 0, status: 'initializing' });

    try {
      console.log(`Starting transcription for file: ${file.name} (${file.size} bytes)`);

      const formData = new FormData();
      formData.append('audio', file);
      formData.append('userId', currentUser);
      formData.append('projectId', currentProject);

      const response = await fetch('/api/audio/transcribe-progress', {
        method: 'POST',
        body: formData,
      });

      let data;
      try {
        data = await response.json();
      } catch (jsonError) {
        // Handle non-JSON responses (HTML error pages, etc.)
        const text = await response.text();
        throw new Error(`Server returned non-JSON response (${response.status}): ${text.substring(0, 100)}...`);
      }

      if (!response.ok) {
        throw new Error(data.error || 'Failed to start transcription');
      }

      // Start polling for progress
      const jobId = data.jobId;
      setAudioProgress({
        progress: 0,
        eta: data.estimatedDuration ? Math.round(data.estimatedDuration / 2.5) : 30,
        status: 'starting',
        jobId
      });

      // Poll every 2 seconds
      const pollInterval = setInterval(() => {
        pollAudioProgress(jobId);
      }, 2000);

      // Clean up interval when transcription completes or fails
      const cleanupInterval = () => {
        clearInterval(pollInterval);
      };

      // Store cleanup function for potential use
      setTimeout(cleanupInterval, 10 * 60 * 1000); // 10 minute max timeout

      setSelectedAudio(null);
      console.log(`[AUDIO] Started transcription job ${jobId} for ${file.name}`);

    } catch (error: any) {
      console.error('Audio transcription error:', error);
      const errorMessage: Message = {
        role: 'assistant',
        content: `❌ **Audio Transcription Failed**\n\nError: ${error.message}\n\nPlease try again with a different audio file or contact support if the issue persists.`,
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, errorMessage]);
      setIsTranscribingAudio(false);
      setAudioProgress({ progress: 0, eta: 0, status: 'idle' });
    }
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
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [showSearch, setShowSearch] = useState(false);

  const sendMessage = async () => {
    if (!input.trim() || loading) return;

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
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMessages,
          userId: currentUser,
          projectId: currentProject,
          conversationId: currentConversationId || `conv_${Date.now()}`
        }),
      });

      const data = await response.json();

      const assistantMessage: Message = {
        role: 'assistant',
        content: data.response || 'I apologize, but I could not generate a response.',
        timestamp: new Date().toISOString(),
        modelInfo: data.modelUsed
      };

      setMessages([...newMessages, assistantMessage]);
    } catch (error) {
      console.error('Chat error:', error);
      const errorMessage: Message = {
        role: 'assistant',
        content: 'I encountered an error. Please try again.',
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
      preview: `${conv.messageCount} messages • ${conv.lastMessage}`
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

  return (
    <div style={{
      display: 'flex',
      height: '100vh',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
      backgroundColor: '#0f0f0f',
      color: '#ffffff'
    }}>
      {/* EMERGENCY OAUTH TEST - TOP OF PAGE */}
      <div style={{ position: 'absolute', top: '10px', right: '10px', zIndex: 9999, background: 'red', padding: '10px' }}>
        {status === 'loading' && <div>Auth Loading...</div>}
        {!session && status !== 'loading' && (
          <button onClick={() => signIn('google')} style={{ padding: '10px', backgroundColor: 'blue', color: 'white' }}>
            EMERGENCY OAUTH TEST
          </button>
        )}
        {session && <div style={{ color: 'white' }}>SIGNED IN: {session.user?.email}</div>}
      </div>

      {/* Sidebar */}
      <div style={{
        width: '260px',
        backgroundColor: '#171717',
        borderRight: '1px solid #333',
        display: 'flex',
        flexDirection: 'column',
        padding: '16px'
      }}>
        {/* User Switcher */}
        <div style={{ marginBottom: '20px' }}>
          <select
            value={currentUser}
            onChange={(e) => setCurrentUser(e.target.value as 'zach' | 'rebecca')}
            style={{
              width: '100%',
              padding: '8px',
              backgroundColor: '#2a2a2a',
              border: '1px solid #444',
              borderRadius: '6px',
              color: '#ffffff',
              fontSize: '14px'
            }}
          >
            <option value="zach">Zach (Admin)</option>
            <option value="rebecca">Rebecca (User)</option>
          </select>
        </div>

        {/* Search Bar */}
        <div style={{ marginBottom: '16px' }}>
          <input
            type="text"
            placeholder="Search conversations, projects, tags..."
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
              padding: '10px 12px',
              backgroundColor: '#2a2a2a',
              border: '1px solid #444',
              borderRadius: '6px',
              color: '#ffffff',
              fontSize: '13px',
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

        {/* New Chat Button */}
        <button
          onClick={() => {
            setMessages([]);
            setCurrentConversationId(null);
            setConversationTitle('');
            setSuggestedTags([]);
            setShowTags(false);
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
            marginBottom: '16px'
          }}
        >
          + New Chat
        </button>

        {/* Conversation History */}
        <div style={{ marginBottom: '20px' }}>
          <h3 style={{
            fontSize: '12px',
            fontWeight: '600',
            color: '#aaa',
            marginBottom: '8px',
            textTransform: 'uppercase'
          }}>
            Recent Conversations
          </h3>
          <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
            {conversationHistory.slice(0, 5).map((conv) => (
              <div
                key={conv.id}
                onClick={() => {
                  setCurrentConversationId(conv.id);
                  setCurrentProject(conv.project);
                  // Load conversation messages here
                }}
                style={{
                  padding: '8px',
                  backgroundColor: currentConversationId === conv.id ? '#2a2a2a' : 'transparent',
                  borderRadius: '4px',
                  marginBottom: '4px',
                  cursor: 'pointer',
                  borderLeft: `3px solid ${conv.project === 'client-work' ? '#4a9eff' : conv.project === 'personal' ? '#10a37f' : '#666'}`,
                  paddingLeft: '8px'
                }}
              >
                <div style={{
                  fontSize: '12px',
                  color: '#ccc',
                  fontWeight: '500',
                  marginBottom: '2px',
                  lineHeight: '1.2'
                }}>
                  {conv.title}
                </div>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: '10px',
                  color: '#666'
                }}>
                  <span>{conv.messageCount} messages</span>
                  <span>{conv.lastMessage}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Projects Section */}
        <div style={{ flex: 1 }}>
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
              onClick={() => {
                const name = prompt('Enter project name (e.g., "DND Campaign", "Work Projects"):');
                if (name && name.trim()) {
                  const projectId = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
                  const newProject = {
                    id: projectId,
                    name: name.trim(),
                    conversations: 0,
                    status: 'active'
                  };
                  setProjects(prev => {
                    // Check if project already exists
                    if (prev.find(p => p.id === projectId)) {
                      alert('Project with this name already exists!');
                      return prev;
                    }
                    // Add new project at the top
                    return [newProject, ...prev];
                  });

                  // Add to created projects set for persistence
                  setCreatedProjects(prev => {
                    const newSet = new Set(prev);
                    newSet.add(projectId);
                    return newSet;
                  });

                  setCurrentProject(projectId);
                  alert(`Project "${name}" created successfully!`);
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
            maxHeight: '300px',
            overflowY: 'auto',
            overflowX: 'hidden',
            scrollbarWidth: 'thin',
            scrollbarColor: '#666 #2a2a2a'
          }}>
            {projects.map((project) => (
              <div
                key={project.id}
              style={{
                padding: '8px 12px',
                backgroundColor: currentProject === project.id ? '#2a2a2a' : '#1a1a1a',
                borderRadius: '6px',
                marginBottom: '8px',
                fontSize: '14px',
                color: currentProject === project.id ? '#fff' : '#ccc',
                border: currentProject === project.id ? '1px solid #4a9eff' : '1px solid transparent',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                position: 'relative'
              }}
            >
              <div
                onClick={() => {
                  handleProjectChange(project.id);
                  setMessages([]); // Clear current messages
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
                <span>{project.name}</span>
                <span style={{
                  fontSize: '11px',
                  color: '#666',
                  backgroundColor: '#333',
                  padding: '2px 6px',
                  borderRadius: '10px'
                }}>
                  {project.conversations}
                </span>
              </div>

              {/* Delete button - only show for non-general projects */}
              {project.id !== 'general' && (
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
                    fontSize: '12px',
                    marginLeft: '8px',
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
              )}
              </div>
            ))}
          </div>

          {/* Current Project Info */}
          <div style={{
            marginTop: '16px',
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
              {projects.find(p => p.id === currentProject)?.name || 'General'}
            </div>
          </div>
        </div>

        {/* Google Authentication */}
        <div style={{
          marginBottom: '20px',
          padding: '10px'
        }}>
          <div style={{ color: '#888', fontSize: '10px', marginBottom: '5px' }}>
            Google Account Status
          </div>
          {status === 'loading' ? (
            <div style={{
              padding: '12px',
              backgroundColor: '#2a2a2a',
              borderRadius: '8px',
              fontSize: '12px',
              color: '#888',
              textAlign: 'center'
            }}>
              Loading auth...
            </div>
          ) : session ? (
            <div style={{
              padding: '12px',
              backgroundColor: '#1a4a1a',
              borderRadius: '8px',
              fontSize: '12px',
              color: '#4ade80'
            }}>
              <div style={{ fontWeight: '600', marginBottom: '4px' }}>
                ✅ Google Connected
              </div>
              <div style={{ marginBottom: '8px', fontSize: '11px' }}>
                {session.user?.email}
              </div>
              <button
                onClick={() => signOut()}
                style={{
                  padding: '6px 12px',
                  backgroundColor: '#ef4444',
                  border: 'none',
                  borderRadius: '4px',
                  color: 'white',
                  fontSize: '11px',
                  cursor: 'pointer'
                }}
              >
                Disconnect
              </button>
            </div>
          ) : (
            <button
              onClick={() => signIn('google')}
              style={{
                width: '100%',
                padding: '12px',
                backgroundColor: '#4285f4',
                border: 'none',
                borderRadius: '8px',
                color: 'white',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
            >
              🔗 Connect Google
            </button>
          )}
        </div>

        {/* Google Services Toggle */}
        <div style={{ marginBottom: '20px' }}>
          <button
            onClick={() => setShowGoogleServices(!showGoogleServices)}
            style={{
              width: '100%',
              padding: '12px',
              backgroundColor: showGoogleServices ? '#4ade80' : '#2a2a2a',
              border: '1px solid #444',
              borderRadius: '6px',
              color: '#ffffff',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: '500',
              transition: 'all 0.2s',
              opacity: session ? 1 : 0.6
            }}
          >
            {showGoogleServices ? '📱 Hide Google Services' : '🔗 Show Google Services'}
          </button>
          {!session && (
            <div style={{ fontSize: '10px', color: '#666', marginTop: '4px', textAlign: 'center' }}>
              Sign in to enable
            </div>
          )}
        </div>

        {/* System Status */}
        <div style={{
          marginTop: 'auto',
          padding: '12px',
          backgroundColor: '#1a1a1a',
          borderRadius: '8px',
          fontSize: '12px',
          color: '#888'
        }}>
          <div>KimbleAI v4</div>
          <div>Status: Online</div>
          <div>Memory: Active</div>
          {session && <div>Google: Connected ✅</div>}
        </div>
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
        <div style={{
          padding: '16px 24px',
          borderBottom: '1px solid #333',
          backgroundColor: '#171717'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              {conversationTitle ? (
                <div>
                  <h1 style={{
                    margin: 0,
                    fontSize: '16px',
                    fontWeight: '600',
                    color: '#ffffff'
                  }}>
                    {conversationTitle}
                  </h1>
                  <p style={{
                    margin: '2px 0 0 0',
                    fontSize: '12px',
                    color: '#888'
                  }}>
                    Project: {projects.find(p => p.id === currentProject)?.name || 'General'}
                  </p>
                </div>
              ) : (
                <div>
                  <h1 style={{
                    margin: 0,
                    fontSize: '18px',
                    fontWeight: '600',
                    color: '#ffffff'
                  }}>
                    KimbleAI Chat
                  </h1>
                  <p style={{
                    margin: '4px 0 0 0',
                    fontSize: '14px',
                    color: '#888'
                  }}>
                    AI Assistant with Memory & Context
                  </p>
                </div>
              )}
            </div>

            {messages.length > 0 && !conversationTitle && (
              <button
                onClick={() => {
                  const title = prompt('Give this conversation a title:');
                  if (title) {
                    setConversationTitle(title);
                    // Save to history
                    const newConv = {
                      id: Date.now().toString(),
                      title,
                      project: currentProject,
                      lastMessage: 'just now',
                      messageCount: messages.length
                    };
                    setConversationHistory([newConv, ...conversationHistory]);
                    setCurrentConversationId(newConv.id);
                  }
                }}
                style={{
                  padding: '6px 12px',
                  backgroundColor: '#2a2a2a',
                  border: '1px solid #444',
                  borderRadius: '6px',
                  color: '#ccc',
                  fontSize: '12px',
                  cursor: 'pointer'
                }}
              >
                💾 Save Chat
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
              <h2 style={{ fontSize: '24px', marginBottom: '8px' }}>
                Welcome to KimbleAI v4
              </h2>
              <p style={{ fontSize: '16px', margin: 0 }}>
                Start a conversation to experience AI with perfect memory
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
        </div>

        {/* Input Area */}
        <div
          style={{
            padding: '24px',
            borderTop: '1px solid #333',
            backgroundColor: '#171717'
          }}
          onPaste={handlePaste}
        >
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
              placeholder="Type your message or paste a screenshot..."
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
                opacity: isTranscribingAudio ? 0.6 : 1
              }}
              title="Upload and transcribe audio (M4A, MP3, WAV, etc.)"
            >
              {isTranscribingAudio ? '⏳' : '🎵'}
              <input
                type="file"
                accept="audio/*,.m4a,.mp3,.wav,.ogg,.aac"
                onChange={handleAudioSelect}
                disabled={isTranscribingAudio}
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
                display: 'inline-block'
              }}>
                <div style={{ marginBottom: '2px' }}>
                  {audioProgress.status === 'initializing' && '🔄 Initializing...'}
                  {audioProgress.status === 'preparing_file' && '📁 Preparing file...'}
                  {audioProgress.status === 'uploading_to_whisper' && '⬆️ Uploading...'}
                  {audioProgress.status === 'transcribing' && '🎯 Transcribing...'}
                  {audioProgress.status === 'saving_to_database' && '💾 Saving...'}
                  {audioProgress.status === 'generating_embeddings' && '🧠 Generating embeddings...'}
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
                        : `${Math.floor(audioProgress.eta / 60)}m`}`}
                    </span>
                  </div>
                )}
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
                {suggestedTags.map((tag, index) => (
                  <span
                    key={index}
                    style={{
                      padding: '4px 8px',
                      backgroundColor: '#2a2a2a',
                      border: '1px solid #444',
                      borderRadius: '12px',
                      fontSize: '11px',
                      color: '#ccc',
                      cursor: 'pointer'
                    }}
                    onClick={() => {
                      // Add to search or filter functionality later
                      console.log('Tag clicked:', tag);
                    }}
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
        </div>
      )}
    </div>
  );
}