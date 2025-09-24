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
    const { action, userId = 'zach', eventData, timeRange } = await request.json();

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

    // Initialize Google Calendar client
    const oauth2Client = new google.auth.OAuth2();
    oauth2Client.setCredentials({
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token
    });

    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

    switch (action) {
      case 'get_events':
        return await getCalendarEvents(calendar, userId, timeRange);

      case 'create_event':
        return await createCalendarEvent(calendar, userId, eventData);

      case 'sync_to_knowledge':
        return await syncCalendarToKnowledge(calendar, userId, timeRange);

      case 'get_availability':
        return await getAvailability(calendar, userId, timeRange);

      case 'schedule_meeting':
        return await scheduleMeeting(calendar, userId, eventData);

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

  } catch (error: any) {
    console.error('Google Calendar API error:', error);
    return NextResponse.json({
      error: 'Calendar operation failed',
      details: error.message
    }, { status: 500 });
  }
}

async function getCalendarEvents(calendar: any, userId: string, timeRange: any) {
  const { start, end, maxResults = 50 } = timeRange || {};

  const response = await calendar.events.list({
    calendarId: 'primary',
    timeMin: start || new Date().toISOString(),
    timeMax: end || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    maxResults,
    singleEvents: true,
    orderBy: 'startTime'
  });

  const events = response.data.items || [];

  // Format events for frontend
  const formattedEvents = events.map((event: any) => ({
    id: event.id,
    title: event.summary || 'No Title',
    description: event.description || '',
    start: event.start?.dateTime || event.start?.date,
    end: event.end?.dateTime || event.end?.date,
    location: event.location || '',
    attendees: event.attendees?.map((a: any) => ({
      email: a.email,
      name: a.displayName,
      status: a.responseStatus
    })) || [],
    creator: event.creator,
    organizer: event.organizer,
    status: event.status,
    htmlLink: event.htmlLink,
    conferenceData: event.conferenceData,
    isAllDay: !event.start?.dateTime
  }));

  return NextResponse.json({
    success: true,
    events: formattedEvents,
    totalEvents: formattedEvents.length,
    timeRange: { start, end }
  });
}

async function createCalendarEvent(calendar: any, userId: string, eventData: any) {
  const {
    title,
    description,
    start,
    end,
    attendees,
    location,
    reminders,
    projectId
  } = eventData;

  const event = {
    summary: title,
    description: description || '',
    start: {
      dateTime: start,
      timeZone: 'America/New_York'
    },
    end: {
      dateTime: end,
      timeZone: 'America/New_York'
    },
    location: location || '',
    attendees: attendees?.map((email: string) => ({ email })) || [],
    reminders: {
      useDefault: false,
      overrides: reminders || [
        { method: 'popup', minutes: 15 },
        { method: 'email', minutes: 60 }
      ]
    },
    conferenceData: {
      createRequest: {
        requestId: `meeting-${Date.now()}`,
        conferenceSolutionKey: { type: 'hangoutsMeet' }
      }
    }
  };

  const response = await calendar.events.insert({
    calendarId: 'primary',
    resource: event,
    conferenceDataVersion: 1
  });

  const createdEvent = response.data;

  // Store event reference in knowledge base for future AI context
  if (projectId) {
    const eventContext = `Calendar Event: ${title}\nDescription: ${description}\nDate: ${start}\nAttendees: ${attendees?.join(', ') || 'None'}`;
    const embedding = await generateEmbedding(eventContext);

    await supabase.from('knowledge_base').insert({
      user_id: userId,
      source_type: 'calendar',
      source_id: createdEvent.id,
      category: 'meeting',
      title: `Meeting: ${title}`,
      content: eventContext,
      embedding: embedding,
      importance: 0.8,
      tags: ['calendar', 'meeting', projectId],
      metadata: {
        event_id: createdEvent.id,
        project_id: projectId,
        meeting_link: createdEvent.conferenceData?.entryPoints?.[0]?.uri,
        start_time: start,
        end_time: end,
        attendees: attendees || []
      }
    });
  }

  return NextResponse.json({
    success: true,
    event: {
      id: createdEvent.id,
      title: createdEvent.summary,
      start: createdEvent.start?.dateTime,
      end: createdEvent.end?.dateTime,
      htmlLink: createdEvent.htmlLink,
      meetingLink: createdEvent.conferenceData?.entryPoints?.[0]?.uri
    }
  });
}

async function syncCalendarToKnowledge(calendar: any, userId: string, timeRange: any) {
  const { start, end } = timeRange || {
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
  };

  const response = await calendar.events.list({
    calendarId: 'primary',
    timeMin: start,
    timeMax: end,
    maxResults: 200,
    singleEvents: true,
    orderBy: 'startTime'
  });

  const events = response.data.items || [];
  let syncedCount = 0;

  for (const event of events) {
    try {
      // Skip events without meaningful content
      if (!event.summary || event.summary.length < 3) continue;

      // Check if already synced
      const { data: existing } = await supabase
        .from('knowledge_base')
        .select('id')
        .eq('source_type', 'calendar')
        .eq('source_id', event.id)
        .single();

      if (existing) continue; // Already synced

      // Create knowledge entry
      const eventContext = `
Calendar Event: ${event.summary}
Date: ${event.start?.dateTime || event.start?.date}
${event.description ? `Description: ${event.description}` : ''}
${event.location ? `Location: ${event.location}` : ''}
${event.attendees ? `Attendees: ${event.attendees.map((a: any) => a.email).join(', ')}` : ''}
      `.trim();

      const embedding = await generateEmbedding(eventContext);

      await supabase.from('knowledge_base').insert({
        user_id: userId,
        source_type: 'calendar',
        source_id: event.id,
        category: 'meeting',
        title: `Meeting: ${event.summary}`,
        content: eventContext,
        embedding: embedding,
        importance: 0.7,
        tags: ['calendar', 'meeting', 'auto-synced'],
        metadata: {
          event_id: event.id,
          start_time: event.start?.dateTime || event.start?.date,
          end_time: event.end?.dateTime || event.end?.date,
          attendees: event.attendees?.map((a: any) => a.email) || [],
          created_by_sync: true
        }
      });

      syncedCount++;
    } catch (error) {
      console.error(`Failed to sync event ${event.id}:`, error);
    }
  }

  return NextResponse.json({
    success: true,
    syncedEvents: syncedCount,
    totalEvents: events.length,
    message: `Synced ${syncedCount} calendar events to knowledge base`
  });
}

async function getAvailability(calendar: any, userId: string, timeRange: any) {
  const { start, end, duration = 60 } = timeRange;

  // Get busy times
  const freeBusyResponse = await calendar.freebusy.query({
    resource: {
      timeMin: start,
      timeMax: end,
      items: [{ id: 'primary' }]
    }
  });

  const busyTimes = freeBusyResponse.data.calendars?.primary?.busy || [];

  // Calculate available slots
  const availableSlots = [];
  const startTime = new Date(start);
  const endTime = new Date(end);
  const slotDuration = duration * 60 * 1000; // Convert to milliseconds

  let currentTime = new Date(startTime);

  while (currentTime < endTime) {
    const slotEnd = new Date(currentTime.getTime() + slotDuration);

    // Check if this slot conflicts with any busy time
    const isAvailable = !busyTimes.some((busy: any) => {
      const busyStart = new Date(busy.start);
      const busyEnd = new Date(busy.end);
      return (currentTime < busyEnd && slotEnd > busyStart);
    });

    if (isAvailable) {
      availableSlots.push({
        start: currentTime.toISOString(),
        end: slotEnd.toISOString()
      });
    }

    currentTime = new Date(currentTime.getTime() + 30 * 60 * 1000); // 30-minute increments
  }

  return NextResponse.json({
    success: true,
    availableSlots,
    busyTimes,
    totalAvailableSlots: availableSlots.length
  });
}

async function scheduleMeeting(calendar: any, userId: string, eventData: any) {
  const {
    title,
    description,
    duration = 60,
    attendees,
    preferredTimes,
    projectId
  } = eventData;

  // Find the best available time
  let bestTime = null;

  for (const preferredTime of preferredTimes) {
    const availability = await getAvailability(calendar, userId, {
      start: preferredTime.start,
      end: preferredTime.end,
      duration
    });

    if (availability.ok) {
      const availabilityData = await availability.json();
      if (availabilityData.availableSlots.length > 0) {
        bestTime = availabilityData.availableSlots[0];
        break;
      }
    }
  }

  if (!bestTime) {
    return NextResponse.json({
      error: 'No available time slots found',
      suggestions: 'Try different time preferences'
    }, { status: 400 });
  }

  // Create the event
  const createResponse = await createCalendarEvent(calendar, userId, {
    title,
    description,
    start: bestTime.start,
    end: bestTime.end,
    attendees,
    projectId
  });

  return createResponse;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId') || 'zach';
  const action = searchParams.get('action') || 'get_events';

  try {
    // Skip database operations during build time
    if (process.env.NODE_ENV === 'development' && !process.env.OPENAI_API_KEY) {
      return NextResponse.json({
        service: 'Google Calendar Integration',
        status: 'build_mode'
      });
    }

    // Get user's Google token
    const { data: tokenData } = await supabase
      .from('user_tokens')
      .select('access_token')
      .eq('user_id', userId)
      .single();

    if (!tokenData?.access_token) {
      return NextResponse.json({
        error: 'User not authenticated with Google'
      }, { status: 401 });
    }

    // Initialize Google Calendar client
    const oauth2Client = new google.auth.OAuth2();
    oauth2Client.setCredentials({
      access_token: tokenData.access_token
    });

    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

    if (action === 'get_today_events') {
      const today = new Date();
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      return await getCalendarEvents(calendar, userId, {
        start: today.toISOString(),
        end: tomorrow.toISOString()
      });
    }

    return NextResponse.json({
      service: 'Google Calendar Integration',
      endpoints: {
        'POST /api/google/calendar': {
          actions: [
            'get_events - Get calendar events for a time range',
            'create_event - Create a new calendar event',
            'sync_to_knowledge - Sync calendar events to knowledge base',
            'get_availability - Check availability for scheduling',
            'schedule_meeting - Intelligently schedule a meeting'
          ]
        }
      }
    });

  } catch (error: any) {
    console.error('Calendar GET error:', error);
    return NextResponse.json({
      error: 'Failed to access calendar',
      details: error.message
    }, { status: 500 });
  }
}