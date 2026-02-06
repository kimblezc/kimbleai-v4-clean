/**
 * Calendar Tools - Google Calendar integration
 */

import type { Tool, ToolContext, ToolResult } from './index';

/**
 * List upcoming calendar events
 */
const listEvents: Tool = {
  name: 'calendar_list_events',
  description: 'List upcoming events from Google Calendar.',
  category: 'calendar',
  requiresConfirmation: false,
  inputSchema: {
    type: 'object',
    properties: {
      days: {
        type: 'number',
        description: 'Number of days to look ahead (default: 7)',
      },
      maxResults: {
        type: 'number',
        description: 'Maximum events to return (default: 10)',
      },
    },
  },
  execute: async (args: { days?: number; maxResults?: number }, context: ToolContext): Promise<ToolResult> => {
    const { days = 7, maxResults = 10 } = args;
    const { googleAccessToken } = context;

    if (!googleAccessToken) {
      return {
        success: false,
        error: 'Google Calendar not connected. Please sign in with Google.',
      };
    }

    try {
      const timeMin = new Date().toISOString();
      const timeMax = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();

      const response = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/primary/events?` +
          `timeMin=${timeMin}&timeMax=${timeMax}&maxResults=${maxResults}&singleEvents=true&orderBy=startTime`,
        {
          headers: {
            Authorization: `Bearer ${googleAccessToken}`,
          },
        }
      );

      if (!response.ok) {
        if (response.status === 401) {
          return { success: false, error: 'Google Calendar token expired. Please sign in again.' };
        }
        throw new Error(`Calendar API error: ${response.status}`);
      }

      const data = await response.json();

      const events = (data.items || []).map((event: any) => ({
        id: event.id,
        title: event.summary || 'No title',
        start: event.start?.dateTime || event.start?.date,
        end: event.end?.dateTime || event.end?.date,
        location: event.location,
        description: event.description?.substring(0, 100),
        link: event.htmlLink,
      }));

      return {
        success: true,
        data: events,
        display: {
          type: 'table',
          content: events,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch calendar',
      };
    }
  },
};

/**
 * Create a calendar event
 */
const createEvent: Tool = {
  name: 'calendar_create_event',
  description: 'Create a new event in Google Calendar. Requires user confirmation.',
  category: 'calendar',
  requiresConfirmation: true, // Important: requires confirmation
  inputSchema: {
    type: 'object',
    properties: {
      title: {
        type: 'string',
        description: 'Event title',
      },
      startTime: {
        type: 'string',
        description: 'Start time in ISO format (e.g., "2026-02-07T10:00:00")',
      },
      endTime: {
        type: 'string',
        description: 'End time in ISO format (e.g., "2026-02-07T11:00:00")',
      },
      description: {
        type: 'string',
        description: 'Event description (optional)',
      },
      location: {
        type: 'string',
        description: 'Event location (optional)',
      },
      attendees: {
        type: 'array',
        items: { type: 'string' },
        description: 'Email addresses of attendees (optional)',
      },
    },
    required: ['title', 'startTime', 'endTime'],
  },
  execute: async (
    args: {
      title: string;
      startTime: string;
      endTime: string;
      description?: string;
      location?: string;
      attendees?: string[];
    },
    context: ToolContext
  ): Promise<ToolResult> => {
    const { title, startTime, endTime, description, location, attendees } = args;
    const { googleAccessToken } = context;

    if (!googleAccessToken) {
      return {
        success: false,
        error: 'Google Calendar not connected. Please sign in with Google.',
      };
    }

    try {
      const event: any = {
        summary: title,
        start: {
          dateTime: startTime,
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        },
        end: {
          dateTime: endTime,
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        },
      };

      if (description) event.description = description;
      if (location) event.location = location;
      if (attendees?.length) {
        event.attendees = attendees.map((email) => ({ email }));
      }

      const response = await fetch(
        'https://www.googleapis.com/calendar/v3/calendars/primary/events',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${googleAccessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(event),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || `API error: ${response.status}`);
      }

      const createdEvent = await response.json();

      return {
        success: true,
        data: {
          id: createdEvent.id,
          title: createdEvent.summary,
          start: createdEvent.start?.dateTime,
          end: createdEvent.end?.dateTime,
          link: createdEvent.htmlLink,
        },
        display: {
          type: 'link',
          content: {
            text: `Event "${title}" created`,
            url: createdEvent.htmlLink,
          },
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create event',
      };
    }
  },
};

/**
 * Find free time slots
 */
const findFreeTime: Tool = {
  name: 'calendar_find_free_time',
  description: 'Find available time slots in the calendar.',
  category: 'calendar',
  requiresConfirmation: false,
  inputSchema: {
    type: 'object',
    properties: {
      days: {
        type: 'number',
        description: 'Number of days to check (default: 7)',
      },
      durationMinutes: {
        type: 'number',
        description: 'Minimum slot duration in minutes (default: 30)',
      },
      workingHoursOnly: {
        type: 'boolean',
        description: 'Only show 9am-5pm slots (default: true)',
      },
    },
  },
  execute: async (
    args: { days?: number; durationMinutes?: number; workingHoursOnly?: boolean },
    context: ToolContext
  ): Promise<ToolResult> => {
    const { days = 7, durationMinutes = 30, workingHoursOnly = true } = args;
    const { googleAccessToken } = context;

    if (!googleAccessToken) {
      return {
        success: false,
        error: 'Google Calendar not connected. Please sign in with Google.',
      };
    }

    try {
      // First, get all events
      const timeMin = new Date().toISOString();
      const timeMax = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();

      const response = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/primary/events?` +
          `timeMin=${timeMin}&timeMax=${timeMax}&singleEvents=true&orderBy=startTime`,
        {
          headers: {
            Authorization: `Bearer ${googleAccessToken}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Calendar API error: ${response.status}`);
      }

      const data = await response.json();
      const events = data.items || [];

      // Calculate free slots
      const freeSlots: Array<{ start: string; end: string; duration: number }> = [];

      // Simple algorithm: find gaps between events
      let lastEnd = new Date();

      for (const event of events) {
        const eventStart = new Date(event.start?.dateTime || event.start?.date);
        const eventEnd = new Date(event.end?.dateTime || event.end?.date);

        const gapMinutes = (eventStart.getTime() - lastEnd.getTime()) / (1000 * 60);

        if (gapMinutes >= durationMinutes) {
          // Check working hours if required
          if (workingHoursOnly) {
            const startHour = lastEnd.getHours();
            const endHour = eventStart.getHours();
            if (startHour >= 9 && endHour <= 17) {
              freeSlots.push({
                start: lastEnd.toISOString(),
                end: eventStart.toISOString(),
                duration: Math.round(gapMinutes),
              });
            }
          } else {
            freeSlots.push({
              start: lastEnd.toISOString(),
              end: eventStart.toISOString(),
              duration: Math.round(gapMinutes),
            });
          }
        }

        lastEnd = eventEnd;
      }

      // Limit to top 10 slots
      const topSlots = freeSlots.slice(0, 10);

      return {
        success: true,
        data: topSlots,
        display: {
          type: 'json',
          content: topSlots.map((s) => ({
            start: new Date(s.start).toLocaleString(),
            end: new Date(s.end).toLocaleString(),
            duration: `${s.duration} minutes`,
          })),
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to find free time',
      };
    }
  },
};

export const calendarTools: Tool[] = [listEvents, createEvent, findFreeTime];
