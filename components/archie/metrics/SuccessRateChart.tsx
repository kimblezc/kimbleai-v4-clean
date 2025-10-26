'use client';

import React from 'react';

interface AgentData {
  agentType: string;
  completed: number;
  failed: number;
  successRate: number;
}

interface SuccessRateChartProps {
  data: AgentData[];
}

export function SuccessRateChart({ data }: SuccessRateChartProps) {
  // Calculate total for percentages
  const totalTasks = data.reduce((sum, agent) => sum + agent.completed + agent.failed, 0);

  // Generate colors for each agent type
  const colors = [
    { from: 'from-purple-500', to: 'to-pink-500', bg: 'bg-purple-500' },
    { from: 'from-blue-500', to: 'to-cyan-500', bg: 'bg-blue-500' },
    { from: 'from-green-500', to: 'to-emerald-500', bg: 'bg-green-500' },
    { from: 'from-orange-500', to: 'to-red-500', bg: 'bg-orange-500' },
    { from: 'from-yellow-500', to: 'to-orange-500', bg: 'bg-yellow-500' },
    { from: 'from-indigo-500', to: 'to-purple-500', bg: 'bg-indigo-500' },
    { from: 'from-pink-500', to: 'to-rose-500', bg: 'bg-pink-500' },
    { from: 'from-teal-500', to: 'to-cyan-500', bg: 'bg-teal-500' },
  ];

  // Calculate donut segments
  let currentAngle = 0;
  const segments = data.map((agent, index) => {
    const total = agent.completed + agent.failed;
    const percentage = totalTasks > 0 ? (total / totalTasks) * 100 : 0;
    const angle = (percentage / 100) * 360;

    const segment = {
      ...agent,
      percentage,
      startAngle: currentAngle,
      endAngle: currentAngle + angle,
      color: colors[index % colors.length],
      total
    };

    currentAngle += angle;
    return segment;
  });

  // SVG donut chart parameters
  const size = 200;
  const center = size / 2;
  const radius = 70;
  const innerRadius = 45;

  const polarToCartesian = (angle: number, r: number) => {
    const angleInRadians = ((angle - 90) * Math.PI) / 180;
    return {
      x: center + r * Math.cos(angleInRadians),
      y: center + r * Math.sin(angleInRadians)
    };
  };

  const createArcPath = (startAngle: number, endAngle: number) => {
    const start = polarToCartesian(startAngle, radius);
    const end = polarToCartesian(endAngle, radius);
    const innerStart = polarToCartesian(endAngle, innerRadius);
    const innerEnd = polarToCartesian(startAngle, innerRadius);

    const largeArcFlag = endAngle - startAngle > 180 ? 1 : 0;

    return [
      `M ${start.x} ${start.y}`,
      `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${end.x} ${end.y}`,
      `L ${innerStart.x} ${innerStart.y}`,
      `A ${innerRadius} ${innerRadius} 0 ${largeArcFlag} 0 ${innerEnd.x} ${innerEnd.y}`,
      'Z'
    ].join(' ');
  };

  return (
    <div className="bg-slate-900/50 backdrop-blur-sm border-2 border-slate-800 rounded-2xl p-6">
      {/* Header */}
      <div className="mb-6">
        <h3 className="text-xl font-bold text-white mb-1 flex items-center gap-2">
          <svg className="w-6 h-6 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
          </svg>
          Success Rate by Agent Type
        </h3>
        <p className="text-sm text-slate-400">
          Task distribution and performance
        </p>
      </div>

      <div className="flex flex-col lg:flex-row items-center gap-8">
        {/* Donut Chart */}
        <div className="flex-shrink-0">
          <div className="relative">
            <svg width={size} height={size} className="transform -rotate-90">
              {segments.map((segment, index) => {
                if (segment.percentage === 0) return null;

                return (
                  <g key={index} className="group">
                    <path
                      d={createArcPath(segment.startAngle, segment.endAngle)}
                      className={`
                        fill-current transition-all duration-300
                        ${segment.color.bg.replace('bg-', 'text-')}
                        hover:opacity-80
                      `}
                      style={{
                        filter: 'drop-shadow(0 4px 6px rgba(0, 0, 0, 0.3))'
                      }}
                    />
                    {/* Tooltip effect would go here */}
                  </g>
                );
              })}
            </svg>

            {/* Center text */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <div className="text-3xl font-bold text-white">{totalTasks}</div>
                <div className="text-xs text-slate-400 uppercase tracking-wider">Total Tasks</div>
              </div>
            </div>
          </div>
        </div>

        {/* Legend and Stats */}
        <div className="flex-1 space-y-3 w-full">
          {segments.map((segment, index) => (
            <div
              key={index}
              className="group bg-slate-800/30 hover:bg-slate-800/50 rounded-lg p-3 transition-all duration-200"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${segment.color.bg}`}></div>
                  <span className="font-medium text-white text-sm">{segment.agentType}</span>
                </div>
                <div className="text-right">
                  <span className={`
                    text-sm font-bold
                    ${segment.successRate >= 90 ? 'text-green-400' :
                      segment.successRate >= 70 ? 'text-yellow-400' :
                      'text-orange-400'}
                  `}>
                    {segment.successRate.toFixed(1)}%
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>{segment.total} tasks ({segment.percentage.toFixed(1)}%)</span>
                <span>
                  <span className="text-green-400">{segment.completed}</span>
                  {' / '}
                  <span className="text-red-400">{segment.failed}</span>
                </span>
              </div>

              {/* Mini progress bar */}
              <div className="mt-2 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                <div
                  className={`h-full bg-gradient-to-r ${segment.color.from} ${segment.color.to} transition-all duration-1000 ease-out`}
                  style={{
                    width: `${segment.successRate}%`,
                    transitionDelay: `${index * 100}ms`
                  }}
                ></div>
              </div>
            </div>
          ))}

          {data.length === 0 && (
            <div className="text-center py-8 text-slate-500">
              <svg className="w-12 h-12 mx-auto mb-2 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
              </svg>
              <p className="text-sm">No agent data available</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
