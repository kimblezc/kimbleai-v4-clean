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

interface KnowledgeStats {
  itemsFound: number;
  sources: string[];
  categories: string[];
}

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState<'zach' | 'rebecca'>('zach');
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<string>('');
  const [showSidebar, setShowSidebar] = useState(true);
  const [currentProject, setCurrentProject] = useState('');
  const [currentTags, setCurrentTags] = useState('');
  const [showFileUpload, setShowFileUpload] = useState(false);
  const [knowledgeStats, setKnowledgeStats] = useState<KnowledgeStats | null>(null);
  const [connectionStatus, setConnectionStatus] = useState({ 
    drive: false, 
    gmail: false 
  });
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // Check API status on mount
  useEffect(() => {
    fetch('/api/chat')
      .then(res => res.json())
      .then(data => {
        console.log('API Capabilities:', data.capabilities);
      })
      .catch(err => console.error('API check failed:', err));
  }, []);

  // Load conversations on mount ONLY
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

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Save current user preference
  useEffect(() => {
    localStorage.setItem('kimbleai_current_user', currentUser);
  }, [currentUser]);

  // Load from localStorage
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

  // Save to localStorage whenever conversations change
  const saveConversationsToStorage = (convs: Conversation[]) => {
    localStorage.setItem('kimbleai_conversations', JSON.stringify(convs));
  };

  const startNewConversation = () => {
    const newId = 'conv_' + Date.now();
    setCurrentConversationId(newId);
    setMessages([]);
    setCurrentProject('');
    setCurrentTags('');
    setKnowledgeStats(null);
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
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: newMessages.map(m => ({
            role: m.role,
            content: m.content
          })),
          userId: currentUser,
          conversationId: currentConversationId,
          projectId: currentProject,
          tags: currentTags.split(',').map(t => t.trim()).filter(t => t)
        }),
      });

      let data;
      try {
        const responseText = await response.text();
        data = JSON.parse(responseText);
      } catch (parseError) {
        console.error('Failed to parse response:', parseError);
        data = { response: 'Error: Failed to parse server response', error: true };
      }
      
      // Update knowledge stats if available
      if (data.knowledgeBase) {
        setKnowledgeStats(data.knowledgeBase);
      }
      
      const assistantMessage: Message = {
        role: 'assistant',
        content: data.response || data.error || 'No response',
        timestamp: new Date().toISOString()
      };

      const updatedMessages = [...newMessages, assistantMessage];
      setMessages(updatedMessages);
      
      // Save immediately after getting response
      setTimeout(() => {
        saveCurrentConversation();
      }, 100);
      
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

  const connectGoogleServices = () => {
    alert('Google OAuth integration will be added in the next update. For now, you can upload documents directly using the file upload feature.');
  };

  return (
    <div style={{ display: 'flex', height: '100vh', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
      {/* Sidebar */}
      <div style={{
        width: showSidebar ? '300px' : '0',
        minWidth: showSidebar ? '300px' : '0',
        transition: 'all 0.3s',
        backgroundColor: '#202123',
        borderRight: '1px solid #2d2d30',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
      }}>
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
                fontSize: '14px',
                fontWeight: '500'
              }}
            >
              👨 Zach
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
                fontSize: '14px',
                fontWeight: '500'
              }}
            >
              👩 Rebecca
            </button>
          </div>
          
          <button
            onClick={startNewConversation}
            style={{
              width: '100%',
              padding: '12px',
              backgroundColor: 'transparent',
              border: '1px solid #565869',
              borderRadius: '6px',
              color: 'white',
              cursor: 'pointer',
              fontSize: '14px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '8px'
            }}
          >
            <span>+</span> New chat
          </button>
          
          <button
            onClick={() => setShowFileUpload(!showFileUpload)}
            style={{
              width: '100%',
              padding: '12px',
              backgroundColor: '#444654',
              border: '1px solid #565869',
              borderRadius: '6px',
              color: 'white',
              cursor: 'pointer',
              fontSize: '14px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            📁 Upload Files
          </button>
        </div>
        
        {showFileUpload && (
          <div style={{ padding: '12px' }}>
            <FileUpload 
              userId={currentUser}
              onUploadComplete={() => {
                console.log('File uploaded successfully');
              }}
            />
          </div>
        )}
        
        <div style={{ 
          padding: '12px',
          borderBottom: '1px solid #2d2d30'
        }}>
          <div style={{ color: '#8e8ea0', fontSize: '12px', marginBottom: '8px' }}>
            INTEGRATIONS
          </div>
          <button
            onClick={connectGoogleServices}
            style={{
              width: '100%',
              padding: '10px',
              backgroundColor: connectionStatus.drive ? '#10a37f' : '#343541',
              border: '1px solid #565869',
              borderRadius: '6px',
              color: 'white',
              cursor: 'pointer',
              fontSize: '13px',
              marginBottom: '6px',
              textAlign: 'left'
            }}
          >
            {connectionStatus.drive ? '✓' : '○'} Google Drive
          </button>
          <button
            onClick={connectGoogleServices}
            style={{
              width: '100%',
              padding: '10px',
              backgroundColor: connectionStatus.gmail ? '#10a37f' : '#343541',
              border: '1px solid #565869',
              borderRadius: '6px',
              color: 'white',
              cursor: 'pointer',
              fontSize: '13px',
              textAlign: 'left'
            }}
          >
            {connectionStatus.gmail ? '✓' : '○'} Gmail
          </button>
        </div>
        
        <div style={{ 
          flex: 1, 
          overflowY: 'auto', 
          padding: '8px',
          overflowX: 'hidden'
        }}>
          <div style={{ color: '#8e8ea0', fontSize: '12px', margin: '8px 4px' }}>
            RECENT CONVERSATIONS
          </div>
          {conversations
            .filter(c => c.userId === currentUser)
            .slice(0, 20)
            .map(conv => (
            <div
              key={conv.id}
              style={{
                padding: '12px',
                borderRadius: '6px',
                cursor: 'pointer',
                backgroundColor: conv.id === currentConversationId ? '#343541' : 'transparent',
                marginBottom: '2px',
                position: 'relative',
                wordBreak: 'break-word'
              }}
              onClick={() => loadConversation(conv.id)}
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
              <div style={{ 
                color: '#ececf1', 
                fontSize: '14px', 
                marginBottom: '4px',
                paddingRight: '20px',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
              }}>
                {conv.title}
              </div>
              {conv.project && (
                <div style={{ 
                  color: '#3b82f6', 
                  fontSize: '12px', 
                  marginBottom: '2px',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}>
                  📁 {conv.project}
                </div>
              )}
              {conv.tags && conv.tags.length > 0 && (
                <div style={{ 
                  display: 'flex', 
                  flexWrap: 'wrap', 
                  gap: '4px', 
                  marginTop: '4px' 
                }}>
                  {conv.tags.slice(0, 3).map((tag, i) => (
                    <span key={i} style={{
                      fontSize: '11px',
                      backgroundColor: '#444654',
                      color: '#c5c5d2',
                      padding: '2px 6px',
                      borderRadius: '3px',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      maxWidth: '80px'
                    }}>
                      {tag}
                    </span>
                  ))}
                </div>
              )}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (confirm('Delete this conversation?')) {
                    deleteConversation(conv.id);
                  }
                }}
                style={{
                  position: 'absolute',
                  right: '8px',
                  top: '12px',
                  backgroundColor: 'transparent',
                  border: 'none',
                  color: '#8e8ea0',
                  cursor: 'pointer',
                  fontSize: '16px',
                  padding: '2px',
                  lineHeight: '1',
                  opacity: 0.7
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.opacity = '1';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.opacity = '0.7';
                }}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Main Chat Area */}
      <div style={{ 
        flex: 1, 
        display: 'flex', 
        flexDirection: 'column', 
        backgroundColor: '#343541',
        minWidth: 0
      }}>
        <div style={{ 
          backgroundColor: '#343541', 
          borderBottom: '1px solid #2d2d30',
          padding: '16px 24px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <button
                onClick={() => setShowSidebar(!showSidebar)}
                style={{
                  backgroundColor: 'transparent',
                  border: 'none',
                  color: '#ececf1',
                  cursor: 'pointer',
                  fontSize: '20px',
                  padding: '4px'
                }}
              >
                ☰
              </button>
              <h1 style={{ 
                color: '#ececf1', 
                fontSize: '20px',
                fontWeight: '600',
                margin: 0
              }}>
                KimbleAI <span style={{ fontSize: '14px', color: '#8e8ea0' }}>
                  • RAG System Active • {currentUser === 'zach' ? 'Zach' : 'Rebecca'}
                </span>
              </h1>
            </div>
          </div>
          
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <label style={{ color: '#8e8ea0', fontSize: '13px' }}>Project:</label>
              <input
                type="text"
                value={currentProject}
                onChange={(e) => setCurrentProject(e.target.value)}
                onBlur={saveCurrentConversation}
                placeholder="Enter project name"
                style={{
                  padding: '6px 12px',
                  backgroundColor: '#40414f',
                  border: '1px solid #565869',
                  borderRadius: '6px',
                  color: '#ececf1',
                  fontSize: '14px',
                  outline: 'none',
                  minWidth: '150px'
                }}
              />
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <label style={{ color: '#8e8ea0', fontSize: '13px' }}>Tags:</label>
              <input
                type="text"
                value={currentTags}
                onChange={(e) => setCurrentTags(e.target.value)}
                onBlur={saveCurrentConversation}
                placeholder="tag1, tag2, tag3"
                style={{
                  padding: '6px 12px',
                  backgroundColor: '#40414f',
                  border: '1px solid #565869',
                  borderRadius: '6px',
                  color: '#ececf1',
                  fontSize: '14px',
                  outline: 'none',
                  minWidth: '200px'
                }}
              />
            </div>
          </div>
          
          {knowledgeStats && knowledgeStats.itemsFound > 0 && (
            <div style={{
              marginTop: '12px',
              padding: '8px 12px',
              backgroundColor: '#40414f',
              borderRadius: '6px',
              fontSize: '12px',
              color: '#10a37f'
            }}>
              📚 Found {knowledgeStats.itemsFound} relevant items from: {knowledgeStats.sources.join(', ')}
            </div>
          )}
        </div>

        <div style={{ 
          flex: 1, 
          overflowY: 'auto',
          padding: '20px 0'
        }}>
          {messages.length === 0 && (
            <div style={{ 
              textAlign: 'center', 
              color: '#8e8ea0',
              marginTop: '60px',
              padding: '20px',
              maxWidth: '600px',
              margin: '60px auto 0'
            }}>
              <div style={{ fontSize: '48px', marginBottom: '24px' }}>🤖</div>
              <h2 style={{ fontSize: '24px', color: '#ececf1', marginBottom: '16px' }}>
                KimbleAI with Comprehensive Memory
              </h2>
              <p style={{ fontSize: '15px', lineHeight: '1.6', marginBottom: '24px' }}>
                I remember everything from our conversations, documents, and emails.
                Ask me anything about your past discussions, uploaded files, or stored information.
              </p>
              
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '12px',
                textAlign: 'left'
              }}>
                <div style={{ 
                  padding: '16px',
                  backgroundColor: '#444654',
                  borderRadius: '8px'
                }}>
                  <div style={{ fontSize: '16px', marginBottom: '8px' }}>💬</div>
                  <div style={{ fontSize: '13px', color: '#ececf1' }}>
                    Reference any past conversation
                  </div>
                </div>
                <div style={{ 
                  padding: '16px',
                  backgroundColor: '#444654',
                  borderRadius: '8px'
                }}>
                  <div style={{ fontSize: '16px', marginBottom: '8px' }}>📁</div>
                  <div style={{ fontSize: '13px', color: '#ececf1' }}>
                    Search uploaded documents
                  </div>
                </div>
                <div style={{ 
                  padding: '16px',
                  backgroundColor: '#444654',
                  borderRadius: '8px'
                }}>
                  <div style={{ fontSize: '16px', marginBottom: '8px' }}>🏷️</div>
                  <div style={{ fontSize: '13px', color: '#ececf1' }}>
                    Organize with projects & tags
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {messages.map((message, index) => (
            <div
              key={index}
              style={{
                padding: '20px',
                backgroundColor: message.role === 'user' ? '#343541' : '#444654'
              }}
            >
              <div style={{
                maxWidth: '800px',
                margin: '0 auto',
                display: 'flex',
                gap: '16px'
              }}>
                <div style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '6px',
                  backgroundColor: message.role === 'user' 
                    ? (currentUser === 'rebecca' ? '#ec4899' : '#3b82f6')
                    : '#10a37f',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontSize: '14px',
                  fontWeight: 'bold',
                  flexShrink: 0
                }}>
                  {message.role === 'user' 
                    ? (currentUser === 'rebecca' ? 'R' : 'Z') 
                    : 'AI'}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ 
                    color: '#ececf1',
                    fontSize: '15px',
                    lineHeight: '1.7',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word'
                  }}>
                    {message.content}
                  </div>
                  {message.timestamp && (
                    <div style={{ 
                      color: '#8e8ea0',
                      fontSize: '11px',
                      marginTop: '8px'
                    }}>
                      {new Date(message.timestamp).toLocaleString()}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
          
          {loading && (
            <div style={{ padding: '20px', backgroundColor: '#444654' }}>
              <div style={{
                maxWidth: '800px',
                margin: '0 auto',
                display: 'flex',
                gap: '16px'
              }}>
                <div style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '6px',
                  backgroundColor: '#10a37f',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontSize: '14px',
                  fontWeight: 'bold'
                }}>
                  AI
                </div>
                <div style={{ color: '#8e8ea0' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div className="typing-indicator">
                      <span></span>
                      <span></span>
                      <span></span>
                    </div>
                    Searching knowledge base...
                  </div>
                </div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        <div style={{ 
          borderTop: '1px solid #2d2d30',
          backgroundColor: '#343541',
          padding: '20px'
        }}>
          <div style={{
            maxWidth: '800px',
            margin: '0 auto',
            display: 'flex',
            gap: '12px'
          }}>
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
              placeholder="Ask about past conversations, documents, or anything new..."
              disabled={loading}
              style={{
                flex: 1,
                padding: '12px 16px',
                backgroundColor: '#40414f',
                border: '1px solid #565869',
                borderRadius: '6px',
                color: '#ececf1',
                fontSize: '15px',
                outline: 'none',
                transition: 'border-color 0.2s'
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = '#10a37f';
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = '#565869';
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
                color: loading || !inputValue.trim() ? '#8e8ea0' : 'white',
                cursor: loading || !inputValue.trim() ? 'not-allowed' : 'pointer',
                fontSize: '15px',
                fontWeight: '500',
                transition: 'background-color 0.2s'
              }}
            >
              Send
            </button>
          </div>
        </div>
      </div>

      <style jsx>{`
        .typing-indicator {
          display: flex;
          align-items: center;
          gap: 4px;
        }
        
        .typing-indicator span {
          height: 8px;
          width: 8px;
          background-color: #8e8ea0;
          border-radius: 50%;
          display: inline-block;
          animation: typing 1.4s infinite;
        }
        
        .typing-indicator span:nth-child(2) {
          animation-delay: 0.2s;
        }
        
        .typing-indicator span:nth-child(3) {
          animation-delay: 0.4s;
        }
        
        @keyframes typing {
          0%, 60%, 100% {
            transform: translateY(0);
            opacity: 0.7;
          }
          30% {
            transform: translateY(-10px);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}