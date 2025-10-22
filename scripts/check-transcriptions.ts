import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

config({ path: '.env.local' });

async function checkTranscriptions() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data, error } = await supabase
    .from('audio_transcriptions')
    .select('id, filename, project_id, created_at, duration')
    .order('created_at', { ascending: false })
    .limit(10);

  if (error) {
    console.log('Error:', error);
    return;
  }

  console.log('\n📊 Recent Transcriptions in Database:\n');
  if (!data || data.length === 0) {
    console.log('No transcriptions found');
  } else {
    data.forEach(t => {
      console.log(`ID: ${t.id}`);
      console.log(`Filename: ${t.filename}`);
      console.log(`Project: ${t.project_id || 'none'}`);
      console.log(`Duration: ${Math.floor(t.duration / 60)}min`);
      console.log(`Created: ${new Date(t.created_at).toLocaleString()}`);
      console.log('---');
    });
    console.log(`\nTotal: ${data.length} transcriptions`);
  }
}

checkTranscriptions();
