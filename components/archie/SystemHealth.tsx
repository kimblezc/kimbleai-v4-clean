'use client';

import React from 'react';

interface SystemHealthProps {
  systemHealth: {
    agentEnabled: boolean;
    lastHealthCheck: string;
    errorRate: number;
  };
  errorCount: number;
}

export function SystemHealth({ systemHealth, errorCount }: SystemHealthProps) {
  const { agentEnabled, lastHealthCheck, errorRate } = systemHealth;

  const getHealthStatus = () => {
    if (!agentEnabled) return { status: 'offline', color: 'red', label: 'Offline' };
    if (errorRate > 10) return { status: 'degraded', color: 'yellow', label: 'Degraded' };
    if (errorCount > 5) return { status: 'warning', color: 'orange', label: 'Warning' };
    return { status: 'healthy', color: 'green', label: 'Healthy' };
  };

  const health = getHealthStatus();

  const getTimeAgo = (dateString: string): string => {
    const date = new Date(dateString);
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);

    if (seconds < 60) return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  };

  const healthMetrics = [
    {
      label: 'Agent Status',
      value: agentEnabled ? 'Enabled' : 'Disabled',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      color: agentEnabled ? 'text-green-400' : 'text-red-400',
      bg: agentEnabled ? 'bg-green-500/10' : 'bg-red-500/10'
    },
    {
      label: 'Error Rate',
      value: `${errorRate}%`,
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      ),
      color: errorRate > 10 ? 'text-red-400' : errorRate > 5 ? 'text-yellow-400' : 'text-green-400',
      bg: errorRate > 10 ? 'bg-red-500/10' : errorRate > 5 ? 'bg-yellow-500/10' : 'bg-green-500/10'
    },
    {
      label: 'Critical Issues',
      value: errorCount.toString(),
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      color: errorCount > 5 ? 'text-red-400' : errorCount > 0 ? 'text-yellow-400' : 'text-green-400',
      bg: errorCount > 5 ? 'bg-red-500/10' : errorCount > 0 ? 'bg-yellow-500/10' : 'bg-green-500/10'
    },
    {
      label: 'Last Check',
      value: getTimeAgo(lastHealthCheck),
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      color: 'text-blue-400',
      bg: 'bg-blue-500/10'
    }
  ];

  return (
    <div className="bg-slate-900/50 backdrop-blur-sm border-2 border-slate-800 rounded-2xl p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-bold text-white mb-1">System Health</h3>
          <p className="text-sm text-slate-400">Real-time status monitoring</p>
        </div>
      </div>

      {/* Overall Health Status */}
      <div className={`
        relative overflow-hidden
        border-2 rounded-xl p-5 mb-6
        ${health.color === 'green' ? 'bg-green-500/5 border-green-500/30' :
          health.color === 'yellow' ? 'bg-yellow-500/5 border-yellow-500/30' :
          health.color === 'orange' ? 'bg-orange-500/5 border-orange-500/30' :
          'bg-red-500/5 border-red-500/30'}
      `}>
        {/* Gradient overlay */}
        <div className={`
          absolute inset-0 opacity-10
          ${health.color === 'green' ? 'bg-gradient-to-br from-green-500 to-emerald-500' :
            health.color === 'yellow' ? 'bg-gradient-to-br from-yellow-500 to-orange-500' :
            health.color === 'orange' ? 'bg-gradient-to-br from-orange-500 to-red-500' :
            'bg-gradient-to-br from-red-500 to-pink-500'}
        `} />

        {/* Content */}
        <div className="relative z-10 flex items-center gap-4">
          {/* Status icon */}
          <div className={`
            relative flex items-center justify-center w-12 h-12 rounded-xl
            ${health.color === 'green' ? 'bg-green-500/20' :
              health.color === 'yellow' ? 'bg-yellow-500/20' :
              health.color === 'orange' ? 'bg-orange-500/20' :
              'bg-red-500/20'}
          `}>
            {health.status === 'healthy' ? (
              <svg className={`w-6 h-6 text-${health.color}-400`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            ) : health.status === 'degraded' || health.status === 'warning' ? (
              <svg className={`w-6 h-6 text-${health.color}-400`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            ) : (
              <svg className={`w-6 h-6 text-${health.color}-400`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            )}

            {/* Pulse animation for healthy */}
            {health.status === 'healthy' && (
              <div className="absolute inset-0 bg-green-400 rounded-xl animate-ping opacity-20" />
            )}
          </div>

          {/* Status text */}
          <div className="flex-1">
            <div className={`
              text-lg font-bold mb-0.5
              ${health.color === 'green' ? 'text-green-400' :
                health.color === 'yellow' ? 'text-yellow-400' :
                health.color === 'orange' ? 'text-orange-400' :
                'text-red-400'}
            `}>
              {health.label}
            </div>
            <div className="text-xs text-slate-400">
              All systems {health.status === 'healthy' ? 'operational' : 'require attention'}
            </div>
          </div>
        </div>
      </div>

      {/* Health Metrics Grid */}
      <div className="space-y-3">
        {healthMetrics.map((metric, index) => (
          <div
            key={index}
            className={`
              flex items-center justify-between
              ${metric.bg} border border-slate-700/50
              rounded-lg p-3
              hover:scale-[1.02]
              transition-all duration-200
            `}
          >
            <div className="flex items-center gap-3">
              <div className={`${metric.color}`}>
                {metric.icon}
              </div>
              <div>
                <div className="text-xs text-slate-400 mb-0.5">
                  {metric.label}
                </div>
                <div className={`text-sm font-bold ${metric.color}`}>
                  {metric.value}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="mt-4 pt-4 border-t border-slate-800">
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-500">Monitoring 4 agents</span>
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
            <span className="text-slate-500">Live</span>
          </div>
        </div>
      </div>
    </div>
  );
}
