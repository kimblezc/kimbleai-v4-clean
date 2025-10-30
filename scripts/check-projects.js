const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkProjects() {
  const { data, error } = await supabase
    .from('projects')
    .select('id, name, owner_id, status, created_at')
    .order('name');

  if (error) {
    console.error('Database error:', error.message);
    return;
  }

  console.log('\n=== ALL PROJECTS IN DATABASE ===\n');

  if (!data || data.length === 0) {
    console.log('No projects found in database');
  } else {
    data.forEach((p, idx) => {
      console.log(`${idx + 1}. ${p.name}`);
      console.log(`   ID: ${p.id}`);
      console.log(`   Owner: ${p.owner_id}`);
      console.log(`   Status: ${p.status}`);
      console.log(`   Created: ${new Date(p.created_at).toLocaleString()}\n`);
    });
  }

  console.log(`Total projects: ${data ? data.length : 0}\n`);
}

checkProjects().catch(console.error);
