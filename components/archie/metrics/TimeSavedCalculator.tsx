'use client';

import React, { useState } from 'react';

interface TaskTypeData {
  taskType: string;
  count: number;
  avgDuration: number;
  timeSaved: number;
  color: string;
}

interface TimeSavedCalculatorProps {
  taskTypeBreakdown: TaskTypeData[];
  totalTimeSaved: number; // in minutes
}

export function TimeSavedCalculator({ taskTypeBreakdown, totalTimeSaved }: TimeSavedCalculatorProps) {
  const [showMethodology, setShowMethodology] = useState(false);

  // Calculate value based on $50/hour rate (conservative estimate)
  const hourlyRate = 50;
  const hoursSaved = totalTimeSaved / 60;
  const dollarValue = hoursSaved * hourlyRate;

  // Project monthly and yearly
  const monthlyHours = hoursSaved * 30; // Approximate
  const monthlyValue = monthlyHours * hourlyRate;
  const yearlyHours = hoursSaved * 365;
  const yearlyValue = yearlyHours * hourlyRate;

  // Time saved per task type methodology
  const taskTimeEstimates: Record<string, number> = {
    'monitor_errors': 15, // 15 min to manually check logs
    'optimize_performance': 30, // 30 min for manual analysis
    'fix_bugs': 45, // 45 min average bug fix
    'run_tests': 10, // 10 min to run and verify tests
    'analyze_logs': 20, // 20 min for log analysis
    'security_scan': 25, // 25 min for security review
    'dependency_update': 20, // 20 min to update and test
    'code_cleanup': 15, // 15 min for cleanup tasks
    'documentation_update': 20, // 20 min for docs
  };

  return (
    <div className="bg-slate-900/50 backdrop-blur-sm border-2 border-slate-800 rounded-2xl p-6">
      {/* Header */}
      <div className="mb-6">
        <h3 className="text-xl font-bold text-white mb-1 flex items-center gap-2">
          <svg className="w-6 h-6 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Time Saved Calculator
        </h3>
        <p className="text-sm text-slate-400">
          Quantifying the value of automation
        </p>
      </div>

      {/* Big Number Display */}
      <div className="relative overflow-hidden bg-gradient-to-br from-blue-900/30 to-cyan-900/30 rounded-xl p-6 mb-6">
        {/* Glow effect */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(59,130,246,0.15),transparent_70%)]"></div>

        <div className="relative z-10">
          <div className="text-center mb-4">
            <div className="text-sm text-blue-300 uppercase tracking-wider mb-2">Total Time Saved</div>
            <div className="flex items-baseline justify-center gap-3">
              <span className="text-6xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
                {hoursSaved.toFixed(1)}
              </span>
              <span className="text-2xl text-blue-400 font-medium">hours</span>
            </div>
            <div className="text-sm text-slate-400 mt-2">
              ({totalTimeSaved} minutes across all tasks)
            </div>
          </div>

          {/* Value Calculation */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-blue-800/30">
            <div className="text-center">
              <div className="text-2xl font-bold text-white">${dollarValue.toFixed(0)}</div>
              <div className="text-xs text-slate-400 uppercase tracking-wider">Current Value</div>
              <div className="text-xs text-blue-400 mt-1">@ ${hourlyRate}/hr</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-white">${monthlyValue.toFixed(0)}</div>
              <div className="text-xs text-slate-400 uppercase tracking-wider">Monthly Projection</div>
              <div className="text-xs text-blue-400 mt-1">~{monthlyHours.toFixed(0)} hrs/mo</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-white">${yearlyValue.toFixed(0)}</div>
              <div className="text-xs text-slate-400 uppercase tracking-wider">Yearly Projection</div>
              <div className="text-xs text-blue-400 mt-1">~{yearlyHours.toFixed(0)} hrs/yr</div>
            </div>
          </div>
        </div>
      </div>

      {/* Task Type Breakdown */}
      <div className="space-y-3 mb-4">
        <div className="text-sm font-semibold text-slate-300 mb-2">Time Saved by Task Type</div>
        {taskTypeBreakdown.slice(0, 5).map((task, index) => {
          const taskHours = task.timeSaved / 60;
          const taskPercentage = totalTimeSaved > 0 ? (task.timeSaved / totalTimeSaved) * 100 : 0;

          return (
            <div key={index} className="bg-slate-800/30 rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${task.color}`}></div>
                  <span className="text-sm font-medium text-white">
                    {task.taskType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </span>
                </div>
                <span className="text-sm font-bold text-blue-400">
                  {taskHours.toFixed(1)}h
                </span>
              </div>
              <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                <span>{task.count} tasks completed</span>
                <span>{taskPercentage.toFixed(1)}% of total</span>
              </div>
              <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
                <div
                  className={`h-full ${task.color} transition-all duration-1000 ease-out`}
                  style={{
                    width: `${taskPercentage}%`,
                    transitionDelay: `${index * 100}ms`
                  }}
                ></div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Methodology Toggle */}
      <button
        onClick={() => setShowMethodology(!showMethodology)}
        className="w-full py-2 px-4 bg-slate-800/50 hover:bg-slate-800 rounded-lg text-sm text-slate-300 transition-colors flex items-center justify-between"
      >
        <span>How is this calculated?</span>
        <svg
          className={`w-4 h-4 transition-transform ${showMethodology ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Methodology Details */}
      {showMethodology && (
        <div className="mt-4 p-4 bg-slate-800/30 rounded-lg text-xs text-slate-400 space-y-2">
          <p className="font-semibold text-slate-300">Time Saved Methodology:</p>
          <p>
            Each task type has an estimated manual completion time based on industry standards:
          </p>
          <ul className="space-y-1 ml-4">
            <li>• Error Monitoring: 15 min (manual log review)</li>
            <li>• Performance Optimization: 30 min (analysis + implementation)</li>
            <li>• Bug Fixes: 45 min (diagnosis + fix + testing)</li>
            <li>• Test Execution: 10 min (run + verify results)</li>
            <li>• Log Analysis: 20 min (review + pattern detection)</li>
            <li>• Security Scans: 25 min (manual review + remediation)</li>
            <li>• Dependency Updates: 20 min (update + compatibility testing)</li>
            <li>• Code Cleanup: 15 min (refactoring + review)</li>
            <li>• Documentation: 20 min (writing + formatting)</li>
          </ul>
          <p className="pt-2 border-t border-slate-700">
            Time saved = (Manual time - Archie's automated time) × Number of tasks completed
          </p>
          <p>
            Dollar value calculated at ${hourlyRate}/hour (conservative developer rate).
            Actual value may be higher for senior developers or specialized tasks.
          </p>
        </div>
      )}
    </div>
  );
}
