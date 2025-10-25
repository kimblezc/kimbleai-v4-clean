'use client';

import React from 'react';

interface MetricsGridProps {
  stats: {
    transcriptions: number;
    devices: number;
    pendingTasks: number;
    completedTasks: number;
    totalTasks: number;
    insights: number;
    activityToday: number;
    activityThisWeek: number;
  };
}

interface MetricCardProps {
  label: string;
  value: number;
  icon: React.ReactNode;
  gradient: string;
  borderColor: string;
  trend?: {
    value: number;
    direction: 'up' | 'down' | 'neutral';
  };
}

function MetricCard({ label, value, icon, gradient, borderColor, trend }: MetricCardProps) {
  return (
    <div className={`
      relative group overflow-hidden
      bg-slate-900/50 backdrop-blur-sm
      border-2 ${borderColor}
      rounded-2xl p-6
      hover:scale-[1.02] hover:shadow-2xl
      transition-all duration-300
    `}>
      {/* Gradient overlay */}
      <div className={`
        absolute inset-0 opacity-0 group-hover:opacity-10
        bg-gradient-to-br ${gradient}
        transition-opacity duration-300
      `} />

      {/* Content */}
      <div className="relative z-10">
        <div className="flex items-start justify-between mb-4">
          {/* Icon */}
          <div className={`
            p-3 rounded-xl
            bg-gradient-to-br ${gradient}
            shadow-lg
            group-hover:scale-110 group-hover:rotate-3
            transition-transform duration-300
          `}>
            {icon}
          </div>

          {/* Trend indicator */}
          {trend && (
            <div className={`
              flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold
              ${trend.direction === 'up' ? 'bg-green-500/20 text-green-400' :
                trend.direction === 'down' ? 'bg-red-500/20 text-red-400' :
                'bg-slate-500/20 text-slate-400'}
            `}>
              {trend.direction === 'up' ? '↗' : trend.direction === 'down' ? '↘' : '→'}
              <span>{trend.value}%</span>
            </div>
          )}
        </div>

        {/* Label */}
        <div className="text-sm font-medium text-slate-400 uppercase tracking-wider mb-2">
          {label}
        </div>

        {/* Value */}
        <div className="text-4xl font-bold text-white">
          {value.toLocaleString()}
        </div>
      </div>
    </div>
  );
}

export function MetricsGrid({ stats }: MetricsGridProps) {
  const metrics: Omit<MetricCardProps, 'trend'>[] = [
    {
      label: 'Transcriptions',
      value: stats.transcriptions,
      icon: (
        <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
        </svg>
      ),
      gradient: 'from-blue-500 to-cyan-500',
      borderColor: 'border-blue-500/30'
    },
    {
      label: 'Active Devices',
      value: stats.devices,
      icon: (
        <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
        </svg>
      ),
      gradient: 'from-orange-500 to-red-500',
      borderColor: 'border-orange-500/30'
    },
    {
      label: 'Pending Tasks',
      value: stats.pendingTasks,
      icon: (
        <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
      ),
      gradient: 'from-yellow-500 to-orange-500',
      borderColor: 'border-yellow-500/30'
    },
    {
      label: 'Completed Today',
      value: stats.completedTasks,
      icon: (
        <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      gradient: 'from-green-500 to-emerald-500',
      borderColor: 'border-green-500/30'
    },
    {
      label: 'Recent Insights',
      value: stats.insights,
      icon: (
        <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
        </svg>
      ),
      gradient: 'from-purple-500 to-pink-500',
      borderColor: 'border-purple-500/30'
    },
    {
      label: 'Activity Today',
      value: stats.activityToday,
      icon: (
        <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      ),
      gradient: 'from-indigo-500 to-blue-500',
      borderColor: 'border-indigo-500/30'
    }
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {metrics.map((metric, index) => (
        <MetricCard
          key={index}
          {...metric}
        />
      ))}
    </div>
  );
}
