import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { ProjectStateLogger } from '@/lib/project-logger';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
  try {
    // Get current state from logger
    const currentState = ProjectStateLogger.getCurrentState();
    
    // Get stats from Supabase
    const { data: projectStatus } = await supabase
      .from('project_status')
      .select('*')
      .single();
    
    // Get drift report
    const { data: driftReport } = await supabase
      .rpc('get_project_drift_report');
    
    // Check Zapier webhook status
    const zapierStatus = {
      memory_webhook: !!process.env.ZAPIER_MEMORY_WEBHOOK_URL,
      organize_webhook: !!process.env.ZAPIER_ORGANIZE_WEBHOOK_URL,
      search_webhook: !!process.env.ZAPIER_SEARCH_WEBHOOK_URL,
      tasks_used: currentState.zapierTasks?.used || 0,
      tasks_total: 750
    };
    
    // Generate summary
    const summary = ProjectStateLogger.getSummaryForContinuation();
    
    return NextResponse.json({
      status: 'operational',
      timestamp: new Date().toISOString(),
      current_state: currentState,
      database_stats: projectStatus,
      drift_report: driftReport,
      zapier_status: zapierStatus,
      summary,
      next_actions: [
        !zapierStatus.memory_webhook && 'Create Zapier memory extraction webhook',
        !zapierStatus.organize_webhook && 'Create Zapier organization webhook',
        zapierStatus.tasks_used === 0 && 'No Zapier tasks used - automation not active',
      ].filter(Boolean)
    });
    
  } catch (error: any) {
    return NextResponse.json({
      status: 'error',
      error: error.message,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}