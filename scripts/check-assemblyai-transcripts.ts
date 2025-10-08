// Check recent AssemblyAI transcriptions
const API_KEY = 'b33ccce950894067b89588381d61cddb';

async function checkRecent() {
  const response = await fetch('https://api.assemblyai.com/v2/transcript', {
    headers: { 'authorization': API_KEY }
  });

  if (!response.ok) {
    console.error('Failed:', response.status);
    return;
  }

  const data = await response.json();
  console.log('\nRecent transcriptions:');
  console.log('Total:', data.transcripts?.length || 0);

  data.transcripts?.slice(0, 5).forEach((t: any) => {
    console.log(`\n- ID: ${t.id}`);
    console.log(`  Status: ${t.status}`);
    console.log(`  Created: ${new Date(t.created).toLocaleString()}`);
    console.log(`  Duration: ${t.audio_duration}s`);
  });
}

checkRecent();
