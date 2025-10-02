// Quick database check
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

(async () => {
  console.log('🔍 Quick System Check\n');

  // 1. Users
  const { count: userCount } = await supabase.from('users').select('*', { count: 'exact', head: true });
  console.log(`Users: ${userCount || 0}`);

  // 2. Messages with embeddings
  const { count: msgCount } = await supabase.from('messages').select('*', { count: 'exact', head: true });
  console.log(`Messages: ${msgCount || 0}`);

  // 3. Knowledge base
  const { count: kbCount } = await supabase.from('knowledge_base').select('*', { count: 'exact', head: true });
  console.log(`Knowledge: ${kbCount || 0}`);

  // 4. Storage
  const { data: buckets } = await supabase.storage.listBuckets();
  console.log(`Buckets: ${buckets?.map(b => b.name).join(', ') || 'none'}`);

  // 5. Test function
  try {
    await supabase.rpc('search_all_content', {
      query_embedding: new Array(1536).fill(0.1),
      p_user_id: 'zach-admin-001',
      match_threshold: 0.7,
      match_count: 1
    });
    console.log('search_all_content: ✅');
  } catch {
    console.log('search_all_content: ❌ (needs migration)');
  }

  console.log('\n✅ Check complete');
})();
