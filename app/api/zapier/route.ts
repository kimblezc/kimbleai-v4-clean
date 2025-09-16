// KIMBLEAI V4 - COMPLETE ZAPIER WEBHOOK SYSTEM
// This file coordinates all Zapier automations for the project

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// WEBHOOK 1: AUTO-ORGANIZE WITH DYNAMIC PROJECTS & TAGS
export async function organizationWebhook(req: NextRequest) {
  const body = await req.json();
  const { conversationId, userId, messages } = body;
  
  // Zapier will call OpenAI to analyze and suggest:
  // - Project name (auto-created if new)
  // - 3-5 relevant tags
  // - Confidence score
  
  // This is called FROM Zapier with the results
  const { suggestedProject, suggestedTags, confidence } = body;
  
  // Create project if doesn't exist
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
  
  // Update conversation with project and tags
  await supabase
    .from('conversations')
    .update({
      project_id: project.id,
      tags: suggestedTags,
      auto_organized: true,
      organization_confidence: confidence
    })
    .eq('id', conversationId);
  
  // Update project stats
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

// WEBHOOK 2: MEMORY EXTRACTION WITH VECTOR EMBEDDINGS
export async function memoryWebhook(req: NextRequest) {
  const body = await req.json();
  const { conversationId, userId, extractedFacts, embeddings } = body;
  
  // Zapier has already:
  // 1. Called OpenAI to extract facts
  // 2. Generated embeddings with text-embedding-ada-002
  // 3. Structured the data
  
  // Store each fact as a memory chunk
  const memoryChunks = extractedFacts.map((fact: any, index: number) => ({
    user_id: userId,
    conversation_id: conversationId,
    content: fact.content,
    content_type: fact.type, // 'fact', 'preference', 'event', 'knowledge'
    embedding: embeddings[index],
    relevance_score: fact.importance || 1.0,
    is_family_shared: fact.shareable || false,
    metadata: {
      extracted_at: new Date().toISOString(),
      source: 'zapier_memory_agent'
    }
  }));
  
  // Batch insert all memory chunks
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

// WEBHOOK 3: UNIFIED SEARCH ACROSS ALL SERVICES
export async function searchWebhook(req: NextRequest) {
  const body = await req.json();
  const { query, userId, searchEmbedding } = body;
  
  // Zapier has already searched:
  // 1. Google Drive files
  // 2. Gmail messages
  // 3. Generated search embedding
  
  // Now search our vector database
  const { data: memories } = await supabase.rpc('search_similar_messages', {
    query_embedding: searchEmbedding,
    match_threshold: 0.75,
    match_count: 10,
    user_id: userId
  });
  
  // Combine with Zapier's results
  const combinedResults = {
    memories: memories || [],
    drive_files: body.driveResults || [],
    gmail_messages: body.gmailResults || [],
    total_results: (memories?.length || 0) + 
                   (body.driveResults?.length || 0) + 
                   (body.gmailResults?.length || 0)
  };
  
  return NextResponse.json(combinedResults);
}

// WEBHOOK 4: AUTO-DEPLOY WITH ERROR FIXING
export async function deployWebhook(req: NextRequest) {
  const body = await req.json();
  const { error, suggested_fix, deployment_id } = body;
  
  // Zapier has:
  // 1. Detected build/deployment error
  // 2. Called GPT-4 to analyze error
  // 3. Generated fix with GitHub Copilot
  // 4. Committed fix to GitHub
  // 5. Triggered new deployment
  
  // Log deployment attempt
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

// WEBHOOK 5: TRIGGER MEMORY EXTRACTION AFTER EACH CONVERSATION
export async function triggerMemoryExtraction(req: NextRequest) {
  const body = await req.json();
  const { conversationId, userId, messages } = body;
  
  // This webhook is called from your chat API
  // It triggers Zapier to extract memories
  
  // Send to Zapier webhook
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

// Helper function to generate consistent project colors
function generateProjectColor(projectName: string): string {
  const colors = [
    '#3B82F6', // blue
    '#10B981', // green
    '#F59E0B', // amber
    '#EF4444', // red
    '#8B5CF6', // violet
    '#EC4899', // pink
    '#06B6D4', // cyan
    '#F97316'  // orange
  ];
  
  // Generate consistent color based on project name
  const hash = projectName.split('').reduce((acc, char) => {
    return char.charCodeAt(0) + ((acc << 5) - acc);
  }, 0);
  
  return colors[Math.abs(hash) % colors.length];
}

// Main router for all Zapier webhooks
export async function POST(request: NextRequest) {
  const url = new URL(request.url);
  const action = url.searchParams.get('action');
  
  switch (action) {
    case 'organize':
      return organizationWebhook(request);
    case 'memory':
      return memoryWebhook(request);
    case 'search':
      return searchWebhook(request);
    case 'deploy':
      return deployWebhook(request);
    case 'trigger-memory':
      return triggerMemoryExtraction(request);
    default:
      return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  }
}