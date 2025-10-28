'use client';

import { useEffect, useState } from 'react';

interface SessionLoggerProps {
  userId: string;
}

export default function SessionLogger({ userId }: SessionLoggerProps) {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [device, setDevice] = useState<'laptop' | 'pc' | 'other'>('pc');
  const [isLogging, setIsLogging] = useState(false);

  useEffect(() => {
    // Check if there's an active session in localStorage
    const activeSession = localStorage.getItem('kimbleai_active_session');
    if (activeSession) {
      const session = JSON.parse(activeSession);
      setSessionId(session.session_id);
      setDevice(session.device);
    }
  }, []);

  const startSession = async () => {
    try {
      setIsLogging(true);
      const newSessionId = `session_${new Date().toISOString().split('T')[0]}_${Date.now()}`;

      const response = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          sessionId: newSessionId,
          deviceName: device,
          projectPath: 'C:\\Users\\zachk\\OneDrive\\Documents\\kimbleai-v4-clean',
          title: `${device} session - ${new Date().toLocaleString()}`,
          summary: 'Session started',
          gitBranch: 'master',
          tags: ['auto-logged']
        })
      });

      if (response.ok) {
        const data = await response.json();
        setSessionId(newSessionId);

        // Save to localStorage
        localStorage.setItem('kimbleai_active_session', JSON.stringify({
          session_id: newSessionId,
          device,
          started_at: new Date().toISOString()
        }));

        alert('✅ Session logging started!');
      } else {
        throw new Error('Failed to start session');
      }
    } catch (error) {
      console.error('Error starting session:', error);
      alert('❌ Failed to start session logging');
    } finally {
      setIsLogging(false);
    }
  };

  const endSession = async () => {
    if (!sessionId) return;

    try {
      setIsLogging(true);

      const response = await fetch(`/api/sessions/${sessionId}/end`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          summary: 'Session ended',
          nextSteps: ['Continue on other device']
        })
      });

      if (response.ok) {
        setSessionId(null);
        localStorage.removeItem('kimbleai_active_session');
        alert('✅ Session logged successfully!');
      } else {
        throw new Error('Failed to end session');
      }
    } catch (error) {
      console.error('Error ending session:', error);
      alert('❌ Failed to end session');
    } finally {
      setIsLogging(false);
    }
  };

  const viewSessions = () => {
    window.location.href = '/sessions';
  };

  return (
    <div style={{
      position: 'fixed',
      bottom: '2rem',
      right: '2rem',
      zIndex: 1000,
      backgroundColor: '#1f1f1f',
      border: '1px solid #333',
      borderRadius: '0.5rem',
      padding: '1rem',
      boxShadow: '0 4px 6px rgba(0, 0, 0, 0.3)',
      minWidth: '250px'
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        marginBottom: '0.75rem',
        paddingBottom: '0.75rem',
        borderBottom: '1px solid #333'
      }}>
        <span style={{ fontSize: '1.25rem' }}>📋</span>
        <span style={{ fontWeight: 'bold', color: 'white' }}>Session Logger</span>
      </div>

      {/* Device Selector */}
      {!sessionId && (
        <div style={{ marginBottom: '0.75rem' }}>
          <label style={{
            display: 'block',
            fontSize: '0.75rem',
            color: '#666',
            marginBottom: '0.5rem'
          }}>
            Device:
          </label>
          <select
            value={device}
            onChange={(e) => setDevice(e.target.value as 'laptop' | 'pc' | 'other')}
            style={{
              width: '100%',
              padding: '0.5rem',
              backgroundColor: '#0a0a0a',
              border: '1px solid #333',
              borderRadius: '0.25rem',
              color: 'white',
              cursor: 'pointer'
            }}
          >
            <option value="laptop">💻 Laptop</option>
            <option value="pc">🖥️ PC</option>
            <option value="other">📱 Other</option>
          </select>
        </div>
      )}

      {/* Status */}
      {sessionId && (
        <div style={{
          marginBottom: '0.75rem',
          padding: '0.5rem',
          backgroundColor: '#065f46',
          borderRadius: '0.25rem',
          fontSize: '0.75rem',
          color: '#10b981',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem'
        }}>
          <span style={{ fontSize: '0.5rem' }}>🟢</span>
          <span>Logging active on {device}</span>
        </div>
      )}

      {/* Actions */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '0.5rem'
      }}>
        {!sessionId ? (
          <button
            onClick={startSession}
            disabled={isLogging}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: '#2563eb',
              border: 'none',
              borderRadius: '0.25rem',
              color: 'white',
              cursor: isLogging ? 'not-allowed' : 'pointer',
              fontWeight: '500',
              opacity: isLogging ? 0.5 : 1
            }}
          >
            {isLogging ? '...' : '▶️ Start Logging'}
          </button>
        ) : (
          <button
            onClick={endSession}
            disabled={isLogging}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: '#dc2626',
              border: 'none',
              borderRadius: '0.25rem',
              color: 'white',
              cursor: isLogging ? 'not-allowed' : 'pointer',
              fontWeight: '500',
              opacity: isLogging ? 0.5 : 1
            }}
          >
            {isLogging ? '...' : '⏹️ End Session'}
          </button>
        )}

        <button
          onClick={viewSessions}
          style={{
            padding: '0.5rem 1rem',
            backgroundColor: '#1f1f1f',
            border: '1px solid #333',
            borderRadius: '0.25rem',
            color: 'white',
            cursor: 'pointer',
            fontSize: '0.875rem'
          }}
        >
          📋 View All Sessions
        </button>
      </div>
    </div>
  );
}
