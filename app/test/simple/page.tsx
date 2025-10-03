'use client';

import { useState } from 'react';

export default function SimplePage() {
  const [messages, setMessages] = useState<Array<{role: string, content: string}>>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const sendMessage = async () => {
    if (!input.trim() || loading) return;

    const userMessage = { role: 'user', content: input };
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
          userId: 'zach'
        }),
      });

      const data = await response.json();

      const assistantMessage = {
        role: 'assistant',
        content: data.response || 'No response'
      };

      setMessages([...newMessages, assistantMessage]);
    } catch (error) {
      console.error('Chat error:', error);
      setMessages([...newMessages, { role: 'assistant', content: 'Error occurred' }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto', fontFamily: 'system-ui' }}>
      <h1 style={{ color: '#333', marginBottom: '20px' }}>KimbleAI v4 - Live Demo</h1>

      <div style={{
        border: '1px solid #ddd',
        borderRadius: '8px',
        padding: '20px',
        marginBottom: '20px',
        backgroundColor: '#f9f9f9'
      }}>
        <h3>System Status: LIVE</h3>
        <p><strong>URL:</strong> https://kimbleai.com</p>
        <p><strong>Features:</strong> AI Chat, Memory, File Upload, Auto-Reference Butler</p>
        <p><strong>Compatible:</strong> PC, Mac, iPhone, Android, Tablet</p>
      </div>

      <div style={{
        height: '400px',
        overflowY: 'auto',
        border: '1px solid #ddd',
        borderRadius: '8px',
        padding: '15px',
        marginBottom: '15px',
        backgroundColor: 'white'
      }}>
        {messages.length === 0 && (
          <div style={{ color: '#666', textAlign: 'center', marginTop: '50px' }}>
            <p>Welcome to KimbleAI v4!</p>
            <p>Try asking: &quot;What can you do?&quot; or &quot;Tell me about the system features&quot;</p>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} style={{
            marginBottom: '15px',
            padding: '12px',
            borderRadius: '6px',
            backgroundColor: msg.role === 'user' ? '#e3f2fd' : '#f5f5f5'
          }}>
            <strong style={{ color: msg.role === 'user' ? '#1976d2' : '#2e7d32' }}>
              {msg.role === 'user' ? 'You' : 'KimbleAI'}:
            </strong>
            <div style={{ marginTop: '5px' }}>{msg.content}</div>
          </div>
        ))}

        {loading && (
          <div style={{ textAlign: 'center', color: '#666' }}>
            KimbleAI is thinking...
          </div>
        )}
      </div>

      <div style={{ display: 'flex', gap: '10px' }}>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
          placeholder="Type your message..."
          disabled={loading}
          style={{
            flex: 1,
            padding: '12px',
            border: '1px solid #ddd',
            borderRadius: '6px',
            fontSize: '14px'
          }}
        />
        <button
          onClick={sendMessage}
          disabled={loading || !input.trim()}
          style={{
            padding: '12px 24px',
            backgroundColor: loading ? '#ccc' : '#1976d2',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: loading ? 'not-allowed' : 'pointer',
            fontSize: '14px'
          }}
        >
          Send
        </button>
      </div>

      <div style={{ marginTop: '20px', padding: '15px', backgroundColor: '#e8f5e8', borderRadius: '8px' }}>
        <h4>Test Features:</h4>
        <ul>
          <li><strong>Chat:</strong> Type any message and get AI response</li>
          <li><strong>Memory:</strong> Ask follow-up questions - system remembers context</li>
          <li><strong>Auto-Reference:</strong> System automatically pulls relevant information</li>
          <li><strong>Multi-Device:</strong> Works on any device with a browser</li>
        </ul>
      </div>

      <div style={{ marginTop: '20px', padding: '15px', backgroundColor: '#fff3cd', borderRadius: '8px' }}>
        <h4>Additional Endpoints:</h4>
        <ul>
          <li><strong>/api/health</strong> - System health check</li>
          <li><strong>/api/status</strong> - Feature status</li>
          <li><strong>/api/memory-test</strong> - RAG/Vector system test</li>
          <li><strong>/admin</strong> - Admin dashboard</li>
        </ul>
      </div>
    </div>
  );
}