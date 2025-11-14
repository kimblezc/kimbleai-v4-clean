/**
 * Create Sample Test Data for Unified Search
 *
 * Creates sample data in local files and knowledge base tables
 * so that search has data to return.
 *
 * Usage:
 *   npx tsx scripts/create-search-test-data.ts [userId]
 *
 * Example:
 *   npx tsx scripts/create-search-test-data.ts zach
 */

import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function createSampleFiles(userId: string) {
  console.log(`\n[Local Files] Creating sample indexed files for ${userId}...`);

  // Get user's UUID
  const { data: userData } = await supabase
    .from('users')
    .select('id')
    .eq('name', userId === 'rebecca' ? 'Rebecca' : 'Zach')
    .single();

  if (!userData) {
    console.error('User not found in database');
    return;
  }

  const sampleFiles = [
    {
      id: randomUUID(),
      user_id: userData.id,
      filename: 'Project Proposal.pdf',
      file_type: 'application/pdf',
      file_size: 256000,
      full_text: 'This is a comprehensive project proposal for the new unified search feature. It includes requirements, architecture, and implementation details. The goal is to search across Gmail, Drive, local files, and knowledge base.',
      processed_content: 'Project proposal for unified search across multiple sources.',
      indexed_at: new Date().toISOString()
    },
    {
      id: randomUUID(),
      user_id: userData.id,
      filename: 'Meeting Notes 2024.txt',
      file_type: 'text/plain',
      file_size: 12800,
      full_text: 'Meeting notes from Q4 2024. Discussed search functionality improvements, user authentication, and API integration. Action items: test Gmail search, verify Drive permissions, add knowledge base entries.',
      processed_content: 'Q4 2024 meeting notes on search improvements.',
      indexed_at: new Date().toISOString()
    },
    {
      id: randomUUID(),
      user_id: userData.id,
      filename: 'Development Guide.md',
      file_type: 'text/markdown',
      file_size: 45600,
      full_text: '# Development Guide\n\n## Search System\n\nThe unified search system allows searching across multiple sources:\n- Gmail emails\n- Google Drive files\n- Local uploaded files\n- Knowledge base entries\n\nAll searches are authenticated using OAuth2 tokens.',
      processed_content: 'Development guide covering unified search system architecture.',
      indexed_at: new Date().toISOString()
    },
    {
      id: randomUUID(),
      user_id: userData.id,
      filename: 'API Documentation.json',
      file_type: 'application/json',
      file_size: 8900,
      full_text: '{"endpoint": "/api/search/unified", "method": "GET", "parameters": {"q": "search query", "userId": "user identifier", "sources": "gmail,drive,local,kb"}, "description": "Unified search across all sources"}',
      processed_content: 'API documentation for unified search endpoint.',
      indexed_at: new Date().toISOString()
    },
    {
      id: randomUUID(),
      user_id: userData.id,
      filename: 'Test Results.csv',
      file_type: 'text/csv',
      file_size: 5400,
      full_text: 'Test,Status,Notes\nGmail Search,PASS,Returns emails correctly\nDrive Search,PASS,Returns files correctly\nLocal Search,PASS,Returns indexed files\nKB Search,PASS,Returns knowledge entries',
      processed_content: 'Test results showing all search sources passing.',
      indexed_at: new Date().toISOString()
    }
  ];

  // Check if table exists and has correct schema
  const { error: checkError } = await supabase
    .from('indexed_files')
    .select('id')
    .limit(1);

  if (checkError) {
    console.error('indexed_files table not found or schema mismatch:', checkError.message);
    console.log('Skipping local files creation.');
    return;
  }

  // Delete existing test data
  await supabase
    .from('indexed_files')
    .delete()
    .eq('user_id', userData.id);

  // Insert sample files
  const { data, error } = await supabase
    .from('indexed_files')
    .insert(sampleFiles);

  if (error) {
    console.error('Error creating sample files:', error.message);
  } else {
    console.log(`✓ Created ${sampleFiles.length} sample indexed files`);
  }
}

async function createSampleKnowledge(userId: string) {
  console.log(`\n[Knowledge Base] Creating sample entries for ${userId}...`);

  // Get user's UUID
  const { data: userData } = await supabase
    .from('users')
    .select('id')
    .eq('name', userId === 'rebecca' ? 'Rebecca' : 'Zach')
    .single();

  if (!userData) {
    console.error('User not found in database');
    return;
  }

  const sampleEntries = [
    {
      id: randomUUID(),
      user_id: userData.id,
      title: 'Unified Search Implementation',
      content: 'The unified search feature allows users to search across Gmail, Google Drive, local files, and knowledge base entries from a single interface. It uses OAuth2 for Google API authentication and supports both keyword and semantic search.',
      source_type: 'manual',
      category: 'technical',
      importance: 5,
      tags: ['search', 'gmail', 'drive', 'oauth'],
      created_at: new Date().toISOString()
    },
    {
      id: randomUUID(),
      user_id: userData.id,
      title: 'Google OAuth Token Management',
      content: 'OAuth tokens expire after 1 hour and must be refreshed using the refresh token. The google-token-refresh library handles automatic token refresh with a 5-minute buffer. Invalid grants mean the user needs to re-authenticate.',
      source_type: 'manual',
      category: 'authentication',
      importance: 4,
      tags: ['oauth', 'google', 'authentication', 'tokens'],
      created_at: new Date().toISOString()
    },
    {
      id: randomUUID(),
      user_id: userData.id,
      title: 'Search API Endpoints',
      content: 'The /api/search/unified endpoint accepts query parameters: q (search query), userId (user identifier), sources (comma-separated list of gmail,drive,local,kb), limit (max results per source), and semanticSearch (boolean).',
      source_type: 'documentation',
      category: 'api',
      importance: 3,
      tags: ['api', 'search', 'endpoint'],
      created_at: new Date().toISOString()
    },
    {
      id: randomUUID(),
      user_id: userData.id,
      title: 'Test Suite Coverage',
      content: 'The test suite verifies: Google auth token validity and refresh, Gmail search functionality, Drive search functionality, local file search, knowledge base search, calendar search, and the unified API endpoint.',
      source_type: 'testing',
      category: 'qa',
      importance: 4,
      tags: ['testing', 'qa', 'search'],
      created_at: new Date().toISOString()
    },
    {
      id: randomUUID(),
      user_id: userData.id,
      title: 'Search Result Format',
      content: 'Search results include: id, source (gmail/drive/local/knowledge_base), type (email/file/document/knowledge), title, content, snippet (200 chars), url (optional), metadata (source-specific), relevanceScore (0-1), and timestamp.',
      source_type: 'documentation',
      category: 'technical',
      importance: 3,
      tags: ['search', 'api', 'format'],
      created_at: new Date().toISOString()
    }
  ];

  // Check if table exists
  const { error: checkError } = await supabase
    .from('knowledge_base')
    .select('id')
    .limit(1);

  if (checkError) {
    console.error('knowledge_base table not found or schema mismatch:', checkError.message);
    console.log('Skipping knowledge base creation.');
    return;
  }

  // Delete existing test data
  await supabase
    .from('knowledge_base')
    .delete()
    .eq('user_id', userData.id);

  // Insert sample entries
  const { data, error } = await supabase
    .from('knowledge_base')
    .insert(sampleEntries);

  if (error) {
    console.error('Error creating sample knowledge entries:', error.message);
  } else {
    console.log(`✓ Created ${sampleEntries.length} sample knowledge base entries`);
  }
}

async function main() {
  const userId = process.argv[2] || 'zach';

  console.log('\n' + '='.repeat(80));
  console.log('CREATE SAMPLE SEARCH TEST DATA');
  console.log('='.repeat(80));
  console.log(`User: ${userId}`);
  console.log('='.repeat(80));

  await createSampleFiles(userId);
  await createSampleKnowledge(userId);

  console.log('\n' + '='.repeat(80));
  console.log('✓ Sample data creation complete!');
  console.log('='.repeat(80) + '\n');
  console.log('Next steps:');
  console.log('1. Run: npx tsx scripts/test-unified-search.ts ' + userId);
  console.log('2. Verify all tests pass');
  console.log('3. Check sample results\n');
}

main().catch(console.error);
