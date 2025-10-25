'use client';

import React from 'react';

interface ActivityFeedProps {
  activities: any[];
  findings: any[];
}

interface ActivityItem {
  id: string;
  type: 'log' | 'finding';
  timestamp: Date;
  message: string;
  level?: string;
  severity?: string;
  category?: string;
}

export function ActivityFeed({ activities, findings }: ActivityFeedProps) {
  // Combine and sort activities and findings
  const allItems: ActivityItem[] = [
    ...activities.map(a => ({
      id: a.id,
      type: 'log' as const,
      timestamp: new Date(a.timestamp),
      message: a.message,
      level: a.log_level,
      category: a.category
    })),
    ...findings.map(f => ({
      id: f.id,
      type: 'finding' as const,
      timestamp: new Date(f.detected_at),
      message: f.title,
      severity: f.severity,
      category: f.finding_type
    }))
  ].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()).slice(0, 15);

  const getTimeAgo = (date: Date): string => {
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);

    if (seconds < 60) return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  };

  const getIcon = (item: ActivityItem): React.ReactNode => {
    if (item.type === 'finding') {
      switch (item.severity) {
        case 'critical':
          return <span className="text-red-500">🔴</span>;
        case 'high':
          return <span className="text-orange-500">🟠</span>;
        case 'medium':
          return <span className="text-yellow-500">🟡</span>;
        default:
          return <span className="text-blue-500">🔵</span>;
      }
    }

    switch (item.level) {
      case 'error':
      case 'critical':
        return <span className="text-red-400">⚠️</span>;
      case 'warn':
        return <span className="text-yellow-400">⚡</span>;
      case 'info':
        return <span className="text-blue-400">ℹ️</span>;
      default:
        return <span className="text-slate-400">•</span>;
    }
  };

  const getColor = (item: ActivityItem): string => {
    if (item.type === 'finding') {
      switch (item.severity) {
        case 'critical':
          return 'text-red-400 border-red-500/30';
        case 'high':
          return 'text-orange-400 border-orange-500/30';
        case 'medium':
          return 'text-yellow-400 border-yellow-500/30';
        default:
          return 'text-blue-400 border-blue-500/30';
      }
    }

    switch (item.level) {
      case 'error':
      case 'critical':
        return 'text-red-400 border-red-500/30';
      case 'warn':
        return 'text-yellow-400 border-yellow-500/30';
      default:
        return 'text-slate-400 border-slate-700';
    }
  };

  return (
    <div className="bg-slate-900/50 backdrop-blur-sm border-2 border-slate-800 rounded-2xl p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-bold text-white mb-1">Activity Feed</h3>
          <p className="text-sm text-slate-400">Real-time agent actions & findings</p>
        </div>
        <div className="relative flex items-center justify-center">
          <div className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse" />
          <div className="absolute inset-0 w-2 h-2 bg-indigo-400 rounded-full animate-ping" />
        </div>
      </div>

      {/* Activity List */}
      <div className="space-y-3 max-h-[600px] overflow-y-auto scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
        {allItems.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-4xl mb-3">📭</div>
            <p className="text-sm text-slate-500">No recent activity</p>
          </div>
        ) : (
          allItems.map((item, index) => (
            <div
              key={item.id}
              className={`
                group relative
                bg-slate-800/30 border ${getColor(item).split(' ')[1]}
                rounded-lg p-3
                hover:bg-slate-800/50
                transition-all duration-200
                animate-in fade-in slide-in-from-top-2
              `}
              style={{ animationDelay: `${index * 30}ms` }}
            >
              <div className="flex items-start gap-3">
                {/* Icon */}
                <div className="text-lg flex-shrink-0 mt-0.5">
                  {getIcon(item)}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <p className="text-sm text-white line-clamp-2 leading-relaxed">
                      {item.message}
                    </p>
                    <span className="text-xs text-slate-500 flex-shrink-0">
                      {getTimeAgo(item.timestamp)}
                    </span>
                  </div>

                  {/* Metadata */}
                  <div className="flex items-center gap-2 text-xs">
                    {item.category && (
                      <span className={`
                        px-2 py-0.5 rounded-md font-medium
                        ${item.type === 'finding' ? 'bg-purple-500/10 text-purple-400' : 'bg-slate-700 text-slate-400'}
                      `}>
                        {item.category}
                      </span>
                    )}
                    {item.type === 'finding' && item.severity && (
                      <span className="text-slate-500">
                        {item.severity} severity
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Footer */}
      {allItems.length > 0 && (
        <div className="mt-4 pt-4 border-t border-slate-800">
          <p className="text-xs text-slate-500 text-center">
            Showing last {allItems.length} events
          </p>
        </div>
      )}
    </div>
  );
}
