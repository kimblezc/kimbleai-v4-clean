import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function checkLast() {
  const { data, error } = await supabase
    .from('audio_transcriptions')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log('\nLast transcription:');
  console.log('ID:', data.id);
  console.log('Filename:', data.filename);
  console.log('Duration:', data.duration, 'seconds');
  console.log('Service:', data.service);
  console.log('\nMetadata keys:', Object.keys(data.metadata || {}));
  console.log('\nSpeaker labels:', data.metadata?.speaker_labels ? 'YES' : 'NO');
  console.log('Utterances count:', data.metadata?.utterances?.length || 0);
  console.log('Words count:', data.metadata?.words?.length || 0);

  if (data.metadata?.utterances?.slice(0, 3)) {
    console.log('\nFirst 3 utterances:');
    data.metadata.utterances.slice(0, 3).forEach((u: any, i: number) => {
      console.log(`${i + 1}. Speaker ${u.speaker} (${u.start}ms-${u.end}ms): ${u.text.substring(0, 100)}...`);
    });
  }
}

checkLast();
