/**
 * Archie Metrics API
 * GET /api/archie/metrics - Get aggregate metrics and analytics
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const days = parseInt(searchParams.get('days') || '30');

    // Get date range
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Fetch runs in date range
    const { data: runs, error: runsError } = await supabase
      .from('archie_runs')
      .select('*')
      .gte('started_at', startDate.toISOString())
      .lte('started_at', endDate.toISOString())
      .order('started_at', { ascending: false });

    if (runsError) {
      console.error('Error fetching runs:', runsError);
      return NextResponse.json({
        success: false,
        error: runsError.message
      }, { status: 500 });
    }

    // Fetch issues in date range
    const { data: issues, error: issuesError } = await supabase
      .from('archie_issues')
      .select('*')
      .gte('first_seen_at', startDate.toISOString())
      .lte('first_seen_at', endDate.toISOString());

    if (issuesError) {
      console.error('Error fetching issues:', issuesError);
      return NextResponse.json({
        success: false,
        error: issuesError.message
      }, { status: 500 });
    }

    // Fetch fix attempts
    const { data: attempts, error: attemptsError } = await supabase
      .from('archie_fix_attempts')
      .select('*')
      .gte('started_at', startDate.toISOString())
      .lte('started_at', endDate.toISOString());

    if (attemptsError) {
      console.error('Error fetching attempts:', attemptsError);
    }

    // Calculate metrics
    const totalRuns = runs?.length || 0;
    const successfulRuns = runs?.filter(r => r.status === 'completed').length || 0;
    const failedRuns = runs?.filter(r => r.status === 'failed').length || 0;

    const totalIssuesFound = runs?.reduce((sum, r) => sum + (r.tasks_found || 0), 0) || 0;
    const totalIssuesFixed = runs?.reduce((sum, r) => sum + (r.tasks_completed || 0), 0) || 0;
    const totalCost = runs?.reduce((sum, r) => sum + (parseFloat(r.total_cost_usd) || 0), 0) || 0;

    // Count by type
    const fixedByType: Record<string, number> = {};
    issues?.forEach(issue => {
      if (issue.status === 'fixed') {
        fixedByType[issue.type] = (fixedByType[issue.type] || 0) + 1;
      }
    });

    // Top issues (most common)
    const issueFrequency: Record<string, number> = {};
    issues?.forEach(issue => {
      const key = issue.fingerprint || issue.issue_description;
      issueFrequency[key] = (issueFrequency[key] || 0) + 1;
    });

    const topIssues = Object.entries(issueFrequency)
      .map(([fingerprint, count]) => {
        const issue = issues?.find(i => i.fingerprint === fingerprint || i.issue_description === fingerprint);
        return {
          fingerprint,
          description: issue?.issue_description || 'Unknown',
          type: issue?.type || 'unknown',
          count
        };
      })
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Success rate
    const avgSuccessRate = totalIssuesFound > 0
      ? Math.round((totalIssuesFixed / totalIssuesFound) * 100)
      : 0;

    // Cost breakdown
    const costByModel: Record<string, number> = {};
    attempts?.forEach(attempt => {
      if (attempt.ai_model_used && attempt.cost_usd) {
        const model = attempt.ai_model_used;
        costByModel[model] = (costByModel[model] || 0) + parseFloat(attempt.cost_usd);
      }
    });

    // Get learning stats
    const { data: learnings } = await supabase
      .from('archie_learning')
      .select('*')
      .order('success_rate', { ascending: false })
      .limit(10);

    return NextResponse.json({
      success: true,
      metrics: {
        overview: {
          totalRuns,
          successfulRuns,
          failedRuns,
          totalIssuesFound,
          totalIssuesFixed,
          totalCost: parseFloat(totalCost.toFixed(4)),
          avgSuccessRate
        },
        fixedByType,
        topIssues,
        costBreakdown: {
          byModel: costByModel,
          total: parseFloat(totalCost.toFixed(4))
        },
        learnings: learnings || []
      },
      dateRange: {
        start: startDate.toISOString(),
        end: endDate.toISOString(),
        days
      }
    });

  } catch (error: any) {
    console.error('Metrics API error:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}
