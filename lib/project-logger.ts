// KIMBLEAI AUTOMATED PROJECT STATE LOGGER
// This file automatically logs EVERY change to prevent drift

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export class ProjectStateLogger {
  private static logFile = path.join(process.cwd(), 'PROJECT_STATE.json');
  private static masterLogFile = path.join(process.cwd(), 'MASTER_LOG.md');
  
  // Load current state
  static getCurrentState() {
    try {
      if (fs.existsSync(this.logFile)) {
        return JSON.parse(fs.readFileSync(this.logFile, 'utf8'));
      }
    } catch (e) {
      console.error('Failed to load state:', e);
    }
    
    return {
      version: '0.0.0',
      lastUpdated: new Date().toISOString(),
      working: {},
      broken: {},
      pending: {},
      zapierTasks: {
        used: 0,
        total: 750,
        workflows: []
      },
      envVars: {},
      conversations: 0,
      memories: 0
    };
  }
  
  // Auto-log on EVERY API call
  static async logApiCall(endpoint: string, success: boolean, details: any) {
    const state = this.getCurrentState();
    
    // Update state
    if (!state.apiCalls) state.apiCalls = {};
    if (!state.apiCalls[endpoint]) state.apiCalls[endpoint] = { success: 0, failed: 0 };
    
    if (success) {
      state.apiCalls[endpoint].success++;
    } else {
      state.apiCalls[endpoint].failed++;
    }
    
    state.lastUpdated = new Date().toISOString();
    
    // Save locally
    fs.writeFileSync(this.logFile, JSON.stringify(state, null, 2));
    
    // Save to Supabase
    await supabase.from('project_logs').insert({
      timestamp: new Date().toISOString(),
      endpoint,
      success,
      details,
      state_snapshot: state
    });
    
    // Update master log
    this.updateMasterLog(endpoint, success, details);
  }
  
  // Update master log in Markdown
  static updateMasterLog(action: string, success: boolean, details: any) {
    const entry = `
### ${new Date().toISOString()}
- **Action**: ${action}
- **Status**: ${success ? '✅ SUCCESS' : '❌ FAILED'}
- **Details**: ${JSON.stringify(details, null, 2)}
---
`;
    
    fs.appendFileSync(this.masterLogFile, entry);
  }
  
  // Log Zapier webhook trigger
  static async logZapierTrigger(webhook: string, payload: any) {
    const state = this.getCurrentState();
    
    state.zapierTasks.used++;
    if (!state.zapierTasks.workflows.includes(webhook)) {
      state.zapierTasks.workflows.push(webhook);
    }
    
    state.lastZapierTrigger = {
      webhook,
      timestamp: new Date().toISOString(),
      payload
    };
    
    fs.writeFileSync(this.logFile, JSON.stringify(state, null, 2));
    
    // Also log to Supabase
    await supabase.from('zapier_logs').insert({
      webhook_type: webhook,
      payload,
      success: true,
      created_at: new Date().toISOString()
    });
  }
  
  // Track feature activation
  static async logFeatureStatus(feature: string, status: 'working' | 'broken' | 'pending', details?: any) {
    const state = this.getCurrentState();
    
    if (status === 'working') {
      state.working[feature] = { since: new Date().toISOString(), details };
      delete state.broken[feature];
      delete state.pending[feature];
    } else if (status === 'broken') {
      state.broken[feature] = { since: new Date().toISOString(), details };
      delete state.working[feature];
    } else {
      state.pending[feature] = { since: new Date().toISOString(), details };
    }
    
    fs.writeFileSync(this.logFile, JSON.stringify(state, null, 2));
    
    this.updateMasterLog(`Feature: ${feature}`, status === 'working', details);
  }
  
  // Get summary for continuation
  static getSummaryForContinuation(): string {
    const state = this.getCurrentState();
    
    return `
# KIMBLEAI PROJECT STATE
Version: ${state.version}
Last Updated: ${state.lastUpdated}

## WORKING:
${Object.keys(state.working).map(k => `- ${k}`).join('\n')}

## BROKEN:
${Object.keys(state.broken).map(k => `- ${k}`).join('\n')}

## PENDING:
${Object.keys(state.pending).map(k => `- ${k}`).join('\n')}

## ZAPIER:
- Tasks Used: ${state.zapierTasks.used}/750
- Active Workflows: ${state.zapierTasks.workflows.join(', ') || 'NONE'}

## NEXT ACTION:
${state.nextAction || 'Create Zapier webhooks'}
    `;
  }
}

// Auto-export summary on build
if (process.env.NODE_ENV === 'production') {
  console.log(ProjectStateLogger.getSummaryForContinuation());
}