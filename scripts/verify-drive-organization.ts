// Verify files are properly organized in Google Drive
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import fetch from 'node-fetch';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function verifyDriveOrganization() {
  console.log('\n🔍 Verifying Google Drive File Organization\n');
  console.log('═'.repeat(60));

  // Get access token
  const { data: tokenData, error } = await supabase
    .from('user_tokens')
    .select('access_token')
    .eq('user_id', 'zach')
    .single();

  if (error || !tokenData?.access_token) {
    console.error('❌ Could not get access token');
    return;
  }

  const accessToken = tokenData.access_token;
  console.log('✅ Got access token\n');

  // List recent transcription files in Drive
  console.log('📂 Searching for transcription files...\n');

  const searchResponse = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent("name contains 'transcript' or name contains 'transcription'")}&orderBy=createdTime desc&pageSize=10&fields=files(id,name,createdTime,parents,webViewLink,mimeType)`,
    {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    }
  );

  if (!searchResponse.ok) {
    const errorText = await searchResponse.text();
    console.error('❌ Failed to search Drive:', errorText);
    return;
  }

  const searchData = await searchResponse.json() as any;
  const files = searchData.files || [];

  if (files.length === 0) {
    console.log('⚠️  No transcription files found in Google Drive');
    return;
  }

  console.log(`✅ Found ${files.length} transcription file(s):\n`);

  for (const file of files) {
    console.log('─'.repeat(60));
    console.log(`📄 Name: ${file.name}`);
    console.log(`🆔 ID: ${file.id}`);
    console.log(`📅 Created: ${new Date(file.createdTime).toLocaleString()}`);
    console.log(`🔗 Link: ${file.webViewLink}`);
    console.log(`📎 Type: ${file.mimeType}`);

    // Get parent folder info
    if (file.parents && file.parents.length > 0) {
      for (const parentId of file.parents) {
        const folderResponse = await fetch(
          `https://www.googleapis.com/drive/v3/files/${parentId}?fields=name`,
          {
            headers: {
              'Authorization': `Bearer ${accessToken}`
            }
          }
        );

        if (folderResponse.ok) {
          const folderData = await folderResponse.json() as any;
          console.log(`📁 Folder: ${folderData.name}`);
        }
      }
    } else {
      console.log(`📁 Folder: Root / My Drive`);
    }
    console.log('');
  }

  console.log('═'.repeat(60));
  console.log('\n✅ Verification complete!');
}

verifyDriveOrganization();
