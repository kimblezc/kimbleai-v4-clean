/**
 * Autonomous Agent Status API
 *
 * Returns current status, recent tasks, findings, and reports
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const view = url.searchParams.get('view') || 'summary'; // summary, logs, tasks, findings, reports

    switch (view) {
      case 'summary':
        return await getSummary();

      case 'logs':
        return await getLogs(request);

      case 'tasks':
        return await getTasks(request);

      case 'findings':
        return await getFindings(request);

      case 'reports':
        return await getReports(request);

      default:
        return NextResponse.json({ error: 'Invalid view parameter' }, { status: 400 });
    }
  } catch (error: any) {
    console.error('Agent status API error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * Get summary dashboard
 */
async function getSummary() {
  const [state, recentTasks, recentFindings, latestReport, recentLogs] = await Promise.all([
    // Agent state
    supabase.from('agent_state').select('*'),

    // Recent tasks (last 24 hours)
    supabase
      .from('agent_tasks')
      .select('*')
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false })
      .limit(10),

    // Recent findings
    supabase
      .from('agent_findings')
      .select('*')
      .gte('detected_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .order('severity', { ascending: true })
      .limit(10),

    // Latest report
    supabase
      .from('agent_reports')
      .select('*')
      .order('generated_at', { ascending: false })
      .limit(1)
      .single(),

    // Recent log summary
    supabase
      .from('agent_logs')
      .select('log_level')
      .gte('timestamp', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
  ]);

  // Calculate statistics
  const taskStats = {
    total: recentTasks.data?.length || 0,
    completed: recentTasks.data?.filter(t => t.status === 'completed').length || 0,
    failed: recentTasks.data?.filter(t => t.status === 'failed').length || 0,
    pending: recentTasks.data?.filter(t => t.status === 'pending').length || 0
  };

  const findingStats = {
    total: recentFindings.data?.length || 0,
    critical: recentFindings.data?.filter(f => f.severity === 'critical').length || 0,
    high: recentFindings.data?.filter(f => f.severity === 'high').length || 0,
    medium: recentFindings.data?.filter(f => f.severity === 'medium').length || 0
  };

  const logStats = {
    total: recentLogs.data?.length || 0,
    errors: recentLogs.data?.filter(l => l.log_level === 'error').length || 0,
    warnings: recentLogs.data?.filter(l => l.log_level === 'warn').length || 0
  };

  return NextResponse.json({
    success: true,
    agent_state: state.data?.reduce((acc: any, s: any) => {
      acc[s.key] = s.value;
      return acc;
    }, {}),
    statistics: {
      tasks: taskStats,
      findings: findingStats,
      logs: logStats
    },
    latest_report: latestReport.data,
    recent_activity: {
      tasks: recentTasks.data?.slice(0, 5),
      findings: recentFindings.data?.slice(0, 5)
    }
  });
}

/**
 * Get technical logs
 */
async function getLogs(request: NextRequest) {
  const url = new URL(request.url);
  const level = url.searchParams.get('level'); // Filter by log level
  const limit = parseInt(url.searchParams.get('limit') || '100');

  let query = supabase
    .from('agent_logs')
    .select('*')
    .order('timestamp', { ascending: false })
    .limit(limit);

  if (level) {
    query = query.eq('log_level', level);
  }

  const { data, error } = await query;

  if (error) throw error;

  return NextResponse.json({
    success: true,
    logs: data,
    filters: { level, limit }
  });
}

/**
 * Get tasks
 */
async function getTasks(request: NextRequest) {
  const url = new URL(request.url);
  const status = url.searchParams.get('status');
  const limit = parseInt(url.searchParams.get('limit') || '50');

  let query = supabase
    .from('agent_tasks')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (status) {
    query = query.eq('status', status);
  }

  const { data, error } = await query;

  if (error) throw error;

  return NextResponse.json({
    success: true,
    tasks: data,
    filters: { status, limit }
  });
}

/**
 * Get findings
 */
async function getFindings(request: NextRequest) {
  const url = new URL(request.url);
  const severity = url.searchParams.get('severity');
  const status = url.searchParams.get('status');
  const limit = parseInt(url.searchParams.get('limit') || '50');

  let query = supabase
    .from('agent_findings')
    .select('*')
    .order('detected_at', { ascending: false })
    .limit(limit);

  if (severity) {
    query = query.eq('severity', severity);
  }

  if (status) {
    query = query.eq('status', status);
  }

  const { data, error } = await query;

  if (error) throw error;

  return NextResponse.json({
    success: true,
    findings: data,
    filters: { severity, status, limit }
  });
}

/**
 * Get reports (executive summaries)
 */
async function getReports(request: NextRequest) {
  const url = new URL(request.url);
  const type = url.searchParams.get('type');
  const limit = parseInt(url.searchParams.get('limit') || '10');

  let query = supabase
    .from('agent_reports')
    .select('*')
    .order('generated_at', { ascending: false })
    .limit(limit);

  if (type) {
    query = query.eq('report_type', type);
  }

  const { data, error } = await query;

  if (error) throw error;

  return NextResponse.json({
    success: true,
    reports: data,
    filters: { type, limit }
  });
}
