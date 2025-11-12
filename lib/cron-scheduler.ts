/**
 * Cron Scheduler for Railway Deployment
 *
 * Railway doesn't support Vercel's cron format, so we use node-cron
 * to schedule jobs in-process.
 *
 * Jobs:
 * - Archie V1: Every 12 hours (simple fixes: lint, dead code, patches)
 * - Archie V2: Daily at 3am (complex fixes with AI and learning)
 * - Backup: Daily at 2am
 * - Index: Every 6 hours
 * - Index Attachments: Every 4 hours
 *
 * Cost Optimization:
 * - V1 (2x/day): $5.08/month (60 runs @ $0.0847)
 * - V2 (1x/day): $5.22/month (30 runs @ $0.174)
 * - Total: $10.30/month (vs $125/month hourly V2)
 * - Savings: 92% reduction!
 */

import cron from 'node-cron';

// Base URL for API calls
const BASE_URL = process.env.NEXTAUTH_URL || 'http://localhost:3000';
const CRON_SECRET = process.env.CRON_SECRET;

/**
 * Make authenticated API call to a cron endpoint
 */
async function callCronEndpoint(path: string, name: string): Promise<void> {
  try {
    console.log(`[CRON] Triggering ${name} at ${new Date().toISOString()}`);

    const url = `${BASE_URL}${path}`;
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    // Add authentication if CRON_SECRET is configured
    if (CRON_SECRET) {
      headers['Authorization'] = `Bearer ${CRON_SECRET}`;
    }

    const response = await fetch(url, {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      console.error(`[CRON] ${name} failed with status ${response.status}`);
      const text = await response.text();
      console.error(`[CRON] Response: ${text}`);
      return;
    }

    const data = await response.json();
    console.log(`[CRON] ${name} completed successfully:`, data.summary || data.message || 'OK');
  } catch (error: any) {
    console.error(`[CRON] ${name} error:`, error.message);
  }
}

/**
 * Initialize all cron jobs
 */
export function initCronJobs(): void {
  // Only run in production on Railway
  if (process.env.NODE_ENV !== 'production' || !process.env.RAILWAY_ENVIRONMENT) {
    console.log('[CRON] Not running in Railway production - cron jobs disabled');
    return;
  }

  if (!CRON_SECRET) {
    console.warn('[CRON] WARNING: CRON_SECRET not set - cron jobs will run without authentication');
  }

  console.log('[CRON] Initializing cron jobs...');

  // Archie V1: Every 12 hours at midnight and noon (simple fixes)
  cron.schedule('0 0,12 * * *', () => {
    callCronEndpoint('/api/archie/run', 'Archie V1 (Simple Fixes)');
  }, {
    timezone: 'America/New_York'
  });

  // Archie V2: Daily at 3:00 AM (complex fixes with AI)
  cron.schedule('0 3 * * *', () => {
    callCronEndpoint('/api/archie/run?v2=true', 'Archie V2 (Complex Fixes)');
  }, {
    timezone: 'America/New_York'
  });

  // Backup: Daily at 2:00 AM
  cron.schedule('0 2 * * *', () => {
    callCronEndpoint('/api/backup/cron', 'Backup');
  }, {
    timezone: 'America/New_York'
  });

  // Index: Every 6 hours at minute 0
  cron.schedule('0 */6 * * *', () => {
    callCronEndpoint('/api/index/cron', 'Index');
  }, {
    timezone: 'America/New_York'
  });

  // Index Attachments: Every 4 hours at minute 0
  cron.schedule('0 */4 * * *', () => {
    callCronEndpoint('/api/cron/index-attachments', 'Index Attachments');
  }, {
    timezone: 'America/New_York'
  });

  console.log('[CRON] All cron jobs scheduled:');
  console.log('[CRON] - Archie V1 (Simple): Every 12 hours at midnight & noon (0 0,12 * * *)');
  console.log('[CRON] - Archie V2 (Complex): Daily at 3:00 AM (0 3 * * *)');
  console.log('[CRON] - Backup: Daily at 2:00 AM (0 2 * * *)');
  console.log('[CRON] - Index: Every 6 hours (0 */6 * * *)');
  console.log('[CRON] - Index Attachments: Every 4 hours (0 */4 * * *)');
}

/**
 * Trigger a specific cron job immediately (for testing)
 */
export async function triggerCronJob(jobName: string): Promise<void> {
  const jobs: Record<string, string> = {
    'archie': '/api/archie/run',
    'archie-v1': '/api/archie/run',
    'archie-v2': '/api/archie/run?v2=true',
    'backup': '/api/backup/cron',
    'index': '/api/index/cron',
    'index-attachments': '/api/cron/index-attachments',
  };

  const path = jobs[jobName.toLowerCase()];
  if (!path) {
    throw new Error(`Unknown cron job: ${jobName}`);
  }

  await callCronEndpoint(path, jobName);
}
