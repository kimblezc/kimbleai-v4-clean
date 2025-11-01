'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Card } from './ui/card';
import { Button } from './ui/Button';
import Link from 'next/link';

interface Email {
  id: string;
  subject: string;
  from: string;
  date: string;
  unread: boolean;
}

interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  end: string;
}

interface DriveFile {
  id: string;
  name: string;
  modifiedTime: string;
  isFolder: boolean;
}

export function GoogleWorkspaceWidget() {
  const { data: session } = useSession();
  const [recentEmails, setRecentEmails] = useState<Email[]>([]);
  const [upcomingEvents, setUpcomingEvents] = useState<CalendarEvent[]>([]);
  const [recentFiles, setRecentFiles] = useState<DriveFile[]>([]);
  const [loading, setLoading] = useState(false);

  const userId = session?.user?.email?.includes('zach') ? 'zach' : 'rebecca';

  useEffect(() => {
    if (session) {
      loadData();
    }
  }, [session]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Load recent emails
      const emailResponse = await fetch(`/api/google/gmail?action=list&userId=${userId}&maxResults=5`);
      const emailData = await emailResponse.json();
      if (emailData.success) {
        setRecentEmails(emailData.messages || []);
      }

      // Load upcoming events
      const now = new Date();
      const end = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      const calendarResponse = await fetch('/api/google/calendar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'get_events',
          userId,
          timeRange: { start: now.toISOString(), end: end.toISOString() }
        })
      });
      const calendarData = await calendarResponse.json();
      if (calendarData.success) {
        setUpcomingEvents((calendarData.events || []).slice(0, 3));
      }

      // Load recent files
      const driveResponse = await fetch(`/api/google/drive?action=list&userId=${userId}`);
      const driveData = await driveResponse.json();
      if (driveData.success) {
        setRecentFiles((driveData.files || []).slice(0, 5));
      }
    } catch (error) {
      console.error('Failed to load Google Workspace data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diff = now.getTime() - date.getTime();
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));

      if (days === 0) {
        return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
      } else if (days === 1) {
        return 'Yesterday';
      } else if (days < 7) {
        return date.toLocaleDateString('en-US', { weekday: 'short' });
      } else {
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      }
    } catch {
      return dateString;
    }
  };

  const formatEventTime = (startStr: string) => {
    try {
      const start = new Date(startStr);
      const today = new Date();
      const isToday = start.toDateString() === today.toDateString();
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const isTomorrow = start.toDateString() === tomorrow.toDateString();

      if (isToday) {
        return `Today ${start.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`;
      } else if (isTomorrow) {
        return `Tomorrow ${start.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`;
      } else {
        return start.toLocaleDateString('en-US', {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
          hour: 'numeric',
          minute: '2-digit'
        });
      }
    } catch {
      return startStr;
    }
  };

  if (!session) {
    return (
      <Card>
        <div className="text-center py-8">
          <div className="text-4xl mb-3">🔗</div>
          <h3 className="text-lg font-semibold text-white mb-2">Google Workspace</h3>
          <p className="text-gray-400 text-sm mb-4">Connect to see your emails, calendar, and files</p>
          <Link href="/integrations">
            <Button size="sm">Connect</Button>
          </Link>
        </div>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* Gmail Widget */}
      <Card>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <span>📧</span>
            <span>Recent Emails</span>
          </h3>
          <Link href="/integrations?tab=gmail">
            <button className="text-blue-400 hover:text-blue-300 text-sm">View All</button>
          </Link>
        </div>

        {loading ? (
          <div className="text-center py-4 text-gray-400">Loading...</div>
        ) : recentEmails.length === 0 ? (
          <div className="text-center py-4 text-gray-500">No recent emails</div>
        ) : (
          <div className="space-y-2">
            {recentEmails.map((email) => (
              <div
                key={email.id}
                className={`p-2 rounded border ${
                  email.unread
                    ? 'border-blue-500 bg-blue-900/20'
                    : 'border-gray-700 bg-gray-800/50'
                }`}
              >
                <div className="flex justify-between items-start mb-1">
                  <span className={`text-sm font-medium truncate flex-1 ${
                    email.unread ? 'text-white' : 'text-gray-400'
                  }`}>
                    {email.subject}
                  </span>
                  <span className="text-xs text-gray-500 ml-2">{formatDate(email.date)}</span>
                </div>
                <div className="text-xs text-gray-500 truncate">
                  {email.from.split('<')[0].trim()}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Calendar Widget */}
      <Card>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <span>📅</span>
            <span>Upcoming Events</span>
          </h3>
          <Link href="/integrations?tab=calendar">
            <button className="text-blue-400 hover:text-blue-300 text-sm">View All</button>
          </Link>
        </div>

        {loading ? (
          <div className="text-center py-4 text-gray-400">Loading...</div>
        ) : upcomingEvents.length === 0 ? (
          <div className="text-center py-4 text-gray-500">No upcoming events</div>
        ) : (
          <div className="space-y-3">
            {upcomingEvents.map((event) => (
              <div
                key={event.id}
                className="p-3 rounded border border-blue-500 bg-blue-900/20"
              >
                <div className="text-sm font-medium text-white mb-1">{event.title}</div>
                <div className="text-xs text-gray-400">{formatEventTime(event.start)}</div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Drive Widget */}
      <Card>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <span>📁</span>
            <span>Recent Files</span>
          </h3>
          <Link href="/integrations?tab=drive">
            <button className="text-blue-400 hover:text-blue-300 text-sm">View All</button>
          </Link>
        </div>

        {loading ? (
          <div className="text-center py-4 text-gray-400">Loading...</div>
        ) : recentFiles.length === 0 ? (
          <div className="text-center py-4 text-gray-500">No recent files</div>
        ) : (
          <div className="space-y-2">
            {recentFiles.map((file) => (
              <div
                key={file.id}
                className="p-2 rounded border border-gray-700 bg-gray-800/50 hover:bg-gray-800 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <span className="text-lg">{file.isFolder ? '📁' : '📄'}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-white truncate">{file.name}</div>
                    <div className="text-xs text-gray-500">
                      Modified {formatDate(file.modifiedTime)}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
