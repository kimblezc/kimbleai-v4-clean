'use client';

import { useState } from 'react';

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
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState<'zach' | 'rebecca'>('zach');
  const [currentProject, setCurrentProject] = useState('General');
  const [projects, setProjects] = useState([
    { id: 'general', name: 'General', conversations: 12, status: 'active' },
    { id: 'client-work', name: 'Client Work', conversations: 8, status: 'active' },
    { id: 'personal', name: 'Personal Projects', conversations: 5, status: 'active' }
  ]);
  const [suggestedTags, setSuggestedTags] = useState<string[]>([]);
  const [showTags, setShowTags] = useState(false);
  const [conversationTitle, setConversationTitle] = useState('');
  const [conversationHistory, setConversationHistory] = useState([
    { id: '1', title: 'GPT-5 model integration discussion', project: 'general', lastMessage: '2 hours ago', messageCount: 15 },
    { id: '2', title: 'Client requirements review', project: 'client-work', lastMessage: '1 day ago', messageCount: 8 },
    { id: '3', title: 'Quick CSS question', project: 'general', lastMessage: '3 days ago', messageCount: 3 },
    { id: '4', title: 'Database schema planning', project: 'personal', lastMessage: '1 week ago', messageCount: 12 }
  ]);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
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
          projectId: currentProject
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
                const name = prompt('Project name:');
                if (name) {
                  const newProject = {
                    id: name.toLowerCase().replace(/\s+/g, '-'),
                    name,
                    conversations: 0,
                    status: 'active'
                  };
                  setProjects([...projects, newProject]);
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

          {projects.map((project) => (
            <div
              key={project.id}
              onClick={() => setCurrentProject(project.id)}
              style={{
                padding: '8px 12px',
                backgroundColor: currentProject === project.id ? '#2a2a2a' : '#1a1a1a',
                borderRadius: '6px',
                marginBottom: '8px',
                fontSize: '14px',
                color: currentProject === project.id ? '#fff' : '#ccc',
                cursor: 'pointer',
                border: currentProject === project.id ? '1px solid #4a9eff' : '1px solid transparent',
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
          ))}

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
        </div>
      </div>

      {/* Main Chat Area */}
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
              <div style={{
                fontSize: '15px',
                lineHeight: '1.5',
                color: '#ffffff'
              }}>
                {message.content}
              </div>
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
        <div style={{
          padding: '24px',
          borderTop: '1px solid #333',
          backgroundColor: '#171717'
        }}>
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
              placeholder="Type your message..."
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
    </div>
  );
}