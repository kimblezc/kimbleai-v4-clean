// Script to create thumbnails storage bucket in Supabase
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function createThumbnailsBucket() {
  console.log('Creating "thumbnails" storage bucket...\n');

  try {
    // Check if bucket exists
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();

    if (listError) {
      console.error('❌ Error listing buckets:', listError.message);
      return;
    }

    const exists = buckets.some(b => b.name === 'thumbnails');

    if (exists) {
      console.log('✅ "thumbnails" bucket already exists!');
      return;
    }

    // Create bucket
    const { data, error } = await supabase.storage.createBucket('thumbnails', {
      public: true, // Make bucket publicly accessible
      fileSizeLimit: 5242880, // 5MB limit
      allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
    });

    if (error) {
      console.error('❌ Error creating bucket:', error.message);
      console.log('\nAlternative: Create bucket manually in Supabase Dashboard:');
      console.log('1. Go to: https://supabase.com/dashboard/project/gbmefnaqsxtoseufjixp/storage/buckets');
      console.log('2. Click "New bucket"');
      console.log('3. Name: thumbnails');
      console.log('4. Public bucket: Yes');
      console.log('5. File size limit: 5 MB');
      console.log('6. Allowed MIME types: image/jpeg, image/png, image/webp, image/gif');
      return;
    }

    console.log('✅ "thumbnails" bucket created successfully!');
    console.log('   Name:', data.name);
    console.log('   ID:', data.id);
    console.log('   Public:', data.public);

  } catch (err) {
    console.error('❌ Unexpected error:', err.message);
  }
}

createThumbnailsBucket();
