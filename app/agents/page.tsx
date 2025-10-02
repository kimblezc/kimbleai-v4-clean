'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import AgentStatusDashboard from '../../components/AgentStatusDashboard';

export default function AgentsPage() {
  const router = useRouter();

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#0f0f0f',
      color: '#ffffff',
      padding: '24px'
    }}>
      {/* Header with Back Button */}
      <div style={{
        maxWidth: '1400px',
        margin: '0 auto',
        marginBottom: '24px'
      }}>
        <button
          onClick={() => router.push('/')}
          style={{
            padding: '10px 16px',
            backgroundColor: '#2a2a2a',
            border: '1px solid #444',
            borderRadius: '8px',
            color: '#ffffff',
            fontSize: '14px',
            cursor: 'pointer',
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          ← Back to Chat
        </button>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{
              fontSize: '32px',
              fontWeight: '700',
              margin: 0,
              marginBottom: '8px'
            }}>
              🤖 Agent Ecosystem
            </h1>
            <p style={{
              fontSize: '16px',
              color: '#888',
              margin: 0
            }}>
              Real-time monitoring and management of all KimbleAI agents
            </p>
          </div>

          <button
            onClick={() => router.push('/agents/status')}
            style={{
              padding: '12px 20px',
              backgroundColor: '#4a9eff',
              border: 'none',
              borderRadius: '8px',
              color: '#ffffff',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            📊 View Detailed Status
          </button>
        </div>
      </div>

      {/* Agent Dashboard */}
      <div style={{
        maxWidth: '1400px',
        margin: '0 auto'
      }}>
        <AgentStatusDashboard />
      </div>
    </div>
  );
}
