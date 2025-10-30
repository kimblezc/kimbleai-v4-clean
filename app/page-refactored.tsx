'use client';

import React, { useState } from 'react';
import { signOut, useSession } from 'next-auth/react';
import { useConversations } from '@/hooks/useConversations';
import { useMessages } from '@/hooks/useMessages';
import { useProjects } from '@/hooks/useProjects';
import FormattedMessage from '../components/FormattedMessage';
import GoogleServicesPanel from '../components/GoogleServicesPanel';
import LoadingScreen from '../components/LoadingScreen';
import UnifiedSearch from '../components/search/UnifiedSearch';
import { ModelSelector, type AIModel } from '../components/model-selector/ModelSelector';
import versionData from '../version.json';

export default function Home() {
  const { data: session, status } = useSession();
  const [currentUser, setCurrentUser] = useState<'zach' | 'rebecca'>('zach');
  const [selectedModel, setSelectedModel] = useState<AIModel>('claude-sonnet-4-5');
  const [input, setInput] = useState('');
  const [showModelSelector, setShowModelSelector] = useState(false);
  const [showGoogleServices, setShowGoogleServices] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

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
  const { projects, currentProject, selectProject } = projectsHook;

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
      suggestedTags: [],
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
            return (
              <div key={group} style={{ marginBottom: '16px' }}>
                <div style={{ fontSize: '11px', color: '#888', marginBottom: '8px', textTransform: 'uppercase' }}>
                  {group}
                </div>
                {convs.map((conv) => (
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
                    }}
                  >
                    {conv.title || 'Untitled conversation'}
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
        <div style={{ fontSize: '10px', color: '#666', marginTop: '8px', textAlign: 'center' }}>
          v{versionData.version}
        </div>
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
          <h1 style={{ fontSize: '20px', fontWeight: '700' }}>KimbleAI</h1>
          <div style={{ display: 'flex', gap: '8px' }}>
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
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>💬</div>
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
          <div style={{ display: 'flex', gap: '8px' }}>
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
