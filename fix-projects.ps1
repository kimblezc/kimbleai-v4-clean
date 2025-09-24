# QUICK FIX FOR PROJECTS UI
Write-Host "Fixing Projects UI..." -ForegroundColor Cyan

# Update the page.tsx to properly group by projects
$pageContent = @'
'use client';

import { useState, useEffect, useRef } from 'react';
import FileUpload from '../components/FileUpload';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp?: string;
  userId?: string;
}

interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  project?: string;
  tags?: string[];
  userId: string;
  createdAt: string;
  updatedAt: string;
}

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState<'zach' | 'rebecca'>('zach');
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<string>('');
  const [currentProject, setCurrentProject] = useState('');
  const [currentTags, setCurrentTags] = useState('');
  const [showFileUpload, setShowFileUpload] = useState(false);
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set(['All']));
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // Group conversations by project
  const getProjectGroups = () => {
    const groups: { [key: string]: Conversation[] } = { 'All': [] };
    
    conversations
      .filter(c => c.userId === currentUser)
      .forEach(conv => {
        const projectName = conv.project || 'Uncategorized';
        if (!groups[projectName]) {
          groups[projectName] = [];
        }
        groups[projectName].push(conv);
        groups['All'].push(conv);
      });
    
    return groups;
  };

  // Load conversations on mount
  useEffect(() => {
    if (!isInitialized) {
      loadConversationsFromStorage();
      const savedConvId = localStorage.getItem('kimbleai_current_conversation');
      const savedUser = localStorage.getItem('kimbleai_current_user') as 'zach' | 'rebecca';
      
      if (savedUser) setCurrentUser(savedUser);
      
      if (savedConvId) {
        setCurrentConversationId(savedConvId);
        loadConversation(savedConvId);
      } else {
        startNewConversation();
      }
      setIsInitialized(true);
    }
  }, [isInitialized]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    localStorage.setItem('kimbleai_current_user', currentUser);
  }, [currentUser]);

  const loadConversationsFromStorage = () => {
    const saved = localStorage.getItem('kimbleai_conversations');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setConversations(parsed);
      } catch (e) {
        console.error('Failed to parse saved conversations:', e);
      }
    }
  };

  const saveConversationsToStorage = (convs: Conversation[]) => {
    localStorage.setItem('kimbleai_conversations', JSON.stringify(convs));
  };

  const startNewConversation = () => {
    const newId = 'conv_' + Date.now();
    setCurrentConversationId(newId);
    setMessages([]);
    setCurrentProject('');
    setCurrentTags('');
    localStorage.setItem('kimbleai_current_conversation', newId);
  };

  const loadConversation = (convId: string) => {
    const conv = conversations.find(c => c.id === convId);
    if (conv) {
      setMessages(conv.messages || []);
      setCurrentConversationId(convId);
      setCurrentProject(conv.project || '');
      setCurrentTags(conv.tags?.join(', ') || '');
      localStorage.setItem('kimbleai_current_conversation', convId);
    }
  };

  const saveCurrentConversation = () => {
    if (!currentConversationId || messages.length === 0) return;
    
    const conversation: Conversation = {
      id: currentConversationId,
      title: messages[0]?.content.substring(0, 50) || 'New Chat',
      messages: messages,
      project: currentProject,
      tags: currentTags.split(',').map(t => t.trim()).filter(t => t),
      userId: currentUser,
      createdAt: conversations.find(c => c.id === currentConversationId)?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    const existingIndex = conversations.findIndex(c => c.id === currentConversationId);
    let updated: Conversation[];
    
    if (existingIndex >= 0) {
      updated = [...conversations];
      updated[existingIndex] = conversation;
    } else {
      updated = [conversation, ...conversations];
    }
    
    setConversations(updated);
    saveConversationsToStorage(updated);
  };

  const deleteConversation = (convId: string) => {
    const updated = conversations.filter(c => c.id !== convId);
    setConversations(updated);
    saveConversationsToStorage(updated);
    
    if (convId === currentConversationId) {
      startNewConversation();
    }
  };

  const sendMessage = async () => {
    if (!inputValue.trim() || loading) return;

    const userMessage: Message = {
      role: 'user',
      content: inputValue,
      timestamp: new Date().toISOString(),
      userId: currentUser
    };

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInputValue('');
    setLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMessages.map(m => ({ role: m.role, content: m.content })),
          userId: currentUser,
          conversationId: currentConversationId,
          projectId: currentProject,
          tags: currentTags.split(',').map(t => t.trim()).filter(t => t)
        }),
      });

      const data = await response.json();
      
      const assistantMessage: Message = {
        role: 'assistant',
        content: data.response || 'No response',
        timestamp: new Date().toISOString()
      };

      const updatedMessages = [...newMessages, assistantMessage];
      setMessages(updatedMessages);
      
      setTimeout(() => saveCurrentConversation(), 100);
      
    } catch (error: any) {
      console.error('Chat error:', error);
      const errorMessage: Message = {
        role: 'assistant',
        content: `Error: ${error.message}`,
        timestamp: new Date().toISOString()
      };
      setMessages([...newMessages, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const toggleProject = (projectName: string) => {
    const newExpanded = new Set(expandedProjects);
    if (newExpanded.has(projectName)) {
      newExpanded.delete(projectName);
    } else {
      newExpanded.add(projectName);
    }
    setExpandedProjects(newExpanded);
  };

  const projectGroups = getProjectGroups();

  return (
    <div style={{ display: 'flex', height: '100vh', fontFamily: 'system-ui, sans-serif' }}>
      {/* PROJECT SIDEBAR */}
      <div style={{
        width: '320px',
        backgroundColor: '#202123',
        borderRight: '1px solid #2d2d30',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {/* Header */}
        <div style={{ padding: '12px', borderBottom: '1px solid #2d2d30' }}>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
            <button
              onClick={() => setCurrentUser('zach')}
              style={{
                flex: 1,
                padding: '8px',
                borderRadius: '6px',
                border: 'none',
                backgroundColor: currentUser === 'zach' ? '#3b82f6' : '#343541',
                color: 'white',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              Zach
            </button>
            <button
              onClick={() => setCurrentUser('rebecca')}
              style={{
                flex: 1,
                padding: '8px',
                borderRadius: '6px',
                border: 'none',
                backgroundColor: currentUser === 'rebecca' ? '#ec4899' : '#343541',
                color: 'white',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              Rebecca
            </button>
          </div>
          
          <button
            onClick={startNewConversation}
            style={{
              width: '100%',
              padding: '12px',
              backgroundColor: '#10a37f',
              border: 'none',
              borderRadius: '6px',
              color: 'white',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            + New Conversation
          </button>
        </div>
        
        {/* Projects List */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '8px' }}>
          <div style={{ color: '#8e8ea0', fontSize: '11px', margin: '8px', textTransform: 'uppercase' }}>
            Projects & Conversations
          </div>
          
          {Object.entries(projectGroups).map(([projectName, convs]) => (
            <div key={projectName} style={{ marginBottom: '8px' }}>
              <div
                onClick={() => toggleProject(projectName)}
                style={{
                  padding: '8px 12px',
                  backgroundColor: '#2c2c2c',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '4px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ color: '#8e8ea0', fontSize: '12px' }}>
                    {expandedProjects.has(projectName) ? '▼' : '▶'}
                  </span>
                  <span style={{ color: '#ececf1', fontSize: '14px', fontWeight: '500' }}>
                    {projectName === 'All' ? '📊 All Conversations' : 
                     projectName === 'Uncategorized' ? '📁 No Project' : 
                     `📁 ${projectName}`}
                  </span>
                </div>
                <span style={{
                  backgroundColor: '#444654',
                  color: '#c5c5d2',
                  padding: '2px 8px',
                  borderRadius: '10px',
                  fontSize: '11px'
                }}>
                  {convs.length}
                </span>
              </div>
              
              {expandedProjects.has(projectName) && (
                <div style={{ marginLeft: '24px' }}>
                  {convs.slice(0, 10).map(conv => (
                    <div
                      key={conv.id}
                      onClick={() => loadConversation(conv.id)}
                      style={{
                        padding: '8px 12px',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        backgroundColor: conv.id === currentConversationId ? '#343541' : 'transparent',
                        marginBottom: '2px'
                      }}
                      onMouseEnter={(e) => {
                        if (conv.id !== currentConversationId) {
                          e.currentTarget.style.backgroundColor = '#2c2c2c';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (conv.id !== currentConversationId) {
                          e.currentTarget.style.backgroundColor = 'transparent';
                        }
                      }}
                    >
                      <div style={{ color: '#ececf1', fontSize: '13px', marginBottom: '4px' }}>
                        {conv.title}
                      </div>
                      {conv.tags && conv.tags.length > 0 && (
                        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                          {conv.tags.map((tag, i) => (
                            <span key={i} style={{
                              fontSize: '10px',
                              backgroundColor: '#444654',
                              color: '#8e8ea0',
                              padding: '2px 4px',
                              borderRadius: '3px'
                            }}>
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                  {convs.length > 10 && (
                    <div style={{ padding: '8px 12px', color: '#8e8ea0', fontSize: '11px' }}>
                      +{convs.length - 10} more
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
        
        {/* Upload Section */}
        <div style={{ padding: '12px', borderTop: '1px solid #2d2d30' }}>
          <button
            onClick={() => setShowFileUpload(!showFileUpload)}
            style={{
              width: '100%',
              padding: '10px',
              backgroundColor: '#444654',
              border: 'none',
              borderRadius: '6px',
              color: 'white',
              cursor: 'pointer',
              fontSize: '13px'
            }}
          >
            📁 Upload Files
          </button>
        </div>
        
        {showFileUpload && (
          <div style={{ padding: '12px' }}>
            <FileUpload userId={currentUser} onUploadComplete={() => console.log('Uploaded')} />
          </div>
        )}
      </div>

      {/* MAIN CHAT AREA */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', backgroundColor: '#343541' }}>
        {/* Header */}
        <div style={{ padding: '16px 24px', borderBottom: '1px solid #2d2d30' }}>
          <h1 style={{ color: '#ececf1', fontSize: '20px', marginBottom: '12px' }}>
            KimbleAI • {currentUser === 'zach' ? 'Zach' : 'Rebecca'}
          </h1>
          
          <div style={{ display: 'flex', gap: '12px' }}>
            <input
              type="text"
              value={currentProject}
              onChange={(e) => setCurrentProject(e.target.value)}
              onBlur={saveCurrentConversation}
              placeholder="Project name"
              style={{
                padding: '6px 12px',
                backgroundColor: '#40414f',
                border: '1px solid #565869',
                borderRadius: '6px',
                color: '#ececf1',
                fontSize: '13px'
              }}
            />
            <input
              type="text"
              value={currentTags}
              onChange={(e) => setCurrentTags(e.target.value)}
              onBlur={saveCurrentConversation}
              placeholder="Tags (comma separated)"
              style={{
                padding: '6px 12px',
                backgroundColor: '#40414f',
                border: '1px solid #565869',
                borderRadius: '6px',
                color: '#ececf1',
                fontSize: '13px',
                minWidth: '200px'
              }}
            />
          </div>
        </div>

        {/* Messages */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
          {messages.map((message, index) => (
            <div key={index} style={{
              padding: '16px',
              backgroundColor: message.role === 'user' ? '#343541' : '#444654',
              marginBottom: '8px',
              borderRadius: '8px'
            }}>
              <div style={{ display: 'flex', gap: '12px' }}>
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '4px',
                  backgroundColor: message.role === 'user' 
                    ? (currentUser === 'rebecca' ? '#ec4899' : '#3b82f6')
                    : '#10a37f',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontSize: '14px',
                  fontWeight: 'bold'
                }}>
                  {message.role === 'user' ? (currentUser === 'rebecca' ? 'R' : 'Z') : 'AI'}
                </div>
                <div style={{ flex: 1, color: '#ececf1', fontSize: '14px', lineHeight: '1.6' }}>
                  {message.content}
                </div>
              </div>
            </div>
          ))}
          {loading && (
            <div style={{ padding: '16px', backgroundColor: '#444654', borderRadius: '8px' }}>
              <div style={{ color: '#8e8ea0' }}>AI is thinking...</div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div style={{ padding: '20px', borderTop: '1px solid #2d2d30' }}>
          <div style={{ display: 'flex', gap: '12px', maxWidth: '800px', margin: '0 auto' }}>
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
              placeholder="Type your message..."
              disabled={loading}
              style={{
                flex: 1,
                padding: '12px',
                backgroundColor: '#40414f',
                border: '1px solid #565869',
                borderRadius: '6px',
                color: '#ececf1',
                fontSize: '14px'
              }}
            />
            <button
              onClick={sendMessage}
              disabled={loading || !inputValue.trim()}
              style={{
                padding: '12px 24px',
                backgroundColor: loading || !inputValue.trim() ? '#40414f' : '#10a37f',
                border: 'none',
                borderRadius: '6px',
                color: 'white',
                cursor: loading || !inputValue.trim() ? 'not-allowed' : 'pointer',
                fontSize: '14px'
              }}
            >
              Send
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
'@

Set-Content -Path "app\page.tsx" -Value $pageContent -Encoding UTF8
Write-Host "✓ Projects UI fixed!" -ForegroundColor Green
Write-Host "Deploying..." -ForegroundColor Yellow

git add -A
git commit -m "Fix projects UI - conversations now grouped by project in sidebar"
git push origin main

Write-Host "✓ Deployed! Projects are now properly organized" -ForegroundColor Green