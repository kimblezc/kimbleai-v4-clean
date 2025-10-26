import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Constants for calculations
const HOURLY_RATE = 50; // Conservative developer hourly rate
const COST_PER_1K_TOKENS = 0.003; // Average LLM API cost
const AVG_TOKENS_PER_TASK = 1500; // Estimated average

// Time saved estimates per task type (in minutes)
const TASK_TIME_ESTIMATES: Record<string, number> = {
  'monitor_errors': 15,
  'optimize_performance': 30,
  'fix_bugs': 45,
  'run_tests': 10,
  'analyze_logs': 20,
  'security_scan': 25,
  'dependency_update': 20,
  'code_cleanup': 15,
  'documentation_update': 20,
};

// Agent colors for visualization
const AGENT_COLORS: Record<string, string> = {
  'monitor_errors': 'bg-red-500',
  'optimize_performance': 'bg-blue-500',
  'fix_bugs': 'bg-orange-500',
  'run_tests': 'bg-green-500',
  'analyze_logs': 'bg-purple-500',
  'security_scan': 'bg-yellow-500',
  'dependency_update': 'bg-indigo-500',
  'code_cleanup': 'bg-pink-500',
  'documentation_update': 'bg-cyan-500',
};

export async function GET() {
  try {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Fetch all tasks from last 30 days
    const { data: allTasks, error: tasksError } = await supabase
      .from('agent_tasks')
      .select('*')
      .gte('created_at', thirtyDaysAgo.toISOString())
      .order('created_at', { ascending: true });

    if (tasksError) throw tasksError;

    const tasks = allTasks || [];

    // Calculate overview metrics
    const completedTasks = tasks.filter(t => t.status === 'completed');
    const failedTasks = tasks.filter(t => t.status === 'failed');
    const totalTasks = tasks.length;
    const successRate = totalTasks > 0 ? (completedTasks.length / totalTasks) * 100 : 0;

    // Calculate total time saved
    let totalTimeSaved = 0;
    completedTasks.forEach(task => {
      const estimatedTime = TASK_TIME_ESTIMATES[task.task_type] || 20;
      const actualTime = task.duration_ms ? task.duration_ms / 1000 / 60 : 2; // Convert to minutes
      totalTimeSaved += Math.max(0, estimatedTime - actualTime);
    });

    // Calculate total cost
    const totalCost = (totalTasks * AVG_TOKENS_PER_TASK * COST_PER_1K_TOKENS) / 1000;

    // Calculate ROI
    const valueDelivered = (totalTimeSaved / 60) * HOURLY_RATE;
    const roi = totalCost > 0 ? (valueDelivered / totalCost) * 100 : 0;

    // Generate time series data
    const dailyData = generateTimeSeriesData(tasks, 'daily', 30);
    const weeklyData = generateTimeSeriesData(tasks, 'weekly', 12);
    const monthlyData = generateTimeSeriesData(tasks, 'monthly', 6);

    // Agent breakdown
    const agentBreakdown = generateAgentBreakdown(tasks);

    // Task type breakdown with time saved
    const taskTypeBreakdown = generateTaskTypeBreakdown(completedTasks);

    // Activity heatmap (last 7 days, hourly)
    const activityHeatmap = await generateActivityHeatmap(sevenDaysAgo);

    // Cost breakdown
    const costBreakdown = generateCostBreakdown(tasks);

    const response = {
      overview: {
        totalTasks,
        completedTasks: completedTasks.length,
        failedTasks: failedTasks.length,
        successRate,
        totalTimeSaved,
        totalCost,
        roi,
      },
      timeSeriesData: {
        daily: dailyData,
        weekly: weeklyData,
        monthly: monthlyData,
      },
      agentBreakdown,
      taskTypeBreakdown,
      activityHeatmap,
      costBreakdown,
    };

    return NextResponse.json(response, {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
      },
    });
  } catch (error) {
    console.error('Error fetching performance data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch performance data' },
      { status: 500 }
    );
  }
}

function generateTimeSeriesData(
  tasks: any[],
  timeRange: 'daily' | 'weekly' | 'monthly',
  periods: number
) {
  const now = new Date();
  const data: Array<{ date?: string; week?: string; month?: string; completed: number; failed: number }> = [];

  for (let i = periods - 1; i >= 0; i--) {
    let startDate: Date;
    let endDate: Date;
    let label: string;

    if (timeRange === 'daily') {
      startDate = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      endDate = new Date(startDate.getTime() + 24 * 60 * 60 * 1000);
      label = startDate.toISOString().split('T')[0];

      const dayTasks = tasks.filter(t => {
        const taskDate = new Date(t.created_at);
        return taskDate >= startDate && taskDate < endDate;
      });

      data.push({
        date: label,
        completed: dayTasks.filter(t => t.status === 'completed').length,
        failed: dayTasks.filter(t => t.status === 'failed').length,
      });
    } else if (timeRange === 'weekly') {
      startDate = new Date(now.getTime() - i * 7 * 24 * 60 * 60 * 1000);
      endDate = new Date(startDate.getTime() + 7 * 24 * 60 * 60 * 1000);
      label = `Week ${periods - i}`;

      const weekTasks = tasks.filter(t => {
        const taskDate = new Date(t.created_at);
        return taskDate >= startDate && taskDate < endDate;
      });

      data.push({
        week: label,
        completed: weekTasks.filter(t => t.status === 'completed').length,
        failed: weekTasks.filter(t => t.status === 'failed').length,
      });
    } else {
      // Monthly
      startDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
      endDate = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
      label = startDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });

      const monthTasks = tasks.filter(t => {
        const taskDate = new Date(t.created_at);
        return taskDate >= startDate && taskDate < endDate;
      });

      data.push({
        month: label,
        completed: monthTasks.filter(t => t.status === 'completed').length,
        failed: monthTasks.filter(t => t.status === 'failed').length,
      });
    }
  }

  return data;
}

function generateAgentBreakdown(tasks: any[]) {
  const breakdown: Record<string, { completed: number; failed: number; durations: number[] }> = {};

  tasks.forEach(task => {
    const type = task.task_type || 'unknown';
    if (!breakdown[type]) {
      breakdown[type] = { completed: 0, failed: 0, durations: [] };
    }

    if (task.status === 'completed') {
      breakdown[type].completed++;
      if (task.duration_ms) {
        breakdown[type].durations.push(task.duration_ms);
      }
    } else if (task.status === 'failed') {
      breakdown[type].failed++;
    }
  });

  return Object.entries(breakdown).map(([type, stats]) => {
    const total = stats.completed + stats.failed;
    const successRate = total > 0 ? (stats.completed / total) * 100 : 0;
    const avgDuration = stats.durations.length > 0
      ? stats.durations.reduce((a, b) => a + b, 0) / stats.durations.length
      : 0;

    return {
      agentType: type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
      completed: stats.completed,
      failed: stats.failed,
      avgDuration,
      successRate,
    };
  }).sort((a, b) => (b.completed + b.failed) - (a.completed + a.failed));
}

function generateTaskTypeBreakdown(completedTasks: any[]) {
  const breakdown: Record<string, { count: number; durations: number[] }> = {};

  completedTasks.forEach(task => {
    const type = task.task_type || 'unknown';
    if (!breakdown[type]) {
      breakdown[type] = { count: 0, durations: [] };
    }

    breakdown[type].count++;
    if (task.duration_ms) {
      breakdown[type].durations.push(task.duration_ms);
    }
  });

  return Object.entries(breakdown).map(([type, stats]) => {
    const avgDuration = stats.durations.length > 0
      ? stats.durations.reduce((a, b) => a + b, 0) / stats.durations.length
      : 0;

    const estimatedTime = TASK_TIME_ESTIMATES[type] || 20;
    const actualTime = avgDuration / 1000 / 60; // Convert to minutes
    const timeSaved = Math.max(0, estimatedTime - actualTime) * stats.count;

    return {
      taskType: type,
      count: stats.count,
      avgDuration,
      timeSaved,
      color: AGENT_COLORS[type] || 'bg-gray-500',
    };
  }).sort((a, b) => b.timeSaved - a.timeSaved);
}

async function generateActivityHeatmap(sevenDaysAgo: Date) {
  // Fetch logs from last 7 days
  const { data: logs } = await supabase
    .from('agent_logs')
    .select('timestamp')
    .gte('timestamp', sevenDaysAgo.toISOString());

  const weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const hourlyData: number[][] = Array(7).fill(null).map(() => Array(24).fill(0));

  (logs || []).forEach(log => {
    const date = new Date(log.timestamp);
    const dayOfWeek = date.getDay();
    const hour = date.getHours();
    hourlyData[dayOfWeek][hour]++;
  });

  return {
    hourly: hourlyData,
    weekday: weekdays,
  };
}

function generateCostBreakdown(tasks: any[]) {
  const byAgent: Record<string, { tasks: number; cost: number }> = {};
  const byTaskType: Record<string, { tasks: number; cost: number }> = {};

  tasks.forEach(task => {
    const type = task.task_type || 'unknown';
    const cost = (AVG_TOKENS_PER_TASK * COST_PER_1K_TOKENS) / 1000;

    // By agent (task type)
    if (!byAgent[type]) {
      byAgent[type] = { tasks: 0, cost: 0 };
    }
    byAgent[type].tasks++;
    byAgent[type].cost += cost;

    // By task type (same as agent in this case)
    if (!byTaskType[type]) {
      byTaskType[type] = { tasks: 0, cost: 0 };
    }
    byTaskType[type].tasks++;
    byTaskType[type].cost += cost;
  });

  return {
    byAgent: Object.entries(byAgent).map(([name, data]) => ({
      name: name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
      ...data,
    })).sort((a, b) => b.cost - a.cost),
    byTaskType: Object.entries(byTaskType).map(([name, data]) => ({
      name,
      ...data,
    })).sort((a, b) => b.cost - a.cost),
  };
}
