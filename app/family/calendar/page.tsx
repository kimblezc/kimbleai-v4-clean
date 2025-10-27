'use client';

import React, { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/Button';
import { useRouter } from 'next/navigation';

interface TimeSlot {
  date: string;
  start: string;
  end: string;
  duration: number;
}

interface CalendarEvent {
  id: string;
  title: string;
  description: string;
  start_time: string;
  end_time: string;
  all_day: boolean;
  location: string;
  attendees: string[];
  created_by: string;
  event_type: string;
  color: string;
  is_recurring: boolean;
  status: string;
  is_conflict: boolean;
  conflict_reason: string;
}

const EVENT_TYPES = [
  { value: 'date_night', label: 'Date Night', icon: '💑', color: 'pink' },
  { value: 'family_meeting', label: 'Family Meeting', icon: '👨‍👩‍👧', color: 'blue' },
  { value: 'home_project', label: 'Home Project', icon: '🏠', color: 'green' },
  { value: 'travel', label: 'Travel', icon: '✈️', color: 'cyan' },
  { value: 'appointment', label: 'Appointment', icon: '📅', color: 'yellow' },
  { value: 'social', label: 'Social', icon: '🎉', color: 'purple' },
  { value: 'work', label: 'Work', icon: '💼', color: 'gray' },
  { value: 'personal', label: 'Personal', icon: '👤', color: 'indigo' },
  { value: 'other', label: 'Other', icon: '📌', color: 'gray' },
];

export default function FamilyCalendar() {
  const router = useRouter();
  const [availability, setAvailability] = useState<TimeSlot[]>([]);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [startDate, setStartDate] = useState(getToday());
  const [endDate, setEndDate] = useState(getDateDaysFromNow(7));
  const [minDuration, setMinDuration] = useState(60);
  const [isScheduling, setIsScheduling] = useState(false);

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [eventStartTime, setEventStartTime] = useState('');
  const [eventEndTime, setEventEndTime] = useState('');
  const [location, setLocation] = useState('');
  const [eventType, setEventType] = useState('other');
  const [attendees, setAttendees] = useState<string[]>(['zach', 'rebecca']);

  useEffect(() => {
    loadAvailability();
  }, [startDate, endDate, minDuration]);

  function getToday() {
    return new Date().toISOString().split('T')[0];
  }

  function getDateDaysFromNow(days: number) {
    const date = new Date();
    date.setDate(date.getDate() + days);
    return date.toISOString().split('T')[0];
  }

  const loadAvailability = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `/api/family/availability?start_date=${startDate}&end_date=${endDate}&min_duration=${minDuration}`
      );
      const data = await response.json();

      if (data.success) {
        setAvailability(data.slots || []);
      }
    } catch (error) {
      console.error('Failed to load availability:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleScheduleEvent = async () => {
    if (!title || !eventStartTime || !eventEndTime) {
      alert('Title, start time, and end time are required');
      return;
    }

    try {
      const response = await fetch('/api/family/availability', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          description,
          startTime: eventStartTime,
          endTime: eventEndTime,
          location,
          attendees,
          eventType,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setIsScheduling(false);
        setTitle('');
        setDescription('');
        setEventStartTime('');
        setEventEndTime('');
        setLocation('');
        loadAvailability();
        alert(
          data.hasConflict
            ? `Event scheduled with conflicts: ${data.conflictReason}`
            : 'Event scheduled successfully!'
        );
      }
    } catch (error) {
      console.error('Failed to schedule event:', error);
      alert('Failed to schedule event');
    }
  };

  const fillSlotTime = (slot: TimeSlot) => {
    const startDateTime = `${slot.date}T${slot.start}`;
    const endDateTime = `${slot.date}T${slot.end}`;
    setEventStartTime(startDateTime);
    setEventEndTime(endDateTime);
    setIsScheduling(true);
  };

  const getEventTypeInfo = (typeValue: string) => {
    return EVENT_TYPES.find((t) => t.value === typeValue) || EVENT_TYPES[EVENT_TYPES.length - 1];
  };

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Joint Calendar Intelligence</h1>
            <p className="text-gray-400">
              Find mutual availability and schedule events for the family
            </p>
          </div>
          <div className="flex gap-3">
            <Button
              icon="🏠"
              variant="secondary"
              onClick={() => router.push('/family')}
            >
              Back to Dashboard
            </Button>
            <Button
              icon="📅"
              onClick={() => setIsScheduling(true)}
              className="bg-blue-600 hover:bg-blue-700"
            >
              Schedule Event
            </Button>
          </div>
        </div>

        {/* Availability Finder */}
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
          <h2 className="text-xl font-bold text-white mb-4">Find Mutual Availability</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">End Date</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Min Duration (minutes)
              </label>
              <input
                type="number"
                value={minDuration}
                onChange={(e) => setMinDuration(parseInt(e.target.value) || 60)}
                className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex items-end">
              <Button icon="🔍" onClick={loadAvailability} className="w-full">
                Search
              </Button>
            </div>
          </div>

          <div className="flex gap-2 mb-4">
            <button
              onClick={() => {
                setStartDate(getToday());
                setEndDate(getDateDaysFromNow(7));
              }}
              className="px-3 py-1.5 bg-gray-800 text-gray-300 rounded-lg text-sm hover:bg-gray-700"
            >
              This Week
            </button>
            <button
              onClick={() => {
                setStartDate(getToday());
                setEndDate(getDateDaysFromNow(14));
              }}
              className="px-3 py-1.5 bg-gray-800 text-gray-300 rounded-lg text-sm hover:bg-gray-700"
            >
              Next 2 Weeks
            </button>
            <button
              onClick={() => {
                setStartDate(getToday());
                setEndDate(getDateDaysFromNow(30));
              }}
              className="px-3 py-1.5 bg-gray-800 text-gray-300 rounded-lg text-sm hover:bg-gray-700"
            >
              This Month
            </button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
            </div>
          ) : availability.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              No mutual availability found for the selected time range
            </div>
          ) : (
            <div className="space-y-3">
              <div className="text-sm text-gray-400 mb-2">
                Found {availability.length} available time slot(s)
              </div>
              {availability.map((slot, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-4 bg-gray-800 rounded-lg hover:bg-gray-750 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="text-2xl">📅</div>
                    <div>
                      <div className="text-white font-medium">
                        {new Date(slot.date).toLocaleDateString('en-US', {
                          weekday: 'long',
                          month: 'long',
                          day: 'numeric',
                        })}
                      </div>
                      <div className="text-sm text-gray-400">
                        {slot.start} - {slot.end} ({slot.duration} minutes)
                      </div>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => fillSlotTime(slot)}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    Schedule
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Schedule Event Form */}
        {isScheduling && (
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
            <h2 className="text-xl font-bold text-white mb-4">Schedule Joint Event</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Event Title</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Enter event title..."
                  className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Enter description..."
                  rows={3}
                  className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Start Time</label>
                  <input
                    type="datetime-local"
                    value={eventStartTime}
                    onChange={(e) => setEventStartTime(e.target.value)}
                    className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">End Time</label>
                  <input
                    type="datetime-local"
                    value={eventEndTime}
                    onChange={(e) => setEventEndTime(e.target.value)}
                    className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Location</label>
                  <input
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="Enter location..."
                    className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Event Type</label>
                  <select
                    value={eventType}
                    onChange={(e) => setEventType(e.target.value)}
                    className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {EVENT_TYPES.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.icon} {type.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Attendees</label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={attendees.includes('zach')}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setAttendees([...attendees, 'zach']);
                        } else {
                          setAttendees(attendees.filter((a) => a !== 'zach'));
                        }
                      }}
                      className="w-4 h-4 text-purple-600 bg-gray-800 border-gray-700 rounded focus:ring-purple-500"
                    />
                    <span className="text-sm text-gray-300">Zach</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={attendees.includes('rebecca')}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setAttendees([...attendees, 'rebecca']);
                        } else {
                          setAttendees(attendees.filter((a) => a !== 'rebecca'));
                        }
                      }}
                      className="w-4 h-4 text-pink-600 bg-gray-800 border-gray-700 rounded focus:ring-pink-500"
                    />
                    <span className="text-sm text-gray-300">Rebecca</span>
                  </label>
                </div>
              </div>

              <div className="flex gap-3">
                <Button icon="📅" onClick={handleScheduleEvent}>
                  Create Event
                </Button>
                <Button variant="secondary" onClick={() => setIsScheduling(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-gradient-to-br from-pink-900 to-pink-950 border border-pink-700 rounded-lg p-6">
            <div className="text-4xl mb-3">💑</div>
            <h3 className="text-lg font-bold text-white mb-2">Date Night</h3>
            <p className="text-pink-300 text-sm mb-4">Schedule your next date night</p>
            <Button
              size="sm"
              onClick={() => {
                setEventType('date_night');
                setTitle('Date Night');
                setAttendees(['zach', 'rebecca']);
                setIsScheduling(true);
              }}
              className="bg-pink-600 hover:bg-pink-700"
            >
              Schedule
            </Button>
          </div>

          <div className="bg-gradient-to-br from-blue-900 to-blue-950 border border-blue-700 rounded-lg p-6">
            <div className="text-4xl mb-3">👨‍👩‍👧</div>
            <h3 className="text-lg font-bold text-white mb-2">Family Meeting</h3>
            <p className="text-blue-300 text-sm mb-4">Schedule a family check-in</p>
            <Button
              size="sm"
              onClick={() => {
                setEventType('family_meeting');
                setTitle('Family Meeting');
                setAttendees(['zach', 'rebecca']);
                setIsScheduling(true);
              }}
              className="bg-blue-600 hover:bg-blue-700"
            >
              Schedule
            </Button>
          </div>

          <div className="bg-gradient-to-br from-green-900 to-green-950 border border-green-700 rounded-lg p-6">
            <div className="text-4xl mb-3">🏠</div>
            <h3 className="text-lg font-bold text-white mb-2">Home Project</h3>
            <p className="text-green-300 text-sm mb-4">Block time for house work</p>
            <Button
              size="sm"
              onClick={() => {
                setEventType('home_project');
                setTitle('Home Project');
                setAttendees(['zach', 'rebecca']);
                setIsScheduling(true);
              }}
              className="bg-green-600 hover:bg-green-700"
            >
              Schedule
            </Button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
