'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

interface DeviceSession {
  id: string;
  device_type: string;
  device_name: string;
  browser_info: string;
  last_heartbeat: string;
  current_context: any;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface DeviceStats {
  totalSessions: number;
  activeSessions: number;
  currentDevice: string | null;
  devices: DeviceSession[];
}

export default function DevicesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [stats, setStats] = useState<DeviceStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
      return;
    }

    if (status === 'authenticated') {
      loadDeviceStats();
      const interval = setInterval(loadDeviceStats, 30000);
      return () => clearInterval(interval);
    }
  }, [status, router]);

  const loadDeviceStats = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/sync/devices');
      const data = await response.json();

      if (data.success) {
        setStats({
          totalSessions: data.devices.length,
          activeSessions: data.devices.filter((d: DeviceSession) => d.is_active).length,
          currentDevice: data.currentDevice || null,
          devices: data.devices
        });
        setError(null);
      } else {
        setError(data.error || 'Failed to load device data');
      }
    } catch (err: any) {
      console.error('Error loading device stats:', err);
      setError(err.message || 'Failed to load device data');
    } finally {
      setLoading(false);
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  const getDeviceIcon = (deviceType: string) => {
    switch (deviceType?.toLowerCase()) {
      case 'desktop':
      case 'pc':
        return '🖥️';
      case 'laptop':
        return '💻';
      case 'mobile':
        return '📱';
      case 'tablet':
        return '📱';
      default:
        return '💻';
    }
  };

  const getStatusColor = (isActive: boolean, lastHeartbeat: string) => {
    if (!isActive) return '#666';

    const date = new Date(lastHeartbeat);
    const now = new Date();
    const diffMins = Math.floor((now.getTime() - date.getTime()) / 60000);

    if (diffMins < 5) return '#10b981'; // Green - active now
    if (diffMins < 30) return '#f59e0b'; // Yellow - recently active
    return '#666'; // Gray - inactive
  };

  if (status === 'loading' || loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        backgroundColor: '#0f0f0f',
        color: '#888',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
      }}>
        Loading device data...
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#0f0f0f',
      color: '#ffffff',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
      padding: '40px 20px'
    }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ marginBottom: '32px' }}>
          <button
            onClick={() => router.push('/')}
            style={{
              background: 'none',
              border: '1px solid #333',
              borderRadius: '6px',
              color: '#888',
              cursor: 'pointer',
              fontSize: '14px',
              padding: '8px 16px',
              marginBottom: '24px'
            }}
          >
            ← Back to Home
          </button>

          <h1 style={{
            fontSize: '32px',
            fontWeight: '700',
            margin: '0 0 8px 0',
            background: 'linear-gradient(135deg, #4a9eff 0%, #10a37f 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent'
          }}>
            Device Continuity
          </h1>
          <p style={{ fontSize: '16px', color: '#888', margin: 0 }}>
            Sync your context across all devices
          </p>
        </div>

        {error && (
          <div style={{
            padding: '16px',
            backgroundColor: '#2a1a1a',
            border: '1px solid #ef4444',
            borderRadius: '8px',
            color: '#ef4444',
            marginBottom: '24px'
          }}>
            {error}
          </div>
        )}

        {/* Stats Overview */}
        {stats && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
            gap: '20px',
            marginBottom: '32px'
          }}>
            <div style={{
              padding: '24px',
              backgroundColor: '#171717',
              border: '1px solid #333',
              borderRadius: '12px'
            }}>
              <div style={{ fontSize: '14px', color: '#888', marginBottom: '8px' }}>
                Total Devices
              </div>
              <div style={{ fontSize: '36px', fontWeight: '700', color: '#4a9eff' }}>
                {stats.totalSessions}
              </div>
            </div>

            <div style={{
              padding: '24px',
              backgroundColor: '#171717',
              border: '1px solid #333',
              borderRadius: '12px'
            }}>
              <div style={{ fontSize: '14px', color: '#888', marginBottom: '8px' }}>
                Active Now
              </div>
              <div style={{ fontSize: '36px', fontWeight: '700', color: '#10b981' }}>
                {stats.activeSessions}
              </div>
            </div>

            <div style={{
              padding: '24px',
              backgroundColor: '#171717',
              border: '1px solid #333',
              borderRadius: '12px'
            }}>
              <div style={{ fontSize: '14px', color: '#888', marginBottom: '8px' }}>
                Current Device
              </div>
              <div style={{ fontSize: '18px', fontWeight: '600', color: '#fff', marginTop: '8px' }}>
                {stats.currentDevice || 'Unknown'}
              </div>
            </div>
          </div>
        )}

        {/* Device List */}
        <div style={{
          backgroundColor: '#171717',
          border: '1px solid #333',
          borderRadius: '12px',
          overflow: 'hidden'
        }}>
          <div style={{
            padding: '20px 24px',
            borderBottom: '1px solid #333',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <h2 style={{ fontSize: '18px', fontWeight: '600', margin: 0 }}>
              All Devices
            </h2>
            <button
              onClick={loadDeviceStats}
              disabled={loading}
              style={{
                background: 'none',
                border: '1px solid #444',
                borderRadius: '6px',
                color: '#888',
                cursor: loading ? 'not-allowed' : 'pointer',
                fontSize: '12px',
                padding: '6px 12px'
              }}
            >
              {loading ? 'Refreshing...' : '🔄 Refresh'}
            </button>
          </div>

          {stats && stats.devices.length === 0 ? (
            <div style={{
              padding: '48px 24px',
              textAlign: 'center',
              color: '#666'
            }}>
              No device sessions found
            </div>
          ) : (
            <div style={{ padding: '0' }}>
              {stats?.devices.map((device, index) => (
                <div
                  key={device.id}
                  style={{
                    padding: '20px 24px',
                    borderBottom: index < stats.devices.length - 1 ? '1px solid #333' : 'none',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      marginBottom: '8px'
                    }}>
                      <span style={{ fontSize: '24px' }}>
                        {getDeviceIcon(device.device_type)}
                      </span>
                      <div>
                        <div style={{
                          fontSize: '16px',
                          fontWeight: '600',
                          color: '#fff',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px'
                        }}>
                          {device.device_name || 'Unknown Device'}
                          <span
                            style={{
                              width: '8px',
                              height: '8px',
                              borderRadius: '50%',
                              backgroundColor: getStatusColor(device.is_active, device.last_heartbeat)
                            }}
                          />
                        </div>
                        <div style={{ fontSize: '12px', color: '#888', marginTop: '4px' }}>
                          {device.browser_info || 'No browser info'}
                        </div>
                      </div>
                    </div>

                    {device.current_context && (
                      <div style={{
                        marginTop: '12px',
                        padding: '12px',
                        backgroundColor: '#0a0a0a',
                        borderRadius: '6px',
                        fontSize: '12px',
                        color: '#888'
                      }}>
                        <div style={{ fontWeight: '600', color: '#aaa', marginBottom: '4px' }}>
                          Current Context:
                        </div>
                        <div>{JSON.stringify(device.current_context).substring(0, 100)}...</div>
                      </div>
                    )}
                  </div>

                  <div style={{
                    textAlign: 'right',
                    marginLeft: '24px'
                  }}>
                    <div style={{
                      fontSize: '12px',
                      color: device.is_active ? '#10b981' : '#666',
                      fontWeight: '600',
                      marginBottom: '4px'
                    }}>
                      {device.is_active ? 'Active' : 'Inactive'}
                    </div>
                    <div style={{ fontSize: '11px', color: '#666' }}>
                      Last seen: {formatTimestamp(device.last_heartbeat)}
                    </div>
                    <div style={{ fontSize: '10px', color: '#555', marginTop: '4px' }}>
                      Created: {new Date(device.created_at).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Info Section */}
        <div style={{
          marginTop: '32px',
          padding: '20px',
          backgroundColor: '#0a0a0a',
          border: '1px solid #333',
          borderRadius: '8px',
          fontSize: '13px',
          color: '#888'
        }}>
          <div style={{ fontWeight: '600', color: '#aaa', marginBottom: '8px' }}>
            ℹ️ About Device Continuity
          </div>
          <p style={{ margin: '0 0 8px 0' }}>
            Device continuity automatically syncs your context across all your devices.
            When you switch from your laptop to your desktop, your conversations and context
            seamlessly continue where you left off.
          </p>
          <p style={{ margin: 0 }}>
            Device sessions are marked as active when they've sent a heartbeat in the last 5 minutes.
            This page auto-refreshes every 30 seconds.
          </p>
        </div>
      </div>
    </div>
  );
}
