'use client';

import React, { useState, useRef, useEffect } from 'react';

interface AIAssistantProps {
  currentFile: {
    path: string;
    content: string;
    language: string;
  } | null;
  onCodeGenerated: (code: string) => void;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export default function AIAssistant({
  currentFile,
  onCodeGenerated,
}: AIAssistantProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMessage: Message = {
      role: 'user',
      content: input,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const response = await fetch('/api/code/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, userMessage],
          currentFile: currentFile
            ? {
                path: currentFile.path,
                content: currentFile.content,
                language: currentFile.language,
              }
            : null,
        }),
      });

      const data = await response.json();

      if (data.success) {
        const assistantMessage: Message = {
          role: 'assistant',
          content: data.response,
          timestamp: new Date(),
        };

        setMessages((prev) => [...prev, assistantMessage]);

        // If the response contains code, offer to apply it
        if (data.code) {
          onCodeGenerated(data.code);
        }
      } else {
        const errorMessage: Message = {
          role: 'assistant',
          content: `Error: ${data.error}`,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, errorMessage]);
      }
    } catch (error) {
      const errorMessage: Message = {
        role: 'assistant',
        content: `Error: ${error}`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const quickActions = [
    { label: '🐛 Debug this code', prompt: 'Debug this code and explain the issues' },
    { label: '📝 Add comments', prompt: 'Add detailed comments to this code' },
    { label: '🔄 Refactor', prompt: 'Refactor this code to be more efficient' },
    { label: '📚 Explain', prompt: 'Explain what this code does in detail' },
    { label: '✨ Improve', prompt: 'Suggest improvements to this code' },
    { label: '🧪 Add tests', prompt: 'Write unit tests for this code' },
  ];

  const handleQuickAction = (prompt: string) => {
    setInput(prompt);
  };

  return (
    <div style={{
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      backgroundColor: '#171717'
    }}>
      {/* Header */}
      <div style={{
        padding: '16px',
        borderBottom: '1px solid #333'
      }}>
        <h2 style={{
          fontSize: '16px',
          fontWeight: '600',
          display: 'flex',
          alignItems: 'center'
        }}>
          <span style={{ marginRight: '8px' }}>🤖</span>
          AI Assistant
        </h2>
        <p style={{
          fontSize: '11px',
          color: '#888',
          marginTop: '4px'
        }}>
          Powered by OpenAI GPT-4.1 mini
        </p>
      </div>

      {/* Messages */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px'
      }}>
        {messages.length === 0 && (
          <div style={{
            textAlign: 'center',
            color: '#888',
            padding: '32px 0'
          }}>
            <div style={{ fontSize: '24px', marginBottom: '16px' }}>👋</div>
            <p style={{ fontSize: '12px' }}>
              Hi! I'm your AI coding assistant.
            </p>
            <p style={{ fontSize: '11px', marginTop: '8px' }}>
              Ask me to help with code, debug issues, or explain concepts.
            </p>
          </div>
        )}

        {messages.map((message, index) => (
          <div
            key={index}
            style={{
              display: 'flex',
              justifyContent: message.role === 'user' ? 'flex-end' : 'flex-start'
            }}
          >
            <div
              style={{
                maxWidth: '280px',
                borderRadius: '8px',
                padding: '12px',
                backgroundColor: message.role === 'user' ? '#1e40af' : '#2a2a2a',
                color: '#ffffff'
              }}
            >
              <div style={{
                fontSize: '12px',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word'
              }}>
                {message.content}
              </div>
              <div style={{
                fontSize: '10px',
                opacity: 0.5,
                marginTop: '4px'
              }}>
                {message.timestamp.toLocaleTimeString()}
              </div>
            </div>
          </div>
        ))}

        {loading && (
          <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
            <div style={{
              backgroundColor: '#2a2a2a',
              borderRadius: '8px',
              padding: '12px'
            }}>
              <div style={{ display: 'flex', gap: '8px' }}>
                <div style={{
                  width: '8px',
                  height: '8px',
                  backgroundColor: '#888',
                  borderRadius: '50%',
                  animation: 'bounce 1s infinite'
                }}></div>
                <div style={{
                  width: '8px',
                  height: '8px',
                  backgroundColor: '#888',
                  borderRadius: '50%',
                  animation: 'bounce 1s infinite 0.1s'
                }}></div>
                <div style={{
                  width: '8px',
                  height: '8px',
                  backgroundColor: '#888',
                  borderRadius: '50%',
                  animation: 'bounce 1s infinite 0.2s'
                }}></div>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Quick Actions */}
      {currentFile && messages.length === 0 && (
        <div style={{
          padding: '16px',
          borderTop: '1px solid #333'
        }}>
          <div style={{
            fontSize: '11px',
            color: '#888',
            marginBottom: '8px',
            textTransform: 'uppercase',
            fontWeight: '600'
          }}>
            Quick Actions
          </div>
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '8px'
          }}>
            {quickActions.map((action) => (
              <button
                key={action.label}
                onClick={() => handleQuickAction(action.prompt)}
                style={{
                  fontSize: '11px',
                  backgroundColor: '#0a0a0a',
                  border: '1px solid #333',
                  borderRadius: '6px',
                  padding: '8px',
                  textAlign: 'left',
                  color: '#ffffff',
                  cursor: 'pointer',
                  transition: 'background-color 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#2a2a2a'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#0a0a0a'}
              >
                {action.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div style={{
        padding: '16px',
        borderTop: '1px solid #333'
      }}>
        <div style={{ display: 'flex', gap: '8px' }}>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Ask me anything..."
            style={{
              flex: 1,
              backgroundColor: '#2a2a2a',
              border: '1px solid #444',
              borderRadius: '6px',
              padding: '10px 12px',
              fontSize: '12px',
              color: '#ffffff',
              outline: 'none'
            }}
            disabled={loading}
          />
          <button
            onClick={handleSend}
            disabled={loading || !input.trim()}
            style={{
              padding: '10px 16px',
              backgroundColor: loading || !input.trim() ? '#0a0a0a' : '#1e40af',
              border: loading || !input.trim() ? '1px solid #333' : '1px solid #2563eb',
              borderRadius: '6px',
              color: '#ffffff',
              fontSize: '12px',
              fontWeight: '500',
              cursor: loading || !input.trim() ? 'not-allowed' : 'pointer',
              transition: 'background-color 0.2s'
            }}
            onMouseEnter={(e) => {
              if (!loading && input.trim()) {
                e.currentTarget.style.backgroundColor = '#2563eb';
              }
            }}
            onMouseLeave={(e) => {
              if (!loading && input.trim()) {
                e.currentTarget.style.backgroundColor = '#1e40af';
              }
            }}
          >
            {loading ? '...' : 'Send'}
          </button>
        </div>
        {currentFile && (
          <div style={{
            fontSize: '11px',
            color: '#888',
            marginTop: '8px'
          }}>
            Context: {currentFile.path}
          </div>
        )}
      </div>
    </div>
  );
}
