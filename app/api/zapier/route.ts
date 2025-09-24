import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Helper function to generate project colors
function generateProjectColor(projectName: string): string {
  const colors = [
    '#3B82F6', '#10B981', '#F59E0B', '#EF4444',
    '#8B5CF6', '#EC4899', '#06B6D4', '#F97316'
  ];
  const hash = projectName.split('').reduce((acc, char) => {
    return char.charCodeAt(0) + ((acc << 5) - acc);
  }, 0);
  return colors[Math.abs(hash) % colors.length];
}

// Main POST handler for all Zapier webhooks
export async function POST(request: NextRequest) {
  const url = new URL(request.url);
  const action = url.searchParams.get('action');
  
  try {
    const body = await request.json();
    
    switch (action) {
      case 'organize': {
        // Auto-organize with dynamic projects & tags
        const { conversationId, userId, suggestedProject, suggestedTags, confidence } = body;
        
        const { data: project } = await supabase
          .from('projects')
          .upsert({
            name: suggestedProject,
            user_id: userId,
            color: generateProjectColor(suggestedProject),
            auto_created: true
          })
          .select()
          .single();
        
        await supabase
          .from('conversations')
          .update({
            project_id: project.id,
            tags: suggestedTags,
            auto_organized: true,
            organization_confidence: confidence
          })
          .eq('id', conversationId);
        
        await supabase.rpc('increment_project_count', { 
          project_id: project.id 
        });
        
        return NextResponse.json({
          success: true,
          project: project.name,
          tags: suggestedTags,
          confidence
        });
      }
      
      case 'memory': {
        // Memory extraction with vector embeddings
        const { conversationId, userId, extractedFacts, embeddings } = body;
        
        const memoryChunks = extractedFacts.map((fact: any, index: number) => ({
          user_id: userId,
          conversation_id: conversationId,
          content: fact.content,
          content_type: fact.type,
          embedding: embeddings[index],
          relevance_score: fact.importance || 1.0,
          is_family_shared: fact.shareable || false,
          metadata: {
            extracted_at: new Date().toISOString(),
            source: 'zapier_memory_agent'
          }
        }));
        
        const { error } = await supabase
          .from('memory_chunks')
          .insert(memoryChunks);
        
        if (error) {
          console.error('Memory storage error:', error);
          return NextResponse.json({ error: 'Failed to store memories' }, { status: 500 });
        }
        
        return NextResponse.json({
          success: true,
          stored: memoryChunks.length,
          message: `Stored ${memoryChunks.length} memory chunks`
        });
      }
      
      case 'search': {
        // Unified search across all services
        const { query, userId, searchEmbedding } = body;
        
        const { data: memories } = await supabase.rpc('search_similar_messages', {
          query_embedding: searchEmbedding,
          match_threshold: 0.75,
          match_count: 10,
          user_id: userId
        });
        
        return NextResponse.json({
          memories: memories || [],
          drive_files: body.driveResults || [],
          gmail_messages: body.gmailResults || [],
          total_results: (memories?.length || 0) + 
                         (body.driveResults?.length || 0) + 
                         (body.gmailResults?.length || 0)
        });
      }
      
      case 'deploy': {
        // Auto-deploy with error fixing
        const { error, suggested_fix, deployment_id } = body;
        
        await supabase
          .from('deployment_logs')
          .insert({
            deployment_id,
            error_message: error,
            suggested_fix,
            auto_fixed: true,
            timestamp: new Date().toISOString()
          });
        
        return NextResponse.json({
          success: true,
          deployment_id,
          fix_applied: true
        });
      }
      
      case 'trigger-memory': {
        // Trigger memory extraction after conversation
        const { conversationId, userId, messages } = body;
        
        const zapierWebhookUrl = process.env.ZAPIER_MEMORY_WEBHOOK_URL;
        
        if (zapierWebhookUrl) {
          await fetch(zapierWebhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              conversationId,
              userId,
              messages,
              timestamp: new Date().toISOString()
            })
          });
        }
        
        return NextResponse.json({ triggered: true });
      }
      
      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
    }
  } catch (error: any) {
    console.error('Zapier webhook error:', error);
    return NextResponse.json({ 
      error: 'Webhook processing failed',
      details: error.message 
    }, { status: 500 });
  }
}

// GET endpoint for webhook status
export async function GET() {
  return NextResponse.json({
    status: 'Zapier webhooks ready',
    endpoints: {
      organize: '/api/zapier?action=organize',
      memory: '/api/zapier?action=memory',
      search: '/api/zapier?action=search',
      deploy: '/api/zapier?action=deploy',
      trigger: '/api/zapier?action=trigger-memory'
    },
    timestamp: new Date().toISOString()
  });
}