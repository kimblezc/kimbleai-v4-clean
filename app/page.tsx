'use client';

import React, { useState, useEffect, useRef } from 'react';
import { signOut, useSession } from 'next-auth/react';
import { useConversations } from '@/hooks/useConversations';
import { useMessages } from '@/hooks/useMessages';
import { useProjects } from '@/hooks/useProjects';
import FormattedMessage from '../components/FormattedMessage';
import GoogleServicesPanel from '../components/GoogleServicesPanel';
import LoadingScreen from '../components/LoadingScreen';
import UnifiedSearch from '../components/search/UnifiedSearch';
import { ModelSelector, type AIModel } from '../components/model-selector/ModelSelector';
import D20Dice from '../components/D20Dice';
import versionData from '../version.json';
import { formatRelativeTime } from '@/lib/chat-utils';

const versionInfo = {
  version: versionData.version,
  commit: versionData.commit,
  lastUpdated: versionData.lastUpdated
};

// D&D facts for rotating display - mix of surface-level and deep lore
const DND_FACTS = [
  "The original D&D (1974) had only 3 character classes: Fighter, Magic-User, and Cleric.",
  "A natural 20 is called a 'critical success' - it automatically succeeds at nearly any task.",
  "The Deck of Many Things can grant wishes or instantly kill you - many DMs ban it entirely.",
  "Dungeons & Dragons was created by Gary Gygax and Dave Arneson in 1974 in Lake Geneva, Wisconsin.",
  "The Tarrasque, inspired by French folklore, is nearly indestructible with a CR of 30 in 5e.",
  "Beholders are xenophobic tyrants - each believes its own physical form is the only 'correct' one.",
  "The Blood War is an eternal conflict between demons (chaotic evil) and devils (lawful evil).",
  "A Dungeon Master's most powerful tool isn't dice - it's improvisation and player buy-in.",
  "Critical Role has raised over $11 million for charity and revolutionized actual-play content.",
  "The longest D&D campaign ever recorded lasted over 40 years with the same DM and players.",
  "Vecna began as a simple lich in Greyhawk and became a god - his hand and eye are legendary artifacts.",
  "The d20 system wasn't always core to D&D - early editions used d6s and percentile dice for most rolls.",
  "THAC0 (To Hit Armor Class 0) was the most confusing mechanic in AD&D 2e - lower numbers were better.",
  "The Drow were created by Gary Gygax for the D-series modules and became iconic dark elves.",
  "Planescape's city of Sigil sits at the center of the multiverse - even gods cannot enter uninvited.",
  "The Tomb of Horrors is Gary Gygax's deadliest dungeon - designed to kill overconfident players.",
  "Ravenloft started as a single Halloween adventure (I6) and became an entire gothic horror setting.",
  "The Lady of Pain rules Sigil - her mere presence can kill, and she has never spoken a word.",
  "Spelljammer lets you sail through space in magical ships - from the Forgotten Realms to Dark Sun.",
  "Bahamut, the Platinum Dragon god of good, sometimes walks among mortals disguised as an old man.",
];

// Shuffle helper function (outside component to avoid recreation)
const shuffleArray = (array: number[]) => {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

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
  // D&D facts rotation - shuffled queue for random non-repeating facts
  const factQueueRef = useRef(shuffleArray(Array.from({ length: DND_FACTS.length }, (_, i) => i)));
  const [currentFactIndex, setCurrentFactIndex] = useState(factQueueRef.current[0] || 0);

  const conversationsHook = useConversations(currentUser);
  const {
    currentConversationId,
    groupedConversations,
    selectConversation,
    createNewConversation,
    deleteConversation,
    togglePin,
    loading: conversationsLoading,
    loadConversations,
  } = conversationsHook;

  const messagesHook = useMessages(currentConversationId, currentUser, loadConversations);
  const { messages, sending, messagesEndRef, sendMessage, clearMessages } = messagesHook;

  const projectsHook = useProjects(currentUser);
  const { projects, currentProject, selectProject, updateProject, deleteProject } = projectsHook;

  // Rotate D&D facts every 8 seconds - random non-repeating using shuffled queue
  // MUST be called before early return to maintain consistent hook order
  useEffect(() => {
    const interval = setInterval(() => {
      // If queue is empty, refill with shuffled indices
      if (factQueueRef.current.length === 0) {
        factQueueRef.current = shuffleArray(Array.from({ length: DND_FACTS.length }, (_, i) => i));
      }

      // Get next fact from queue
      const nextIndex = factQueueRef.current.shift();
      if (nextIndex !== undefined) {
        setCurrentFactIndex(nextIndex);
      }
    }, 8000);

    return () => clearInterval(interval);
  }, []);

  if (status === 'loading' || status === 'unauthenticated') {
    return (
      <LoadingScreen
        message={status === 'loading' ? 'Loading KimbleAI...' : 'Redirecting to sign in...'}
        fullScreen={true}
      />
    );
  }

  const handleSendMessage = async () => {
    if (!input.trim() || sending) return;
    const messageContent = input;
    setInput('');
    await sendMessage(messageContent, {
      selectedModel,
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
        .d20-glow {
          position: relative;
          background: radial-gradient(circle at center, rgba(16, 185, 129, 0.2) 0%, rgba(16, 185, 129, 0.1) 30%, transparent 70%);
          box-shadow:
            0 0 20px rgba(16, 185, 129, 0.3),
            0 0 40px rgba(16, 185, 129, 0.15),
            0 0 60px rgba(16, 185, 129, 0.05);
        }

        @media (max-width: 768px) {
          .sidebar {
            position: fixed;
            left: ${isMobileSidebarOpen ? '0' : '-280px'};
            top: 0;
            bottom: 0;
            z-index: 1000;
            transition: left 0.3s ease;
          }
        }
      `}</style>

      {/* Mobile Menu Button */}
      <button
        onClick={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
        className="md:hidden fixed top-4 left-4 z-50 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm"
      >
        Menu
      </button>

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
            className="w-full py-2.5 px-4 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg text-sm font-medium transition-colors"
          >
            New chat
          </button>
        </div>

        {/* Search Button */}
        <div className="px-3 pb-2">
          <button
            onClick={() => setIsSearchOpen(true)}
            className="w-full py-2 px-4 bg-gray-900 hover:bg-gray-800 border border-gray-800 rounded-lg text-sm text-gray-400 text-left transition-colors"
          >
            Search...
          </button>
        </div>

        {/* Projects Section */}
        <div className="px-3 pb-2">
          <div className="text-xs text-gray-500 font-medium px-2 mb-2">PROJECTS</div>
          <div className="space-y-1">
            <button
              onClick={() => selectProject('')}
              className={`w-full py-1.5 px-3 rounded-md text-sm text-left transition-colors ${
                !currentProject ? 'bg-gray-800 text-white' : 'text-gray-400 hover:bg-gray-900'
              }`}
            >
              General
            </button>
            {projects.map(project => (
              <div key={project.id} className="flex items-center gap-1">
                <button
                  onClick={() => selectProject(project.id)}
                  className={`flex-1 py-1.5 px-3 rounded-md text-sm text-left transition-colors ${
                    currentProject === project.id ? 'bg-gray-800 text-white' : 'text-gray-400 hover:bg-gray-900'
                  }`}
                >
                  {project.name}
                </button>
                <button
                  onClick={() => {
                    if (confirm(`Delete project "${project.name}"?`)) {
                      deleteProject(project.id);
                    }
                  }}
                  className="p-1 text-gray-600 hover:text-red-500 text-xs"
                >
                  ×
                </button>
              </div>
            ))}
            <button
              onClick={() => {
                const name = prompt('Enter project name:');
                if (name) {
                  projectsHook.createProject({ name, status: 'active' });
                }
              }}
              className="w-full py-1.5 px-3 rounded-md text-sm text-left text-gray-500 hover:bg-gray-900 transition-colors"
            >
              + New project
            </button>
          </div>
        </div>

        {/* Conversations List */}
        <div className="flex-1 overflow-y-auto px-3">
          {Object.entries(groupedConversations).map(([group, convs]) => {
            if (convs.length === 0) return null;

            const sortedConvs = [...convs].sort((a, b) => {
              const dateA = (a?.updated_at || a?.created_at) ? new Date(a.updated_at || a.created_at).getTime() : 0;
              const dateB = (b?.updated_at || b?.created_at) ? new Date(b.updated_at || b.created_at).getTime() : 0;
              return dateB - dateA;
            });

            return (
              <div key={group} className="mb-4">
                <div className="text-xs text-gray-500 font-medium px-2 mb-2">{group.toUpperCase()}</div>
                {sortedConvs.map((conv) => (
                  <button
                    key={conv.id}
                    onClick={() => {
                      selectConversation(conv.id);
                      setIsMobileSidebarOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2 rounded-md mb-1 transition-colors ${
                      currentConversationId === conv.id
                        ? 'bg-gray-800 text-white'
                        : 'text-gray-400 hover:bg-gray-900'
                    }`}
                  >
                    <div className="text-sm truncate">{conv.title || 'Untitled conversation'}</div>
                    {(conv.updated_at || conv.created_at) && (
                      <div className="text-xs text-gray-600 mt-0.5">
                        {formatRelativeTime(conv.updated_at || conv.created_at)}
                      </div>
                    )}
                  </button>
                ))}
              </div>
            );
          })}
        </div>

        {/* Version Info */}
        <div className="p-3 border-t border-gray-900">
          <div className="text-xs text-gray-600 text-center">
            v{versionInfo.version} @ {versionInfo.commit}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="bg-gray-950 border-b border-gray-800 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="d20-glow rounded-full p-1">
              <D20Dice size={40} spinning={true} />
            </div>
            <div>
              <h1 className="text-lg font-semibold">KimbleAI</h1>
            </div>
          </div>

          {/* User Selector */}
          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg text-sm transition-colors"
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

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-4">
          {messages.length === 0 ? (
            <div className="text-center mt-32 max-w-2xl mx-auto px-8">
              <div className="text-lg text-gray-400 mb-3">{getGreeting()}</div>
              <div className="text-sm text-gray-600 italic leading-relaxed transition-opacity duration-500">
                "{DND_FACTS[currentFactIndex]}"
              </div>
            </div>
          ) : (
            <div className="max-w-3xl mx-auto space-y-6">
              {messages.map((msg, idx) => (
                <div key={idx} className="flex gap-4">
                  <div className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-sm ${
                    msg.role === 'user' ? 'bg-gray-700' : 'bg-gray-800'
                  }`}>
                    {msg.role === 'user' ? 'U' : 'AI'}
                  </div>
                  <div className="flex-1 pt-1">
                    <FormattedMessage content={msg.content} />
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
        </div>

        {/* Input Area */}
        <div className="border-t border-gray-800 bg-gray-950 p-4">
          <div className="max-w-3xl mx-auto">
            <div className="flex items-end gap-2">
              {/* Model Selector Button */}
              <button
                onClick={() => setShowModelSelector(!showModelSelector)}
                className="px-3 py-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg text-xs text-gray-400 transition-colors"
                title="Select model"
              >
                {selectedModel.replace('claude-', '').replace('gpt-', '')}
              </button>

              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                placeholder="Ask me anything..."
                disabled={sending}
                className="flex-1 px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-sm focus:outline-none focus:border-gray-600 transition-colors"
              />

              <button
                onClick={handleSendMessage}
                disabled={!input.trim() || sending}
                className={`px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                  input.trim() && !sending
                    ? 'bg-white text-black hover:bg-gray-200'
                    : 'bg-gray-800 text-gray-600 cursor-not-allowed'
                }`}
              >
                Send
              </button>
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
          className="fixed inset-0 bg-black/80 flex items-center justify-center z-50"
          onClick={() => setShowModelSelector(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-gray-900 border border-gray-700 rounded-lg p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto m-4"
          >
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
    </div>
  );
}
