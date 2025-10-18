/**
 * Check detailed Archie logs
 */

import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function checkLogs() {
  const { data: logs } = await supabase
    .from('agent_logs')
    .select('*')
    .order('timestamp', { ascending: false })
    .limit(30);

  console.log('📝 Archie Activity Log:\n');
  logs?.forEach((log: any) => {
    const time = new Date(log.timestamp).toLocaleTimeString();
    const details = log.details ? `\n    ${JSON.stringify(log.details, null, 2)}` : '';
    console.log(`[${time}] [${log.log_level.toUpperCase()}] ${log.message}${details}\n`);
  });
}

checkLogs().catch(console.error);
