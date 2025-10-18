/**
 * Delete the test task so priority tasks can be created
 */

import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function deleteTestData() {
  console.log('🗑️ Deleting test data...\n');

  // Delete test task
  const { error: taskError } = await supabase
    .from('agent_tasks')
    .delete()
    .ilike('title', '%TEST:%');

  if (taskError) {
    console.error('Task deletion failed:', taskError);
  } else {
    console.log('✅ Test task deleted');
  }

  // Delete test finding
  const { error: findingError } = await supabase
    .from('agent_findings')
    .delete()
    .ilike('title', '%TEST:%');

  if (findingError) {
    console.error('Finding deletion failed:', findingError);
  } else {
    console.log('✅ Test finding deleted');
  }

  console.log('\n✅ Test data cleaned up!');
  console.log('Next Archie run will create priority tasks from PROJECT_GOALS.md');
}

deleteTestData().catch(console.error);
