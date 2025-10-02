import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function generateEmbedding(text: string): Promise<number[] | null> {
  try {
    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'text-embedding-3-small',
        input: text.substring(0, 8000),
        dimensions: 1536
      })
    });

    if (!response.ok) return null;
    const data = await response.json();
    return data.data[0].embedding;
  } catch (error) {
    console.error('Embedding error:', error);
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const { action = 'search', query, userId = 'zach', maxResults = 10, emailData, projectId } = await request.json();

    // Get user's Google token
    const { data: tokenData } = await supabase
      .from('user_tokens')
      .select('access_token, refresh_token')
      .eq('user_id', userId)
      .single();

    if (!tokenData?.access_token) {
      return NextResponse.json({
        error: 'User not authenticated with Google'
      }, { status: 401 });
    }

    // Initialize Gmail client
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID!,
      process.env.GOOGLE_CLIENT_SECRET!,
      process.env.NEXTAUTH_URL + '/api/auth/callback/google'
    );
    oauth2Client.setCredentials({
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token
    });

    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

    switch (action) {
      case 'search':
        return await searchEmails(gmail, query, userId, maxResults, projectId);

      case 'sync_project_emails':
        return await syncProjectEmails(gmail, userId, projectId);

      case 'send_email':
        return await sendEmail(gmail, userId, emailData);

      case 'get_unread':
        return await getUnreadEmails(gmail, userId);

      case 'get_recent':
        return await getRecentEmails(gmail, userId, maxResults);

      case 'bulk_sync':
        return await bulkSyncEmails(gmail, userId);

      default:
        return await searchEmails(gmail, query, userId, maxResults, projectId);
    }

  } catch (error: any) {
    console.error('Gmail search error:', error);
    return NextResponse.json({
      error: 'Failed to search Gmail',
      details: error.message
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action') || 'list';
    const userId = searchParams.get('userId') || 'zach';
    const query = searchParams.get('q') || '';
    const maxResults = parseInt(searchParams.get('maxResults') || '20');
    const messageId = searchParams.get('messageId');
    const labelId = searchParams.get('labelId');

    // Get user's Google token
    const { data: tokenData } = await supabase
      .from('user_tokens')
      .select('access_token, refresh_token')
      .eq('user_id', userId)
      .single();

    if (!tokenData?.access_token) {
      return NextResponse.json({
        error: 'User not authenticated with Google'
      }, { status: 401 });
    }

    // Initialize Gmail client
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID!,
      process.env.GOOGLE_CLIENT_SECRET!,
      process.env.NEXTAUTH_URL + '/api/auth/callback/google'
    );
    oauth2Client.setCredentials({
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token
    });

    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

    switch (action) {
      case 'list':
        return await listEmails(gmail, userId, maxResults, labelId);

      case 'get':
        if (!messageId) {
          return NextResponse.json({ error: 'messageId is required' }, { status: 400 });
        }
        return await getEmail(gmail, messageId);

      case 'search':
        return await searchEmails(gmail, query, userId, maxResults);

      case 'labels':
        return await getLabels(gmail);

      default:
        return NextResponse.json({
          service: 'Gmail API',
          endpoints: {
            'GET ?action=list': 'List inbox messages',
            'GET ?action=get&messageId=xxx': 'Get single message with full details',
            'GET ?action=search&q=xxx': 'Search emails',
            'GET ?action=labels': 'Get all labels',
            'POST': 'Import email to knowledge base or send email'
          }
        });
    }

  } catch (error: any) {
    console.error('Gmail GET error:', error);
    return NextResponse.json({
      error: 'Failed to access Gmail',
      details: error.message
    }, { status: 500 });
  }
}

async function listEmails(gmail: any, userId: string, maxResults: number, labelId?: string | null) {
  const listParams: any = {
    userId: 'me',
    maxResults,
    labelIds: labelId ? [labelId] : ['INBOX']
  };

  const response = await gmail.users.messages.list(listParams);
  const messages = response.data.messages || [];

  const emailList = [];
  for (const message of messages.slice(0, maxResults)) {
    try {
      const fullMessage = await gmail.users.messages.get({
        userId: 'me',
        id: message.id,
        format: 'metadata',
        metadataHeaders: ['Subject', 'From', 'To', 'Date']
      });

      const headers = fullMessage.data.payload?.headers || [];
      const subject = headers.find((h: any) => h.name === 'Subject')?.value || 'No subject';
      const from = headers.find((h: any) => h.name === 'From')?.value || 'Unknown';
      const date = headers.find((h: any) => h.name === 'Date')?.value || '';

      emailList.push({
        id: message.id,
        threadId: message.threadId,
        subject,
        from,
        date,
        snippet: fullMessage.data.snippet || '',
        labels: fullMessage.data.labelIds || [],
        unread: fullMessage.data.labelIds?.includes('UNREAD')
      });
    } catch (err) {
      console.error(`Error fetching message ${message.id}:`, err);
    }
  }

  return NextResponse.json({
    success: true,
    messages: emailList,
    total: messages.length
  });
}

async function getEmail(gmail: any, messageId: string) {
  const fullMessage = await gmail.users.messages.get({
    userId: 'me',
    id: messageId
  });

  const headers = fullMessage.data.payload?.headers || [];
  const subject = headers.find((h: any) => h.name === 'Subject')?.value || 'No subject';
  const from = headers.find((h: any) => h.name === 'From')?.value || 'Unknown';
  const to = headers.find((h: any) => h.name === 'To')?.value || '';
  const date = headers.find((h: any) => h.name === 'Date')?.value || '';
  const cc = headers.find((h: any) => h.name === 'Cc')?.value || '';

  // Extract body
  let body = '';
  let attachments: any[] = [];

  const extractBody = (payload: any): string => {
    if (payload.parts) {
      for (const part of payload.parts) {
        if (part.mimeType === 'text/plain' && part.body?.data) {
          return Buffer.from(part.body.data, 'base64').toString('utf-8');
        } else if (part.mimeType === 'text/html' && part.body?.data && !body) {
          const htmlContent = Buffer.from(part.body.data, 'base64').toString('utf-8');
          return htmlContent.replace(/<[^>]*>/g, '');
        } else if (part.parts) {
          const nestedBody = extractBody(part);
          if (nestedBody) return nestedBody;
        }

        if (part.filename && part.filename.length > 0) {
          attachments.push({
            filename: part.filename,
            mimeType: part.mimeType,
            size: part.body?.size || 0,
            attachmentId: part.body?.attachmentId
          });
        }
      }
    } else if (payload.body?.data) {
      return Buffer.from(payload.body.data, 'base64').toString('utf-8');
    }
    return '';
  };

  body = extractBody(fullMessage.data.payload);

  return NextResponse.json({
    success: true,
    email: {
      id: messageId,
      threadId: fullMessage.data.threadId,
      subject,
      from,
      to,
      cc,
      date,
      body,
      snippet: fullMessage.data.snippet || '',
      attachments,
      labels: fullMessage.data.labelIds || [],
      unread: fullMessage.data.labelIds?.includes('UNREAD')
    }
  });
}

async function getLabels(gmail: any) {
  const response = await gmail.users.labels.list({
    userId: 'me'
  });

  const labels = response.data.labels || [];

  return NextResponse.json({
    success: true,
    labels: labels.map((label: any) => ({
      id: label.id,
      name: label.name,
      type: label.type,
      messagesTotal: label.messagesTotal,
      messagesUnread: label.messagesUnread
    }))
  });
}

async function searchEmails(gmail: any, query: string, userId: string, maxResults: number, projectId?: string) {
  // Search Gmail
  const response = await gmail.users.messages.list({
    userId: 'me',
    q: query,
    maxResults: maxResults
  });

  // Get user data
  const { data: userData } = await supabase
    .from('users')
    .select('id')
    .eq('name', userId === 'rebecca' ? 'Rebecca' : 'Zach')
    .single();

  // Process each message with enhanced functionality
  const processedMessages = [];
  const messages = response.data.messages || [];
  for (const message of messages) {
    try {
      const fullMessage = await gmail.users.messages.get({
        userId: 'me',
        id: message.id!
      });

      // Extract message content
      const headers = fullMessage.data.payload?.headers || [];
      const subject = headers.find((h: any) => h.name === 'Subject')?.value || 'No subject';
      const from = headers.find((h: any) => h.name === 'From')?.value || 'Unknown';
      const to = headers.find((h: any) => h.name === 'To')?.value || '';
      const date = headers.find((h: any) => h.name === 'Date')?.value || '';
      const messageId = headers.find((h: any) => h.name === 'Message-ID')?.value || '';

      // Enhanced body extraction
      let body = '';
      let attachments: any[] = [];

      const extractBody = (payload: any): string => {
        if (payload.parts) {
          for (const part of payload.parts) {
            if (part.mimeType === 'text/plain' && part.body?.data) {
              return Buffer.from(part.body.data, 'base64').toString('utf-8');
            } else if (part.mimeType === 'text/html' && part.body?.data) {
              // Fallback to HTML if no plain text
              const htmlContent = Buffer.from(part.body.data, 'base64').toString('utf-8');
              return htmlContent.replace(/<[^>]*>/g, ''); // Simple HTML strip
            } else if (part.parts) {
              const nestedBody: string = extractBody(part);
              if (nestedBody) return nestedBody;
            }

            // Check for attachments
            if (part.filename && part.filename.length > 0) {
              attachments.push({
                filename: part.filename,
                mimeType: part.mimeType,
                size: part.body?.size || 0
              });
            }
          }
        } else if (payload.body?.data) {
          return Buffer.from(payload.body.data, 'base64').toString('utf-8');
        }
        return '';
      };

      body = extractBody(fullMessage.data.payload);

      // Generate embedding
      const content = `Subject: ${subject}\nFrom: ${from}\nTo: ${to}\nDate: ${date}\n\n${body}`;
      const embedding = await generateEmbedding(content);

      // Determine importance based on content
      let importance = 0.6;
      if (subject.toLowerCase().includes('urgent') || subject.toLowerCase().includes('important')) {
        importance = 0.9;
      } else if (from.includes(userId) || to.includes(userId)) {
        importance = 0.8;
      }

      // Enhanced tags
      const tags = ['gmail'];
      if (projectId) tags.push(projectId);

      const domain = from.split('@')[1]?.split('>')[0];
      if (domain) tags.push(domain);

      if (attachments.length > 0) tags.push('has-attachments');
      if (subject.toLowerCase().includes('meeting')) tags.push('meeting');
      if (subject.toLowerCase().includes('deadline')) tags.push('deadline');

      // Store in knowledge base
      await supabase.from('knowledge_base').upsert({
        user_id: userData?.id,
        source_type: 'email',
        source_id: message.id,
        category: 'email',
        title: subject,
        content: content.substring(0, 2000),
        embedding: embedding,
        importance: importance,
        tags: tags,
        metadata: {
          messageId: message.id,
          gmailMessageId: messageId,
          from: from,
          to: to,
          date: date,
          threadId: message.threadId,
          attachments: attachments,
          project_id: projectId,
          labels: fullMessage.data.labelIds || []
        }
      });

      processedMessages.push({
        id: message.id,
        subject: subject,
        from: from,
        to: to,
        date: date,
        preview: body.substring(0, 150),
        attachments: attachments,
        importance: importance,
        threadId: message.threadId
      });

    } catch (err) {
      console.error(`Error processing message ${message.id}:`, err);
    }
  }

  return NextResponse.json({
    success: true,
    messagesFound: processedMessages.length,
    messages: processedMessages,
    query: query
  });
}

async function syncProjectEmails(gmail: any, userId: string, projectId: string) {
  const projectQuery = `${projectId} OR subject:${projectId}`;

  const response = await gmail.users.messages.list({
    userId: 'me',
    q: projectQuery,
    maxResults: 50
  });

  const messages = response.data.messages || [];
  return await searchEmails(gmail, projectQuery, userId, 50, projectId);
}

async function sendEmail(gmail: any, userId: string, emailData: any) {
  const { to, subject, body, replyToMessageId } = emailData;

  const email = [
    `To: ${to}`,
    `Subject: ${subject}`,
    '',
    body
  ].join('\r\n');

  const encodedEmail = Buffer.from(email).toString('base64url');

  const requestBody: any = {
    raw: encodedEmail
  };

  if (replyToMessageId) {
    requestBody.threadId = replyToMessageId;
  }

  const response = await gmail.users.messages.send({
    userId: 'me',
    resource: requestBody
  });

  return NextResponse.json({
    success: true,
    messageId: response.data.id,
    threadId: response.data.threadId
  });
}

async function getUnreadEmails(gmail: any, userId: string) {
  const response = await gmail.users.messages.list({
    userId: 'me',
    q: 'is:unread',
    maxResults: 20
  });

  return await searchEmails(gmail, 'is:unread', userId, 20);
}

async function getRecentEmails(gmail: any, userId: string, maxResults: number) {
  const response = await gmail.users.messages.list({
    userId: 'me',
    maxResults: maxResults
  });

  return await searchEmails(gmail, '', userId, maxResults);
}

async function bulkSyncEmails(gmail: any, userId: string) {
  // Sync emails from the last 7 days
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const dateQuery = `after:${sevenDaysAgo.getFullYear()}/${sevenDaysAgo.getMonth() + 1}/${sevenDaysAgo.getDate()}`;

  const response = await gmail.users.messages.list({
    userId: 'me',
    q: dateQuery,
    maxResults: 100
  });

  return await searchEmails(gmail, dateQuery, userId, 100, 'bulk-sync');
}