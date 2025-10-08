// Verify batch-test folder contents
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import fetch from 'node-fetch';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function verifyBatchTestFolder() {
  console.log('\n📂 Verifying batch-test Folder\n');

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

  // Find batch-test folder
  const searchResponse = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent("name='batch-test' and mimeType='application/vnd.google-apps.folder'")}&fields=files(id,name,parents)`,
    { headers: { 'Authorization': `Bearer ${accessToken}` } }
  );

  const searchData = await searchResponse.json() as any;
  const batchTestFolder = searchData.files?.[0];

  if (!batchTestFolder) {
    console.log('❌ "batch-test" folder not found');
    return;
  }

  console.log(`✅ Found "batch-test" folder: ${batchTestFolder.id}`);

  // Get parent folder
  if (batchTestFolder.parents && batchTestFolder.parents.length > 0) {
    const parentId = batchTestFolder.parents[0];
    const parentResponse = await fetch(
      `https://www.googleapis.com/drive/v3/files/${parentId}?fields=id,name`,
      { headers: { 'Authorization': `Bearer ${accessToken}` } }
    );

    const parentData = await parentResponse.json() as any;
    console.log(`📁 Parent folder: ${parentData.name}`);

    if (parentData.name === 'kimbleai-transcriptions') {
      console.log('\n✅ VERIFIED: Files are in kimbleai-transcriptions/batch-test/\n');
    }
  }

  // List files in batch-test folder
  const filesResponse = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(`'${batchTestFolder.id}' in parents`)}&fields=files(name,mimeType,createdTime)&orderBy=createdTime desc`,
    { headers: { 'Authorization': `Bearer ${accessToken}` } }
  );

  const filesData = await filesResponse.json() as any;
  const files = filesData.files || [];

  console.log(`📄 Files in "batch-test" folder:\n`);

  // Group by base filename
  const fileGroups: Record<string, any[]> = {};
  files.forEach((file: any) => {
    const baseName = file.name.replace(/_transcript\.(txt|json|srt|vtt)$/, '');
    if (!fileGroups[baseName]) {
      fileGroups[baseName] = [];
    }
    fileGroups[baseName].push(file);
  });

  Object.entries(fileGroups).forEach(([baseName, groupFiles], i) => {
    console.log(`   ${i + 1}. ${baseName} (${groupFiles.length} files):`);
    groupFiles.forEach((file: any) => {
      const ext = file.name.split('.').pop()?.toUpperCase();
      const icon = ext === 'JSON' ? '📊' : ext === 'VTT' ? '📺' : ext === 'SRT' ? '📽️' : '📝';
      console.log(`      ${icon} ${file.name} (${new Date(file.createdTime).toLocaleTimeString()})`);
    });
    console.log('');
  });

  console.log(`✅ Total files in batch-test folder: ${files.length}\n`);
  console.log(`📊 Summary:`);
  console.log(`   Unique transcriptions: ${Object.keys(fileGroups).length}`);
  console.log(`   Files per transcription: ${files.length / Object.keys(fileGroups).length}`);
}

verifyBatchTestFolder();
