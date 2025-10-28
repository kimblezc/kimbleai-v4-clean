'use client';

/**
 * AgentCard Component
 *
 * Displays a single agent's status and key metrics on the Agent Command Center.
 * Clickable card that links to the agent's detailed subpage.
 */

import Link from 'next/link';
import { ReactNode } from 'react';

export interface AgentCardProps {
  name: string;
  icon: string;
  description: string;
  status: 'active' | 'idle' | 'error' | 'disabled';
  currentActivity?: string;
  metrics: {
    label: string;
    value: string | number;
    trend?: 'up' | 'down' | 'neutral';
  }[];
  detailsUrl: string;
  error?: string;
}

const statusConfig = {
  active: {
    bgColor: 'bg-green-900/30',
    borderColor: 'border-green-500/40',
    textColor: 'text-green-400',
    icon: '●',
    label: 'Active'
  },
  idle: {
    bgColor: 'bg-slate-900/30',
    borderColor: 'border-slate-500/40',
    textColor: 'text-slate-400',
    icon: '○',
    label: 'Idle'
  },
  error: {
    bgColor: 'bg-red-900/30',
    borderColor: 'border-red-500/40',
    textColor: 'text-red-400',
    icon: '⚠',
    label: 'Error'
  },
  disabled: {
    bgColor: 'bg-slate-900/20',
    borderColor: 'border-slate-600/30',
    textColor: 'text-slate-500',
    icon: '○',
    label: 'Disabled'
  }
};

export function AgentCard({
  name,
  icon,
  description,
  status,
  currentActivity,
  metrics,
  detailsUrl,
  error
}: AgentCardProps) {
  const config = statusConfig[status];

  return (
    <Link href={detailsUrl}>
      <div className={`
        relative overflow-hidden rounded-lg border-2 ${config.borderColor}
        ${config.bgColor} backdrop-blur-sm
        transition-all duration-300 cursor-pointer
        hover:border-indigo-500/50 hover:shadow-lg hover:shadow-indigo-500/20
        hover:scale-[1.02] hover:-translate-y-1
        p-6 h-full
      `}>
        {/* Animated background gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-900/10 via-transparent to-purple-900/10 opacity-0 hover:opacity-100 transition-opacity duration-300" />

        <div className="relative z-10">
          {/* Header */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="text-4xl">{icon}</div>
              <div>
                <h3 className="text-xl font-bold text-white">{name}</h3>
                <p className="text-sm text-slate-400 mt-0.5">{description}</p>
              </div>
            </div>

            {/* Status indicator */}
            <div className={`
              flex items-center gap-2 px-3 py-1.5 rounded-full
              ${config.bgColor} ${config.borderColor} border
            `}>
              <span className={`text-xs ${config.textColor} animate-pulse`}>
                {config.icon}
              </span>
              <span className={`text-xs font-semibold ${config.textColor}`}>
                {config.label}
              </span>
            </div>
          </div>

          {/* Current Activity */}
          {currentActivity && status === 'active' && (
            <div className="mb-4 p-3 rounded-md bg-indigo-950/30 border border-indigo-500/20">
              <div className="text-xs text-indigo-400 font-semibold mb-1">CURRENT ACTIVITY</div>
              <div className="text-sm text-slate-300">{currentActivity}</div>
            </div>
          )}

          {/* Error Message */}
          {error && status === 'error' && (
            <div className="mb-4 p-3 rounded-md bg-red-950/30 border border-red-500/20">
              <div className="text-xs text-red-400 font-semibold mb-1">ERROR</div>
              <div className="text-sm text-red-300">{error}</div>
            </div>
          )}

          {/* Metrics Grid */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            {metrics.map((metric, idx) => (
              <div
                key={idx}
                className="bg-slate-900/50 border border-slate-700/30 rounded-md p-3"
              >
                <div className="text-xs text-slate-500 font-medium mb-1">
                  {metric.label}
                </div>
                <div className="flex items-end justify-between">
                  <div className="text-2xl font-bold text-white">
                    {metric.value}
                  </div>
                  {metric.trend && (
                    <div className={`text-xs font-semibold ${
                      metric.trend === 'up' ? 'text-green-400' :
                      metric.trend === 'down' ? 'text-red-400' :
                      'text-slate-400'
                    }`}>
                      {metric.trend === 'up' ? '↑' : metric.trend === 'down' ? '↓' : '→'}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* View Details CTA */}
          <div className="flex items-center justify-between text-sm">
            <span className="text-indigo-400 font-semibold group-hover:text-indigo-300 transition-colors">
              View Details →
            </span>
            <span className="text-xs text-slate-500">
              Real-time monitoring
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}
