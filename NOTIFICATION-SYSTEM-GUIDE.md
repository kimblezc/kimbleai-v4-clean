# KimbleAI v4 - Production Notification System

## Overview

Complete, production-ready real-time notification system with:
- In-app toast notifications (react-hot-toast)
- Persistent notification center/inbox
- Real-time updates via Supabase Realtime
- Email notifications (integrated with existing email system)
- User preferences management
- Pre-built notification templates

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Notification Flow                         │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Event Triggers → NotificationManager → Multiple Channels   │
│  (File upload,                           ├─ Toast (UI)      │
│   Budget alert,    [Processes &          ├─ Database        │
│   Backup, etc.)     Distributes]         ├─ Email (SMTP)    │
│                                          └─ Real-time Push   │
│                                                              │
│  User opens app → NotificationCenter ← Supabase Realtime    │
│                   [Displays inbox]       [Live updates]     │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## Quick Start

### 1. Database Setup

Run the database migration in your Supabase SQL editor:

```bash
# Located at: database/notifications-table-migration.sql
```

This creates:
- `notifications` table (with RLS policies)
- `notification_preferences` table
- Real-time subscriptions enabled
- Automatic timestamp triggers

### 2. Install Dependencies

```bash
npm install react-hot-toast
# or
npm install  # If already added to package.json
```

### 3. Add Components to Your App

#### Option A: Add to Root Layout (Recommended)

```tsx
// app/layout.tsx
import { NotificationSystem } from '@/components/NotificationSystem';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <NotificationSystem />  {/* Toast container */}
        {children}
      </body>
    </html>
  );
}
```

#### Option B: Add Notification Center to Navigation

```tsx
// components/Navigation.tsx
import { NotificationCenter } from '@/components/NotificationSystem';

export function Navigation() {
  return (
    <nav>
      {/* Your nav items */}
      <NotificationCenter />  {/* Bell icon with dropdown */}
    </nav>
  );
}
```

### 4. Test the System

```bash
# Run comprehensive tests
npx tsx scripts/test-notifications.ts
```

## Usage

### Basic Notification Sending

```typescript
import NotificationManager from '@/lib/notification-manager';

// Simple success notification
await NotificationManager.success(
  userId,
  'Upload Complete',
  'Your file has been uploaded successfully'
);

// Error notification
await NotificationManager.error(
  userId,
  'Upload Failed',
  'File size exceeds limit'
);

// With link and metadata
await NotificationManager.info(
  userId,
  'New Message',
  'You have a new message from John',
  {
    link: '/messages/123',
    metadata: { messageId: '123', sender: 'john@example.com' }
  }
);
```

### Advanced Notifications

```typescript
// Full control with notify()
await NotificationManager.notify({
  userId: 'user@example.com',
  type: 'success',
  title: 'Task Completed',
  message: 'Your analysis is ready',
  link: '/results/456',
  metadata: { taskId: '456', duration: '2.5s' },

  // Delivery options
  showToast: true,          // Show toast (default: true)
  persistToDb: true,        // Save to DB (default: true)
  sendEmail: true,          // Send email (default: false)

  // Email options
  emailSubject: 'Analysis Complete',
  emailRecipients: ['user@example.com'],
  emailTemplate: 'custom',
});
```

### Pre-built Notification Templates

The system includes preset methods for common events:

```typescript
// File uploaded
await NotificationManager.notifyFileUploaded(
  userId,
  'report.pdf',
  'file123'
);

// File indexed and searchable
await NotificationManager.notifyFileIndexed(
  userId,
  'report.pdf',
  'file123'
);

// Transcription completed
await NotificationManager.notifyTranscriptionCompleted(
  userId,
  'meeting.mp3',
  'file456'
);

// Budget alerts (auto-triggers at 50%, 75%, 90%, 100%)
await NotificationManager.notifyBudgetAlert(
  userId,
  75,              // percentage
  'monthly',       // or 'daily'
  {
    cost: 37.50,
    limit: 50.00,
    projectedMonthly: 45.00
  }
);

// Gmail sync completed
await NotificationManager.notifyGmailSync(userId, 42);

// Backup completed/failed
await NotificationManager.notifyBackupCompleted(
  userId,
  'backup123',
  10485760  // size in bytes
);

await NotificationManager.notifyBackupFailed(
  userId,
  'Storage quota exceeded'
);

// Agent task completed
await NotificationManager.notifyAgentTaskCompleted(
  userId,
  'Document Analysis',
  'task101'
);
```

### Client-Side Hook

```tsx
'use client';

import { useNotifications } from '@/hooks/useNotifications';
import { useSession } from 'next-auth/react';

export function MyComponent() {
  const { data: session } = useSession();
  const {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    refresh,
  } = useNotifications(session?.user?.email, {
    autoShowToast: true,  // Auto-show toasts for new notifications
    includeRead: true,     // Include read notifications
  });

  return (
    <div>
      <h2>Notifications ({unreadCount} unread)</h2>
      {notifications.map(notification => (
        <div key={notification.id}>
          <h3>{notification.title}</h3>
          <p>{notification.message}</p>
          <button onClick={() => markAsRead(notification.id!)}>
            Mark as read
          </button>
        </div>
      ))}
    </div>
  );
}
```

### API Routes

The system provides REST API endpoints:

```typescript
// GET /api/notifications
// Get user notifications
const response = await fetch('/api/notifications?limit=50&includeRead=true');
const { notifications, unreadCount } = await response.json();

// POST /api/notifications
// Create notification
await fetch('/api/notifications', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    type: 'success',
    title: 'Test',
    message: 'This is a test',
    sendEmail: false,
  })
});

// PUT /api/notifications
// Mark as read
await fetch('/api/notifications', {
  method: 'PUT',
  body: JSON.stringify({ id: 'notification-id' })
});

// Mark all as read
await fetch('/api/notifications', {
  method: 'PUT',
  body: JSON.stringify({ markAllAsRead: true })
});

// DELETE /api/notifications?id=notification-id
// Delete notification
await fetch('/api/notifications?id=notification-id', {
  method: 'DELETE'
});

// DELETE /api/notifications?deleteAllRead=true
// Delete all read notifications
await fetch('/api/notifications?deleteAllRead=true', {
  method: 'DELETE'
});
```

## Features

### 1. Toast Notifications (In-App)
- Auto-dismissing messages
- Beautiful, themed UI
- Positioned top-right by default
- Different colors for success/error/warning/info
- Configurable duration

### 2. Notification Center/Inbox
- Bell icon with unread badge
- Dropdown with notification list
- Filter by all/unread
- Mark as read/unread
- Delete notifications
- Click to navigate (if link provided)
- Real-time updates

### 3. Real-time Updates
- Supabase Realtime subscriptions
- Instant notification delivery
- Auto-update notification list
- No polling required
- Handles INSERT/UPDATE/DELETE events

### 4. Email Notifications
- Integrated with existing SMTP system
- Beautiful HTML templates
- Plain text fallback
- Priority levels
- Customizable templates

### 5. User Preferences
- Email enabled/disabled
- Toast enabled/disabled
- Sound enabled/disabled
- Per-event preferences (file upload, backup, etc.)
- Auto-created on first use

### 6. Persistence
- All notifications stored in database
- Read/unread tracking
- Metadata support (JSON)
- Timestamps (created_at, updated_at)
- Links for navigation

## Integrated Systems

The notification system is already integrated with:

### 1. Backup System
```typescript
// lib/backup-system.ts
// Automatically sends notifications on:
// - Backup completed (with details)
// - Backup failed (with error)
```

### 2. Cost Monitor
```typescript
// lib/cost-monitor.ts
// Automatically sends notifications at:
// - 50% budget usage
// - 75% budget usage (email + toast)
// - 90% budget usage (email + toast)
// - 100% budget exceeded (email + toast)
```

### 3. File Upload (Ready to integrate)
```typescript
// In your file upload handler:
import NotificationManager from '@/lib/notification-manager';

// After successful upload
await NotificationManager.notifyFileUploaded(userId, fileName, fileId);

// After indexing
await NotificationManager.notifyFileIndexed(userId, fileName, fileId);
```

### 4. Transcription Service (Ready to integrate)
```typescript
// In your transcription handler:
await NotificationManager.notifyTranscriptionCompleted(
  userId,
  audioFileName,
  fileId
);
```

### 5. Gmail Sync (Ready to integrate)
```typescript
// In your Gmail sync handler:
await NotificationManager.notifyGmailSync(userId, messageCount);
```

## Database Schema

### notifications table
```sql
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('success', 'error', 'info', 'warning')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  link TEXT,
  read BOOLEAN DEFAULT FALSE,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_notifications_user_read ON notifications(user_id, read);
CREATE INDEX idx_notifications_user_created ON notifications(user_id, created_at DESC);
CREATE INDEX idx_notifications_type ON notifications(type);
```

### notification_preferences table
```sql
CREATE TABLE notification_preferences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT NOT NULL UNIQUE,
  email_enabled BOOLEAN DEFAULT TRUE,
  toast_enabled BOOLEAN DEFAULT TRUE,
  sound_enabled BOOLEAN DEFAULT FALSE,
  preferences JSONB DEFAULT '{...}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

## Security

- Row Level Security (RLS) enabled
- Users can only access their own notifications
- Email notifications respect user preferences
- API routes require authentication
- Real-time subscriptions filtered by user_id

## Performance

- Indexed queries (user_id, read status, created_at)
- Efficient Supabase Realtime subscriptions
- Automatic cleanup of read notifications
- Optimistic UI updates
- Connection pooling for SMTP

## Testing

Run the comprehensive test suite:

```bash
npx tsx scripts/test-notifications.ts
```

Tests include:
- Basic notification creation
- Notification retrieval
- Mark as read/delete operations
- Preset notification templates
- Email notifications
- Bulk operations
- User preferences

## Troubleshooting

### Notifications not appearing in UI
1. Check database migration ran successfully
2. Verify Supabase credentials in .env.local
3. Check browser console for errors
4. Verify user is authenticated

### Real-time updates not working
1. Check Supabase Realtime is enabled for notifications table
2. Run: `ALTER PUBLICATION supabase_realtime ADD TABLE notifications;`
3. Check network tab for websocket connection
4. Verify RLS policies allow SELECT

### Email notifications not sending
1. Check SMTP credentials in .env.local
2. Test email configuration: `emailSystem.testConfiguration()`
3. Check nodemailer logs
4. Verify email_enabled in user preferences

### Toast notifications not showing
1. Verify `<NotificationSystem />` is in your layout
2. Check autoShowToast is true in useNotifications
3. Check toast_enabled in user preferences
4. Look for console errors

## Environment Variables

Required for full functionality:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# SMTP (for email notifications)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
SMTP_FROM=noreply@kimbleai.com

# Cost alert email
COST_ALERT_EMAIL=admin@example.com
```

## Next Steps

1. Run database migration
2. Add NotificationSystem component to layout
3. Add NotificationCenter to navigation
4. Run tests to verify setup
5. Integrate notifications into your features
6. Configure SMTP for email notifications
7. Customize notification preferences

## Support

For issues or questions:
- Check this guide first
- Review test results
- Check Supabase dashboard
- Review console logs
- Test with provided scripts

---

Built for KimbleAI v4 - Production-ready notification system with real-time updates, email alerts, and beautiful UI.
