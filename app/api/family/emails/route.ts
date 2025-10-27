import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireAuth } from '@/lib/auth';
import { google } from 'googleapis';
import OpenAI from 'openai';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

interface EmailCategory {
  category: string;
  subcategory?: string;
  isShared: boolean;
  sharedWith: string[];
  priority: string;
  actionRequired: boolean;
  actionItems: string[];
  tags: string[];
}

// GET: Fetch family-relevant emails
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    const { searchParams } = new URL(request.url);

    const category = searchParams.get('category');
    const isShared = searchParams.get('is_shared') === 'true';
    const actionRequired = searchParams.get('action_required') === 'true';
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    let query = supabase
      .from('family_email_categories')
      .select('*')
      .order('received_date', { ascending: false })
      .range(offset, offset + limit - 1);

    if (category) {
      query = query.eq('category', category);
    }

    if (isShared) {
      query = query.eq('is_shared', true);
    }

    if (actionRequired) {
      query = query.eq('action_required', true);
    }

    const { data: emails, error } = await query;

    if (error) {
      console.error('Error fetching emails:', error);
      return NextResponse.json(
        { error: 'Failed to fetch emails' },
        { status: 500 }
      );
    }

    // Get category counts
    const { data: categoryCounts } = await supabase
      .from('family_email_categories')
      .select('category')
      .eq('is_archived', false);

    const counts = categoryCounts?.reduce((acc, email) => {
      acc[email.category] = (acc[email.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return NextResponse.json({
      success: true,
      emails: emails || [],
      count: emails?.length || 0,
      categoryCounts: counts || {},
    });
  } catch (error: any) {
    console.error('Emails API error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST: Categorize and tag emails
export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    const body = await request.json();

    const { action, emailId, category, tags, isShared, sharedWith } = body;

    if (action === 'categorize') {
      // Update email category
      const { error } = await supabase
        .from('family_email_categories')
        .update({
          category,
          tags,
          is_shared: isShared,
          shared_with: sharedWith,
        })
        .eq('id', emailId);

      if (error) {
        console.error('Error updating email:', error);
        return NextResponse.json(
          { error: 'Failed to update email' },
          { status: 500 }
        );
      }

      return NextResponse.json({ success: true });
    } else if (action === 'fetch_and_categorize') {
      // Fetch new emails from Gmail and categorize them
      const result = await fetchAndCategorizeEmails(auth.userId, auth.email);
      return NextResponse.json(result);
    } else if (action === 'share') {
      // Share email with other user
      const { data: email } = await supabase
        .from('family_email_categories')
        .select('*')
        .eq('id', emailId)
        .single();

      if (!email) {
        return NextResponse.json(
          { error: 'Email not found' },
          { status: 404 }
        );
      }

      const { error } = await supabase
        .from('family_email_categories')
        .update({
          is_shared: true,
          shared_with: [...(email.shared_with || []), auth.userId === 'zach' ? 'rebecca' : 'zach'],
        })
        .eq('id', emailId);

      if (error) {
        return NextResponse.json(
          { error: 'Failed to share email' },
          { status: 500 }
        );
      }

      // Log activity
      await supabase.from('family_activity_feed').insert({
        user_id: auth.userId,
        activity_type: 'email_shared',
        title: `Shared email: ${email.subject}`,
        description: email.snippet,
        resource_type: 'email',
        resource_id: emailId,
        is_visible_to: ['zach', 'rebecca'],
      });

      return NextResponse.json({ success: true });
    }

    return NextResponse.json(
      { error: 'Invalid action' },
      { status: 400 }
    );
  } catch (error: any) {
    console.error('Emails POST API error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

// Helper function to fetch and categorize emails from Gmail
async function fetchAndCategorizeEmails(userId: string, userEmail: string) {
  try {
    // Get user's Gmail token
    const { data: token } = await supabase
      .from('user_tokens')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (!token || !token.access_token) {
      return {
        success: false,
        error: 'Gmail not connected',
      };
    }

    // Initialize Gmail client
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET
    );

    oauth2Client.setCredentials({
      access_token: token.access_token,
      refresh_token: token.refresh_token,
    });

    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

    // Fetch recent emails (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const afterDate = Math.floor(thirtyDaysAgo.getTime() / 1000);

    const response = await gmail.users.messages.list({
      userId: 'me',
      maxResults: 50,
      q: `after:${afterDate}`,
    });

    const messages = response.data.messages || [];
    const categorizedEmails: any[] = [];

    for (const message of messages.slice(0, 20)) {
      // Limit to 20 emails for performance
      const messageData = await gmail.users.messages.get({
        userId: 'me',
        id: message.id!,
        format: 'full',
      });

      const headers = messageData.data.payload?.headers || [];
      const subject = headers.find((h) => h.name === 'Subject')?.value || '';
      const from = headers.find((h) => h.name === 'From')?.value || '';
      const to = headers.find((h) => h.name === 'To')?.value?.split(',') || [];
      const cc = headers.find((h) => h.name === 'Cc')?.value?.split(',') || [];
      const date = headers.find((h) => h.name === 'Date')?.value || '';

      const snippet = messageData.data.snippet || '';
      const internalDate = messageData.data.internalDate || '';
      const receivedDate = new Date(parseInt(internalDate)).toISOString();

      // Categorize email using AI
      const emailCategory = await categorizeEmail(subject, snippet, from);

      // Check if email already exists
      const { data: existingEmail } = await supabase
        .from('family_email_categories')
        .select('id')
        .eq('gmail_message_id', message.id!)
        .single();

      if (!existingEmail) {
        // Insert new email
        const { data: newEmail, error } = await supabase
          .from('family_email_categories')
          .insert({
            gmail_message_id: message.id!,
            thread_id: messageData.data.threadId || '',
            user_email: userEmail,
            from_email: from,
            to_email: to,
            cc_email: cc,
            subject,
            snippet,
            category: emailCategory.category,
            subcategory: emailCategory.subcategory,
            is_shared: emailCategory.isShared,
            shared_with: emailCategory.sharedWith,
            priority: emailCategory.priority,
            action_required: emailCategory.actionRequired,
            action_items: emailCategory.actionItems,
            tags: emailCategory.tags,
            received_date: receivedDate,
            has_attachments: (messageData.data.payload?.parts?.length || 0) > 1,
            attachment_count: (messageData.data.payload?.parts?.length || 1) - 1,
          })
          .select()
          .single();

        if (!error && newEmail) {
          categorizedEmails.push(newEmail);
        }
      }
    }

    return {
      success: true,
      categorized: categorizedEmails.length,
      total: messages.length,
    };
  } catch (error: any) {
    console.error('Fetch and categorize error:', error);
    return {
      success: false,
      error: error.message,
    };
  }
}

// Helper function to categorize email using AI
async function categorizeEmail(
  subject: string,
  snippet: string,
  from: string
): Promise<EmailCategory> {
  try {
    const prompt = `Analyze this email and categorize it for a family management system.

Email Subject: ${subject}
Email From: ${from}
Email Snippet: ${snippet}

Categorize this email into ONE of these categories:
- bills_financial: Bank statements, bills, credit cards, investments, insurance
- travel: Booking confirmations, travel itineraries, hotels, flights
- home_property: Utilities, contractors, HOA, maintenance, property
- joint_projects: Projects both spouses are working on
- family: Relatives, family events, extended family
- shopping: Online orders, receipts, shipping confirmations
- insurance: Health, auto, home, life insurance
- legal: Legal documents, contracts, agreements
- healthcare: Medical, dental, appointments, prescriptions
- utilities: Electricity, water, internet, phone bills
- subscriptions: Streaming, software, memberships
- other: Anything else

Also determine:
1. Is this email relevant to both spouses? (isShared: true/false)
2. Priority level: low, normal, high, urgent
3. Does it require action? (actionRequired: true/false)
4. What action items if any? (list)
5. Suggested tags (2-3 relevant tags)

Respond with ONLY valid JSON:
{
  "category": "category_name",
  "subcategory": "optional subcategory",
  "isShared": true/false,
  "sharedWith": ["zach", "rebecca"] or ["zach"] or ["rebecca"],
  "priority": "low/normal/high/urgent",
  "actionRequired": true/false,
  "actionItems": ["action1", "action2"],
  "tags": ["tag1", "tag2"]
}`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are a family email categorization assistant. Respond only with valid JSON.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.3,
      max_tokens: 300,
    });

    const result = response.choices[0].message.content || '{}';
    const parsed = JSON.parse(result);

    return {
      category: parsed.category || 'other',
      subcategory: parsed.subcategory,
      isShared: parsed.isShared !== false,
      sharedWith: parsed.sharedWith || ['zach', 'rebecca'],
      priority: parsed.priority || 'normal',
      actionRequired: parsed.actionRequired || false,
      actionItems: parsed.actionItems || [],
      tags: parsed.tags || [],
    };
  } catch (error) {
    console.error('Email categorization error:', error);
    // Return default category on error
    return {
      category: 'other',
      isShared: false,
      sharedWith: [],
      priority: 'normal',
      actionRequired: false,
      actionItems: [],
      tags: [],
    };
  }
}
