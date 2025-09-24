'use client';

import { useState } from 'react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp?: string;
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

  const sendMessage = async () => {
    if (!input.trim() || loading) return;

    const userMessage: Message = {
      role: 'user',
      content: input,
      timestamp: new Date().toISOString()
    };

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput('');
    setLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMessages,
          userId: currentUser
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

        {/* New Chat Button */}
        <button
          onClick={() => setMessages([])}
          style={{
            width: '100%',
            padding: '12px',
            backgroundColor: '#2a2a2a',
            border: '1px solid #444',
            borderRadius: '8px',
            color: '#ffffff',
            fontSize: '14px',
            cursor: 'pointer',
            marginBottom: '20px'
          }}
        >
          + New Chat
        </button>

        {/* Projects Section */}
        <div style={{ flex: 1 }}>
          <h3 style={{
            fontSize: '14px',
            fontWeight: '600',
            marginBottom: '12px',
            color: '#aaa'
          }}>
            Projects
          </h3>

          <div style={{
            padding: '8px 12px',
            backgroundColor: '#2a2a2a',
            borderRadius: '6px',
            marginBottom: '8px',
            fontSize: '14px',
            color: '#ccc'
          }}>
            General
          </div>

          <div style={{
            padding: '8px 12px',
            backgroundColor: '#1a1a1a',
            borderRadius: '6px',
            marginBottom: '8px',
            fontSize: '14px',
            color: '#ccc'
          }}>
            Project Alpha
          </div>

          <div style={{
            padding: '8px 12px',
            backgroundColor: '#1a1a1a',
            borderRadius: '6px',
            marginBottom: '8px',
            fontSize: '14px',
            color: '#ccc'
          }}>
            Project Beta
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
        </div>
      </div>
    </div>
  );
}