'use client';

import React from 'react';

interface Agent {
  name: string;
  icon: string;
  schedule: string;
  description: string;
  color: string;
  borderColor: string;
  status: 'active' | 'idle';
  nextRun?: string;
}

export function AgentStatus() {
  const now = new Date();

  // Calculate next run times based on cron schedules
  const getNextRun = (minutes: number): string => {
    const next = new Date(now.getTime() + minutes * 60 * 1000);
    const diff = next.getTime() - now.getTime();
    const mins = Math.floor(diff / 60000);

    if (mins < 1) return 'Running now';
    if (mins < 60) return `${mins}m`;
    if (mins < 1440) return `${Math.floor(mins / 60)}h ${mins % 60}m`;
    return `${Math.floor(mins / 1440)}d`;
  };

  const agents: Agent[] = [
    {
      name: 'Autonomous Agent',
      icon: '🦉',
      schedule: 'Every 5 minutes',
      description: 'Monitors conversations and creates tasks automatically',
      color: 'from-green-500 to-emerald-500',
      borderColor: 'border-green-500/30',
      status: 'active',
      nextRun: getNextRun(5)
    },
    {
      name: 'Utility Agent',
      icon: '🔍',
      schedule: 'Every 15 minutes',
      description: 'Analyzes logs, monitors performance, detects issues',
      color: 'from-blue-500 to-cyan-500',
      borderColor: 'border-blue-500/30',
      status: 'active',
      nextRun: getNextRun(15)
    },
    {
      name: 'Drive Intelligence',
      icon: '📁',
      schedule: 'Every 6 hours',
      description: 'Organizes files, transcribes audio, finds duplicates',
      color: 'from-purple-500 to-pink-500',
      borderColor: 'border-purple-500/30',
      status: 'active',
      nextRun: getNextRun(360)
    },
    {
      name: 'Device Sync',
      icon: '🔄',
      schedule: 'Every 2 minutes',
      description: 'Syncs context and conversations across devices',
      color: 'from-orange-500 to-red-500',
      borderColor: 'border-orange-500/30',
      status: 'active',
      nextRun: getNextRun(2)
    }
  ];

  return (
    <div className="bg-slate-900/50 backdrop-blur-sm border-2 border-slate-800 rounded-2xl p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-bold text-white mb-1">Active Agents</h3>
          <p className="text-sm text-slate-400">Autonomous systems running 24/7</p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-green-500/10 border border-green-500/30 rounded-lg">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          <span className="text-xs font-medium text-green-400">{agents.length} Active</span>
        </div>
      </div>

      {/* Agent List */}
      <div className="space-y-3">
        {agents.map((agent, index) => (
          <div
            key={index}
            className={`
              relative group overflow-hidden
              bg-slate-800/30 border-2 ${agent.borderColor}
              rounded-xl p-4
              hover:bg-slate-800/50 hover:scale-[1.02]
              transition-all duration-200
            `}
          >
            {/* Gradient overlay */}
            <div className={`
              absolute inset-0 opacity-0 group-hover:opacity-5
              bg-gradient-to-br ${agent.color}
              transition-opacity duration-300
            `} />

            {/* Content */}
            <div className="relative z-10">
              <div className="flex items-start gap-3">
                {/* Icon */}
                <div className="text-2xl group-hover:scale-110 transition-transform duration-200">
                  {agent.icon}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <h4 className="text-sm font-bold text-white truncate">
                      {agent.name}
                    </h4>
                    {agent.status === 'active' && (
                      <div className="flex items-center gap-1.5 px-2 py-0.5 bg-green-500/10 border border-green-500/30 rounded-md">
                        <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                        <span className="text-xs font-medium text-green-400">Active</span>
                      </div>
                    )}
                  </div>

                  <p className="text-xs text-slate-400 mb-2 line-clamp-1">
                    {agent.description}
                  </p>

                  <div className="flex items-center justify-between gap-4 text-xs">
                    <div className="flex items-center gap-1.5 text-slate-500">
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span>{agent.schedule}</span>
                    </div>
                    {agent.nextRun && (
                      <div className="font-medium text-slate-300">
                        Next: {agent.nextRun}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Footer note */}
      <div className="mt-4 pt-4 border-t border-slate-800">
        <p className="text-xs text-slate-500 leading-relaxed">
          All agents run automatically via Vercel Cron. No manual intervention required.
        </p>
      </div>
    </div>
  );
}
