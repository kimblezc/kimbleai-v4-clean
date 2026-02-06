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

import { useState, useEffect, Suspense } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import toast, { Toaster } from 'react-hot-toast';
import { Cog6ToothIcon, FolderIcon, XMarkIcon } from '@heroicons/react/24/outline';
import Sidebar from '@/components/layout/Sidebar';
import MessageList from '@/components/chat/MessageList';
import ChatInput from '@/components/chat/ChatInput';
import ModelSelector from '@/components/chat/ModelSelector';
import CostDisplay from '@/components/chat/CostDisplay';

// Inner component that uses useSearchParams
function ChatPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, status } = useSession();
  const [messages, setMessages] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedModel, setSelectedModel] = useState<string | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<any[]>([]);
  const [totalCost, setTotalCost] = useState(0);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [projects, setProjects] = useState<any[]>([]);

  // Get the active project name for display
  const activeProject = projects.find(p => p.id === activeProjectId);

  // Redirect if not authenticated
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/api/auth/signin');
    }
  }, [status, router]);

  // Initialize project context from URL params
  useEffect(() => {
    const projectIdFromUrl = searchParams.get('projectId');
    if (projectIdFromUrl) {
      setActiveProjectId(projectIdFromUrl);
    }
  }, [searchParams]);

  // Load projects for display
  useEffect(() => {
    if (status === 'authenticated') {
      loadProjects();
    }
  }, [status]);

  // Load conversations on mount and when project changes
  useEffect(() => {
    if (status === 'authenticated' && session?.user?.id) {
      loadConversations();
    }
  }, [status, session, activeProjectId]);

  // Load messages when conversation changes
  useEffect(() => {
    if (conversationId) {
      loadMessages(conversationId);
    }
  }, [conversationId]);

  const loadProjects = async () => {
    try {
      const response = await fetch('/api/projects');
      if (response.ok) {
        const data = await response.json();
        setProjects(data.projects || []);
      }
    } catch (error) {
      console.error('Failed to load projects:', error);
    }
  };

  const loadConversations = async () => {
    try {
      // Always load ALL conversations - Sidebar needs full list to show:
      // 1. Project chats (grouped under projects)
      // 2. Recent chats (unassociated with any project)
      const response = await fetch('/api/conversations');
      if (response.ok) {
        const data = await response.json();
        setConversations(data.conversations || []);

        // If no conversation selected, select based on active project filter
        if (!conversationId) {
          let relevantConversations = data.conversations || [];
          if (activeProjectId) {
            // If project is selected, prefer conversations from that project
            relevantConversations = relevantConversations.filter(
              (c: any) => c.project_id === activeProjectId
            );
          }
          if (relevantConversations.length > 0) {
            setConversationId(relevantConversations[0].id);
          } else {
            createConversation();
          }
        }
      }
    } catch (error) {
      console.error('Failed to load conversations:', error);
    }
  };

  const loadMessages = async (convId: string) => {
    try {
      const response = await fetch(`/api/conversations/${convId}/messages`);
      if (response.ok) {
        const data = await response.json();
        setMessages(data.messages || []);
      }
    } catch (error) {
      console.error('Failed to load messages:', error);
    }
  };

  const createConversation = async (projectId?: string | null) => {
    try {
      const response = await fetch('/api/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'New Chat',
          projectId: projectId ?? activeProjectId ?? undefined,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setConversationId(data.id);
        setMessages([]); // Clear messages for new conversation
        loadConversations(); // Reload conversation list
        toast.success('New conversation created', {
          style: {
            background: '#262626',
            color: '#fff',
            border: '1px solid #404040',
          },
        });
      }
    } catch (error) {
      console.error('Failed to create conversation:', error);
      toast.error('Failed to create conversation');
    }
  };

  // Handle project selection from sidebar
  const handleSelectProject = (projectId: string | null) => {
    setActiveProjectId(projectId);
    setConversationId(null); // Clear active conversation when changing project
    setMessages([]);
    // Update URL without full page reload
    if (projectId) {
      router.push(`/?projectId=${projectId}`, { scroll: false });
    } else {
      router.push('/', { scroll: false });
    }
  };

  // Clear project filter
  const clearProjectFilter = () => {
    handleSelectProject(null);
  };

  const switchConversation = (convId: string) => {
    setConversationId(convId);
    setMessages([]); // Clear messages while loading
  };

  const deleteConversation = async (convId: string) => {
    try {
      const response = await fetch(`/api/conversations/${convId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast.success('Conversation deleted', {
          style: {
            background: '#262626',
            color: '#fff',
            border: '1px solid #404040',
          },
        });
        // If deleting active conversation, switch to another
        if (convId === conversationId) {
          const remaining = conversations.filter(c => c.id !== convId);
          if (remaining.length > 0) {
            setConversationId(remaining[0].id);
          } else {
            createConversation();
          }
        }
        loadConversations();
      } else {
        throw new Error('Failed to delete');
      }
    } catch (error) {
      console.error('Failed to delete conversation:', error);
      toast.error('Failed to delete conversation');
    }
  };

  const renameConversation = async (convId: string, newTitle: string) => {
    try {
      const response = await fetch(`/api/conversations/${convId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newTitle }),
      });

      if (response.ok) {
        toast.success('Conversation renamed', {
          style: {
            background: '#262626',
            color: '#fff',
            border: '1px solid #404040',
          },
        });
        loadConversations();
      } else {
        throw new Error('Failed to rename');
      }
    } catch (error) {
      console.error('Failed to rename conversation:', error);
      toast.error('Failed to rename conversation');
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

    // Show thinking toast
    const thinkingToast = toast.loading('AI is thinking...', {
      style: {
        background: '#262626',
        color: '#fff',
        border: '1px solid #404040',
      },
    });

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
      let modelUsed = '';
      let providerUsed = '';

      const assistantMessageObj = {
        role: 'assistant' as const,
        content: '',
        timestamp: new Date(),
        model: undefined as string | undefined,
        provider: undefined as string | undefined,
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

                // Task 6: Capture model info at start of stream
                if (parsed.type === 'model_info') {
                  modelUsed = parsed.model;
                  providerUsed = parsed.provider;
                  setMessages(prev => {
                    const newMessages = [...prev];
                    newMessages[newMessages.length - 1].model = modelUsed;
                    newMessages[newMessages.length - 1].provider = providerUsed;
                    return newMessages;
                  });
                  continue;
                }

                // Handle cost info at end of stream
                if (parsed.type === 'cost_info' && parsed.costUsd) {
                  setTotalCost(prev => prev + parsed.costUsd);
                  continue;
                }

                if (parsed.content) {
                  assistantMessage += parsed.content;
                  setMessages(prev => {
                    const newMessages = [...prev];
                    newMessages[newMessages.length - 1].content = assistantMessage;
                    // Preserve model info
                    if (modelUsed) newMessages[newMessages.length - 1].model = modelUsed;
                    if (providerUsed) newMessages[newMessages.length - 1].provider = providerUsed;
                    return newMessages;
                  });
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
      toast.error('Failed to send message', {
        id: thinkingToast,
        style: {
          background: '#262626',
          color: '#fff',
          border: '1px solid #dc2626',
        },
      });
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
      toast.dismiss(thinkingToast);
    }
  };

  const handleModelChange = (model: string | null) => {
    setSelectedModel(model);
  };

  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-screen bg-neutral-950">
        <div className="text-lg text-neutral-400">Loading...</div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-neutral-950">
      <Toaster position="top-right" />

      {/* Unified Sidebar with conversations */}
      <Sidebar
        conversations={conversations}
        activeConversationId={conversationId}
        activeProjectId={activeProjectId}
        onSelectConversation={switchConversation}
        onSelectProject={handleSelectProject}
        onNewConversation={() => createConversation()}
        onDeleteConversation={deleteConversation}
        onRenameConversation={renameConversation}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col lg:ml-64">
        {/* Header */}
        <header className="flex items-center justify-between px-6 py-4 bg-neutral-900 border-b border-neutral-800">
          <div className="flex items-center gap-4">
            <ModelSelector
              selectedModel={selectedModel}
              onModelChange={handleModelChange}
            />

            {/* Active Project Indicator */}
            {activeProject && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-neutral-800 border border-neutral-700 rounded-lg">
                <FolderIcon className="w-4 h-4 text-neutral-400" />
                <span className="text-sm text-neutral-300 max-w-[150px] truncate">
                  {activeProject.name}
                </span>
                <button
                  onClick={clearProjectFilter}
                  className="p-0.5 text-neutral-500 hover:text-white hover:bg-neutral-700 rounded transition-colors"
                  title="Clear project filter"
                >
                  <XMarkIcon className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          <div className="flex items-center gap-4">
            <CostDisplay cost={totalCost} />
          </div>
        </header>

        {/* Main Chat Area */}
        <main className="flex-1 overflow-hidden bg-neutral-950">
          <MessageList messages={messages} isLoading={isLoading} />
        </main>

        {/* Input Area */}
        <footer className="border-t border-neutral-800 bg-neutral-900">
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

// Wrap with Suspense for useSearchParams
export default function ChatPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen bg-neutral-950">
        <div className="text-lg text-neutral-400">Loading...</div>
      </div>
    }>
      <ChatPageContent />
    </Suspense>
  );
}
