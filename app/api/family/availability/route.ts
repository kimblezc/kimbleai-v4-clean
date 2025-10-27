import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireAuth } from '@/lib/auth';
import { google } from 'googleapis';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface TimeSlot {
  date: string;
  start: string;
  end: string;
  duration: number;
}

interface AvailabilityRequest {
  startDate: string;
  endDate: string;
  minDuration?: number;
  userIds?: string[];
}

// GET: Find mutual availability
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    const { searchParams } = new URL(request.url);

    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');
    const minDuration = parseInt(searchParams.get('min_duration') || '60');
    const userIds = searchParams.get('user_ids')?.split(',') || ['zach', 'rebecca'];

    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: 'start_date and end_date are required' },
        { status: 400 }
      );
    }

    // Fetch calendar events for both users
    const { data: events, error: eventsError } = await supabase
      .from('family_calendar_events')
      .select('*')
      .gte('start_time', startDate)
      .lte('end_time', endDate)
      .eq('status', 'confirmed')
      .order('start_time');

    if (eventsError) {
      console.error('Error fetching events:', eventsError);
      return NextResponse.json(
        { error: 'Failed to fetch calendar events' },
        { status: 500 }
      );
    }

    // Calculate availability slots
    const availabilitySlots = await calculateMutualAvailability(
      events || [],
      new Date(startDate),
      new Date(endDate),
      minDuration,
      userIds
    );

    return NextResponse.json({
      success: true,
      slots: availabilitySlots,
      count: availabilitySlots.length,
      startDate,
      endDate,
      minDuration,
    });
  } catch (error: any) {
    console.error('Availability API error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST: Schedule joint event
export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    const body = await request.json();

    const {
      title,
      description,
      startTime,
      endTime,
      location,
      attendees = ['zach', 'rebecca'],
      eventType = 'other',
      color = 'blue',
      isRecurring = false,
      recurrenceRule,
      reminderMinutes = [15, 60],
    } = body;

    if (!title || !startTime || !endTime) {
      return NextResponse.json(
        { error: 'title, startTime, and endTime are required' },
        { status: 400 }
      );
    }

    // Check for conflicts
    const { data: existingEvents } = await supabase
      .from('family_calendar_events')
      .select('*')
      .or(`and(start_time.lte.${endTime},end_time.gte.${startTime})`)
      .eq('status', 'confirmed');

    const hasConflict = existingEvents && existingEvents.length > 0;
    const conflictReason = hasConflict
      ? `Conflicts with ${existingEvents.length} existing event(s)`
      : null;

    // Create event in database
    const { data: newEvent, error: insertError } = await supabase
      .from('family_calendar_events')
      .insert({
        title,
        description,
        start_time: startTime,
        end_time: endTime,
        all_day: false,
        location,
        attendees,
        created_by: auth.userId,
        event_type: eventType,
        color,
        is_recurring: isRecurring,
        recurrence_rule: recurrenceRule,
        reminder_minutes: reminderMinutes,
        status: hasConflict ? 'tentative' : 'confirmed',
        is_conflict: hasConflict,
        conflict_reason: conflictReason,
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error creating event:', insertError);
      return NextResponse.json(
        { error: 'Failed to create event' },
        { status: 500 }
      );
    }

    // Log activity
    await supabase.from('family_activity_feed').insert({
      user_id: auth.userId,
      activity_type: 'calendar_event_created',
      title: `Created event: ${title}`,
      description: `Scheduled for ${new Date(startTime).toLocaleDateString()}`,
      resource_type: 'calendar_event',
      resource_id: newEvent.id,
      is_visible_to: attendees,
    });

    return NextResponse.json({
      success: true,
      event: newEvent,
      hasConflict,
      conflictReason,
    });
  } catch (error: any) {
    console.error('Schedule event API error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

// Helper function to calculate mutual availability
async function calculateMutualAvailability(
  events: any[],
  startDate: Date,
  endDate: Date,
  minDuration: number,
  userIds: string[]
): Promise<TimeSlot[]> {
  const availabilitySlots: TimeSlot[] = [];
  const workingHoursStart = 9; // 9 AM
  const workingHoursEnd = 21; // 9 PM

  // Iterate through each day
  let currentDate = new Date(startDate);
  while (currentDate <= endDate) {
    const dateStr = currentDate.toISOString().split('T')[0];

    // Get events for this day
    const dayEvents = events.filter((event) => {
      const eventStart = new Date(event.start_time);
      const eventDate = eventStart.toISOString().split('T')[0];
      return eventDate === dateStr;
    });

    // Sort events by start time
    dayEvents.sort((a, b) =>
      new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
    );

    // Find gaps between events
    let currentTime = workingHoursStart * 60; // Minutes from midnight

    for (const event of dayEvents) {
      const eventStart = new Date(event.start_time);
      const eventEnd = new Date(event.end_time);
      const eventStartMinutes = eventStart.getHours() * 60 + eventStart.getMinutes();
      const eventEndMinutes = eventEnd.getHours() * 60 + eventEnd.getMinutes();

      // Check if there's a gap before this event
      const gapDuration = eventStartMinutes - currentTime;
      if (gapDuration >= minDuration) {
        availabilitySlots.push({
          date: dateStr,
          start: formatTime(currentTime),
          end: formatTime(eventStartMinutes),
          duration: gapDuration,
        });
      }

      // Move current time to after this event
      currentTime = Math.max(currentTime, eventEndMinutes);
    }

    // Check for availability after last event until end of working hours
    const endOfDayMinutes = workingHoursEnd * 60;
    const remainingDuration = endOfDayMinutes - currentTime;
    if (remainingDuration >= minDuration) {
      availabilitySlots.push({
        date: dateStr,
        start: formatTime(currentTime),
        end: formatTime(endOfDayMinutes),
        duration: remainingDuration,
      });
    }

    // Move to next day
    currentDate.setDate(currentDate.getDate() + 1);
  }

  return availabilitySlots;
}

// Helper function to format minutes to HH:MM
function formatTime(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
}
