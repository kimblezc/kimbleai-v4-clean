'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';

export default function GoogleServicesPanel() {
  const { data: session } = useSession();
  const [activeTab, setActiveTab] = useState('gmail');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any>(null);

  const testGmail = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/google/gmail', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'get_recent',
          maxResults: 3,
          userId: 'zach'
        })
      });
      const data = await response.json();
      setResults(data);
    } catch (error) {
      setResults({ error: 'Failed to fetch Gmail data', details: String(error) });
    } finally {
      setLoading(false);
    }
  };

  const testDrive = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/google/drive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'search',
          query: '',
          userId: 'zach'
        })
      });
      const data = await response.json();
      setResults(data);
    } catch (error) {
      setResults({ error: 'Failed to fetch Drive data', details: String(error) });
    } finally {
      setLoading(false);
    }
  };

  const testCalendar = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/google/calendar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'get_events',
          userId: 'zach',
          timeRange: {
            start: '2025-09-26T00:00:00Z',
            end: '2025-12-01T00:00:00Z'
          }
        })
      });
      const data = await response.json();
      setResults(data);
    } catch (error) {
      setResults({ error: 'Failed to fetch Calendar data', details: String(error) });
    } finally {
      setLoading(false);
    }
  };

  if (!session) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: '#888' }}>
        <h2>Google Services</h2>
        <p>Please sign in with Google to access your services.</p>
      </div>
    );
  }

  return (
    <div style={{ color: '#fff', height: '100%' }}>
      <div style={{ marginBottom: '30px' }}>
        <h1 style={{ fontSize: '24px', marginBottom: '10px', color: '#fff' }}>
          🔗 Google Services Integration
        </h1>
        <p style={{ color: '#888', fontSize: '14px' }}>
          Test your Gmail, Drive, and Calendar integrations with live data from your account.
        </p>
      </div>

      <div style={{ display: 'flex', gap: '20px', marginBottom: '30px' }}>
        <button
          onClick={testGmail}
          disabled={loading}
          style={{
            padding: '12px 20px',
            backgroundColor: '#dc2626',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: loading ? 'not-allowed' : 'pointer',
            fontSize: '14px',
            fontWeight: '500',
            opacity: loading ? 0.6 : 1
          }}
        >
          📧 Test Gmail
        </button>
        <button
          onClick={testDrive}
          disabled={loading}
          style={{
            padding: '12px 20px',
            backgroundColor: '#2563eb',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: loading ? 'not-allowed' : 'pointer',
            fontSize: '14px',
            fontWeight: '500',
            opacity: loading ? 0.6 : 1
          }}
        >
          📁 Test Drive
        </button>
        <button
          onClick={testCalendar}
          disabled={loading}
          style={{
            padding: '12px 20px',
            backgroundColor: '#16a34a',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: loading ? 'not-allowed' : 'pointer',
            fontSize: '14px',
            fontWeight: '500',
            opacity: loading ? 0.6 : 1
          }}
        >
          📅 Test Calendar
        </button>
      </div>

      {loading && (
        <div style={{
          padding: '20px',
          backgroundColor: '#1a1a1a',
          borderRadius: '8px',
          color: '#888',
          textAlign: 'center'
        }}>
          Loading your Google data...
        </div>
      )}

      {results && !loading && (
        <div style={{
          backgroundColor: '#1a1a1a',
          borderRadius: '8px',
          padding: '20px',
          maxHeight: '400px',
          overflow: 'auto'
        }}>
          <h3 style={{ color: '#4ade80', marginBottom: '15px' }}>Results:</h3>
          <pre style={{
            fontSize: '12px',
            lineHeight: '1.4',
            color: '#ccc',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word'
          }}>
            {JSON.stringify(results, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}