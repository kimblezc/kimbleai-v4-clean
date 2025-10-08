// Verify full folder path for organization
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import fetch from 'node-fetch';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function verifyFolderPath() {
  console.log('\n📂 Verifying Folder Structure\n');

  const { data: tokenData } = await supabase
    .from('user_tokens')
    .select('access_token')
    .eq('user_id', 'zach')
    .single();

  if (!tokenData?.access_token) {
    console.error('❌ No access token');
    return;
  }

  const accessToken = tokenData.access_token;

  // Get the "general" folder
  const searchResponse = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent("name='general' and mimeType='application/vnd.google-apps.folder'")}&fields=files(id,name,parents)`,
    { headers: { 'Authorization': `Bearer ${accessToken}` } }
  );

  const searchData = await searchResponse.json() as any;
  const generalFolder = searchData.files?.[0];

  if (!generalFolder) {
    console.log('❌ "general" folder not found');
    return;
  }

  console.log(`✅ Found "general" folder: ${generalFolder.id}`);

  // Get parent folder
  if (generalFolder.parents && generalFolder.parents.length > 0) {
    const parentId = generalFolder.parents[0];
    const parentResponse = await fetch(
      `https://www.googleapis.com/drive/v3/files/${parentId}?fields=id,name,parents`,
      { headers: { 'Authorization': `Bearer ${accessToken}` } }
    );

    const parentData = await parentResponse.json() as any;
    console.log(`📁 Parent folder: ${parentData.name} (${parentData.id})`);

    // Check if parent is "kimbleai-transcriptions"
    if (parentData.name === 'kimbleai-transcriptions') {
      console.log('\n✅ VERIFIED: Files are in kimbleai-transcriptions/general/');
    } else {
      console.log(`\n⚠️  Parent is "${parentData.name}", not "kimbleai-transcriptions"`);
    }
  } else {
    console.log('\n⚠️  "general" folder has no parent (in root)');
  }

  // List files in the general folder
  console.log('\n📄 Files in "general" folder:\n');
  const filesResponse = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(`'${generalFolder.id}' in parents`)}&fields=files(name,mimeType,createdTime)&orderBy=createdTime desc`,
    { headers: { 'Authorization': `Bearer ${accessToken}` } }
  );

  const filesData = await filesResponse.json() as any;
  const files = filesData.files || [];

  files.forEach((file: any) => {
    console.log(`  ${file.mimeType.includes('json') ? '📊' : file.mimeType.includes('vtt') ? '📺' : file.mimeType.includes('srt') ? '📽️' : '📝'} ${file.name} (${new Date(file.createdTime).toLocaleTimeString()})`);
  });

  console.log(`\n✅ Total files in folder: ${files.length}`);
}

verifyFolderPath();
