/**
 * Manually trigger Archie to run immediately
 * This bypasses the 5-minute cron schedule
 */

import { config } from 'dotenv';
import { AutonomousAgent } from '../lib/autonomous-agent';

// Load environment variables
config({ path: '.env.local' });

async function triggerArchie() {
  console.log('🦉 Manually triggering Archie...\n');

  const agent = AutonomousAgent.getInstance();

  try {
    await agent.run();
    console.log('\n✅ Archie execution complete!');
    console.log('Check the dashboard at: https://www.kimbleai.com/agent');
  } catch (error) {
    console.error('\n❌ Archie execution failed:', error);
  }

  process.exit(0);
}

triggerArchie();
