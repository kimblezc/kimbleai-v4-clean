'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';

// Types for security data
interface SecurityEvent {
  id: string;
  session_id: string;
  event_type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  details: any;
  ip_address: string;
  user_agent: string;
  timestamp: string;
  risk_score: number;
}

interface SecurityAnalytics {
  totalEvents: number;
  threatEvents: number;
  blockedRequests: number;
  uniqueIPs: number;
  threatRate: number;
  severityBreakdown: Record<string, number>;
  threatTypeCount: Record<string, number>;
  recentEvents: SecurityEvent[];
}

interface SessionInfo {
  sessionId: string;
  userId?: string;
  tier: 'guest' | 'authenticated' | 'premium';
  ipAddress: string;
  userAgent: string;
  createdAt: string;
  lastActivity: string;
  requestCount: number;
  riskScore: number;
}

// Helper components
const MetricCard: React.FC<{
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: 'up' | 'down' | 'stable';
  severity?: 'low' | 'medium' | 'high' | 'critical';
}> = ({ title, value, subtitle, trend, severity }) => {
  const getSeverityColor = (severity?: string) => {
    switch (severity) {
      case 'critical': return 'text-red-600 bg-red-50';
      case 'high': return 'text-orange-600 bg-orange-50';
      case 'medium': return 'text-yellow-600 bg-yellow-50';
      case 'low': return 'text-green-600 bg-green-50';
      default: return 'text-blue-600 bg-blue-50';
    }
  };

  return (
    <div className={`p-6 rounded-lg border ${getSeverityColor(severity)}`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-bold mt-1">{value}</p>
          {subtitle && <p className="text-sm text-gray-500 mt-1">{subtitle}</p>}
        </div>
        {trend && (
          <div className={`text-sm ${
            trend === 'up' ? 'text-red-500' :
            trend === 'down' ? 'text-green-500' : 'text-gray-500'
          }`}>
            {trend === 'up' ? '↗' : trend === 'down' ? '↘' : '→'}
          </div>
        )}
      </div>
    </div>
  );
};

const ThreatEventRow: React.FC<{ event: SecurityEvent }> = ({ event }) => {
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-100 text-red-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  return (
    <tr className="hover:bg-gray-50">
      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
        {formatTimestamp(event.timestamp)}
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getSeverityColor(event.severity)}`}>
          {event.severity}
        </span>
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
        {event.event_type.replace('_', ' ').toUpperCase()}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
        {event.ip_address}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
        {(event.risk_score * 100).toFixed(1)}%
      </td>
      <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">
        {JSON.stringify(event.details?.analysis?.threats || []).substring(0, 50)}...
      </td>
    </tr>
  );
};

const SessionRow: React.FC<{
  session: SessionInfo;
  onTerminate: (sessionId: string) => void;
}> = ({ session, onTerminate }) => {
  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'premium': return 'bg-purple-100 text-purple-800';
      case 'authenticated': return 'bg-blue-100 text-blue-800';
      case 'guest': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getRiskColor = (riskScore: number) => {
    if (riskScore >= 0.8) return 'text-red-600';
    if (riskScore >= 0.5) return 'text-yellow-600';
    return 'text-green-600';
  };

  return (
    <tr className="hover:bg-gray-50">
      <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900">
        {session.sessionId.substring(0, 16)}...
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getTierColor(session.tier)}`}>
          {session.tier}
        </span>
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
        {session.ipAddress}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
        {session.requestCount}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm">
        <span className={getRiskColor(session.riskScore)}>
          {(session.riskScore * 100).toFixed(1)}%
        </span>
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
        {new Date(session.lastActivity).toLocaleString()}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
        <button
          onClick={() => onTerminate(session.sessionId)}
          className="text-red-600 hover:text-red-900"
        >
          Terminate
        </button>
      </td>
    </tr>
  );
};

// Main SecurityDashboard component
export const SecurityDashboard: React.FC = () => {
  const { data: session } = useSession();
  const [analytics, setAnalytics] = useState<SecurityAnalytics | null>(null);
  const [activeSessions, setActiveSessions] = useState<SessionInfo[]>([]);
  const [threats, setThreats] = useState<SecurityEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<'1h' | '24h' | '7d' | '30d'>('24h');
  const [activeTab, setActiveTab] = useState<'overview' | 'threats' | 'sessions' | 'config'>('overview');

  // Check if user is admin
  const isAdmin = session?.user?.email === 'zach@kimbleai.com';

  // Fetch security data
  const fetchSecurityData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch analytics
      const analyticsResponse = await fetch(`/api/agents/security-perimeter?action=analytics&timeRange=${timeRange}`);
      if (analyticsResponse.ok) {
        const analyticsData = await analyticsResponse.json();
        setAnalytics(analyticsData.analytics);
      }

      // Fetch active sessions
      const sessionsResponse = await fetch('/api/agents/security-perimeter?action=sessions');
      if (sessionsResponse.ok) {
        const sessionsData = await sessionsResponse.json();
        setActiveSessions(sessionsData.activeSessions);
      }

      // Fetch recent threats
      const threatsResponse = await fetch('/api/agents/security-perimeter?action=threats');
      if (threatsResponse.ok) {
        const threatsData = await threatsResponse.json();
        setThreats(threatsData.threats);
      }

    } catch (err) {
      setError('Failed to fetch security data');
      console.error('Security dashboard error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Terminate session
  const terminateSession = async (sessionId: string) => {
    try {
      const response = await fetch('/api/agents/security-perimeter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'terminate_session', sessionId }),
      });

      if (response.ok) {
        await fetchSecurityData(); // Refresh data
      }
    } catch (err) {
      console.error('Failed to terminate session:', err);
    }
  };

  // Generate security report
  const generateReport = async () => {
    try {
      const response = await fetch('/api/agents/security-perimeter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'generate_report',
          reportType: 'security_summary',
          timeRangeHours: timeRange === '1h' ? 1 : timeRange === '24h' ? 24 : timeRange === '7d' ? 168 : 720
        }),
      });

      if (response.ok) {
        const data = await response.json();
        // Download report as JSON
        const blob = new Blob([JSON.stringify(data.report, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `security-report-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      console.error('Failed to generate report:', err);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      fetchSecurityData();
      // Auto-refresh every 30 seconds
      const interval = setInterval(fetchSecurityData, 30000);
      return () => clearInterval(interval);
    }
  }, [timeRange, isAdmin]);

  if (!isAdmin) {
    return (
      <div className="p-8 text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h2>
        <p className="text-gray-600">Admin access required to view security dashboard.</p>
      </div>
    );
  }

  if (loading && !analytics) {
    return (
      <div className="p-8 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">Loading security data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 text-center">
        <div className="text-red-600 mb-4">
          <svg className="h-12 w-12 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Error Loading Data</h2>
        <p className="text-gray-600 mb-4">{error}</p>
        <button
          onClick={fetchSecurityData}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Security Perimeter Dashboard</h1>
            <p className="text-gray-600 mt-2">Monitor and manage site security in real-time</p>
          </div>
          <div className="flex space-x-4">
            {/* Time Range Selector */}
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value as any)}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm"
            >
              <option value="1h">Last Hour</option>
              <option value="24h">Last 24 Hours</option>
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
            </select>

            {/* Action Buttons */}
            <button
              onClick={generateReport}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
            >
              Generate Report
            </button>
            <button
              onClick={fetchSecurityData}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm"
            >
              Refresh
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="mt-6 border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            {[
              { id: 'overview', name: 'Overview' },
              { id: 'threats', name: 'Threats' },
              { id: 'sessions', name: 'Active Sessions' },
              { id: 'config', name: 'Configuration' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.name}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Content based on active tab */}
      {activeTab === 'overview' && analytics && (
        <div className="space-y-8">
          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <MetricCard
              title="Total Events"
              value={analytics.totalEvents.toLocaleString()}
              subtitle={`${timeRange.toUpperCase()} period`}
            />
            <MetricCard
              title="Threat Events"
              value={analytics.threatEvents.toLocaleString()}
              subtitle={`${(analytics.threatRate * 100).toFixed(1)}% threat rate`}
              severity={analytics.threatRate > 0.1 ? 'high' : analytics.threatRate > 0.05 ? 'medium' : 'low'}
            />
            <MetricCard
              title="Blocked Requests"
              value={analytics.blockedRequests.toLocaleString()}
              severity={analytics.blockedRequests > 100 ? 'high' : analytics.blockedRequests > 10 ? 'medium' : 'low'}
            />
            <MetricCard
              title="Unique IPs"
              value={analytics.uniqueIPs.toLocaleString()}
              subtitle="Active sources"
            />
          </div>

          {/* Severity Breakdown */}
          <div className="bg-white p-6 rounded-lg border">
            <h3 className="text-lg font-semibold mb-4">Event Severity Breakdown</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Object.entries(analytics.severityBreakdown).map(([severity, count]) => (
                <div key={severity} className="text-center">
                  <div className={`text-2xl font-bold ${
                    severity === 'critical' ? 'text-red-600' :
                    severity === 'high' ? 'text-orange-600' :
                    severity === 'medium' ? 'text-yellow-600' : 'text-green-600'
                  }`}>
                    {count}
                  </div>
                  <div className="text-sm text-gray-600 capitalize">{severity}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Top Threats */}
          <div className="bg-white p-6 rounded-lg border">
            <h3 className="text-lg font-semibold mb-4">Top Threat Types</h3>
            <div className="space-y-2">
              {Object.entries(analytics.threatTypeCount)
                .sort(([,a], [,b]) => b - a)
                .slice(0, 10)
                .map(([threat, count]) => (
                  <div key={threat} className="flex justify-between items-center">
                    <span className="text-sm font-medium">{threat.replace('_', ' ')}</span>
                    <span className="text-sm text-gray-600">{count}</span>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'threats' && (
        <div className="bg-white rounded-lg border overflow-hidden">
          <div className="px-6 py-4 border-b">
            <h3 className="text-lg font-semibold">Recent Threat Events</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Timestamp
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Severity
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Event Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    IP Address
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Risk Score
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Threats
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {threats.map((event) => (
                  <ThreatEventRow key={event.id} event={event} />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'sessions' && (
        <div className="bg-white rounded-lg border overflow-hidden">
          <div className="px-6 py-4 border-b">
            <h3 className="text-lg font-semibold">Active Sessions ({activeSessions.length})</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Session ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tier
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    IP Address
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Requests
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Risk Score
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Last Activity
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {activeSessions.map((session) => (
                  <SessionRow
                    key={session.sessionId}
                    session={session}
                    onTerminate={terminateSession}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'config' && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-lg border">
            <h3 className="text-lg font-semibold mb-4">Security Configuration</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-medium mb-2">Rate Limits</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Guest:</span>
                    <span>10 req/min</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Authenticated:</span>
                    <span>100 req/min</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Premium:</span>
                    <span>1000 req/min</span>
                  </div>
                </div>
              </div>
              <div>
                <h4 className="font-medium mb-2">Threat Thresholds</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Suspicious:</span>
                    <span>70%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>High Risk:</span>
                    <span>80%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Critical:</span>
                    <span>90%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg border">
            <h3 className="text-lg font-semibold mb-4">System Status</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span className="text-sm">Security Monitoring: Active</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span className="text-sm">Rate Limiting: Active</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span className="text-sm">Threat Detection: Active</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SecurityDashboard;