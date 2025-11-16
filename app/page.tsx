'use client';

import React, { useState, useEffect, useRef } from 'react';
import { signOut, useSession } from 'next-auth/react';
import { useConversations } from '@/hooks/useConversations';
import { useMessages } from '@/hooks/useMessages';
import { useProjects } from '@/hooks/useProjects';
import { useDndFacts } from '@/hooks/useDndFacts';
import { useAutosave } from '@/hooks/useAutosave';
import { useKeyboardShortcuts, KeyboardShortcut } from '@/hooks/useKeyboardShortcuts';
import { useAutoScroll } from '@/hooks/useAutoScroll';
import { useMessageSearch } from '@/hooks/useMessageSearch';
import { useContextMenu } from '@/hooks/useContextMenu';
// Dark mode removed - was not functional
// import { useTheme } from '@/hooks/useTheme';
import { SlashCommand } from '@/hooks/useAutocomplete';
import toast from 'react-hot-toast';
import FormattedMessage from '../components/FormattedMessage';
import EditableMessage from '../components/EditableMessage';
import ConversationSearch from '../components/ConversationSearch';
import SmartInput from '../components/SmartInput';
import ContextMenu, { ContextMenuItem } from '../components/ui/ContextMenu';
import GoogleServicesPanel from '../components/GoogleServicesPanel';
import LoadingScreen from '../components/LoadingScreen';
import UnifiedSearch from '../components/search/UnifiedSearch';
import { ModelSelector, type AIModel } from '../components/model-selector/ModelSelector';
import { IconButton, TouchButton } from '../components/TouchButton';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { KeyboardShortcutsDialog } from '../components/KeyboardShortcutsDialog';
import { MessageLengthIndicator } from '../components/ui/MessageLengthIndicator';
import { ScrollToBottom } from '../components/ui/ScrollToBottom';
import { ResponsiveBreadcrumbs } from '../components/ui/Breadcrumbs';
// Dark mode removed - was not functional
// import { ThemeToggle } from '../components/ui/ThemeToggle';
import { useDeviceType } from '../components/ResponsiveLayout';
import D20Dice from '../components/D20Dice';
import { CostWidget } from '../components/cost/CostWidget';
import versionData from '../version.json';
import { formatRelativeTime } from '@/lib/chat-utils';

const versionInfo = {
  version: versionData.version,
  commit: versionData.commit,
  lastUpdated: versionData.lastUpdated
};

// Dynamic D&D facts are now fetched via API (see /api/dnd-facts)

export default function Home() {
  const { data: session, status } = useSession();
  const [currentUser, setCurrentUser] = useState<'zach' | 'rebecca'>('zach');
  const [selectedModel, setSelectedModel] = useState<AIModel>('claude-sonnet-4-5');
  const [input, setInput] = useState('');
  const [showModelSelector, setShowModelSelector] = useState(false);
  const [showGoogleServices, setShowGoogleServices] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [showTags, setShowTags] = useState(false);
  const [suggestedTags, setSuggestedTags] = useState<string[]>([]);
  const [activeTagFilters, setActiveTagFilters] = useState<string[]>([]);
  const [showProjectDropdown, setShowProjectDropdown] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showShortcutsDialog, setShowShortcutsDialog] = useState(false);
  const [isConversationSearchOpen, setIsConversationSearchOpen] = useState(false);
  const [isGlobalSearchOpen, setIsGlobalSearchOpen] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    variant?: 'danger' | 'warning' | 'info';
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  // Refs for keyboard shortcuts
  const inputRef = useRef<HTMLInputElement>(null);

  // Device detection for responsive design
  const deviceType = useDeviceType();
  const isMobile = deviceType === 'mobile';

  // Theme toggle
  // Dark mode removed - was not functional
  // const { toggleTheme, resolvedTheme } = useTheme();

  // Dynamic D&D facts - fetched from API every 30 seconds
  const { currentFact, loading: factLoading, error: factError } = useDndFacts(30000);

  const conversationsHook = useConversations(currentUser);
  const {
    currentConversationId,
    groupedConversations,
    conversationsByProject,
    recentConversations,
    selectConversation,
    createNewConversation,
    deleteConversation,
    togglePin,
    loading: conversationsLoading,
    loadConversations,
    removeOrphanedConversation,
  } = conversationsHook;

  const messagesHook = useMessages(currentConversationId, currentUser, removeOrphanedConversation);
  const { messages, sending, messagesEndRef, sendMessage, clearMessages, setMessages } = messagesHook;

  const projectsHook = useProjects(currentUser);
  const { projects, currentProject, selectProject, updateProject, deleteProject } = projectsHook;

  // Message search hook
  const messageSearch = useMessageSearch(messages);
  const {
    searchQuery,
    updateSearchQuery,
    totalMatches,
    currentMatchIndex,
    currentMatch,
    nextMatch,
    previousMatch,
    clearSearch,
  } = messageSearch;

  // Context menu hook
  const contextMenu = useContextMenu();

  // Autosave hook - saves draft every 2 seconds
  const { clearDraft, loadDraft } = useAutosave({
    key: `chat-draft-${currentConversationId || 'new'}`,
    value: input,
    delay: 2000,
    showToast: false, // Don't show toast for every autosave
  });

  // Auto-scroll hook with manual override detection
  const { containerRef, showScrollButton, newMessageCount, scrollToBottom } = useAutoScroll([messages], {
    threshold: 100,
    behavior: 'smooth',
  });

  // Load draft on mount or when conversation changes
  useEffect(() => {
    const draft = loadDraft();
    if (draft && draft !== input) {
      setInput(draft);
      toast('Draft restored', { icon: '📝', duration: 3000 });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentConversationId]);

  // Define slash commands for autocomplete
  const slashCommands: SlashCommand[] = [
    {
      command: 'help',
      description: 'Show help dialog',
      action: () => toast('Help coming soon', { icon: '❓' }),
    },
    {
      command: 'clear',
      description: 'Clear current conversation',
      action: () => {
        setConfirmDialog({
          isOpen: true,
          title: 'Clear Conversation',
          message: 'Are you sure you want to clear all messages?',
          variant: 'warning',
          onConfirm: () => {
            clearMessages();
            setConfirmDialog({ ...confirmDialog, isOpen: false });
          },
        });
      },
    },
    {
      command: 'export',
      description: 'Export conversation',
      action: () => toast('Export coming soon', { icon: '📤' }),
    },
    {
      command: 'new',
      description: 'New conversation',
      action: () => handleNewChat(),
    },
    {
      command: 'shortcuts',
      description: 'Show keyboard shortcuts',
      action: () => setShowShortcutsDialog(true),
    },
    {
      command: 'search',
      description: 'Search in conversation',
      action: () => setIsConversationSearchOpen(true),
    },
  ];

  // Keyboard shortcuts configuration
  const shortcuts: KeyboardShortcut[] = [
    // Navigation
    {
      key: 'k',
      ctrl: true,
      callback: () => setIsSearchOpen(true),
      description: 'Open search',
      category: 'Navigation',
    },
    {
      key: 'f',
      ctrl: true,
      callback: () => setIsGlobalSearchOpen(true),
      description: 'Global search (Chat, Drive, Mail)',
      category: 'Navigation',
    },
    {
      key: 'n',
      ctrl: true,
      callback: () => handleNewChat(),
      description: 'New conversation',
      category: 'Navigation',
    },
    {
      key: '/',
      ctrl: true,
      callback: () => setIsMobileSidebarOpen(prev => !prev),
      description: 'Toggle sidebar',
      category: 'Navigation',
    },
    {
      key: 'p',
      ctrl: true,
      callback: () => selectProject(''),
      description: 'Go to General project',
      category: 'Navigation',
    },
    {
      key: 'j',
      ctrl: true,
      callback: () => setIsSearchOpen(true),
      description: 'Quick switcher',
      category: 'Navigation',
    },
    // Recent conversations shortcuts (Cmd/Ctrl + 1-5)
    {
      key: '1',
      ctrl: true,
      callback: () => {
        if (recentConversations[0]) {
          selectConversation(recentConversations[0].id);
          setIsMobileSidebarOpen(false);
        }
      },
      description: 'Jump to recent conversation 1',
      category: 'Navigation',
    },
    {
      key: '2',
      ctrl: true,
      callback: () => {
        if (recentConversations[1]) {
          selectConversation(recentConversations[1].id);
          setIsMobileSidebarOpen(false);
        }
      },
      description: 'Jump to recent conversation 2',
      category: 'Navigation',
    },
    {
      key: '3',
      ctrl: true,
      callback: () => {
        if (recentConversations[2]) {
          selectConversation(recentConversations[2].id);
          setIsMobileSidebarOpen(false);
        }
      },
      description: 'Jump to recent conversation 3',
      category: 'Navigation',
    },
    {
      key: '4',
      ctrl: true,
      callback: () => {
        if (recentConversations[3]) {
          selectConversation(recentConversations[3].id);
          setIsMobileSidebarOpen(false);
        }
      },
      description: 'Jump to recent conversation 4',
      category: 'Navigation',
    },
    {
      key: '5',
      ctrl: true,
      callback: () => {
        if (recentConversations[4]) {
          selectConversation(recentConversations[4].id);
          setIsMobileSidebarOpen(false);
        }
      },
      description: 'Jump to recent conversation 5',
      category: 'Navigation',
    },
    // Actions
    {
      key: 'Enter',
      ctrl: true,
      callback: () => handleSendMessage(),
      description: 'Send message',
      category: 'Actions',
    },
    {
      key: 'Escape',
      callback: () => {
        // Close any open modals
        setShowModelSelector(false);
        setShowGoogleServices(false);
        setIsSearchOpen(false);
        setShowUserMenu(false);
        setShowShortcutsDialog(false);
        setIsConversationSearchOpen(false);
        setConfirmDialog(prev => ({ ...prev, isOpen: false }));
        contextMenu.hideContextMenu();
        if (isConversationSearchOpen) {
          clearSearch();
        }
      },
      description: 'Close modals/dialogs',
      category: 'Actions',
    },
    {
      key: 'm',
      ctrl: true,
      callback: () => setShowModelSelector(prev => !prev),
      description: 'Toggle model selector',
      category: 'Actions',
    },
    {
      key: 't',
      ctrl: true,
      callback: () => setShowTags(prev => !prev),
      description: 'Toggle tags',
      category: 'Actions',
    },
    // Dark mode removed - was not functional
    // {
    //   key: 'd',
    //   ctrl: true,
    //   shift: true,
    //   callback: () => {
    //     toggleTheme();
    //     toast(`Switched to ${resolvedTheme === 'dark' ? 'light' : 'dark'} mode`, {
    //       icon: resolvedTheme === 'dark' ? '☀️' : '🌙',
    //       duration: 2000
    //     });
    //   },
    //   description: 'Toggle dark mode',
    //   category: 'View',
    // },
    {
      key: 'i',
      ctrl: true,
      callback: () => {
        if (inputRef.current) {
          inputRef.current.focus();
        }
      },
      description: 'Focus input',
      category: 'View',
    },
    // Help
    {
      key: '?',
      callback: () => setShowShortcutsDialog(true),
      description: 'Show keyboard shortcuts',
      category: 'General',
    },
  ];

  // Enable keyboard shortcuts
  useKeyboardShortcuts(shortcuts, !sending);

  if (status === 'loading' || status === 'unauthenticated') {
    return (
      <LoadingScreen
        message={status === 'loading' ? 'Loading KimbleAI...' : 'Redirecting to sign in...'}
        fullScreen={true}
      />
    );
  }

  // Auto-select model based on query type
  const getAutoSelectedModel = (message: string): AIModel => {
    // Simple queries - use fast models
    const simplePatterns = [
      /^(hi|hello|hey|greetings?)$/i,
      /^(thank you|thanks|thx)$/i,
      /^(what|who|where|when|how) (is|are|was|were)/i,
      /^(tell me|give me) (a |an )?(joke|fact|quote)/i,
      /^(what'?s|what is) \d+/i,
      /^(explain|define|what does).{0,30}mean/i,
    ];

    // Complex queries - use quality models
    const complexKeywords = ['analyze', 'complex', 'detailed', 'comprehensive', 'research'];

    // RAG queries - use quality models
    const ragKeywords = ['gmail', 'email', 'drive', 'files', 'documents', 'calendar', 'search', 'find'];

    const msg = message.toLowerCase().trim();

    // Check for complex/RAG queries first
    if (complexKeywords.some(kw => msg.includes(kw)) || ragKeywords.some(kw => msg.includes(kw))) {
      return 'claude-sonnet-4-5'; // Quality model for complex tasks
    }

    // Check for simple queries
    if (msg.length < 100 && simplePatterns.some(p => p.test(message))) {
      return 'gpt-4o-mini'; // Fast model for simple tasks
    }

    // Default to balanced model
    return 'gpt-4o-mini'; // Default to fast for most queries
  };

  const handleSendMessage = async () => {
    if (!input.trim() || sending) return;
    const messageContent = input;

    // Auto-select model based on query type
    const autoModel = getAutoSelectedModel(messageContent);
    setSelectedModel(autoModel);

    setInput('');
    clearDraft(); // Clear autosaved draft after sending
    await sendMessage(messageContent, {
      selectedModel: autoModel,
      currentProject,
      suggestedTags: activeTagFilters,
      conversationTitle: '',
    });
  };

  const handleNewChat = () => {
    createNewConversation();
    clearMessages();
    setIsMobileSidebarOpen(false);
  };

  // Handle message editing
  const handleEditMessage = async (messageId: string, newContent: string) => {
    try {
      const response = await fetch(`/api/messages/${messageId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: newContent,
          userId: currentUser,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update message');
      }

      const data = await response.json();

      // Update local messages state
      setMessages(prev =>
        prev.map(msg =>
          msg.id === messageId
            ? { ...msg, content: newContent, editedAt: data.message.edited_at }
            : msg
        )
      );
    } catch (error) {
      console.error('Error editing message:', error);
      throw error;
    }
  };

  // Get context menu items for a message
  const getMessageContextMenuItems = (message: any, index: number): ContextMenuItem[] => {
    const items: ContextMenuItem[] = [];

    // Copy message
    items.push({
      label: 'Copy',
      icon: '📋',
      onClick: () => {
        navigator.clipboard.writeText(message.content);
        toast.success('Message copied to clipboard');
      },
    });

    // Edit message (only for user's own messages)
    if (message.role === 'user' && message.id) {
      items.push({
        label: 'Edit',
        icon: '✏️',
        onClick: () => {
          // Trigger edit mode by clicking on the message
          toast('Double-click message to edit', { icon: 'ℹ️' });
        },
      });
    }

    items.push({ label: '', icon: '', onClick: () => {}, divider: true });

    // Share message (future feature)
    items.push({
      label: 'Share',
      icon: '🔗',
      disabled: true,
      onClick: () => {},
    });

    return items;
  };

  // Get context menu items for a conversation
  const getConversationContextMenuItems = (conv: any): ContextMenuItem[] => {
    return [
      {
        label: 'Rename',
        icon: '✏️',
        onClick: () => {
          toast('Conversation rename coming soon', { icon: '🚧' });
        },
      },
      {
        label: conv.is_pinned ? 'Unpin' : 'Pin',
        icon: conv.is_pinned ? '📌' : '📍',
        onClick: async () => {
          await togglePin(conv.id, conv.is_pinned);
        },
      },
      {
        label: 'Duplicate',
        icon: '📑',
        disabled: true,
        onClick: () => {},
      },
      { label: '', icon: '', onClick: () => {}, divider: true },
      {
        label: 'Export',
        icon: '📤',
        disabled: true,
        onClick: () => {},
      },
      { label: '', icon: '', onClick: () => {}, divider: true },
      {
        label: 'Delete',
        icon: '🗑️',
        danger: true,
        onClick: () => {
          setConfirmDialog({
            isOpen: true,
            title: 'Delete Conversation',
            message: 'Are you sure you want to delete this conversation? This cannot be undone.',
            variant: 'danger',
            onConfirm: async () => {
              await deleteConversation(conv.id);
              setConfirmDialog({ ...confirmDialog, isOpen: false });
            },
          });
        },
      },
    ];
  };

  // Get time-based greeting in CET timezone
  const getGreeting = () => {
    const now = new Date();
    const cetTime = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/Paris' }));
    const hour = cetTime.getHours();
    const userName = currentUser === 'zach' ? 'Zach' : 'Rebecca';

    if (hour >= 6 && hour < 12) {
      return `Good morning, ${userName}`;
    } else if (hour >= 12 && hour < 17) {
      return `Good afternoon, ${userName}`;
    } else if (hour >= 17 && hour < 22) {
      return `Good evening, ${userName}`;
    } else {
      return `Go to bed, ${userName}`;
    }
  };

  return (
    <div className="flex h-screen bg-black text-white">
      <style jsx>{`
        @media (max-width: 768px) {
          .sidebar {
            position: fixed;
            left: ${isMobileSidebarOpen ? '0' : '-100%'};
            top: 0;
            bottom: 0;
            z-index: 1000;
            width: 90vw;
            max-width: 280px;
            transition: left 0.3s ease;
          }
        }
      `}</style>

      {/* Mobile Menu Button */}
      {isMobile && (
        <TouchButton
          onClick={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
          className="md:hidden fixed top-4 left-4 z-50 bg-gray-800 border border-gray-700"
          size="sm"
          variant="secondary"
        >
          Menu
        </TouchButton>
      )}

      {/* Sidebar Overlay (mobile) */}
      {isMobileSidebarOpen && (
        <div
          onClick={() => setIsMobileSidebarOpen(false)}
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
        />
      )}

      {/* Sidebar */}
      <div className="sidebar w-64 bg-gray-950 border-r border-gray-800 flex flex-col">
        {/* New Chat Button */}
        <div className="p-3">
          <button
            onClick={handleNewChat}
            className="w-full py-2.5 px-4 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg text-lg font-medium transition-colors"
          >
            New chat
          </button>
        </div>

        {/* Search Button */}
        <div className="px-3 pb-2">
          <button
            onClick={() => setIsSearchOpen(true)}
            className="w-full py-2 px-4 bg-gray-900 hover:bg-gray-800 border border-gray-800 rounded-lg text-base text-gray-400 text-left transition-colors"
          >
            Search...
          </button>
        </div>

        {/* Projects Section */}
        <div className="px-3 pb-2">
          <div className="text-sm text-gray-500 font-medium px-2 mb-2">PROJECTS</div>
          <div className="space-y-1">
            <button
              onClick={() => selectProject('')}
              className={`w-full py-1.5 px-3 rounded-md text-base text-left transition-colors ${
                !currentProject ? 'bg-gray-800 text-white' : 'text-gray-400 hover:bg-gray-900'
              }`}
            >
              General
            </button>
            {projects.map(project => (
              <div key={project.id} className="flex items-center gap-1">
                <button
                  onClick={() => selectProject(project.id)}
                  className={`flex-1 py-1.5 px-3 rounded-md text-base text-left transition-colors ${
                    currentProject === project.id ? 'bg-gray-800 text-white' : 'text-gray-400 hover:bg-gray-900'
                  }`}
                >
                  {project.name}
                </button>
                <IconButton
                  icon={<span className="text-base">✏️</span>}
                  label="Edit project"
                  onClick={() => {
                    const newName = prompt(`Edit project name:`, project.name);
                    if (newName && newName !== project.name) {
                      updateProject(project.id, { name: newName });
                    }
                  }}
                  variant="ghost"
                  className="text-gray-600 hover:text-blue-400"
                />
                <IconButton
                  icon={<span className="text-base">🗑️</span>}
                  label="Delete project"
                  onClick={() => {
                    setConfirmDialog({
                      isOpen: true,
                      title: 'Delete Project',
                      message: `Are you sure you want to delete "${project.name}"? This action cannot be undone.`,
                      variant: 'danger',
                      onConfirm: () => {
                        deleteProject(project.id);
                        setConfirmDialog({ ...confirmDialog, isOpen: false });
                      },
                    });
                  }}
                  variant="ghost"
                  className="text-gray-600 hover:text-red-500"
                />
              </div>
            ))}
            <button
              onClick={() => {
                const name = prompt('Enter project name:');
                if (name) {
                  projectsHook.createProject({ name, status: 'active' });
                }
              }}
              className="w-full py-1.5 px-3 rounded-md text-base text-left text-gray-500 hover:bg-gray-900 transition-colors"
            >
              + New project
            </button>
          </div>
        </div>

        {/* Conversations List - Grouped by Project */}
        <div className="flex-1 overflow-y-auto px-3">
          {/* Recent Conversations Section */}
          {recentConversations.length > 0 && (
            <div className="mb-4">
              <div className="text-sm text-gray-500 font-medium px-2 mb-2 flex items-center gap-2">
                <span>⭐ RECENT</span>
              </div>
              {recentConversations.map((conv) => (
                <div
                  key={conv.id}
                  className={`flex items-center gap-2 px-2 py-2 rounded-md mb-1 transition-colors ${
                    currentConversationId === conv.id
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-400 hover:bg-gray-900'
                  }`}
                >
                  <button
                    onClick={() => {
                      selectConversation(conv.id);
                      setIsMobileSidebarOpen(false);
                    }}
                    className="flex-1 text-left min-w-0 px-1"
                  >
                    <div className="text-base truncate overflow-hidden text-ellipsis whitespace-nowrap">
                      {conv.title || 'Untitled conversation'}
                    </div>
                    {(conv.updated_at || conv.created_at) && (
                      <div className="text-sm text-gray-600 mt-0.5 truncate">
                        {formatRelativeTime(conv.updated_at || conv.created_at)}
                      </div>
                    )}
                  </button>
                  <button
                    onClick={async (e) => {
                      e.stopPropagation();
                      await togglePin(conv.id, conv.is_pinned);
                    }}
                    className="flex-shrink-0 text-yellow-500 hover:text-yellow-400 hover:bg-yellow-900/20 rounded p-1.5 transition-colors"
                    title={conv.is_pinned ? "Unpin conversation" : "Pin conversation"}
                  >
                    {conv.is_pinned ? '📌' : '📍'}
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Unassigned conversations first */}
          {conversationsByProject['unassigned'] && conversationsByProject['unassigned'].length > 0 && (
            <div className="mb-4">
              <div className="text-sm text-gray-500 font-medium px-2 mb-2">GENERAL</div>
              {conversationsByProject['unassigned'].map((conv) => (
                <div
                  key={conv.id}
                  className={`flex items-center gap-2 px-2 py-2 rounded-md mb-1 transition-colors ${
                    currentConversationId === conv.id
                      ? 'bg-gray-800 text-white'
                      : 'text-gray-400 hover:bg-gray-900'
                  }`}
                >
                  <button
                    onClick={() => {
                      selectConversation(conv.id);
                      setIsMobileSidebarOpen(false);
                    }}
                    className="flex-1 text-left min-w-0 px-1"
                  >
                    <div className="text-base truncate overflow-hidden text-ellipsis whitespace-nowrap">
                      {conv.title || 'Untitled conversation'}
                    </div>
                    {(conv.updated_at || conv.created_at) && (
                      <div className="text-sm text-gray-600 mt-0.5 truncate">
                        {formatRelativeTime(conv.updated_at || conv.created_at)}
                      </div>
                    )}
                  </button>
                  <button
                    onClick={async (e) => {
                      e.stopPropagation();
                      setConfirmDialog({
                        isOpen: true,
                        title: 'Delete Conversation',
                        message: 'Are you sure you want to delete this conversation? This cannot be undone.',
                        variant: 'danger',
                        onConfirm: async () => {
                          await deleteConversation(conv.id);
                          setConfirmDialog({ ...confirmDialog, isOpen: false });
                        }
                      });
                    }}
                    className="flex-shrink-0 text-red-500 hover:text-red-400 hover:bg-red-900/20 rounded p-1.5 transition-colors"
                    title="Delete conversation"
                  >
                    🗑️
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Conversations grouped by project */}
          {Object.entries(conversationsByProject)
            .filter(([projectId]) => projectId !== 'unassigned')
            .map(([projectId, convs]) => {
              if (convs.length === 0) return null;

              // Find project name from projects list
              const project = projects.find(p => p.id === projectId);
              const projectName = project?.name || projectId;

              return (
                <div key={projectId} className="mb-4">
                  <div className="text-sm text-gray-500 font-medium px-2 mb-2 flex items-center justify-between">
                    <span>{projectName.toUpperCase()}</span>
                    <span className="text-gray-600 text-xs">({convs.length})</span>
                  </div>
                  {convs.map((conv) => (
                    <div
                      key={conv.id}
                      className={`flex items-center gap-2 px-2 py-2 rounded-md mb-1 transition-colors ${
                        currentConversationId === conv.id
                          ? 'bg-gray-800 text-white'
                          : 'text-gray-400 hover:bg-gray-900'
                      }`}
                    >
                      <button
                        onClick={() => {
                          selectConversation(conv.id);
                          setIsMobileSidebarOpen(false);
                        }}
                        className="flex-1 text-left min-w-0 px-1"
                      >
                        <div className="text-base truncate overflow-hidden text-ellipsis whitespace-nowrap">
                          {conv.title || 'Untitled conversation'}
                        </div>
                        {(conv.updated_at || conv.created_at) && (
                          <div className="text-sm text-gray-600 mt-0.5 truncate">
                            {formatRelativeTime(conv.updated_at || conv.created_at)}
                          </div>
                        )}
                      </button>
                      <button
                        onClick={async (e) => {
                          e.stopPropagation();
                          setConfirmDialog({
                            isOpen: true,
                            title: 'Delete Conversation',
                            message: 'Are you sure you want to delete this conversation? This cannot be undone.',
                            variant: 'danger',
                            onConfirm: async () => {
                              await deleteConversation(conv.id);
                              setConfirmDialog({ ...confirmDialog, isOpen: false });
                            }
                          });
                        }}
                        className="flex-shrink-0 text-red-500 hover:text-red-400 hover:bg-red-900/20 rounded p-1.5 transition-colors"
                        title="Delete conversation"
                      >
                        🗑️
                      </button>
                    </div>
                  ))}
                </div>
              );
            })}
        </div>

        {/* Archie Dashboard Link */}
        <div className="p-3 border-t border-gray-900">
          <a
            href="/agent"
            className="flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-gradient-to-r from-green-900/20 to-emerald-900/20 hover:from-green-800/30 hover:to-emerald-800/30 border border-green-700/30 hover:border-green-600/50 transition-all duration-200 group"
          >
            <span className="text-xl group-hover:scale-110 transition-transform">🦉</span>
            <span className="text-base font-medium text-green-400 group-hover:text-green-300">
              Archie Dashboard
            </span>
          </a>
        </div>

        {/* Version Info */}
        <div className="p-3 border-t border-gray-900">
          <div className="text-xs text-gray-600 text-center font-mono">
            v{versionInfo.version} @ {versionInfo.commit}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Breadcrumbs */}
        <ResponsiveBreadcrumbs />

        {/* Header */}
        <div className="bg-gray-950 border-b border-gray-800 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <D20Dice size={40} spinning={true} />
            <div>
              <h1 className="text-lg font-semibold">KimbleAI</h1>
            </div>
          </div>

          {/* Cost Widget & User Selector */}
          <div className="flex items-center gap-4">
            <CostWidget />
            <div className="relative">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="px-3 py-1.5 bg-gray-800 dark:bg-gray-700 hover:bg-gray-700 dark:hover:bg-gray-600 border border-gray-700 dark:border-gray-600 rounded-lg text-sm transition-colors"
              >
                {currentUser === 'zach' ? 'Zach' : 'Rebecca'}
              </button>
            {showUserMenu && (
              <div className="absolute right-0 mt-2 w-40 bg-gray-900 border border-gray-700 rounded-lg shadow-lg py-1 z-50">
                <button
                  onClick={() => {
                    setCurrentUser('zach');
                    setShowUserMenu(false);
                  }}
                  className="w-full px-4 py-2 text-left text-sm hover:bg-gray-800 transition-colors"
                >
                  Zach
                </button>
                <button
                  onClick={() => {
                    setCurrentUser('rebecca');
                    setShowUserMenu(false);
                  }}
                  className="w-full px-4 py-2 text-left text-sm hover:bg-gray-800 transition-colors"
                >
                  Rebecca
                </button>
                <div className="border-t border-gray-800 my-1"></div>
                <button
                  onClick={() => {
                    signOut();
                    setShowUserMenu(false);
                  }}
                  className="w-full px-4 py-2 text-left text-sm text-red-400 hover:bg-gray-800 transition-colors"
                >
                  Sign out
                </button>
              </div>
            )}
            </div>
          </div>
        </div>

        {/* Global Unified Search */}
        <UnifiedSearch
          isOpen={isGlobalSearchOpen}
          onClose={() => setIsGlobalSearchOpen(false)}
        />

        {/* Messages Area */}
        <div ref={containerRef} className="flex-1 overflow-y-auto p-4 relative">
          {messages.length === 0 ? (
            <div className="text-center mt-32 max-w-2xl mx-auto px-8">
              <div className="text-4xl text-gray-400 mb-3">{getGreeting()}</div>
              <div className="text-2xl text-gray-600 italic leading-relaxed transition-opacity duration-500">
                {factLoading ? (
                  <span className="text-gray-700">Loading new fact...</span>
                ) : (
                  `"${currentFact}"`
                )}
              </div>
              {factError && (
                <div className="text-sm text-yellow-600 mt-2">
                  {factError}
                </div>
              )}
            </div>
          ) : (
            <div className="max-w-3xl mx-auto space-y-6">
              {/* Project Header - ChatGPT style project header */}
              {currentProject && (
                <div className="flex items-center gap-3 mb-6 pt-2">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center flex-shrink-0">
                    <span className="text-white text-xl font-bold">
                      {(projects.find(p => p.id === currentProject)?.name || 'P')[0].toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1">
                    <h1 className="text-2xl font-semibold text-white leading-tight">
                      {projects.find(p => p.id === currentProject)?.name || 'Project'}
                    </h1>
                    <p className="text-sm text-gray-400 mt-0.5">
                      {conversations.filter(c => c.project_id === currentProject).length} conversation{conversations.filter(c => c.project_id === currentProject).length !== 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
              )}
              {messages.map((msg, idx) => (
                <div
                  key={msg.id || idx}
                  className="flex gap-4"
                  onContextMenu={(e) => {
                    contextMenu.showContextMenu(e, { message: msg, index: idx });
                  }}
                >
                  <div className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-sm ${
                    msg.role === 'user' ? 'bg-gray-700' : 'bg-gray-800'
                  }`}>
                    {msg.role === 'user' ? 'U' : 'AI'}
                  </div>
                  <div className="flex-1 pt-1">
                    <EditableMessage
                      id={msg.id}
                      content={msg.content}
                      role={msg.role}
                      editedAt={msg.editedAt}
                      isOwn={msg.userId === currentUser || !msg.userId}
                      onSave={msg.id ? (newContent) => handleEditMessage(msg.id!, newContent) : undefined}
                      highlight={searchQuery || undefined}
                    />
                  </div>
                </div>
              ))}

              {sending && (
                <div className="flex gap-4">
                  <div className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-sm bg-gray-800">
                    AI
                  </div>
                  <div className="flex-1 pt-1">
                    <div className="flex gap-1">
                      <div className="w-2 h-2 bg-gray-600 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-gray-600 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                      <div className="w-2 h-2 bg-gray-600 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          )}

          {/* Scroll to Bottom Button */}
          {showScrollButton && (
            <ScrollToBottom
              onClick={() => scrollToBottom(true)}
              newMessageCount={newMessageCount}
            />
          )}
        </div>

        {/* Input Area */}
        <div className={`border-t border-gray-800 bg-gray-950 p-3 md:p-4 ${isMobile ? 'safe-padding-bottom' : ''}`}>
          <div className="max-w-3xl mx-auto">
            <div className="flex items-end gap-2">
              <div className="flex-1">
                <SmartInput
                  value={input}
                  onChange={setInput}
                  onSubmit={handleSendMessage}
                  placeholder="Ask me anything..."
                  disabled={sending}
                  projects={projects.map(p => ({ id: p.id, name: p.name }))}
                  tags={activeTagFilters}
                  commands={slashCommands}
                />
              </div>

              <TouchButton
                onClick={handleSendMessage}
                disabled={!input.trim() || sending}
                variant="ghost"
                className="h-[72px] bg-gray-900 text-gray-400 hover:bg-gray-800 border border-gray-700 shadow-none"
              >
                {isMobile ? '→' : 'Send'}
              </TouchButton>
            </div>

            {/* Message Length Indicator */}
            {input.length > 0 && (
              <div className="mt-2">
                <MessageLengthIndicator text={input} />
              </div>
            )}

            {/* Minimalist Model Indicator */}
            <div className="flex items-center mt-2 px-1 text-xs text-gray-500">
              <span className="font-mono">
                Model: {selectedModel === 'claude-sonnet-4-5' ? 'Claude Sonnet' :
                       selectedModel === 'gpt-4o' ? 'GPT-4o' :
                       selectedModel === 'gpt-4o-mini' ? 'GPT-4o Mini' :
                       selectedModel === 'claude-3-5-haiku' ? 'Claude Haiku' :
                       selectedModel}
              </span>
            </div>

            {showTags && (
              <div className="mt-3">
                <div className="text-xs text-gray-500 mb-2">Tags</div>
                <div className="flex flex-wrap gap-2">
                  {activeTagFilters.map((tag, index) => (
                    <span
                      key={index}
                      onClick={() => setActiveTagFilters(prev => prev.filter(t => t !== tag))}
                      className="px-3 py-1 bg-gray-800 border border-gray-700 rounded-full text-xs cursor-pointer hover:bg-gray-700 transition-colors"
                    >
                      {tag} ×
                    </span>
                  ))}
                  <input
                    type="text"
                    placeholder="Add tag..."
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        const tag = e.currentTarget.value.trim().toLowerCase();
                        if (tag && !activeTagFilters.includes(tag)) {
                          setActiveTagFilters(prev => [...prev, tag]);
                        }
                        e.currentTarget.value = '';
                      }
                    }}
                    className="px-3 py-1 bg-gray-900 border border-gray-700 rounded-full text-xs focus:outline-none focus:border-gray-600"
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Model Selector Modal */}
      {showModelSelector && (
        <div
          className="fixed inset-0 bg-black/80 flex items-end sm:items-center justify-center z-50"
          onClick={() => setShowModelSelector(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-gray-900 border border-gray-700 rounded-t-xl sm:rounded-xl p-6 max-w-2xl w-full max-h-[85vh] overflow-y-auto m-0 sm:m-4 animate-slide-up"
          >
            {/* Swipe indicator (mobile only) */}
            <div className="sm:hidden w-12 h-1 bg-gray-700 rounded-full mx-auto mb-4" />

            <h2 className="text-xl font-semibold mb-4">Select Model</h2>
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
      <UnifiedSearch isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />

      {/* Google Services Panel */}
      {showGoogleServices && (
        <GoogleServicesPanel onClose={() => setShowGoogleServices(false)} userId={currentUser} />
      )}

      {/* Confirm Dialog */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        message={confirmDialog.message}
        variant={confirmDialog.variant}
        onConfirm={confirmDialog.onConfirm}
        onCancel={() => setConfirmDialog({ ...confirmDialog, isOpen: false })}
      />

      {/* Keyboard Shortcuts Dialog */}
      <KeyboardShortcutsDialog
        open={showShortcutsDialog}
        onClose={() => setShowShortcutsDialog(false)}
        shortcuts={shortcuts}
      />

      {/* Context Menu */}
      <ContextMenu
        ref={contextMenu.menuRef}
        isVisible={contextMenu.isVisible}
        position={contextMenu.position}
        items={
          contextMenu.data?.message
            ? getMessageContextMenuItems(contextMenu.data.message, contextMenu.data.index)
            : contextMenu.data?.conversation
            ? getConversationContextMenuItems(contextMenu.data.conversation)
            : []
        }
        onClose={contextMenu.hideContextMenu}
      />
    </div>
  );
}
