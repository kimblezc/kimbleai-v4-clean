'use client';

import { useState } from 'react';

interface AgentTriggerButtonsProps {
  agents: Array<{
    name: string;
    endpoint: string;
    color: string;
  }>;
}

export function AgentTriggerButtons({ agents }: AgentTriggerButtonsProps) {
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [results, setResults] = useState<Record<string, string>>({});

  const triggerAgent = async (name: string, endpoint: string) => {
    setLoading({ ...loading, [name]: true });
    setResults({ ...results, [name]: '⏳ Triggering...' });

    try {
      const res = await fetch(endpoint, { method: 'POST' });
      const data = await res.json();

      if (res.ok) {
        setResults({ ...results, [name]: `✅ Success (${data.timestamp})` });
        // Reload page after 2 seconds to show new data
        setTimeout(() => window.location.reload(), 2000);
      } else {
        setResults({ ...results, [name]: `❌ Error: ${data.error || 'Unknown error'}` });
      }
    } catch (error: any) {
      setResults({ ...results, [name]: `❌ Failed: ${error.message}` });
    } finally {
      setLoading({ ...loading, [name]: false });
    }
  };

  return (
    <div style={{
      background: '#1a1a1a',
      border: '3px solid #f59e0b',
      borderRadius: '12px',
      padding: '24px',
      marginBottom: '40px'
    }}>
      <h2 style={{
        fontSize: '24px',
        fontWeight: 'bold',
        color: '#f59e0b',
        marginBottom: '16px',
        borderBottom: '2px solid rgba(245, 158, 11, 0.3)',
        paddingBottom: '12px'
      }}>
        🎮 MANUAL AGENT TRIGGERS
      </h2>

      <div style={{
        fontSize: '12px',
        color: '#9ca3af',
        marginBottom: '20px',
        padding: '12px',
        background: 'rgba(245, 158, 11, 0.1)',
        borderRadius: '6px',
        border: '1px solid rgba(245, 158, 11, 0.2)'
      }}>
        ⚠️ <strong>WARNING:</strong> These buttons manually trigger agents outside of their normal schedule.
        Use for testing and debugging only. Page will reload after success.
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '12px'
      }}>
        {agents.map((agent) => (
          <div key={agent.name}>
            <button
              onClick={() => triggerAgent(agent.name, agent.endpoint)}
              disabled={loading[agent.name]}
              style={{
                width: '100%',
                padding: '12px 16px',
                background: loading[agent.name] ? '#374151' : agent.color,
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: 'bold',
                cursor: loading[agent.name] ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s',
                opacity: loading[agent.name] ? 0.6 : 1
              }}
              onMouseEnter={(e) => {
                if (!loading[agent.name]) {
                  e.currentTarget.style.transform = 'scale(1.02)';
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'scale(1)';
              }}
            >
              {loading[agent.name] ? '⏳ Running...' : `▶️ ${agent.name}`}
            </button>
            {results[agent.name] && (
              <div style={{
                marginTop: '6px',
                fontSize: '11px',
                color: results[agent.name].startsWith('✅') ? '#22c55e' : '#ef4444',
                textAlign: 'center'
              }}>
                {results[agent.name]}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
