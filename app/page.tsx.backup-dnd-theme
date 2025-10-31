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
    loadConversations,
  } = conversationsHook;

  const messagesHook = useMessages(currentConversationId, currentUser, loadConversations);
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
    <div className="flex h-screen bg-gray-950 text-white font-sans relative overflow-hidden">
      {/* D&D-themed Animated Background */}
      <style jsx>{`
        @keyframes shimmer {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }

        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }

        @keyframes glow {
          0%, 100% { box-shadow: 0 0 5px rgba(139, 92, 246, 0.3), 0 0 10px rgba(139, 92, 246, 0.2); }
          50% { box-shadow: 0 0 15px rgba(139, 92, 246, 0.5), 0 0 25px rgba(139, 92, 246, 0.3), 0 0 35px rgba(139, 92, 246, 0.1); }
        }

        @keyframes pulse-glow {
          0%, 100% { box-shadow: 0 0 10px rgba(139, 92, 246, 0.4); }
          50% { box-shadow: 0 0 20px rgba(139, 92, 246, 0.7), 0 0 30px rgba(139, 92, 246, 0.4); }
        }

        @keyframes rune-rotate {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        @keyframes d20-spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        @keyframes mystical-pulse {
          0%, 100% {
            transform: scale(1);
            opacity: 1;
          }
          50% {
            transform: scale(1.05);
            opacity: 0.8;
          }
        }

        @keyframes rune-float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          25% { transform: translateY(-10px) rotate(5deg); }
          50% { transform: translateY(-5px) rotate(-5deg); }
          75% { transform: translateY(-12px) rotate(3deg); }
        }

        @keyframes divination-glow {
          0%, 100% {
            box-shadow: 0 0 20px rgba(139, 92, 246, 0.4),
                        0 0 40px rgba(168, 85, 247, 0.2),
                        inset 0 0 20px rgba(139, 92, 246, 0.1);
          }
          50% {
            box-shadow: 0 0 30px rgba(139, 92, 246, 0.6),
                        0 0 60px rgba(168, 85, 247, 0.4),
                        0 0 80px rgba(147, 51, 234, 0.2),
                        inset 0 0 30px rgba(139, 92, 246, 0.2);
          }
        }

        .fantasy-bg {
          background: linear-gradient(135deg,
            #0a0a0f 0%,
            #1a0f2e 25%,
            #0d0221 50%,
            #1a0f2e 75%,
            #0a0a0f 100%);
          background-size: 400% 400%;
          animation: shimmer 20s ease infinite;
        }

        .mystical-pattern {
          position: absolute;
          inset: 0;
          opacity: 0.03;
          background-image:
            radial-gradient(circle at 20% 30%, rgba(139, 92, 246, 0.1) 0%, transparent 50%),
            radial-gradient(circle at 80% 70%, rgba(168, 85, 247, 0.1) 0%, transparent 50%),
            radial-gradient(circle at 40% 80%, rgba(147, 51, 234, 0.1) 0%, transparent 50%);
          pointer-events: none;
        }

        .fantasy-border {
          border: 2px solid transparent;
          background: linear-gradient(#1a1a1a, #1a1a1a) padding-box,
                      linear-gradient(135deg, rgba(139, 92, 246, 0.3), rgba(168, 85, 247, 0.2), rgba(139, 92, 246, 0.3)) border-box;
        }

        .scroll-frame {
          position: relative;
          background: linear-gradient(135deg, #1a1a1a 0%, #171717 100%);
          border: 2px solid transparent;
          background-clip: padding-box;
        }

        .scroll-frame::before {
          content: '';
          position: absolute;
          inset: -2px;
          background: linear-gradient(135deg, rgba(139, 92, 246, 0.4), rgba(168, 85, 247, 0.3), rgba(139, 92, 246, 0.4));
          border-radius: inherit;
          z-index: -1;
        }

        .magical-glow {
          animation: glow 3s ease-in-out infinite;
        }

        .message-container {
          background: rgba(26, 26, 26, 0.6);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(139, 92, 246, 0.2);
          border-radius: 12px;
          padding: 16px;
          transition: all 0.3s ease;
        }

        .message-container:hover {
          background: rgba(26, 26, 26, 0.8);
          border-color: rgba(139, 92, 246, 0.4);
          transform: translateY(-2px);
          box-shadow: 0 8px 16px rgba(139, 92, 246, 0.1);
        }

        .mystical-input {
          background: linear-gradient(135deg, rgba(26, 26, 26, 0.8) 0%, rgba(42, 42, 42, 0.8) 100%);
          border: 2px solid rgba(139, 92, 246, 0.3);
          transition: all 0.3s ease;
        }

        .mystical-input:focus {
          border-color: rgba(139, 92, 246, 0.6);
          box-shadow: 0 0 20px rgba(139, 92, 246, 0.2), inset 0 0 10px rgba(139, 92, 246, 0.1);
          outline: none;
        }

        .rune-divider {
          height: 1px;
          background: linear-gradient(90deg,
            transparent 0%,
            rgba(139, 92, 246, 0.3) 20%,
            rgba(168, 85, 247, 0.5) 50%,
            rgba(139, 92, 246, 0.3) 80%,
            transparent 100%);
          position: relative;
        }

        .rune-divider::before,
        .rune-divider::after {
          content: '◆';
          position: absolute;
          top: 50%;
          transform: translateY(-50%);
          color: rgba(139, 92, 246, 0.5);
          font-size: 8px;
        }

        .rune-divider::before {
          left: 10px;
        }

        .rune-divider::after {
          right: 10px;
        }

        .fantasy-button {
          background: linear-gradient(135deg, rgba(139, 92, 246, 0.2) 0%, rgba(168, 85, 247, 0.3) 100%);
          border: 1px solid rgba(139, 92, 246, 0.4);
          transition: all 0.3s ease;
          position: relative;
          overflow: hidden;
        }

        .fantasy-button::before {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(135deg, rgba(255, 255, 255, 0.1) 0%, transparent 100%);
          opacity: 0;
          transition: opacity 0.3s ease;
        }

        .fantasy-button:hover::before {
          opacity: 1;
        }

        .fantasy-button:hover {
          border-color: rgba(139, 92, 246, 0.7);
          box-shadow: 0 0 15px rgba(139, 92, 246, 0.3);
          transform: translateY(-2px);
        }

        .sidebar-enchanted {
          background: linear-gradient(135deg, #0a0a0f 0%, #1a0f2e 50%, #0d0221 100%);
          border-right: 2px solid rgba(139, 92, 246, 0.3);
          box-shadow: 4px 0 20px rgba(139, 92, 246, 0.1);
        }

        .conversation-item {
          background: rgba(26, 26, 26, 0.4);
          border: 1px solid transparent;
          transition: all 0.3s ease;
        }

        .conversation-item:hover {
          background: rgba(42, 42, 42, 0.6);
          border-color: rgba(139, 92, 246, 0.3);
          transform: translateX(4px);
          box-shadow: 0 4px 8px rgba(139, 92, 246, 0.1);
        }

        .conversation-item.active {
          background: rgba(139, 92, 246, 0.2);
          border-color: rgba(139, 92, 246, 0.5);
        }

        .header-enchanted {
          background: linear-gradient(180deg, rgba(26, 26, 26, 0.95) 0%, rgba(23, 23, 23, 0.95) 100%);
          border-bottom: 2px solid rgba(139, 92, 246, 0.3);
          backdrop-filter: blur(10px);
        }

        .enchanted-dropdown {
          background: linear-gradient(135deg, #1a1a1a 0%, #0d0221 100%);
          border: 2px solid rgba(139, 92, 246, 0.4);
          box-shadow: 0 8px 24px rgba(139, 92, 246, 0.2);
        }

        .dropdown-item {
          background: rgba(26, 26, 26, 0.4);
          border-bottom: 1px solid rgba(139, 92, 246, 0.2);
          transition: all 0.3s ease;
        }

        .dropdown-item:hover {
          background: rgba(139, 92, 246, 0.2);
          border-color: rgba(139, 92, 246, 0.4);
          transform: translateX(4px);
        }

        .version-badge {
          background: linear-gradient(135deg, rgba(16, 185, 129, 0.2) 0%, rgba(5, 150, 105, 0.2) 100%);
          border: 1px solid rgba(16, 185, 129, 0.5);
          transition: all 0.3s ease;
        }

        .version-badge:hover {
          background: linear-gradient(135deg, rgba(16, 185, 129, 0.3) 0%, rgba(5, 150, 105, 0.3) 100%);
          box-shadow: 0 0 15px rgba(16, 185, 129, 0.3);
        }

        /* Mobile Responsiveness */
        @media (max-width: 768px) {
          .mobile-menu-btn {
            display: block !important;
          }

          .sidebar {
            position: fixed;
            left: -280px;
            top: 0;
            bottom: 0;
            z-index: 1000;
            transition: left 0.3s ease;
          }

          .sidebar.open {
            left: 0;
          }
        }
      `}</style>

      {/* Mystical Background Pattern Layer */}
      <div className="fantasy-bg absolute inset-0" />
      <div className="mystical-pattern" />

      {/* Mobile Menu Button - Enhanced */}
      <button
        className="mobile-menu-btn"
        onClick={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
        style={{
          display: 'none',
          position: 'fixed',
          top: '16px',
          left: '16px',
          zIndex: 999,
          background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.3), rgba(168, 85, 247, 0.3))',
          border: '2px solid rgba(139, 92, 246, 0.5)',
          borderRadius: '8px',
          padding: '10px 14px',
          cursor: 'pointer',
          color: '#fff',
          fontWeight: '600',
          boxShadow: '0 4px 12px rgba(139, 92, 246, 0.2)',
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

      {/* Sidebar - Enhanced with D&D theme */}
      <div
        className={`sidebar sidebar-enchanted ${isMobileSidebarOpen ? 'open' : ''}`}
        style={{
          width: '260px',
          display: 'flex',
          flexDirection: 'column',
          padding: '16px',
          position: 'relative',
          zIndex: 10,
        }}
      >
        {/* New Chat Button - Magical Enhancement */}
        <button
          onClick={handleNewChat}
          className="magical-glow"
          style={{
            padding: '14px',
            background: 'linear-gradient(135deg, #8b5cf6 0%, #a855f7 100%)',
            color: '#fff',
            border: '2px solid rgba(168, 85, 247, 0.5)',
            borderRadius: '10px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: '700',
            marginBottom: '16px',
            position: 'relative',
            overflow: 'hidden',
            transition: 'all 0.3s ease',
            textShadow: '0 2px 4px rgba(0, 0, 0, 0.3)',
          }}
        >
          <span style={{ position: 'relative', zIndex: 1 }}>✨ New Quest</span>
        </button>

        {/* Mystical Divider */}
        <div className="rune-divider" style={{ marginBottom: '16px' }} />

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
              <div key={group} style={{ marginBottom: '20px' }}>
                {/* Fantasy-styled group header */}
                <div style={{
                  fontSize: '11px',
                  color: '#a78bfa',
                  marginBottom: '10px',
                  textTransform: 'uppercase',
                  letterSpacing: '1.5px',
                  fontWeight: '700',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <span style={{ color: 'rgba(139, 92, 246, 0.5)' }}>⟡</span>
                  {group}
                  <span style={{ color: 'rgba(139, 92, 246, 0.5)' }}>⟡</span>
                </div>
                {sortedConvs.map((conv) => (
                  <div
                    key={conv.id}
                    onClick={() => {
                      selectConversation(conv.id);
                      setIsMobileSidebarOpen(false);
                    }}
                    className={`conversation-item ${currentConversationId === conv.id ? 'active' : ''}`}
                    style={{
                      padding: '12px',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      marginBottom: '6px',
                      fontSize: '13px',
                    }}
                  >
                    <div style={{
                      fontWeight: 600,
                      marginBottom: '4px',
                      color: currentConversationId === conv.id ? '#c4b5fd' : '#e5e7eb'
                    }}>
                      {currentConversationId === conv.id ? '📜 ' : '📖 '}
                      {conv.title || 'Untitled Quest'}
                    </div>
                    {(conv.updated_at || conv.created_at) && (
                      <div style={{
                        fontSize: '11px',
                        color: currentConversationId === conv.id ? '#a78bfa' : '#888',
                        fontStyle: 'italic'
                      }}>
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

        {/* Mystical divider before version */}
        <div className="rune-divider" style={{ marginBottom: '12px', marginTop: '12px' }} />

        {/* Version Info - Enhanced */}
        <div
          className="version-badge"
          style={{
            fontSize: '10px',
            color: '#10b981',
            marginTop: '8px',
            textAlign: 'center',
            padding: '6px 8px',
            borderRadius: '6px',
            cursor: 'pointer',
            fontWeight: '600',
            letterSpacing: '0.5px'
          }}
          title={`Version ${versionInfo.version} - Commit ${versionInfo.commit}\nUpdated: ${new Date(versionInfo.lastUpdated).toLocaleString()}`}
        >
          <div>⟡ v{versionInfo.version} @ {versionInfo.commit} ⟡</div>
        </div>

        {/* Cost Tracker - Enhanced with D&D Theme */}
        {session && (
          <div
            onClick={() => window.location.href = '/costs'}
            style={{
              marginTop: '8px',
              padding: '10px 12px',
              background: costStats
                ? (costStats.hourly.percentage >= 100 || costStats.daily.percentage >= 100 || costStats.monthly.percentage >= 100
                  ? 'linear-gradient(135deg, rgba(127, 29, 29, 0.8) 0%, rgba(153, 27, 27, 0.8) 100%)'
                  : 'linear-gradient(135deg, rgba(42, 42, 42, 0.9) 0%, rgba(26, 26, 26, 0.9) 100%)')
                : 'linear-gradient(135deg, rgba(42, 42, 42, 0.9) 0%, rgba(26, 26, 26, 0.9) 100%)',
              border: costStats
                ? `2px solid ${(costStats.hourly.percentage >= 100 || costStats.daily.percentage >= 100 || costStats.monthly.percentage >= 100) ? 'rgba(239, 68, 68, 0.6)' : 'rgba(255, 215, 0, 0.5)'}`
                : '2px solid rgba(139, 92, 246, 0.3)',
              borderRadius: '8px',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              boxShadow: costStats
                ? ((costStats.hourly.percentage >= 100 || costStats.daily.percentage >= 100 || costStats.monthly.percentage >= 100)
                  ? '0 0 15px rgba(239, 68, 68, 0.3)'
                  : '0 0 15px rgba(255, 215, 0, 0.2)')
                : '0 0 10px rgba(139, 92, 246, 0.2)',
            }}
            title={costStats
              ? `Hourly: ${costStats.hourly.percentage.toFixed(0)}%\nDaily: ${costStats.daily.percentage.toFixed(0)}%\nMonthly: ${costStats.monthly.percentage.toFixed(0)}%`
              : 'Loading quest funds...'
            }
          >
            {/* Gold Pouch Header */}
            <div style={{
              fontSize: '11px',
              color: '#ffd700',
              marginBottom: '8px',
              fontWeight: '700',
              letterSpacing: '0.5px',
              textAlign: 'center',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px'
            }}>
              <span>💰</span>
              <span>QUEST FUNDS</span>
              <span>💰</span>
            </div>

            {costStats ? (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span style={{ color: '#999', fontSize: '11px', fontWeight: '600' }}>Hourly:</span>
                  <span style={{
                    color: (costStats.hourly.percentage >= 100) ? '#fca5a5' : '#e5e7eb',
                    fontSize: '11px',
                    fontWeight: '700'
                  }}>
                    ${costStats.hourly.used.toFixed(2)} / ${costStats.hourly.limit.toFixed(0)}
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span style={{ color: '#999', fontSize: '11px', fontWeight: '600' }}>Daily:</span>
                  <span style={{
                    color: (costStats.daily.percentage >= 100) ? '#fca5a5' : '#e5e7eb',
                    fontSize: '11px',
                    fontWeight: '700'
                  }}>
                    ${costStats.daily.used.toFixed(2)} / ${costStats.daily.limit.toFixed(0)}
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#999', fontSize: '11px', fontWeight: '600' }}>Monthly:</span>
                  <span style={{
                    color: (costStats.monthly.percentage >= 100) ? '#fca5a5' : '#e5e7eb',
                    fontSize: '11px',
                    fontWeight: '700'
                  }}>
                    ${costStats.monthly.used.toFixed(2)} / ${costStats.monthly.limit.toFixed(0)}
                  </span>
                </div>

                {/* Progress Bar */}
                <div style={{
                  marginTop: '8px',
                  height: '4px',
                  background: 'rgba(0, 0, 0, 0.3)',
                  borderRadius: '2px',
                  overflow: 'hidden'
                }}>
                  <div style={{
                    height: '100%',
                    width: `${Math.min(costStats.daily.percentage, 100)}%`,
                    background: costStats.daily.percentage >= 100
                      ? 'linear-gradient(90deg, #ef4444, #dc2626)'
                      : costStats.daily.percentage >= 80
                      ? 'linear-gradient(90deg, #fbbf24, #f59e0b)'
                      : 'linear-gradient(90deg, #10b981, #059669)',
                    transition: 'width 0.5s ease',
                    boxShadow: '0 0 8px rgba(255, 255, 255, 0.3)'
                  }} />
                </div>
              </>
            ) : (
              <div style={{
                textAlign: 'center',
                color: '#a78bfa',
                fontSize: '10px',
                fontStyle: 'italic',
                padding: '4px'
              }}>
                Loading gold count...
              </div>
            )}
          </div>
        )}
      </div>

      {/* Main Content */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative', zIndex: 1 }}>
        {/* Header - Enhanced with D&D theme */}
        <div
          className="header-enchanted"
          style={{
            padding: '20px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            position: 'relative',
          }}
        >
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            position: 'relative'
          }}>
            {/* Enhanced D20 with magical aura */}
            <div style={{
              position: 'relative',
              padding: '4px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.2), rgba(168, 85, 247, 0.2))',
              boxShadow: '0 0 20px rgba(139, 92, 246, 0.4), inset 0 0 10px rgba(139, 92, 246, 0.2)',
            }}>
              <D20Dice size={52} spinning={true} />
            </div>
            <div>
              <h1 style={{
                fontSize: '24px',
                fontWeight: '800',
                background: 'linear-gradient(135deg, #e0d5ff 0%, #a78bfa 50%, #8b5cf6 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                letterSpacing: '0.5px',
                textShadow: '0 2px 10px rgba(139, 92, 246, 0.3)',
              }}>
                KimbleAI
              </h1>
              <div style={{
                fontSize: '10px',
                color: '#a78bfa',
                fontStyle: 'italic',
                marginTop: '2px',
                letterSpacing: '1px'
              }}>
                ⟡ Your Digital Dungeon Master ⟡
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            {/* Project Selector */}
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => setShowProjectDropdown(!showProjectDropdown)}
                className="fantasy-button"
                style={{
                  padding: '10px 14px',
                  borderRadius: '8px',
                  color: '#e0d5ff',
                  cursor: 'pointer',
                  fontSize: '12px',
                  fontWeight: '600',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                📁 {projects.find(p => p.id === currentProject)?.name || 'General'}
                <span style={{ fontSize: '10px' }}>▼</span>
              </button>
              {showProjectDropdown && (
                <div
                  className="enchanted-dropdown"
                  style={{
                    position: 'absolute',
                    top: '100%',
                    right: 0,
                    marginTop: '8px',
                    borderRadius: '12px',
                    minWidth: '220px',
                    maxHeight: '320px',
                    overflowY: 'auto',
                    zIndex: 100,
                  }}
                >
                  <div
                    onClick={() => {
                      selectProject('');
                      setShowProjectDropdown(false);
                    }}
                    className="dropdown-item"
                    style={{
                      padding: '12px 14px',
                      cursor: 'pointer',
                      backgroundColor: !currentProject ? 'rgba(139, 92, 246, 0.2)' : 'transparent',
                      fontSize: '13px',
                      fontWeight: '600',
                      color: '#e0d5ff'
                    }}
                  >
                    📁 General
                  </div>
                  {projects.map(project => (
                    <div
                      key={project.id}
                      className="dropdown-item"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '12px 14px',
                        backgroundColor: currentProject === project.id ? 'rgba(139, 92, 246, 0.2)' : 'transparent',
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
                          cursor: 'pointer',
                          fontWeight: '600',
                          color: '#e0d5ff'
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
                      const name = prompt('Enter quest name:');
                      if (name) {
                        projectsHook.createProject({ name, status: 'active' });
                      }
                      setShowProjectDropdown(false);
                    }}
                    className="dropdown-item"
                    style={{
                      padding: '12px 14px',
                      cursor: 'pointer',
                      color: '#a78bfa',
                      fontSize: '13px',
                      fontWeight: '700',
                      borderTop: '2px solid rgba(139, 92, 246, 0.3)'
                    }}
                  >
                    ✨ Create New Project
                  </div>
                </div>
              )}
            </div>
            <button
              onClick={() => setIsSearchOpen(true)}
              className="fantasy-button"
              style={{
                padding: '10px 14px',
                borderRadius: '8px',
                color: '#e0d5ff',
                cursor: 'pointer',
                fontSize: '12px',
                fontWeight: '600',
              }}
            >
              🔍 Search
            </button>
            <button
              onClick={() => setShowModelSelector(!showModelSelector)}
              className="fantasy-button"
              style={{
                padding: '10px 14px',
                borderRadius: '8px',
                color: '#e0d5ff',
                cursor: 'pointer',
                fontSize: '12px',
                fontWeight: '600',
              }}
            >
              {selectedModel.startsWith('gpt') ? '⚡' : '🧠'} {selectedModel}
            </button>
          </div>
        </div>

        {/* Messages Area - Enhanced */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '20px',
          }}
        >
          {messages.length === 0 ? (
            <div style={{
              textAlign: 'center',
              marginTop: '120px',
              animation: 'float 3s ease-in-out infinite'
            }}>
              <div style={{
                fontSize: '48px',
                marginBottom: '20px',
                filter: 'drop-shadow(0 0 20px rgba(139, 92, 246, 0.5))'
              }}>
                ✨
              </div>
              <div style={{
                fontSize: '24px',
                fontWeight: '700',
                marginBottom: '12px',
                background: 'linear-gradient(135deg, #e0d5ff 0%, #a78bfa 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}>
                Begin Your Quest
              </div>
              <div style={{
                fontSize: '14px',
                color: '#a78bfa',
                fontStyle: 'italic'
              }}>
                The tome awaits your first incantation...
              </div>
            </div>
          ) : (
            messages.map((msg, idx) => (
              <div
                key={idx}
                className="message-container"
                style={{
                  display: 'flex',
                  gap: '14px',
                  alignItems: 'flex-start',
                }}
              >
                <div
                  style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '50%',
                    background: msg.role === 'user'
                      ? 'linear-gradient(135deg, #8b5cf6 0%, #a855f7 100%)'
                      : 'linear-gradient(135deg, rgba(42, 42, 42, 0.8) 0%, rgba(58, 58, 58, 0.8) 100%)',
                    border: msg.role === 'user'
                      ? '2px solid rgba(139, 92, 246, 0.5)'
                      : '2px solid rgba(139, 92, 246, 0.3)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '18px',
                    flexShrink: 0,
                    boxShadow: msg.role === 'user'
                      ? '0 4px 12px rgba(139, 92, 246, 0.4)'
                      : '0 4px 12px rgba(0, 0, 0, 0.3)',
                  }}
                >
                  {msg.role === 'user' ? '👤' : '🧙'}
                </div>
                <div style={{ flex: 1, paddingTop: '4px' }}>
                  <div style={{
                    fontSize: '11px',
                    color: '#a78bfa',
                    marginBottom: '8px',
                    fontWeight: '600',
                    letterSpacing: '0.5px'
                  }}>
                    {msg.role === 'user' ? 'ADVENTURER' : 'DUNGEON MASTER'}
                  </div>
                  <FormattedMessage content={msg.content} />
                </div>
              </div>
            ))
          )}

          {/* D&D-Themed Thinking Indicator */}
          {sending && (
            <div
              className="message-container"
              style={{
                display: 'flex',
                gap: '14px',
                alignItems: 'flex-start',
                animation: 'mystical-pulse 2s ease-in-out infinite',
              }}
            >
              <div
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, rgba(42, 42, 42, 0.8) 0%, rgba(58, 58, 58, 0.8) 100%)',
                  border: '2px solid rgba(139, 92, 246, 0.5)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '18px',
                  flexShrink: 0,
                  boxShadow: '0 4px 12px rgba(139, 92, 246, 0.4)',
                  animation: 'divination-glow 2s ease-in-out infinite',
                }}
              >
                🧙
              </div>
              <div style={{ flex: 1, paddingTop: '4px' }}>
                <div style={{
                  fontSize: '11px',
                  color: '#a78bfa',
                  marginBottom: '8px',
                  fontWeight: '600',
                  letterSpacing: '0.5px'
                }}>
                  DUNGEON MASTER
                </div>
                <div style={{
                  background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.1), rgba(168, 85, 247, 0.1))',
                  border: '2px dashed rgba(139, 92, 246, 0.3)',
                  borderRadius: '12px',
                  padding: '20px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '16px',
                }}>
                  {/* Animated D20 */}
                  <div style={{
                    fontSize: '48px',
                    animation: 'd20-spin 3s linear infinite',
                    filter: 'drop-shadow(0 0 20px rgba(139, 92, 246, 0.6))',
                  }}>
                    🎲
                  </div>

                  {/* Floating Runes */}
                  <div style={{
                    display: 'flex',
                    gap: '12px',
                    fontSize: '20px',
                  }}>
                    <span style={{ animation: 'rune-float 2s ease-in-out infinite', animationDelay: '0s' }}>✨</span>
                    <span style={{ animation: 'rune-float 2s ease-in-out infinite', animationDelay: '0.3s' }}>⟡</span>
                    <span style={{ animation: 'rune-float 2s ease-in-out infinite', animationDelay: '0.6s' }}>✦</span>
                    <span style={{ animation: 'rune-float 2s ease-in-out infinite', animationDelay: '0.9s' }}>⟡</span>
                    <span style={{ animation: 'rune-float 2s ease-in-out infinite', animationDelay: '1.2s' }}>✨</span>
                  </div>

                  {/* Text Messages - Rotating */}
                  <div style={{
                    fontSize: '14px',
                    color: '#c4b5fd',
                    fontStyle: 'italic',
                    textAlign: 'center',
                    fontWeight: '600',
                    letterSpacing: '0.5px',
                  }}>
                    {(() => {
                      const messages = [
                        'Consulting the ancient scrolls...',
                        'Casting divination spell...',
                        'Rolling for insight...',
                        'Deciphering mystical runes...',
                        'Channeling arcane wisdom...',
                      ];
                      const index = Math.floor(Date.now() / 3000) % messages.length;
                      return messages[index];
                    })()}
                  </div>

                  {/* Pulsing magical circle */}
                  <div style={{
                    width: '120px',
                    height: '4px',
                    background: 'linear-gradient(90deg, transparent, rgba(139, 92, 246, 0.6), transparent)',
                    borderRadius: '2px',
                    animation: 'pulse-glow 1.5s ease-in-out infinite',
                  }} />
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Area - Enchanted */}
        <div style={{
          padding: '20px',
          borderTop: '2px solid rgba(139, 92, 246, 0.3)',
          background: 'linear-gradient(180deg, rgba(26, 26, 26, 0.95) 0%, rgba(23, 23, 23, 0.95) 100%)',
          backdropFilter: 'blur(10px)'
        }}>
          {/* Mystical divider at top of input */}
          <div className="rune-divider" style={{ marginBottom: '16px' }} />

          <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-end' }}>
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
              placeholder="Speak your incantation..."
              disabled={sending}
              className="mystical-input"
              style={{
                flex: 1,
                padding: '14px 18px',
                borderRadius: '10px',
                color: '#e0d5ff',
                fontSize: '14px',
                fontWeight: '500',
              }}
            />
            <button
              onClick={() => setShowTags(!showTags)}
              className="fantasy-button"
              style={{
                padding: '14px',
                borderRadius: '10px',
                color: '#e0d5ff',
                cursor: 'pointer',
                fontSize: '16px',
                background: showTags
                  ? 'linear-gradient(135deg, rgba(139, 92, 246, 0.4) 0%, rgba(168, 85, 247, 0.4) 100%)'
                  : 'linear-gradient(135deg, rgba(139, 92, 246, 0.2) 0%, rgba(168, 85, 247, 0.3) 100%)',
              }}
              title="Toggle rune tags"
            >
              🏷️
            </button>
            <button
              onClick={handleSendMessage}
              disabled={!input.trim() || sending}
              className={input.trim() && !sending ? 'magical-glow' : ''}
              style={{
                padding: '14px 28px',
                background: input.trim() && !sending
                  ? 'linear-gradient(135deg, #8b5cf6 0%, #a855f7 100%)'
                  : 'linear-gradient(135deg, rgba(68, 68, 68, 0.8) 0%, rgba(58, 58, 58, 0.8) 100%)',
                border: input.trim() && !sending
                  ? '2px solid rgba(168, 85, 247, 0.5)'
                  : '2px solid rgba(68, 68, 68, 0.5)',
                borderRadius: '10px',
                color: '#fff',
                cursor: input.trim() && !sending ? 'pointer' : 'not-allowed',
                fontSize: '16px',
                fontWeight: '700',
                textShadow: '0 2px 4px rgba(0, 0, 0, 0.3)',
                transition: 'all 0.3s ease',
              }}
            >
              {sending ? '⏳' : '✨'}
            </button>
          </div>

          {/* Tag Input/Display - Enchanted Runes */}
          {showTags && (
            <div style={{ marginTop: '16px' }}>
              <div style={{
                fontSize: '12px',
                color: '#a78bfa',
                marginBottom: '10px',
                fontWeight: '600',
                letterSpacing: '0.5px',
                fontStyle: 'italic'
              }}>
                ⟡ Rune Tags for this Quest ⟡
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {activeTagFilters.map((tag, index) => (
                  <span
                    key={index}
                    style={{
                      padding: '6px 12px',
                      background: 'linear-gradient(135deg, #8b5cf6 0%, #a855f7 100%)',
                      border: '2px solid rgba(168, 85, 247, 0.5)',
                      borderRadius: '16px',
                      fontSize: '12px',
                      color: '#fff',
                      cursor: 'pointer',
                      fontWeight: '700',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      boxShadow: '0 4px 8px rgba(139, 92, 246, 0.3)',
                      transition: 'all 0.2s ease'
                    }}
                    onClick={() => {
                      setActiveTagFilters(prev => prev.filter(t => t !== tag));
                    }}
                  >
                    ⟡ {tag}
                    <span style={{ fontSize: '12px', opacity: 0.8 }}>✕</span>
                  </span>
                ))}
                <input
                  type="text"
                  placeholder="Inscribe new rune..."
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
                    padding: '6px 12px',
                    background: 'linear-gradient(135deg, rgba(26, 26, 26, 0.8) 0%, rgba(42, 42, 42, 0.8) 100%)',
                    border: '2px solid rgba(139, 92, 246, 0.3)',
                    borderRadius: '16px',
                    fontSize: '12px',
                    color: '#e0d5ff',
                    outline: 'none',
                    minWidth: '140px',
                    fontStyle: 'italic',
                    transition: 'all 0.3s ease'
                  }}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Model Selector Modal - Enchanted */}
      {showModelSelector && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.85)',
            backdropFilter: 'blur(8px)',
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
              background: 'linear-gradient(135deg, #1a1a1a 0%, #0d0221 100%)',
              border: '2px solid rgba(139, 92, 246, 0.4)',
              borderRadius: '16px',
              padding: '32px',
              maxWidth: '600px',
              width: '90%',
              maxHeight: '80vh',
              overflowY: 'auto',
              boxShadow: '0 20px 60px rgba(139, 92, 246, 0.3), inset 0 0 30px rgba(139, 92, 246, 0.1)',
            }}
          >
            <h2 style={{
              marginBottom: '24px',
              fontSize: '28px',
              fontWeight: '700',
              background: 'linear-gradient(135deg, #e0d5ff 0%, #a78bfa 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              textAlign: 'center',
              letterSpacing: '1px'
            }}>
              ⟡ Choose Your Oracle ⟡
            </h2>
            <div className="rune-divider" style={{ marginBottom: '24px' }} />
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
