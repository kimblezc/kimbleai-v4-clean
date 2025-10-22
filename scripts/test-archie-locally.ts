/**
 * Test Archie's fixes locally without waiting for deployment
 */
import { config } from 'dotenv';
config({ path: '.env.local' });

// Import the AutonomousAgent class
import { AutonomousAgent } from '../lib/autonomous-agent';

async function testArchie() {
  console.log('\n🧪 TESTING ARCHIE FIXES LOCALLY\n' + '='.repeat(60));
  console.log('This will run Archie with the NEW code to prove fixes work\n');

  try {
    const agent = new AutonomousAgent();

    console.log('🚀 Starting Archie execution...\n');

    await agent.run();

    console.log('\n✅ Archie execution completed!');
    console.log('\nNow checking results...\n');

    // Wait a moment for database writes to complete
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Run monitor to see results
    console.log('='.repeat(60));
    const { execSync } = require('child_process');
    execSync('npx tsx scripts/monitor-archie-progress.ts', { stdio: 'inherit' });

  } catch (error: any) {
    console.error('❌ Error running Archie:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

testArchie();
