'use client';

import React, { useState, useEffect } from 'react';
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

// Dynamic version info - commit hash from Vercel environment
const versionInfo = {
  version: versionData.version,
  commit: process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA?.substring(0, 7) || versionData.commit || 'dev',
  lastUpdated: versionData.lastUpdated
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
  const [costStats, setCostStats] = useState<{
    hourly: { used: number; limit: number; percentage: number };
    daily: { used: number; limit: number; percentage: number };
    monthly: { used: number; limit: number; percentage: number };
  } | null>(null);

  // Load cost stats
  useEffect(() => {
    const loadCosts = async () => {
      if (!session) return;
      try {
        const response = await fetch(`/api/costs?action=summary&userId=${currentUser}`);
        const data = await response.json();
        if (!data.error) {
          setCostStats({
            hourly: data.hourly,
            daily: data.daily,
            monthly: data.monthly
          });
        }
      } catch (err) {
        console.error('Failed to load costs:', err);
      }
    };

    if (session) {
      loadCosts();
      const interval = setInterval(loadCosts, 60000); // Refresh every 60s
      return () => clearInterval(interval);
    }
  }, [session, currentUser]);

  // Custom hooks for state management
  const conversationsHook = useConversations(currentUser);
  const {
    currentConversationId,
    groupedConversations,
    selectConversation,
    createNewConversation,
    deleteConversation,
    togglePin,
    loading: conversationsLoading,
  } = conversationsHook;

  const messagesHook = useMessages(currentConversationId, currentUser);
  const { messages, sending, messagesEndRef, sendMessage, clearMessages } = messagesHook;

  const projectsHook = useProjects(currentUser);
  const { projects, currentProject, selectProject, updateProject, deleteProject } = projectsHook;

  // Show loading screen while checking authentication
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

  return (
    <div className="flex h-screen bg-gray-950 text-white font-sans">
      {/* Mobile Menu Button */}
      <button
        className="mobile-menu-btn"
        onClick={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
        style={{
          display: 'none',
          position: 'fixed',
          top: '16px',
          left: '16px',
          zIndex: 999,
          backgroundColor: '#2a2a2a',
          border: '1px solid #444',
          borderRadius: '6px',
          padding: '8px 12px',
          cursor: 'pointer',
          color: '#fff',
        }}
      >
        <span>☰ Menu</span>
      </button>

      {/* Sidebar Overlay (mobile) */}
      {isMobileSidebarOpen && (
        <div
          onClick={() => setIsMobileSidebarOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            zIndex: 999,
          }}
        />
      )}

      {/* Sidebar */}
      <div
        className={`sidebar ${isMobileSidebarOpen ? 'open' : ''}`}
        style={{
          width: '260px',
          backgroundColor: '#171717',
          borderRight: '1px solid #333',
          display: 'flex',
          flexDirection: 'column',
          padding: '16px',
        }}
      >
        {/* New Chat Button */}
        <button
          onClick={handleNewChat}
          style={{
            padding: '12px',
            backgroundColor: '#8b5cf6',
            color: '#fff',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: '600',
            marginBottom: '16px',
          }}
        >
          ➕ New Chat
        </button>

        {/* Conversations List */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {Object.entries(groupedConversations).map(([group, convs]) => {
            if (convs.length === 0) return null;

            // Sort conversations within group by updated_at (newest first)
            const sortedConvs = [...convs].sort((a, b) => {
              const dateA = (a?.updated_at || a?.created_at) ? new Date(a.updated_at || a.created_at).getTime() : 0;
              const dateB = (b?.updated_at || b?.created_at) ? new Date(b.updated_at || b.created_at).getTime() : 0;
              return dateB - dateA; // Newest first
            });

            return (
              <div key={group} style={{ marginBottom: '16px' }}>
                <div style={{ fontSize: '11px', color: '#888', marginBottom: '8px', textTransform: 'uppercase' }}>
                  {group}
                </div>
                {sortedConvs.map((conv) => (
                  <div
                    key={conv.id}
                    onClick={() => {
                      selectConversation(conv.id);
                      setIsMobileSidebarOpen(false);
                    }}
                    style={{
                      padding: '10px',
                      backgroundColor: currentConversationId === conv.id ? '#2a2a2a' : 'transparent',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      marginBottom: '4px',
                      fontSize: '13px',
                      transition: 'background-color 0.2s',
                    }}
                  >
                    <div style={{ fontWeight: 500, marginBottom: '4px' }}>
                      {conv.title || 'Untitled conversation'}
                    </div>
                    {(conv.updated_at || conv.created_at) && (
                      <div style={{ fontSize: '11px', color: '#888' }}>
                        {formatRelativeTime(conv.updated_at || conv.created_at)}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            );
          })}
        </div>

        {/* User Selector */}
        <div style={{ borderTop: '1px solid #333', paddingTop: '12px', marginTop: '12px' }}>
          <select
            value={currentUser}
            onChange={(e) => setCurrentUser(e.target.value as 'zach' | 'rebecca')}
            style={{
              width: '100%',
              padding: '8px',
              backgroundColor: '#2a2a2a',
              color: '#fff',
              border: '1px solid #444',
              borderRadius: '6px',
              fontSize: '12px',
            }}
          >
            <option value="zach">Zach</option>
            <option value="rebecca">Rebecca</option>
          </select>
        </div>

        {/* Version Info */}
        <div
          style={{
            fontSize: '10px',
            color: '#10b981',
            marginTop: '8px',
            textAlign: 'center',
            padding: '4px',
            backgroundColor: '#1a1a1a',
            border: '1px solid #10b981',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
          title={`Version ${versionInfo.version} - Commit ${versionInfo.commit}\nUpdated: ${new Date(versionInfo.lastUpdated).toLocaleString()}`}
        >
          <div>v{versionInfo.version} @ {versionInfo.commit}</div>
        </div>

        {/* Cost Tracker */}
        {session && costStats && (() => {
          const isExceeded = costStats.hourly.percentage >= 100 ||
                            costStats.daily.percentage >= 100 ||
                            costStats.monthly.percentage >= 100;
          return (
            <div
              onClick={() => window.location.href = '/costs'}
              style={{
                marginTop: '8px',
                padding: '4px 6px',
                backgroundColor: isExceeded ? '#7f1d1d' : '#2a2a2a',
                border: `1px solid ${isExceeded ? '#ef4444' : '#10b981'}`,
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '10px'
              }}
              title={`Hourly: ${costStats.hourly.percentage.toFixed(0)}%\nDaily: ${costStats.daily.percentage.toFixed(0)}%\nMonthly: ${costStats.monthly.percentage.toFixed(0)}%`}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
                <span style={{ color: '#666' }}>Hr:</span>
                <span style={{ color: isExceeded ? '#fca5a5' : '#ccc' }}>${costStats.hourly.used.toFixed(2)}/${costStats.hourly.limit.toFixed(0)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
                <span style={{ color: '#666' }}>Day:</span>
                <span style={{ color: isExceeded ? '#fca5a5' : '#ccc' }}>${costStats.daily.used.toFixed(2)}/${costStats.daily.limit.toFixed(0)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#666' }}>Mon:</span>
                <span style={{ color: isExceeded ? '#fca5a5' : '#ccc' }}>${costStats.monthly.used.toFixed(2)}/${costStats.monthly.limit.toFixed(0)}</span>
              </div>
            </div>
          );
        })()}
      </div>

      {/* Main Content */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {/* Header */}
        <div
          style={{
            padding: '16px',
            borderBottom: '1px solid #333',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <D20Dice size={48} spinning={true} />
            <h1 style={{ fontSize: '20px', fontWeight: '700' }}>KimbleAI</h1>
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            {/* Project Selector */}
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => setShowProjectDropdown(!showProjectDropdown)}
                style={{
                  padding: '8px 12px',
                  backgroundColor: '#2a2a2a',
                  border: '1px solid #444',
                  borderRadius: '6px',
                  color: '#fff',
                  cursor: 'pointer',
                  fontSize: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                📁 {projects.find(p => p.id === currentProject)?.name || 'General'}
                <span style={{ fontSize: '10px' }}>▼</span>
              </button>
              {showProjectDropdown && (
                <div
                  style={{
                    position: 'absolute',
                    top: '100%',
                    right: 0,
                    marginTop: '4px',
                    backgroundColor: '#1a1a1a',
                    border: '1px solid #444',
                    borderRadius: '8px',
                    minWidth: '200px',
                    maxHeight: '300px',
                    overflowY: 'auto',
                    zIndex: 100,
                    boxShadow: '0 4px 6px rgba(0,0,0,0.3)'
                  }}
                >
                  <div
                    onClick={() => {
                      selectProject('');
                      setShowProjectDropdown(false);
                    }}
                    style={{
                      padding: '10px 12px',
                      cursor: 'pointer',
                      backgroundColor: !currentProject ? '#2a2a2a' : 'transparent',
                      borderBottom: '1px solid #333',
                      fontSize: '13px'
                    }}
                  >
                    📁 General
                  </div>
                  {projects.map(project => (
                    <div
                      key={project.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '10px 12px',
                        backgroundColor: currentProject === project.id ? '#2a2a2a' : 'transparent',
                        borderBottom: '1px solid #333',
                        fontSize: '13px'
                      }}
                    >
                      <div
                        onClick={() => {
                          selectProject(project.id);
                          setShowProjectDropdown(false);
                        }}
                        style={{
                          flex: 1,
                          cursor: 'pointer'
                        }}
                      >
                        📁 {project.name}
                      </div>
                      <div style={{ display: 'flex', gap: '4px' }}>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            const newName = prompt('Enter new project name:', project.name);
                            if (newName && newName !== project.name) {
                              updateProject(project.id, { name: newName });
                            }
                          }}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: '#888',
                            cursor: 'pointer',
                            fontSize: '12px',
                            padding: '2px 4px'
                          }}
                          title="Rename project"
                        >
                          ✏️
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (confirm(`Delete project "${project.name}"? This will also delete all associated conversations.`)) {
                              deleteProject(project.id);
                              setShowProjectDropdown(false);
                            }
                          }}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: '#ff4444',
                            cursor: 'pointer',
                            fontSize: '12px',
                            padding: '2px 4px'
                          }}
                          title="Delete project"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  ))}
                  <div
                    onClick={() => {
                      const name = prompt('Enter project name:');
                      if (name) {
                        projectsHook.createProject({ name, status: 'active' });
                      }
                      setShowProjectDropdown(false);
                    }}
                    style={{
                      padding: '10px 12px',
                      cursor: 'pointer',
                      color: '#4a9eff',
                      fontSize: '13px'
                    }}
                  >
                    ➕ Create New Project
                  </div>
                </div>
              )}
            </div>
            <button
              onClick={() => setIsSearchOpen(true)}
              style={{
                padding: '8px 12px',
                backgroundColor: '#2a2a2a',
                border: '1px solid #444',
                borderRadius: '6px',
                color: '#fff',
                cursor: 'pointer',
                fontSize: '12px',
              }}
            >
              🔍 Search
            </button>
            <button
              onClick={() => setShowModelSelector(!showModelSelector)}
              style={{
                padding: '8px 12px',
                backgroundColor: '#2a2a2a',
                border: '1px solid #444',
                borderRadius: '6px',
                color: '#fff',
                cursor: 'pointer',
                fontSize: '12px',
              }}
            >
              {selectedModel.startsWith('gpt') ? '⚡' : '🧠'} {selectedModel}
            </button>
          </div>
        </div>

        {/* Messages Area */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
          }}
        >
          {messages.length === 0 ? (
            <div style={{ textAlign: 'center', marginTop: '100px', color: '#666' }}>
              <div style={{ fontSize: '18px', fontWeight: '600', marginBottom: '8px' }}>Start a conversation</div>
              <div style={{ fontSize: '14px' }}>Ask me anything!</div>
            </div>
          ) : (
            messages.map((msg, idx) => (
              <div
                key={idx}
                style={{
                  display: 'flex',
                  gap: '12px',
                  alignItems: 'flex-start',
                }}
              >
                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    backgroundColor: msg.role === 'user' ? '#8b5cf6' : '#2a2a2a',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '14px',
                    flexShrink: 0,
                  }}
                >
                  {msg.role === 'user' ? '👤' : '🤖'}
                </div>
                <div style={{ flex: 1 }}>
                  <FormattedMessage content={msg.content} />
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div style={{ padding: '16px', borderTop: '1px solid #333' }}>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end' }}>
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
              placeholder="Type a message..."
              disabled={sending}
              style={{
                flex: 1,
                padding: '12px 16px',
                backgroundColor: '#2a2a2a',
                border: '1px solid #444',
                borderRadius: '8px',
                color: '#fff',
                fontSize: '14px',
                outline: 'none',
              }}
            />
            <button
              onClick={() => setShowTags(!showTags)}
              style={{
                padding: '12px',
                backgroundColor: showTags ? '#8b5cf6' : '#2a2a2a',
                border: '1px solid #444',
                borderRadius: '8px',
                color: '#fff',
                cursor: 'pointer',
                fontSize: '14px',
              }}
              title="Toggle tags"
            >
              🏷️
            </button>
            <button
              onClick={handleSendMessage}
              disabled={!input.trim() || sending}
              style={{
                padding: '12px 24px',
                backgroundColor: input.trim() && !sending ? '#8b5cf6' : '#444',
                border: 'none',
                borderRadius: '8px',
                color: '#fff',
                cursor: input.trim() && !sending ? 'pointer' : 'not-allowed',
                fontSize: '14px',
                fontWeight: '600',
              }}
            >
              {sending ? '⏳' : '➤'}
            </button>
          </div>

          {/* Tag Input/Display */}
          {showTags && (
            <div style={{ marginTop: '12px' }}>
              <div style={{ fontSize: '12px', color: '#888', marginBottom: '8px' }}>
                Add tags for this conversation:
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {activeTagFilters.map((tag, index) => (
                  <span
                    key={index}
                    style={{
                      padding: '4px 8px',
                      backgroundColor: '#8b5cf6',
                      border: '1px solid #8b5cf6',
                      borderRadius: '12px',
                      fontSize: '11px',
                      color: '#000',
                      cursor: 'pointer',
                      fontWeight: '600',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                    onClick={() => {
                      setActiveTagFilters(prev => prev.filter(t => t !== tag));
                    }}
                  >
                    #{tag}
                    <span style={{ fontSize: '10px' }}>✕</span>
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
                  style={{
                    padding: '4px 8px',
                    backgroundColor: '#2a2a2a',
                    border: '1px solid #444',
                    borderRadius: '12px',
                    fontSize: '11px',
                    color: '#fff',
                    outline: 'none',
                    minWidth: '100px'
                  }}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Model Selector Modal */}
      {showModelSelector && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
          onClick={() => setShowModelSelector(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: '#1a1a1a',
              borderRadius: '12px',
              padding: '24px',
              maxWidth: '600px',
              width: '90%',
              maxHeight: '80vh',
              overflowY: 'auto',
            }}
          >
            <h2 style={{ marginBottom: '20px', fontSize: '24px' }}>Select AI Model</h2>
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
