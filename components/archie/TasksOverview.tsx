'use client';

import React from 'react';

interface TasksOverviewProps {
  tasks: any[];
  byStatus: {
    pending: number;
    in_progress: number;
    completed: number;
    failed: number;
  };
  byType: Record<string, number>;
}

export function TasksOverview({ tasks, byStatus, byType }: TasksOverviewProps) {
  const totalTasks = byStatus.pending + byStatus.in_progress + byStatus.completed + byStatus.failed;

  const statusConfig = [
    {
      key: 'completed',
      label: 'Completed',
      count: byStatus.completed,
      color: 'from-green-500 to-emerald-500',
      borderColor: 'border-green-500/30',
      textColor: 'text-green-400',
      bgColor: 'bg-green-500/10',
      icon: '✓'
    },
    {
      key: 'in_progress',
      label: 'In Progress',
      count: byStatus.in_progress,
      color: 'from-blue-500 to-cyan-500',
      borderColor: 'border-blue-500/30',
      textColor: 'text-blue-400',
      bgColor: 'bg-blue-500/10',
      icon: '⟳'
    },
    {
      key: 'pending',
      label: 'Pending',
      count: byStatus.pending,
      color: 'from-yellow-500 to-orange-500',
      borderColor: 'border-yellow-500/30',
      textColor: 'text-yellow-400',
      bgColor: 'bg-yellow-500/10',
      icon: '○'
    },
    {
      key: 'failed',
      label: 'Failed',
      count: byStatus.failed,
      color: 'from-red-500 to-pink-500',
      borderColor: 'border-red-500/30',
      textColor: 'text-red-400',
      bgColor: 'bg-red-500/10',
      icon: '✕'
    }
  ];

  const getStatusColor = (status: string): string => {
    const config = statusConfig.find(s => s.key === status);
    return config?.textColor || 'text-slate-400';
  };

  const getStatusBg = (status: string): string => {
    const config = statusConfig.find(s => s.key === status);
    return config?.bgColor || 'bg-slate-500/10';
  };

  const getTaskTypeDisplay = (type: string): string => {
    return type
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const getTimeAgo = (dateString: string): string => {
    const date = new Date(dateString);
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);

    if (seconds < 60) return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  };

  return (
    <div className="bg-slate-900/50 backdrop-blur-sm border-2 border-slate-800 rounded-2xl p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-bold text-white mb-1">Task Management</h3>
          <p className="text-sm text-slate-400">Overview of all agent tasks</p>
        </div>
        <div className="px-3 py-1.5 bg-slate-800 rounded-lg">
          <span className="text-sm font-bold text-white">{totalTasks}</span>
          <span className="text-xs text-slate-400 ml-1">total</span>
        </div>
      </div>

      {/* Status Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {statusConfig.map((status) => {
          const percentage = totalTasks > 0 ? (status.count / totalTasks) * 100 : 0;
          return (
            <div
              key={status.key}
              className={`
                relative overflow-hidden
                bg-slate-800/30 border ${status.borderColor}
                rounded-xl p-4
                hover:scale-105
                transition-all duration-200
              `}
            >
              {/* Background gradient */}
              <div className={`
                absolute inset-0 opacity-5
                bg-gradient-to-br ${status.color}
              `} />

              {/* Content */}
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-2xl">{status.icon}</span>
                  <span className={`text-xs font-medium ${status.textColor}`}>
                    {percentage.toFixed(0)}%
                  </span>
                </div>
                <div className={`text-2xl font-bold ${status.textColor} mb-1`}>
                  {status.count}
                </div>
                <div className="text-xs text-slate-400 uppercase tracking-wide">
                  {status.label}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Task Type Distribution */}
      {Object.keys(byType).length > 0 && (
        <div className="mb-6">
          <h4 className="text-sm font-semibold text-slate-300 mb-3">By Type</h4>
          <div className="space-y-2">
            {Object.entries(byType)
              .sort(([, a], [, b]) => b - a)
              .slice(0, 5)
              .map(([type, count]) => {
                const percentage = totalTasks > 0 ? (count / totalTasks) * 100 : 0;
                return (
                  <div key={type} className="group">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium text-slate-400">
                        {getTaskTypeDisplay(type)}
                      </span>
                      <span className="text-xs text-slate-500">
                        {count} ({percentage.toFixed(0)}%)
                      </span>
                    </div>
                    <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-500"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* Recent Tasks */}
      <div>
        <h4 className="text-sm font-semibold text-slate-300 mb-3">Recent Tasks</h4>
        <div className="space-y-2 max-h-[400px] overflow-y-auto scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
          {tasks.length === 0 ? (
            <div className="text-center py-6">
              <div className="text-3xl mb-2">📋</div>
              <p className="text-sm text-slate-500">No tasks yet</p>
            </div>
          ) : (
            tasks.slice(0, 10).map((task) => (
              <div
                key={task.id}
                className={`
                  group
                  bg-slate-800/30 border ${statusConfig.find(s => s.key === task.status)?.borderColor || 'border-slate-700'}
                  rounded-lg p-3
                  hover:bg-slate-800/50
                  transition-all duration-200
                `}
              >
                <div className="flex items-start gap-3">
                  {/* Status indicator */}
                  <div className={`
                    mt-1 w-2 h-2 rounded-full flex-shrink-0
                    ${task.status === 'completed' ? 'bg-green-500' :
                      task.status === 'in_progress' ? 'bg-blue-500 animate-pulse' :
                      task.status === 'failed' ? 'bg-red-500' :
                      'bg-yellow-500'}
                  `} />

                  {/* Task info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <h5 className="text-sm font-medium text-white line-clamp-1">
                        {task.title}
                      </h5>
                      <span className="text-xs text-slate-500 flex-shrink-0">
                        {getTimeAgo(task.created_at)}
                      </span>
                    </div>

                    {task.description && (
                      <p className="text-xs text-slate-400 line-clamp-2 mb-2">
                        {task.description}
                      </p>
                    )}

                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`
                        px-2 py-0.5 rounded-md text-xs font-medium
                        ${getStatusBg(task.status)} ${getStatusColor(task.status)}
                      `}>
                        {task.status.replace('_', ' ')}
                      </span>
                      <span className="px-2 py-0.5 bg-slate-700/50 rounded-md text-xs text-slate-400">
                        {getTaskTypeDisplay(task.task_type)}
                      </span>
                      {task.priority && (
                        <span className="text-xs text-slate-500">
                          P{task.priority}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
