'use client';

import React from 'react';
import Link from 'next/link';

interface DashboardHeaderProps {
  stats: {
    transcriptions: number;
    devices: number;
    pendingTasks: number;
    completedTasks: number;
    totalTasks: number;
    insights: number;
    activityToday: number;
    activityThisWeek: number;
    hasErrors: boolean;
  };
}

export function DashboardHeader({ stats }: DashboardHeaderProps) {
  const isHealthy = !stats.hasErrors && stats.activityToday > 0;

  return (
    <div className="relative mb-8">
      {/* Back to Home */}
      <Link
        href="/"
        className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors mb-6 group"
      >
        <svg
          className="w-4 h-4 group-hover:-translate-x-1 transition-transform"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Back to Chat
      </Link>

      <div className="flex items-start justify-between gap-8 flex-wrap">
        {/* Left side - Title & Icon */}
        <div className="flex items-start gap-6">
          {/* Animated Archie Icon */}
          <div className="relative group">
            <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/20 via-purple-500/20 to-pink-500/20 blur-2xl group-hover:blur-3xl transition-all duration-500" />
            <div className="relative text-7xl filter drop-shadow-2xl animate-float">
              🦉
            </div>
            {/* Status indicator */}
            <div className={`
              absolute -bottom-1 -right-1 w-6 h-6 rounded-full border-4 border-slate-950
              ${isHealthy ? 'bg-green-500 animate-pulse' : 'bg-yellow-500'}
            `}>
              <div className={`
                absolute inset-0 rounded-full animate-ping
                ${isHealthy ? 'bg-green-400' : 'bg-yellow-400'}
              `} />
            </div>
          </div>

          {/* Title & Description */}
          <div>
            <h1 className="text-5xl font-bold mb-3 bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
              Archie Dashboard
            </h1>
            <p className="text-lg text-slate-400 max-w-xl leading-relaxed">
              Real-time oversight center for autonomous AI agents
            </p>

            {/* Stats summary */}
            <div className="flex items-center gap-4 mt-4 text-sm text-slate-500">
              <span className="flex items-center gap-1.5">
                <span className="text-indigo-400 font-semibold">{stats.totalTasks}</span> total tasks
              </span>
              <span className="text-slate-700">•</span>
              <span className="flex items-center gap-1.5">
                <span className="text-purple-400 font-semibold">{stats.insights}</span> insights
              </span>
              <span className="text-slate-700">•</span>
              <span className="flex items-center gap-1.5">
                <span className="text-pink-400 font-semibold">{stats.activityToday}</span> actions today
              </span>
            </div>
          </div>
        </div>

        {/* Right side - Status Badge */}
        <div className="flex flex-col items-end gap-3">
          {/* System Status */}
          <div className={`
            inline-flex items-center gap-3 px-5 py-3 rounded-xl backdrop-blur-xl
            border shadow-lg transition-all duration-300
            ${isHealthy
              ? 'bg-green-500/10 border-green-500/30 hover:border-green-500/50'
              : 'bg-yellow-500/10 border-yellow-500/30 hover:border-yellow-500/50'
            }
          `}>
            <div className="relative flex items-center justify-center">
              <div className={`
                w-3 h-3 rounded-full
                ${isHealthy ? 'bg-green-500' : 'bg-yellow-500'}
              `} />
              <div className={`
                absolute inset-0 w-3 h-3 rounded-full animate-ping
                ${isHealthy ? 'bg-green-400' : 'bg-yellow-400'}
              `} />
            </div>
            <div>
              <div className={`text-sm font-bold ${isHealthy ? 'text-green-400' : 'text-yellow-400'}`}>
                {isHealthy ? 'All Systems Operational' : 'Limited Activity'}
              </div>
              <div className="text-xs text-slate-400 mt-0.5">
                {stats.completedTasks} tasks completed today
              </div>
            </div>
          </div>

          {/* Last updated */}
          <div className="text-xs text-slate-500 flex items-center gap-2">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Live data · Auto-refresh
          </div>
        </div>
      </div>
    </div>
  );
}
