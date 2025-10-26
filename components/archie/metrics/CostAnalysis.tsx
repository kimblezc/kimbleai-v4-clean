'use client';

import React from 'react';

interface CostBreakdown {
  byAgent: Array<{ name: string; cost: number; tasks: number }>;
  byTaskType: Array<{ name: string; cost: number; tasks: number }>;
}

interface CostAnalysisProps {
  costBreakdown: CostBreakdown;
  totalCost: number;
  roi: number;
}

export function CostAnalysis({ costBreakdown, totalCost, roi }: CostAnalysisProps) {
  // Calculate cost efficiency metrics
  const totalTasks = costBreakdown.byAgent.reduce((sum, a) => sum + a.tasks, 0);
  const avgCostPerTask = totalTasks > 0 ? totalCost / totalTasks : 0;

  // Estimate value delivered (based on ROI)
  const valueDelivered = (totalCost * roi) / 100;

  return (
    <div className="bg-slate-900/50 backdrop-blur-sm border-2 border-slate-800 rounded-2xl p-6">
      {/* Header */}
      <div className="mb-6">
        <h3 className="text-xl font-bold text-white mb-1 flex items-center gap-2">
          <svg className="w-6 h-6 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Cost Analysis & ROI
        </h3>
        <p className="text-sm text-slate-400">
          Breaking down API costs and efficiency
        </p>
      </div>

      {/* ROI Hero Section */}
      <div className="relative overflow-hidden bg-gradient-to-br from-emerald-900/30 to-green-900/30 rounded-xl p-6 mb-6">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(16,185,129,0.15),transparent_70%)]"></div>

        <div className="relative z-10">
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="text-center">
              <div className="text-xs text-emerald-300 uppercase tracking-wider mb-1">Total Cost</div>
              <div className="text-3xl font-bold text-white">${totalCost.toFixed(2)}</div>
            </div>
            <div className="text-center">
              <div className="text-xs text-emerald-300 uppercase tracking-wider mb-1">Value Delivered</div>
              <div className="text-3xl font-bold text-white">${valueDelivered.toFixed(0)}</div>
            </div>
            <div className="text-center">
              <div className="text-xs text-emerald-300 uppercase tracking-wider mb-1">ROI</div>
              <div className="text-3xl font-bold bg-gradient-to-r from-emerald-400 to-green-400 bg-clip-text text-transparent">
                {roi.toFixed(0)}%
              </div>
            </div>
          </div>

          {/* Cost per task */}
          <div className="pt-4 border-t border-emerald-800/30">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-300">Average Cost per Task</span>
              <span className="text-lg font-bold text-emerald-400">${avgCostPerTask.toFixed(4)}</span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Extremely cost-effective compared to manual labor
            </p>
          </div>
        </div>
      </div>

      {/* Cost Breakdown Tabs */}
      <div className="space-y-4">
        {/* By Agent */}
        <div>
          <h4 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
            <div className="w-1 h-4 bg-purple-500 rounded"></div>
            Cost by Agent Type
          </h4>
          <div className="space-y-2">
            {costBreakdown.byAgent.map((agent, index) => {
              const percentage = totalCost > 0 ? (agent.cost / totalCost) * 100 : 0;
              const costPerTask = agent.tasks > 0 ? agent.cost / agent.tasks : 0;

              return (
                <div key={index} className="bg-slate-800/30 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-purple-500"></div>
                      <span className="text-sm font-medium text-white">{agent.name}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-bold text-emerald-400">
                        ${agent.cost.toFixed(3)}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                    <span>{agent.tasks} tasks (${costPerTask.toFixed(4)}/task)</span>
                    <span>{percentage.toFixed(1)}% of total</span>
                  </div>
                  <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-1000 ease-out"
                      style={{
                        width: `${percentage}%`,
                        transitionDelay: `${index * 100}ms`
                      }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* By Task Type */}
        <div>
          <h4 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
            <div className="w-1 h-4 bg-blue-500 rounded"></div>
            Cost by Task Type
          </h4>
          <div className="space-y-2">
            {costBreakdown.byTaskType.slice(0, 5).map((taskType, index) => {
              const percentage = totalCost > 0 ? (taskType.cost / totalCost) * 100 : 0;
              const costPerTask = taskType.tasks > 0 ? taskType.cost / taskType.tasks : 0;

              return (
                <div key={index} className="bg-slate-800/30 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                      <span className="text-sm font-medium text-white">
                        {taskType.name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-bold text-emerald-400">
                        ${taskType.cost.toFixed(3)}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                    <span>{taskType.tasks} tasks (${costPerTask.toFixed(4)}/task)</span>
                    <span>{percentage.toFixed(1)}% of total</span>
                  </div>
                  <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-blue-500 to-cyan-500 transition-all duration-1000 ease-out"
                      style={{
                        width: `${percentage}%`,
                        transitionDelay: `${index * 100}ms`
                      }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Efficiency Badge */}
      <div className="mt-6 p-4 bg-gradient-to-r from-emerald-900/30 to-green-900/30 border border-emerald-800/30 rounded-lg">
        <div className="flex items-center gap-3">
          <div className="flex-shrink-0 w-10 h-10 bg-emerald-500/20 rounded-full flex items-center justify-center">
            <svg className="w-6 h-6 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="flex-1">
            <div className="text-sm font-semibold text-emerald-300">Highly Cost-Effective</div>
            <div className="text-xs text-slate-400">
              For every $1 spent on Archie, you save ~${(roi / 100).toFixed(0)} in manual labor costs
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
