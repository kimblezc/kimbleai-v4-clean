'use client';

/**
 * Live Activity Feed Component
 *
 * Real-time streaming display of Archie's activities using Server-Sent Events.
 * Features dark D&D fantasy theme with magical visual effects.
 *
 * Features:
 * - Real-time SSE streaming
 * - Auto-scroll with pause option
 * - Category and level filtering
 * - Visual activity indicators
 * - Connection status monitoring
 * - Dark D&D fantasy aesthetic
 */

import React, { useEffect, useState, useRef, useMemo } from 'react';
import { ActivityEvent, ActivityLevel, ActivityCategory } from '@/lib/activity-stream';

interface LiveActivityFeedProps {
  maxItems?: number;
  autoScroll?: boolean;
  showFilters?: boolean;
}

interface StreamMessage {
  type: 'connected' | 'activity' | 'heartbeat' | 'stats';
  event?: ActivityEvent & { timestamp: string }; // timestamp as string from JSON
  message?: string;
  clientId?: string;
  timestamp?: string;
  stats?: {
    connectedClients: number;
    recentActivityCount: number;
    totalEvents: number;
  };
}

export function LiveActivityFeed({
  maxItems = 50,
  autoScroll = true,
  showFilters = true
}: LiveActivityFeedProps) {
  const [activities, setActivities] = useState<ActivityEvent[]>([]);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<ActivityCategory | 'all'>('all');
  const [selectedLevel, setSelectedLevel] = useState<ActivityLevel | 'all'>('all');
  const [stats, setStats] = useState({ connectedClients: 0, totalEvents: 0 });

  const scrollRef = useRef<HTMLDivElement>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  // Connect to SSE stream
  useEffect(() => {
    const connectToStream = () => {
      try {
        const eventSource = new EventSource('/api/archie/activity/stream');
        eventSourceRef.current = eventSource;

        eventSource.onopen = () => {
          console.log('[LiveActivityFeed] Connected to activity stream');
          setConnected(true);
          setError(null);
        };

        eventSource.onmessage = (event) => {
          try {
            const message: StreamMessage = JSON.parse(event.data);

            switch (message.type) {
              case 'connected':
                console.log('[LiveActivityFeed]', message.message);
                break;

              case 'activity':
                if (message.event) {
                  // Convert timestamp string back to Date
                  const activity: ActivityEvent = {
                    ...message.event,
                    timestamp: new Date(message.event.timestamp)
                  };

                  setActivities(prev => {
                    const updated = [...prev, activity];
                    // Keep only maxItems most recent
                    if (updated.length > maxItems) {
                      return updated.slice(-maxItems);
                    }
                    return updated;
                  });
                }
                break;

              case 'heartbeat':
                // Connection is alive
                break;

              case 'stats':
                if (message.stats) {
                  setStats(message.stats);
                }
                break;
            }
          } catch (err) {
            console.error('[LiveActivityFeed] Error parsing message:', err);
          }
        };

        eventSource.onerror = (err) => {
          console.error('[LiveActivityFeed] SSE error:', err);
          setConnected(false);
          setError('Connection lost. Reconnecting...');
          eventSource.close();

          // Attempt to reconnect after 3 seconds
          setTimeout(() => {
            if (eventSourceRef.current === eventSource) {
              connectToStream();
            }
          }, 3000);
        };
      } catch (err) {
        console.error('[LiveActivityFeed] Failed to connect:', err);
        setError('Failed to connect to activity stream');
      }
    };

    connectToStream();

    // Cleanup on unmount
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
    };
  }, [maxItems]);

  // Auto-scroll to bottom when new activities arrive
  useEffect(() => {
    if (autoScroll && !isPaused && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [activities, autoScroll, isPaused]);

  // Filter activities
  const filteredActivities = useMemo(() => {
    return activities.filter(activity => {
      if (selectedCategory !== 'all' && activity.category !== selectedCategory) {
        return false;
      }
      if (selectedLevel !== 'all' && activity.level !== selectedLevel) {
        return false;
      }
      return true;
    });
  }, [activities, selectedCategory, selectedLevel]);

  // Helper functions
  const getTimeDisplay = (date: Date): string => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
  };

  const getLevelIcon = (level: ActivityLevel): string => {
    const icons: Record<ActivityLevel, string> = {
      debug: '🔍',
      info: 'ℹ️',
      success: '✅',
      warn: '⚠️',
      error: '❌',
      critical: '🔴'
    };
    return icons[level] || '•';
  };

  const getLevelColor = (level: ActivityLevel): string => {
    const colors: Record<ActivityLevel, string> = {
      debug: 'text-slate-400 border-slate-700',
      info: 'text-blue-400 border-blue-500/30',
      success: 'text-emerald-400 border-emerald-500/30',
      warn: 'text-yellow-400 border-yellow-500/30',
      error: 'text-red-400 border-red-500/30',
      critical: 'text-red-500 border-red-500/50'
    };
    return colors[level] || 'text-slate-400 border-slate-700';
  };

  const getCategoryIcon = (category: ActivityCategory): string => {
    const icons: Record<ActivityCategory, string> = {
      drive_sync: '☁️',
      device_monitoring: '📱',
      transcription: '🎙️',
      task_processing: '⚙️',
      insight_generation: '💡',
      file_analysis: '📄',
      system: '🖥️',
      workflow: '🔄',
      custom: '⭐'
    };
    return icons[category] || '•';
  };

  return (
    <div className="relative">
      {/* Mystical Background Effect */}
      <div className="absolute -inset-1 bg-gradient-to-r from-purple-600/20 via-indigo-600/20 to-purple-600/20 rounded-2xl blur-xl opacity-30 animate-pulse" />

      <div className="relative bg-gradient-to-br from-slate-900 via-slate-900/95 to-slate-950 backdrop-blur-sm border-2 border-purple-500/20 rounded-2xl shadow-2xl overflow-hidden">
        {/* Decorative Corner Accents */}
        <div className="absolute top-0 left-0 w-32 h-32 bg-gradient-to-br from-purple-500/10 to-transparent rounded-br-full" />
        <div className="absolute bottom-0 right-0 w-32 h-32 bg-gradient-to-tl from-indigo-500/10 to-transparent rounded-tl-full" />

        {/* Header */}
        <div className="relative border-b border-purple-500/20 bg-gradient-to-r from-slate-900/50 via-slate-800/50 to-slate-900/50 p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="relative">
                {/* Orb Icon */}
                <div className={`
                  w-12 h-12 rounded-full flex items-center justify-center
                  bg-gradient-to-br from-purple-600 to-indigo-600
                  shadow-lg shadow-purple-500/50
                  ${connected ? 'animate-pulse' : 'opacity-50'}
                `}>
                  <span className="text-2xl">🔮</span>
                </div>
                {connected && (
                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full animate-ping" />
                )}
                {!connected && (
                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full" />
                )}
              </div>

              <div>
                <h3 className="text-xl font-bold bg-gradient-to-r from-purple-400 via-indigo-400 to-purple-400 bg-clip-text text-transparent">
                  🌟 Archie Oracle Stream 🌟
                </h3>
                <p className="text-sm text-slate-400 mt-1">
                  {connected ? (
                    <>
                      <span className="text-emerald-400">● Live</span> • Witnessing the arcane work unfold...
                    </>
                  ) : (
                    <>
                      <span className="text-red-400">● Disconnected</span> • {error || 'Reconnecting...'}
                    </>
                  )}
                </p>
              </div>
            </div>

            {/* Connection Stats */}
            <div className="flex items-center gap-4 text-xs">
              <div className="bg-slate-800/50 px-3 py-2 rounded-lg border border-slate-700">
                <div className="text-slate-400">Events</div>
                <div className="text-white font-bold text-lg">{filteredActivities.length}</div>
              </div>
              <div className="bg-slate-800/50 px-3 py-2 rounded-lg border border-slate-700">
                <div className="text-slate-400">Watchers</div>
                <div className="text-white font-bold text-lg">{stats.connectedClients}</div>
              </div>
            </div>
          </div>

          {/* Filters */}
          {showFilters && (
            <div className="mt-4 flex items-center gap-3 flex-wrap">
              <label className="text-xs text-slate-400 font-medium">Filter:</label>

              {/* Category Filter */}
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value as ActivityCategory | 'all')}
                className="px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white focus:border-purple-500 focus:ring-1 focus:ring-purple-500 outline-none"
              >
                <option value="all">All Categories</option>
                <option value="drive_sync">☁️ Drive Sync</option>
                <option value="device_monitoring">📱 Device Monitor</option>
                <option value="transcription">🎙️ Transcription</option>
                <option value="task_processing">⚙️ Task Processing</option>
                <option value="insight_generation">💡 Insights</option>
                <option value="file_analysis">📄 File Analysis</option>
                <option value="system">🖥️ System</option>
                <option value="workflow">🔄 Workflow</option>
              </select>

              {/* Level Filter */}
              <select
                value={selectedLevel}
                onChange={(e) => setSelectedLevel(e.target.value as ActivityLevel | 'all')}
                className="px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white focus:border-purple-500 focus:ring-1 focus:ring-purple-500 outline-none"
              >
                <option value="all">All Levels</option>
                <option value="debug">🔍 Debug</option>
                <option value="info">ℹ️ Info</option>
                <option value="success">✅ Success</option>
                <option value="warn">⚠️ Warning</option>
                <option value="error">❌ Error</option>
                <option value="critical">🔴 Critical</option>
              </select>

              {/* Pause/Resume Button */}
              <button
                onClick={() => setIsPaused(!isPaused)}
                className={`
                  ml-auto px-4 py-1.5 rounded-lg text-sm font-medium
                  transition-all duration-200
                  ${isPaused
                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
                  }
                `}
              >
                {isPaused ? '▶️ Resume' : '⏸️ Pause'}
              </button>
            </div>
          )}
        </div>

        {/* Activity Stream */}
        <div
          ref={scrollRef}
          className="p-6 space-y-3 max-h-[600px] overflow-y-auto scrollbar-thin scrollbar-thumb-purple-500/20 scrollbar-track-transparent"
        >
          {filteredActivities.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4 opacity-50">🧙‍♂️</div>
              <p className="text-slate-500 font-medium">The oracle awaits... No spells cast yet.</p>
              <p className="text-xs text-slate-600 mt-2">Activity will appear here in real-time</p>
            </div>
          ) : (
            filteredActivities.map((activity, index) => (
              <div
                key={activity.id}
                className={`
                  group relative
                  bg-gradient-to-r from-slate-800/40 via-slate-800/30 to-slate-800/40
                  border ${getLevelColor(activity.level).split(' ')[1]}
                  rounded-xl p-4
                  hover:from-slate-800/60 hover:via-slate-800/50 hover:to-slate-800/60
                  transition-all duration-300
                  animate-in fade-in slide-in-from-bottom-2
                  shadow-lg hover:shadow-xl
                `}
                style={{ animationDelay: `${Math.min(index, 10) * 50}ms` }}
              >
                {/* Shimmer Effect on Hover */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-purple-500/5 to-transparent opacity-0 group-hover:opacity-100 group-hover:animate-shimmer rounded-xl pointer-events-none" />

                <div className="flex items-start gap-3 relative z-10">
                  {/* Icon */}
                  <div className="flex-shrink-0 text-2xl mt-0.5">
                    {getCategoryIcon(activity.category)}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{getLevelIcon(activity.level)}</span>
                        <span className={`text-xs font-bold uppercase tracking-wider ${getLevelColor(activity.level).split(' ')[0]}`}>
                          {activity.agent}
                        </span>
                      </div>
                      <span className="text-xs text-slate-500 font-mono flex-shrink-0">
                        [{getTimeDisplay(activity.timestamp)}]
                      </span>
                    </div>

                    <p className="text-sm text-white leading-relaxed mb-2">
                      {activity.message}
                    </p>

                    {activity.details && (
                      <div className="mt-2 p-2 bg-slate-900/50 border border-slate-700 rounded-lg">
                        <p className="text-xs text-slate-400 font-mono whitespace-pre-wrap">
                          {activity.details}
                        </p>
                      </div>
                    )}

                    {/* Metadata */}
                    <div className="flex items-center gap-2 mt-3 flex-wrap">
                      <span className={`
                        px-2 py-1 rounded-md text-xs font-medium
                        bg-purple-500/10 text-purple-400 border border-purple-500/20
                      `}>
                        {activity.category.replace('_', ' ')}
                      </span>

                      {activity.duration && (
                        <span className="px-2 py-1 rounded-md text-xs font-medium bg-slate-700 text-slate-300">
                          ⏱️ {activity.duration}ms
                        </span>
                      )}

                      {activity.status && (
                        <span className={`
                          px-2 py-1 rounded-md text-xs font-medium
                          ${activity.status === 'completed' ? 'bg-emerald-500/10 text-emerald-400' : ''}
                          ${activity.status === 'in_progress' ? 'bg-blue-500/10 text-blue-400' : ''}
                          ${activity.status === 'failed' ? 'bg-red-500/10 text-red-400' : ''}
                          ${activity.status === 'started' ? 'bg-yellow-500/10 text-yellow-400' : ''}
                        `}>
                          {activity.status}
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
        {filteredActivities.length > 0 && (
          <div className="border-t border-purple-500/20 bg-slate-900/50 px-6 py-4">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500">
                {isPaused && <span className="text-yellow-400 mr-2">⏸️ Paused</span>}
                Showing {filteredActivities.length} of {activities.length} events
              </span>
              <span className="text-slate-600">
                Stream powered by Archie's mystical energies ✨
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Tailwind animation for shimmer effect */}
      <style jsx>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        .animate-shimmer {
          animation: shimmer 2s infinite;
        }
      `}</style>
    </div>
  );
}
