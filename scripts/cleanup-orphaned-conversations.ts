#!/usr/bin/env tsx
/**
 * Cleanup Orphaned Conversations
 *
 * This script removes conversations from the database that have no messages
 * or cannot be loaded properly. Run this to clean up broken conversations.
 *
 * Usage: npx tsx scripts/cleanup-orphaned-conversations.ts
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function cleanupOrphanedConversations() {
  console.log('🧹 Starting cleanup of orphaned conversations...\n');

  try {
    // Get all conversations
    const { data: conversations, error: fetchError } = await supabase
      .from('conversations')
      .select('id, title, user_id, created_at');

    if (fetchError) {
      console.error('❌ Error fetching conversations:', fetchError);
      return;
    }

    console.log(`📊 Found ${conversations?.length || 0} total conversations\n`);

    let orphanedCount = 0;
    let deletedCount = 0;

    // Check each conversation for messages
    for (const conv of conversations || []) {
      const { data: messages, error: msgError } = await supabase
        .from('messages')
        .select('id')
        .eq('conversation_id', conv.id);

      if (msgError) {
        console.error(`⚠️  Error checking messages for ${conv.id}:`, msgError.message);
        continue;
      }

      // If no messages, mark as orphaned
      if (!messages || messages.length === 0) {
        orphanedCount++;
        console.log(`🗑️  Orphaned: ${conv.id} - "${conv.title || 'Untitled'}" (no messages)`);

        // Delete the orphaned conversation
        const { error: deleteError } = await supabase
          .from('conversations')
          .delete()
          .eq('id', conv.id);

        if (deleteError) {
          console.error(`   ❌ Failed to delete: ${deleteError.message}`);
        } else {
          deletedCount++;
          console.log(`   ✅ Deleted successfully`);
        }
      }
    }

    console.log('\n📈 Cleanup Summary:');
    console.log(`   Total conversations: ${conversations?.length || 0}`);
    console.log(`   Orphaned found: ${orphanedCount}`);
    console.log(`   Successfully deleted: ${deletedCount}`);
    console.log(`   Remaining conversations: ${(conversations?.length || 0) - deletedCount}`);

  } catch (error) {
    console.error('❌ Cleanup failed:', error);
  }
}

cleanupOrphanedConversations();
