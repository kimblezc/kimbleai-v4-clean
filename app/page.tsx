'use client';

import { useState, useEffect, useRef } from 'react';

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
  const [showSidebar, setShowSidebar] = useState(true);
  const [currentProject, setCurrentProject] = useState('');
  const [currentTags, setCurrentTags] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadConversations();
    startNewConversation();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadConversations = async () => {
    try {
      const response = await fetch('/api/chat?userId=' + currentUser);
      const data = await response.json();
      if (data.conversations) {
        setConversations(data.conversations);
      }
    } catch (error) {
      console.error('Failed to load conversations:', error);
    }
    
    const saved = localStorage.getItem('kimbleai_conversations');
    if (saved) {
      const parsed = JSON.parse(saved);
      setConversations(prev => [...prev, ...parsed]);
    }
  };

  const startNewConversation = () => {
    const newId = 'conv_' + Date.now();
    setCurrentConversationId(newId);
    setMessages([]);
    setCurrentProject('');
    setCurrentTags('');
  };

  const loadConversation = async (convId: string) => {
    try {
      const response = await fetch(`/api/chat?conversationId=${convId}`);
      const data = await response.json();
      if (data.messages) {
        setMessages(data.messages);
        setCurrentConversationId(convId);
        
        const conv = conversations.find(c => c.id === convId);
        if (conv) {
          setCurrentProject(conv.project || '');
          setCurrentTags(conv.tags?.join(', ') || '');
        }
      }
    } catch (error) {
      console.error('Failed to load conversation:', error);
    }
  };

  const saveConversation = () => {
    if (!currentConversationId || messages.length === 0) return;
    
    const conversation: Conversation = {
      id: currentConversationId,
      title: messages[0]?.content.substring(0, 50) || 'New Chat',
      messages: messages,
      project: currentProject,
      tags: currentTags.split(',').map(t => t.trim()).filter(t => t),
      userId: currentUser,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    const existing = conversations.filter(c => c.id !== currentConversationId);
    const updated = [conversation, ...existing];
    setConversations(updated);
    localStorage.setItem('kimbleai_conversations', JSON.stringify(updated));
  };

  const deleteConversation = (convId: string) => {
    const updated = conversations.filter(c => c.id !== convId);
    setConversations(updated);
    localStorage.setItem('kimbleai_conversations', JSON.stringify(updated));
    
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

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [...messages, userMessage],
          userId: currentUser,
          conversationId: currentConversationId,
          projectId: currentProject,
          tags: currentTags.split(',').map(t => t.trim()).filter(t => t)
        }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to get response');
      }

      const assistantMessage: Message = {
        role: 'assistant',
        content: data.response,
        timestamp: new Date().toISOString()
      };

      setMessages(prev => [...prev, assistantMessage]);
      
      if (data.conversationId && !currentConversationId) {
        setCurrentConversationId(data.conversationId);
      }
      
      saveConversation();
      
    } catch (error: any) {
      console.error('Chat error:', error);
      const errorMessage: Message = {
        role: 'assistant',
        content: `Error: ${error.message}`,
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', height: '100vh', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' }}>
      {/* Sidebar - ChatGPT/Claude style */}
      <div style={{
        width: showSidebar ? '260px' : '0',
        transition: 'width 0.3s',
        backgroundColor: '#202123',
        borderRight: '1px solid #2d2d30',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
      }}>
        {/* Sidebar Header */}
        <div style={{ padding: '12px', borderBottom: '1px solid #2d2d30' }}>
          {/* User Selector */}
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
                fontSize: '14px',
                fontWeight: '500'
              }}
            >
              Rebecca
            </button>
          </div>
          
          {/* New Chat Button */}
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
              gap: '8px'
            }}
          >
            <span style={{ fontSize: '16px' }}>+</span> New chat
          </button>
        </div>
        
        {/* Conversations List */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '8px' }}>
          {conversations
            .filter(c => c.userId === currentUser)
            .map(conv => (
            <div
              key={conv.id}
              style={{
                padding: '12px',
                borderRadius: '6px',
                cursor: 'pointer',
                backgroundColor: conv.id === currentConversationId ? '#343541' : 'transparent',
                marginBottom: '2px',
                position: 'relative'
              }}
              onClick={() => loadConversation(conv.id)}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#343541'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = conv.id === currentConversationId ? '#343541' : 'transparent'}
            >
              <div style={{ color: '#ececf1', fontSize: '14px', marginBottom: '4px' }}>
                {conv.title}
              </div>
              {conv.project && (
                <div style={{ color: '#3b82f6', fontSize: '12px', marginBottom: '2px' }}>
                  Project: {conv.project}
                </div>
              )}
              {conv.tags && conv.tags.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '4px' }}>
                  {conv.tags.map((tag, i) => (
                    <span key={i} style={{
                      fontSize: '11px',
                      backgroundColor: '#444654',
                      color: '#c5c5d2',
                      padding: '2px 6px',
                      borderRadius: '3px'
                    }}>
                      {tag}
                    </span>
                  ))}
                </div>
              )}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  deleteConversation(conv.id);
                }}
                style={{
                  position: 'absolute',
                  right: '8px',
                  top: '12px',
                  backgroundColor: 'transparent',
                  border: 'none',
                  color: '#8e8ea0',
                  cursor: 'pointer',
                  fontSize: '18px'
                }}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Main Chat Area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', backgroundColor: '#343541' }}>
        {/* Header */}
        <div style={{ 
          backgroundColor: '#343541', 
          borderBottom: '1px solid #2d2d30',
          padding: '16px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
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
              fontSize: '18px',
              fontWeight: '600',
              margin: 0
            }}>
              KimbleAI
            </h1>
          </div>
          
          {/* Project and Tags */}
          <div style={{ display: 'flex', gap: '12px' }}>
            <input
              type="text"
              value={currentProject}
              onChange={(e) => setCurrentProject(e.target.value)}
              placeholder="Project name"
              style={{
                padding: '8px 12px',
                backgroundColor: '#40414f',
                border: '1px solid #565869',
                borderRadius: '6px',
                color: '#ececf1',
                fontSize: '14px',
                outline: 'none'
              }}
            />
            <input
              type="text"
              value={currentTags}
              onChange={(e) => setCurrentTags(e.target.value)}
              placeholder="Tags (comma separated)"
              style={{
                padding: '8px 12px',
                backgroundColor: '#40414f',
                border: '1px solid #565869',
                borderRadius: '6px',
                color: '#ececf1',
                fontSize: '14px',
                outline: 'none',
                width: '200px'
              }}
            />
          </div>
        </div>

        {/* Messages Area */}
        <div style={{ 
          flex: 1, 
          overflowY: 'auto',
          padding: '20px 0'
        }}>
          {messages.length === 0 && (
            <div style={{ 
              textAlign: 'center', 
              color: '#8e8ea0',
              marginTop: '100px',
              fontSize: '20px'
            }}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>💬</div>
              How can I help you today?
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
                  width: '30px',
                  height: '30px',
                  borderRadius: '4px',
                  backgroundColor: message.role === 'user' 
                    ? (currentUser === 'zach' ? '#3b82f6' : '#ec4899')
                    : '#10a37f',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontSize: '14px',
                  fontWeight: 'bold',
                  flexShrink: 0
                }}>
                  {message.role === 'user' ? (currentUser === 'zach' ? 'Z' : 'R') : 'AI'}
                </div>
                <div style={{ 
                  color: '#ececf1',
                  fontSize: '15px',
                  lineHeight: '1.6',
                  whiteSpace: 'pre-wrap',
                  flex: 1
                }}>
                  {message.content}
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
                  width: '30px',
                  height: '30px',
                  borderRadius: '4px',
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
                  Thinking...
                </div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
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
              onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
              placeholder="Send a message..."
              disabled={loading}
              style={{
                flex: 1,
                padding: '12px 16px',
                backgroundColor: '#40414f',
                border: '1px solid #565869',
                borderRadius: '6px',
                color: '#ececf1',
                fontSize: '15px',
                outline: 'none'
              }}
            />
            <button
              onClick={sendMessage}
              disabled={loading || !inputValue.trim()}
              style={{
                padding: '12px 20px',
                backgroundColor: loading || !inputValue.trim() ? '#40414f' : '#10a37f',
                border: 'none',
                borderRadius: '6px',
                color: loading || !inputValue.trim() ? '#8e8ea0' : 'white',
                cursor: loading || !inputValue.trim() ? 'not-allowed' : 'pointer',
                fontSize: '15px',
                fontWeight: '500'
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