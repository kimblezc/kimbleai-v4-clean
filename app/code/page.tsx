'use client';

import React, { useState, useEffect } from 'react';
import { useSession, signOut } from 'next-auth/react';
import dynamic from 'next/dynamic';

// Disable SSR for components that use browser APIs - with text-only loading fallbacks
const CodeEditor = dynamic(() => import('@/components/code/CodeEditor'), {
  ssr: false,
  loading: () => <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#0f0f0f', color: '#888', fontSize: '11px' }}>Loading editor...</div>
});
const FileExplorer = dynamic(() => import('@/components/code/FileExplorer'), {
  ssr: false,
  loading: () => <div style={{ flex: 1, padding: '16px', textAlign: 'center', color: '#888', fontSize: '11px' }}>Loading files...</div>
});
const Terminal = dynamic(() => import('@/components/code/Terminal'), {
  ssr: false,
  loading: () => <div style={{ height: '100%', width: '100%', backgroundColor: '#000000', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#888', fontSize: '11px' }}>Loading terminal...</div>
});
const AIAssistant = dynamic(() => import('@/components/code/AIAssistant'), {
  ssr: false,
  loading: () => <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#171717', color: '#888', fontSize: '11px' }}>Loading AI assistant...</div>
});
const GitHubPanel = dynamic(() => import('@/components/code/GitHubPanel'), {
  ssr: false,
  loading: () => <div style={{ padding: '12px', textAlign: 'center', color: '#888', fontSize: '11px' }}>Loading repositories...</div>
});

export default function CodePage() {
  const { data: session, status } = useSession();
  const [selectedFile, setSelectedFile] = useState<{
    path: string;
    content: string;
    language: string;
  } | null>(null);
  const [files, setFiles] = useState<any[]>([]);
  const [showTerminal, setShowTerminal] = useState(false);
  const [showAI, setShowAI] = useState(true);
  const [currentRepo, setCurrentRepo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<'zach' | 'rebecca'>('zach');
  const [costStats, setCostStats] = useState<{
    daily: { used: number; limit: number; percentage: number };
  } | null>(null);

  // Redirect if not authenticated
  useEffect(() => {
    if (status === 'unauthenticated') {
      window.location.href = '/auth/signin';
    }
  }, [status]);

  // Load cost stats
  useEffect(() => {
    const loadCostStats = async () => {
      if (!session?.user?.email) return;

      try {
        const response = await fetch('/api/costs/stats');
        const data = await response.json();

        if (data.success) {
          setCostStats(data.stats);
        }
      } catch (error) {
        console.error('Error loading cost stats:', error);
      }
    };

    if (session) {
      loadCostStats();
      // Refresh every 30 seconds
      const interval = setInterval(loadCostStats, 30000);
      return () => clearInterval(interval);
    }
  }, [session]);

  if (status === 'loading') {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        backgroundColor: '#0f0f0f'
      }}>
        <div style={{ color: '#888', fontSize: '11px' }}>Loading Code Editor...</div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <div style={{
      display: 'flex',
      height: '100vh',
      backgroundColor: '#0f0f0f',
      color: '#ffffff',
      overflow: 'hidden'
    }}>
      {/* Error Toast */}
      {error && (
        <div style={{
          position: 'fixed',
          top: '16px',
          right: '16px',
          backgroundColor: '#dc2626',
          color: '#ffffff',
          padding: '12px 16px',
          borderRadius: '6px',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.3)',
          zIndex: 50,
          maxWidth: '400px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '12px' }}>{error}</span>
            <button
              onClick={() => setError(null)}
              style={{
                marginLeft: '16px',
                background: 'none',
                border: 'none',
                color: '#ffffff',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Left Sidebar - File Explorer */}
      <div style={{
        width: '256px',
        backgroundColor: '#171717',
        borderRight: '1px solid #333',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
      }}>
        <div style={{
          padding: '16px',
          borderBottom: '1px solid #333'
        }}>
          <h1 style={{ fontSize: '18px', fontWeight: '700' }}>Code Editor</h1>
          <p style={{
            fontSize: '11px',
            color: '#888',
            marginTop: '4px'
          }}>
            AI-Powered Development
          </p>
        </div>

        <GitHubPanel
          onRepoSelect={(repo) => setCurrentRepo(repo)}
          onFilesLoad={(loadedFiles) => setFiles(loadedFiles)}
        />

        <FileExplorer
          files={files}
          onFileSelect={setSelectedFile}
          currentRepo={currentRepo}
        />

        <div style={{
          padding: '12px',
          borderTop: '1px solid #333',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px'
        }}>
          <button
            onClick={() => setShowTerminal(!showTerminal)}
            style={{
              width: '100%',
              padding: '10px 12px',
              backgroundColor: '#0a0a0a',
              border: '1px solid #333',
              borderRadius: '6px',
              color: '#ffffff',
              fontSize: '12px',
              cursor: 'pointer',
              transition: 'background-color 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#2a2a2a'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#0a0a0a'}
          >
            {showTerminal ? '✕ Close Terminal' : '⌘ Terminal'}
          </button>
          <button
            onClick={() => setShowAI(!showAI)}
            style={{
              width: '100%',
              padding: '10px 12px',
              backgroundColor: '#0a0a0a',
              border: '1px solid #4a9eff',
              borderRadius: '6px',
              color: '#4a9eff',
              fontSize: '12px',
              cursor: 'pointer',
              transition: 'background-color 0.2s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#1e40af';
              e.currentTarget.style.color = '#ffffff';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#0a0a0a';
              e.currentTarget.style.color = '#4a9eff';
            }}
          >
            {showAI ? '✕ Close AI' : '🤖 AI Assistant'}
          </button>
        </div>
      </div>

      {/* Main Editor Area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Top Bar */}
        <div style={{
          height: '48px',
          backgroundColor: '#171717',
          borderBottom: '1px solid #333',
          display: 'flex',
          alignItems: 'center',
          padding: '0 16px',
          justifyContent: 'space-between',
          flexShrink: 0
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {selectedFile ? (
              <>
                <span style={{ fontSize: '12px', color: '#888' }}>
                  {selectedFile.path}
                </span>
                <span style={{
                  fontSize: '11px',
                  backgroundColor: '#0a0a0a',
                  padding: '2px 8px',
                  borderRadius: '4px',
                  border: '1px solid #333'
                }}>
                  {selectedFile.language}
                </span>
              </>
            ) : (
              <span style={{ fontSize: '12px', color: '#666' }}>No file selected</span>
            )}
          </div>
          <div style={{
            display: 'flex',
            gap: '12px',
            fontSize: '11px',
            color: '#888',
            fontWeight: '500',
            alignItems: 'center'
          }}>
            {/* Cost Display */}
            {session && costStats && (
              <div
                onClick={() => window.location.href = '/costs'}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '4px 8px',
                  backgroundColor: '#2a2a2a',
                  border: `1px solid ${
                    costStats.daily.percentage >= 90 ? '#ef4444' :
                    costStats.daily.percentage >= 75 ? '#f59e0b' :
                    costStats.daily.percentage >= 50 ? '#3b82f6' :
                    '#10b981'
                  }`,
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '10px',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#333';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#2a2a2a';
                }}
              >
                <span style={{
                  color: costStats.daily.percentage >= 90 ? '#ef4444' :
                         costStats.daily.percentage >= 75 ? '#f59e0b' :
                         costStats.daily.percentage >= 50 ? '#3b82f6' :
                         '#10b981',
                  fontSize: '10px'
                }}>
                  ●
                </span>
                <span style={{ color: '#ccc', fontWeight: '600' }}>
                  ${costStats.daily.used.toFixed(2)}
                </span>
                <span style={{ color: '#666' }}>/</span>
                <span style={{ color: '#888', fontSize: '9px' }}>
                  ${costStats.daily.limit.toFixed(0)}
                </span>
              </div>
            )}

            {/* GitHub Status */}
            {status === 'loading' ? (
              <span style={{ color: '#888' }}>Auth...</span>
            ) : session ? (
              <>
                <span style={{ color: '#4ade80' }}>GitHub ✅</span>

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
                    onClick={() => setCurrentUser('zach')}
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
                    onClick={() => setCurrentUser('rebecca')}
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

                {/* Back to Home Button */}
                <button
                  onClick={() => window.location.href = '/'}
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
                    e.currentTarget.style.borderColor = '#4a9eff';
                    e.currentTarget.style.color = '#4a9eff';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = '#444';
                    e.currentTarget.style.color = '#888';
                  }}
                >
                  Home
                </button>

                {/* Sign Out Button */}
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
            ) : null}
          </div>
        </div>

        {/* Editor */}
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
          <CodeEditor
            file={selectedFile}
            onSave={(content) => {
              console.log('Saving file:', selectedFile?.path, content);
              // TODO: Implement save functionality
            }}
          />

          {/* Right Sidebar - AI Assistant */}
          {showAI && (
            <div style={{
              width: '384px',
              backgroundColor: '#171717',
              borderLeft: '1px solid #333',
              overflow: 'hidden'
            }}>
              <AIAssistant
                currentFile={selectedFile}
                onCodeGenerated={(code) => {
                  console.log('AI generated code:', code);
                  // TODO: Apply code to editor
                }}
              />
            </div>
          )}
        </div>

        {/* Terminal */}
        {showTerminal && (
          <div style={{
            height: '256px',
            backgroundColor: '#000000',
            borderTop: '1px solid #333',
            flexShrink: 0,
            overflow: 'hidden'
          }}>
            <Terminal />
          </div>
        )}
      </div>
    </div>
  );
}
