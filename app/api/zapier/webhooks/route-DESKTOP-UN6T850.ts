/**
 * Zapier Webhook Integration - Automatic data sync from all Zapier connections
 * This endpoint receives data from Zapier Pro integrations and automatically indexes it
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { BackgroundIndexer } from '@/lib/background-indexer';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const webhookData = await request.json();
    const { source, event_type, data, user_mapping } = webhookData;

    // Verify webhook authenticity (basic security)
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.includes(process.env.ZAPIER_WEBHOOK_SECRET || 'kimbleai-zapier-secret')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Map external user to internal user
    const userId = mapExternalUserToInternal(user_mapping, data);
    if (!userId) {
      return NextResponse.json({ error: 'User mapping failed' }, { status: 400 });
    }

    console.log(`📨 Zapier webhook received: ${source} - ${event_type}`);

    let processed = false;
    let result: any = {};

    switch (source) {
      case 'gmail':
        result = await processGmailWebhook(data, userId);
        processed = true;
        break;

      case 'google_drive':
        result = await processGoogleDriveWebhook(data, userId);
        processed = true;
        break;

      case 'google_calendar':
        result = await processGoogleCalendarWebhook(data, userId);
        processed = true;
        break;

      case 'slack':
        result = await processSlackWebhook(data, userId);
        processed = true;
        break;

      case 'notion':
        result = await processNotionWebhook(data, userId);
        processed = true;
        break;

      case 'airtable':
        result = await processAirtableWebhook(data, userId);
        processed = true;
        break;

      case 'trello':
        result = await processTrelloWebhook(data, userId);
        processed = true;
        break;

      case 'asana':
        result = await processAsanaWebhook(data, userId);
        processed = true;
        break;

      case 'microsoft_teams':
        result = await processTeamsWebhook(data, userId);
        processed = true;
        break;

      case 'dropbox':
        result = await processDropboxWebhook(data, userId);
        processed = true;
        break;

      case 'salesforce':
        result = await processSalesforceWebhook(data, userId);
        processed = true;
        break;

      case 'hubspot':
        result = await processHubSpotWebhook(data, userId);
        processed = true;
        break;

      default:
        // Generic processor for unknown sources
        result = await processGenericWebhook(source, data, userId);
        processed = true;
    }

    // Log the webhook activity
    await supabase
      .from('zapier_webhooks')
      .insert({
        source,
        event_type,
        user_id: userId,
        data: data,
        processed,
        result: result,
        received_at: new Date().toISOString()
      });

    return NextResponse.json({
      success: true,
      source,
      event_type,
      processed,
      result,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('Zapier webhook error:', error);
    return NextResponse.json({
      error: 'Webhook processing failed',
      details: error.message
    }, { status: 500 });
  }
}

function mapExternalUserToInternal(user_mapping: any, data: any): string | null {
  // Priority mapping order:
  // 1. Explicit user mapping from Zapier
  // 2. Email-based mapping
  // 3. Default to Zach for admin-related events

  if (user_mapping?.internal_user_id) {
    return user_mapping.internal_user_id;
  }

  // Email-based mapping
  const email = data.email || data.sender_email || data.from_email || data.user_email;
  if (email) {
    if (email.includes('zach') || email.includes('admin')) {
      return 'zach-admin-001';
    }
    if (email.includes('rebecca')) {
      return 'rebecca-user-001';
    }
  }

  // Default to Zach for system events
  return 'zach-admin-001';
}

async function processGmailWebhook(data: any, userId: string): Promise<any> {
  try {
    const backgroundIndexer = BackgroundIndexer.getInstance();

    // Auto-index email content
    const emailContent = `
Subject: ${data.subject || 'No Subject'}
From: ${data.from || 'Unknown Sender'}
To: ${data.to || ''}
Date: ${data.date || new Date().toISOString()}

${data.body_plain || data.body_html || 'No content'}
    `.trim();

    // Store in knowledge base
    await supabase.from('knowledge_base').insert({
      user_id: userId,
      source_type: 'email',
      source_id: data.message_id || `zapier-${Date.now()}`,
      category: 'email',
      title: data.subject || 'Email from Zapier',
      content: emailContent.substring(0, 2000),
      importance: data.importance === 'high' ? 0.9 : 0.7,
      tags: ['zapier', 'gmail', ...(data.labels || [])],
      metadata: {
        from: data.from,
        to: data.to,
        date: data.date,
        zapier_source: true,
        thread_id: data.thread_id
      }
    });

    return {
      indexed: true,
      content_length: emailContent.length,
      source_id: data.message_id
    };
  } catch (error: any) {
    console.error('Gmail webhook processing error:', error);
    return { error: error.message };
  }
}

async function processGoogleDriveWebhook(data: any, userId: string): Promise<any> {
  try {
    // Auto-index file metadata and content if available
    const fileContent = `
File: ${data.name || 'Unknown File'}
Type: ${data.mime_type || 'Unknown'}
Size: ${data.size || 'Unknown'}
Modified: ${data.modified_time || new Date().toISOString()}
Owner: ${data.owner || 'Unknown'}

${data.content || 'File content not available in webhook'}
    `.trim();

    await supabase.from('knowledge_base').insert({
      user_id: userId,
      source_type: 'drive',
      source_id: data.file_id || `zapier-drive-${Date.now()}`,
      category: getFileCategory(data.mime_type),
      title: data.name || 'File from Zapier',
      content: fileContent.substring(0, 2000),
      importance: 0.7,
      tags: ['zapier', 'google-drive', ...(data.tags || [])],
      metadata: {
        file_id: data.file_id,
        mime_type: data.mime_type,
        size: data.size,
        web_view_link: data.web_view_link,
        zapier_source: true
      }
    });

    return {
      indexed: true,
      file_name: data.name,
      file_type: data.mime_type
    };
  } catch (error: any) {
    console.error('Google Drive webhook processing error:', error);
    return { error: error.message };
  }
}

async function processGoogleCalendarWebhook(data: any, userId: string): Promise<any> {
  try {
    const eventContent = `
Event: ${data.summary || 'No Title'}
Date: ${data.start_time || data.start || 'Unknown'}
Location: ${data.location || 'No location'}
Attendees: ${data.attendees?.join(', ') || 'No attendees'}

${data.description || 'No description'}
    `.trim();

    await supabase.from('knowledge_base').insert({
      user_id: userId,
      source_type: 'calendar',
      source_id: data.event_id || `zapier-calendar-${Date.now()}`,
      category: 'meeting',
      title: `Meeting: ${data.summary || 'Calendar Event'}`,
      content: eventContent.substring(0, 2000),
      importance: 0.8,
      tags: ['zapier', 'calendar', 'meeting'],
      metadata: {
        event_id: data.event_id,
        start_time: data.start_time || data.start,
        end_time: data.end_time || data.end,
        location: data.location,
        attendees: data.attendees || [],
        zapier_source: true
      }
    });

    return {
      indexed: true,
      event_title: data.summary,
      event_date: data.start_time || data.start
    };
  } catch (error: any) {
    console.error('Google Calendar webhook processing error:', error);
    return { error: error.message };
  }
}

async function processSlackWebhook(data: any, userId: string): Promise<any> {
  try {
    const messageContent = `
Slack Message
Channel: ${data.channel_name || 'Unknown Channel'}
User: ${data.user_name || 'Unknown User'}
Timestamp: ${data.timestamp || new Date().toISOString()}

${data.text || 'No message content'}
    `.trim();

    await supabase.from('knowledge_base').insert({
      user_id: userId,
      source_type: 'slack',
      source_id: data.message_ts || `zapier-slack-${Date.now()}`,
      category: 'communication',
      title: `Slack: ${data.channel_name || 'Message'}`,
      content: messageContent.substring(0, 2000),
      importance: data.thread_ts ? 0.8 : 0.6, // Threaded messages are more important
      tags: ['zapier', 'slack', data.channel_name || 'general'],
      metadata: {
        channel: data.channel_name,
        user: data.user_name,
        timestamp: data.timestamp,
        thread_ts: data.thread_ts,
        zapier_source: true
      }
    });

    return {
      indexed: true,
      channel: data.channel_name,
      user: data.user_name
    };
  } catch (error: any) {
    console.error('Slack webhook processing error:', error);
    return { error: error.message };
  }
}

async function processNotionWebhook(data: any, userId: string): Promise<any> {
  try {
    const pageContent = `
Notion Page: ${data.title || 'Untitled'}
Database: ${data.database_name || 'Unknown'}
Status: ${data.status || 'Unknown'}
Created: ${data.created_time || new Date().toISOString()}

${data.content || data.properties_text || 'No content available'}
    `.trim();

    await supabase.from('knowledge_base').insert({
      user_id: userId,
      source_type: 'notion',
      source_id: data.page_id || `zapier-notion-${Date.now()}`,
      category: 'document',
      title: data.title || 'Notion Page',
      content: pageContent.substring(0, 2000),
      importance: 0.8,
      tags: ['zapier', 'notion', ...(data.tags || [])],
      metadata: {
        page_id: data.page_id,
        database_name: data.database_name,
        status: data.status,
        url: data.url,
        zapier_source: true
      }
    });

    return {
      indexed: true,
      page_title: data.title,
      database: data.database_name
    };
  } catch (error: any) {
    console.error('Notion webhook processing error:', error);
    return { error: error.message };
  }
}

async function processGenericWebhook(source: string, data: any, userId: string): Promise<any> {
  try {
    // Generic processor for any service
    const content = JSON.stringify(data, null, 2);

    await supabase.from('knowledge_base').insert({
      user_id: userId,
      source_type: source.toLowerCase().replace(/[^a-z0-9]/g, '_'),
      source_id: data.id || `zapier-${source}-${Date.now()}`,
      category: 'integration',
      title: `${source}: ${data.title || data.name || 'Zapier Integration'}`,
      content: content.substring(0, 2000),
      importance: 0.6,
      tags: ['zapier', source.toLowerCase(), 'integration'],
      metadata: {
        source: source,
        zapier_source: true,
        raw_data: data
      }
    });

    return {
      indexed: true,
      source: source,
      data_size: content.length
    };
  } catch (error: any) {
    console.error(`Generic webhook processing error for ${source}:`, error);
    return { error: error.message };
  }
}

// Additional processors for other services
async function processAirtableWebhook(data: any, userId: string): Promise<any> {
  return await processGenericWebhook('airtable', data, userId);
}

async function processTrelloWebhook(data: any, userId: string): Promise<any> {
  return await processGenericWebhook('trello', data, userId);
}

async function processAsanaWebhook(data: any, userId: string): Promise<any> {
  return await processGenericWebhook('asana', data, userId);
}

async function processTeamsWebhook(data: any, userId: string): Promise<any> {
  return await processGenericWebhook('microsoft_teams', data, userId);
}

async function processDropboxWebhook(data: any, userId: string): Promise<any> {
  return await processGenericWebhook('dropbox', data, userId);
}

async function processSalesforceWebhook(data: any, userId: string): Promise<any> {
  return await processGenericWebhook('salesforce', data, userId);
}

async function processHubSpotWebhook(data: any, userId: string): Promise<any> {
  return await processGenericWebhook('hubspot', data, userId);
}

function getFileCategory(mimeType: string): string {
  if (!mimeType) return 'file';

  if (mimeType.includes('document') || mimeType.includes('text')) return 'document';
  if (mimeType.includes('spreadsheet') || mimeType.includes('csv')) return 'spreadsheet';
  if (mimeType.includes('presentation')) return 'presentation';
  if (mimeType.includes('image')) return 'image';
  if (mimeType.includes('video')) return 'video';
  if (mimeType.includes('audio')) return 'audio';
  if (mimeType.includes('pdf')) return 'pdf';

  return 'file';
}

export async function GET(request: NextRequest) {
  return NextResponse.json({
    service: 'KimbleAI Zapier Webhook Integration',
    version: '1.0',
    supported_sources: [
      'gmail',
      'google_drive',
      'google_calendar',
      'slack',
      'notion',
      'airtable',
      'trello',
      'asana',
      'microsoft_teams',
      'dropbox',
      'salesforce',
      'hubspot'
    ],
    features: [
      'Automatic data indexing from Zapier',
      'Real-time webhook processing',
      'Multi-source integration',
      'Intelligent content categorization',
      'Automatic knowledge base updates'
    ],
    webhook_url: `${process.env.NEXTAUTH_URL}/api/zapier/webhooks`,
    setup_instructions: {
      '1': 'Create a Zap in Zapier Pro',
      '2': 'Choose your trigger app (Gmail, Drive, Slack, etc.)',
      '3': 'Set action to "Webhooks by Zapier"',
      '4': 'Use POST method with the webhook URL above',
      '5': 'Add Authorization header with your secret',
      '6': 'Map relevant fields from trigger to webhook data'
    }
  });
}