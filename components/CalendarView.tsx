'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Card } from './ui/card';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Modal } from './ui/Modal';

interface CalendarEvent {
  id: string;
  title: string;
  description: string;
  start: string;
  end: string;
  location?: string;
  attendees: Array<{
    email: string;
    name?: string;
    status: string;
  }>;
  creator?: any;
  organizer?: any;
  status: string;
  htmlLink: string;
  conferenceData?: any;
  isAllDay: boolean;
}

export function CalendarView() {
  const { data: session } = useSession();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'upcoming' | 'week' | 'month'>('upcoming');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [newEvent, setNewEvent] = useState({
    title: '',
    description: '',
    start: '',
    end: '',
    location: '',
    attendees: ''
  });

  const userId = session?.user?.email?.includes('zach') ? 'zach' : 'rebecca';

  useEffect(() => {
    if (session) {
      loadEvents();
    }
  }, [session, viewMode]);

  const loadEvents = async () => {
    setLoading(true);
    setError(null);
    try {
      const now = new Date();
      const timeRange: any = {};

      if (viewMode === 'upcoming') {
        timeRange.start = now.toISOString();
        timeRange.end = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();
      } else if (viewMode === 'week') {
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - now.getDay());
        startOfWeek.setHours(0, 0, 0, 0);
        timeRange.start = startOfWeek.toISOString();
        timeRange.end = new Date(startOfWeek.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();
      } else {
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        timeRange.start = startOfMonth.toISOString();
        timeRange.end = endOfMonth.toISOString();
      }

      const response = await fetch('/api/google/calendar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'get_events',
          userId,
          timeRange
        })
      });

      const data = await response.json();
      if (data.success) {
        setEvents(data.events);
      } else {
        setError(data.error || 'Failed to load events');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load events');
    } finally {
      setLoading(false);
    }
  };

  const createEvent = async () => {
    if (!newEvent.title || !newEvent.start || !newEvent.end) {
      alert('Please fill in required fields: Title, Start time, and End time');
      return;
    }

    try {
      const attendees = newEvent.attendees
        .split(',')
        .map(email => email.trim())
        .filter(email => email.length > 0);

      const response = await fetch('/api/google/calendar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create_event',
          userId,
          eventData: {
            title: newEvent.title,
            description: newEvent.description,
            start: new Date(newEvent.start).toISOString(),
            end: new Date(newEvent.end).toISOString(),
            location: newEvent.location,
            attendees
          }
        })
      });

      const data = await response.json();
      if (data.success) {
        alert('Event created successfully!');
        setShowCreateModal(false);
        setNewEvent({
          title: '',
          description: '',
          start: '',
          end: '',
          location: '',
          attendees: ''
        });
        loadEvents();
      } else {
        alert('Failed to create event: ' + (data.error || 'Unknown error'));
      }
    } catch (err) {
      alert('Error creating event: ' + err);
    }
  };

  const formatEventTime = (startStr: string, endStr: string, isAllDay: boolean) => {
    const start = new Date(startStr);
    const end = new Date(endStr);

    if (isAllDay) {
      return start.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    }

    const today = new Date();
    const isToday = start.toDateString() === today.toDateString();
    const isSameDay = start.toDateString() === end.toDateString();

    if (isToday && isSameDay) {
      return `Today ${start.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })} - ${end.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`;
    } else if (isSameDay) {
      return `${start.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })} ${start.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })} - ${end.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`;
    } else {
      return `${start.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })} - ${end.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}`;
    }
  };

  const getEventColor = (event: CalendarEvent) => {
    const now = new Date();
    const start = new Date(event.start);
    const end = new Date(event.end);

    if (now >= start && now <= end) {
      return 'border-green-500 bg-green-900/20'; // Happening now
    } else if (start > now && start.getTime() - now.getTime() < 60 * 60 * 1000) {
      return 'border-yellow-500 bg-yellow-900/20'; // Within 1 hour
    } else {
      return 'border-blue-500 bg-blue-900/20'; // Future
    }
  };

  if (!session) {
    return (
      <Card>
        <div className="text-center py-8">
          <p className="text-gray-400">Please sign in to view your calendar</p>
        </div>
      </Card>
    );
  }

  return (
    <div className="flex flex-col h-full gap-4">
      {/* Toolbar */}
      <Card>
        <div className="flex justify-between items-center">
          <div className="flex gap-2">
            <button
              onClick={() => setViewMode('upcoming')}
              className={`px-4 py-2 rounded text-sm font-medium ${
                viewMode === 'upcoming'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-800 text-gray-400 hover:text-white'
              }`}
            >
              Upcoming
            </button>
            <button
              onClick={() => setViewMode('week')}
              className={`px-4 py-2 rounded text-sm font-medium ${
                viewMode === 'week'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-800 text-gray-400 hover:text-white'
              }`}
            >
              This Week
            </button>
            <button
              onClick={() => setViewMode('month')}
              className={`px-4 py-2 rounded text-sm font-medium ${
                viewMode === 'month'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-800 text-gray-400 hover:text-white'
              }`}
            >
              This Month
            </button>
          </div>
          <Button onClick={() => setShowCreateModal(true)}>
            Create Event
          </Button>
        </div>
      </Card>

      {/* Events List */}
      <Card className="flex-1 overflow-auto">
        {loading ? (
          <div className="text-center py-8 text-gray-400">Loading events...</div>
        ) : error ? (
          <div className="text-center py-8 text-red-400">{error}</div>
        ) : events.length === 0 ? (
          <div className="text-center py-8 text-gray-400">No events found</div>
        ) : (
          <div className="space-y-3">
            {events.map((event) => (
              <div
                key={event.id}
                onClick={() => setSelectedEvent(event)}
                className={`p-4 rounded-lg border cursor-pointer transition-colors hover:border-blue-400 ${getEventColor(event)}`}
              >
                <div className="flex justify-between items-start mb-2">
                  <h3 className="text-lg font-semibold text-white">{event.title}</h3>
                  <a
                    href={event.htmlLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="text-blue-400 hover:text-blue-300 text-sm"
                  >
                    Open
                  </a>
                </div>
                <div className="text-sm text-gray-400 mb-1">
                  {formatEventTime(event.start, event.end, event.isAllDay)}
                </div>
                {event.location && (
                  <div className="text-sm text-gray-500 mb-1">
                    Location: {event.location}
                  </div>
                )}
                {event.attendees.length > 0 && (
                  <div className="text-sm text-gray-500">
                    {event.attendees.length} attendee{event.attendees.length !== 1 ? 's' : ''}
                  </div>
                )}
                {event.description && (
                  <div className="text-sm text-gray-400 mt-2 line-clamp-2">
                    {event.description}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Create Event Modal */}
      {showCreateModal && (
        <Modal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          title="Create Calendar Event"
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Title *
              </label>
              <input
                type="text"
                value={newEvent.title}
                onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
                placeholder="Event title"
                className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Description
              </label>
              <textarea
                value={newEvent.description}
                onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
                placeholder="Event description"
                rows={3}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Start Time *
                </label>
                <input
                  type="datetime-local"
                  value={newEvent.start}
                  onChange={(e) => setNewEvent({ ...newEvent, start: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  End Time *
                </label>
                <input
                  type="datetime-local"
                  value={newEvent.end}
                  onChange={(e) => setNewEvent({ ...newEvent, end: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Location
              </label>
              <input
                type="text"
                value={newEvent.location}
                onChange={(e) => setNewEvent({ ...newEvent, location: e.target.value })}
                placeholder="Meeting location"
                className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Attendees
              </label>
              <input
                type="text"
                value={newEvent.attendees}
                onChange={(e) => setNewEvent({ ...newEvent, attendees: e.target.value })}
                placeholder="email1@example.com, email2@example.com"
                className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">Separate multiple emails with commas</p>
            </div>

            <div className="flex gap-2 pt-4">
              <Button
                fullWidth
                variant="secondary"
                onClick={() => setShowCreateModal(false)}
              >
                Cancel
              </Button>
              <Button fullWidth onClick={createEvent}>
                Create Event
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Event Details Modal */}
      {selectedEvent && (
        <Modal
          isOpen={!!selectedEvent}
          onClose={() => setSelectedEvent(null)}
          title={selectedEvent.title}
        >
          <div className="space-y-4">
            <div>
              <span className="text-sm text-gray-500">Time:</span>
              <div className="text-white">
                {formatEventTime(selectedEvent.start, selectedEvent.end, selectedEvent.isAllDay)}
              </div>
            </div>

            {selectedEvent.location && (
              <div>
                <span className="text-sm text-gray-500">Location:</span>
                <div className="text-white">{selectedEvent.location}</div>
              </div>
            )}

            {selectedEvent.description && (
              <div>
                <span className="text-sm text-gray-500">Description:</span>
                <div className="text-white whitespace-pre-wrap">{selectedEvent.description}</div>
              </div>
            )}

            {selectedEvent.attendees.length > 0 && (
              <div>
                <span className="text-sm text-gray-500">Attendees:</span>
                <div className="mt-2 space-y-1">
                  {selectedEvent.attendees.map((attendee, idx) => (
                    <div key={idx} className="text-white text-sm flex justify-between">
                      <span>{attendee.name || attendee.email}</span>
                      <span className={`text-xs px-2 py-0.5 rounded ${
                        attendee.status === 'accepted' ? 'bg-green-900 text-green-300' :
                        attendee.status === 'declined' ? 'bg-red-900 text-red-300' :
                        'bg-gray-700 text-gray-300'
                      }`}>
                        {attendee.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {selectedEvent.conferenceData?.entryPoints?.[0]?.uri && (
              <div>
                <span className="text-sm text-gray-500">Meeting Link:</span>
                <div>
                  <a
                    href={selectedEvent.conferenceData.entryPoints[0].uri}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:text-blue-300 text-sm break-all"
                  >
                    {selectedEvent.conferenceData.entryPoints[0].uri}
                  </a>
                </div>
              </div>
            )}

            <Button
              fullWidth
              variant="secondary"
              onClick={() => window.open(selectedEvent.htmlLink, '_blank')}
            >
              Open in Google Calendar
            </Button>
          </div>
        </Modal>
      )}
    </div>
  );
}
