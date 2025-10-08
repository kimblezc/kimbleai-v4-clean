require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

(async () => {
  console.log('🔍 Testing Semantic Search & RAG\n');

  const { data: kbEntries, error: kbError } = await supabase
    .from('knowledge_base')
    .select('id, title, content, source_type, created_at, embedding')
    .limit(5);

  if (kbError) {
    console.log('❌ Error:', kbError.message);
    return;
  }

  console.log('✅ Knowledge Base: ' + kbEntries.length + ' entries found\n');
  kbEntries.forEach((entry, i) => {
    console.log((i + 1) + '. ' + entry.title);
    console.log('   Source: ' + entry.source_type);
    console.log('   Has embedding: ' + (entry.embedding ? 'Yes' : 'No'));
    console.log('');
  });

  console.log('🧪 Testing Semantic Search Function...\n');

  const { data: results, error: searchError } = await supabase.rpc('match_knowledge_base', {
    query_embedding: new Array(1536).fill(0.1),
    match_threshold: 0.3,
    match_count: 3
  });

  if (searchError) {
    console.log('❌ Function error: ' + searchError.message);
    console.log('   The match_knowledge_base function needs to be created\n');
  } else {
    console.log('✅ Semantic search function exists and works!');
    console.log('   Found ' + (results ? results.length : 0) + ' results\n');
  }

})().catch(console.error);
