# Cross-Device Continuity Agent Setup Guide

## Overview

The Cross-Device Continuity Agent enables seamless transitions between laptop and PC devices by automatically synchronizing:
- Active project state
- Chat conversation context
- UI state (tabs, settings, panels)
- File upload progress
- Search context
- Device activity indicators

## Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Laptop        │    │   Google Drive   │    │      PC         │
│                 │    │   State Files    │    │                 │
│ ┌─────────────┐ │    │                  │    │ ┌─────────────┐ │
│ │ Local State │ │◄──►│  device-state-   │◄──►│ │ Local State │ │
│ │   Cache     │ │    │    {deviceId}    │    │ │   Cache     │ │
│ └─────────────┘ │    │                  │    │ └─────────────┘ │
│                 │    │  transfer-{id}   │    │                 │
│ ┌─────────────┐ │    │                  │    │ ┌─────────────┐ │
│ │  WebSocket  │ │    └──────────────────┘    │ │  WebSocket  │ │
│ │  Polling    │ │                            │ │  Polling    │ │
│ └─────────────┘ │                            │ └─────────────┘ │
└─────────────────┘                            └─────────────────┘
           │                                            │
           └────────────► Supabase DB ◄─────────────────┘
                         • device_states
                         • device_notifications
                         • user_tokens
```

## Prerequisites

### 1. Google Drive API Setup

```bash
# Environment variables needed in .env.local
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
NEXTAUTH_URL=http://localhost:3000  # or your domain
```

### 2. Supabase Database Schema

Run these SQL commands in your Supabase console:

```sql
-- Device states table
CREATE TABLE device_states (
    id SERIAL PRIMARY KEY,
    device_id VARCHAR(255) NOT NULL,
    user_id VARCHAR(255) NOT NULL,
    state_data JSONB NOT NULL,
    last_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    connection_id VARCHAR(255),
    transferred BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(device_id, user_id)
);

-- Device notifications table
CREATE TABLE device_notifications (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    target_device VARCHAR(255),
    source_device VARCHAR(255),
    event_type VARCHAR(100) NOT NULL,
    event_data JSONB,
    delivered BOOLEAN DEFAULT FALSE,
    delivered_at TIMESTAMP WITH TIME ZONE,
    acknowledged BOOLEAN DEFAULT FALSE,
    acknowledged_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_device_states_user_device ON device_states(user_id, device_id);
CREATE INDEX idx_device_states_updated ON device_states(updated_at);
CREATE INDEX idx_notifications_user_delivered ON device_notifications(user_id, delivered);
CREATE INDEX idx_notifications_created ON device_notifications(created_at);
```

### 3. Google Drive Permissions

Ensure your Google OAuth app has these scopes:
- `https://www.googleapis.com/auth/drive.file`
- `https://www.googleapis.com/auth/drive.metadata.readonly`

## Installation

### 1. API Endpoint
The main API endpoint is automatically available at:
```
/api/agents/continuity
```

### 2. Add Provider to Your App

```tsx
// app/layout.tsx or pages/_app.tsx
import { ContinuityProvider } from '@/lib/continuity-context';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <ContinuityProvider
          userId="your-user-id"
          enabled={true}
          autoSync={true}
          syncInterval={30000} // 30 seconds
        >
          {children}
        </ContinuityProvider>
      </body>
    </html>
  );
}
```

### 3. Add Status Component

```tsx
// In your main navigation or header component
import DeviceContinuityStatus from '@/components/agents/DeviceContinuityStatus';

export default function Navigation() {
  return (
    <nav>
      {/* Your existing navigation */}
      <DeviceContinuityStatus
        showDetails={true}
        onTransferRequest={(deviceId) => {
          console.log('Transfer requested to:', deviceId);
        }}
      />
    </nav>
  );
}
```

## Usage

### Basic Hook Usage

```tsx
import { useContinuity } from '@/lib/hooks/useContinuity';

function MyComponent() {
  const [state, actions] = useContinuity({
    userId: 'your-user-id',
    autoSync: true,
    onTransferReceived: (transferData) => {
      // Handle incoming session transfer
      console.log('Received transfer:', transferData);
    },
    onConflictDetected: (conflicts) => {
      // Handle sync conflicts
      console.log('Conflicts detected:', conflicts);
    }
  });

  return (
    <div>
      <div>Status: {state.isOnline ? 'Online' : 'Offline'}</div>
      <div>Active Devices: {state.activeDevices.length}</div>
      <div>Last Sync: {new Date(state.lastSync).toLocaleTimeString()}</div>

      <button onClick={actions.syncNow} disabled={state.isSyncing}>
        {state.isSyncing ? 'Syncing...' : 'Sync Now'}
      </button>

      {state.hasTransferAvailable && (
        <button onClick={() => actions.transferTo('target-device-id')}>
          Transfer Session
        </button>
      )}
    </div>
  );
}
```

### Context Hooks

```tsx
import {
  useContinuityContext,
  useDeviceStatus,
  useContinuityActions,
  useContinuityNotifications
} from '@/lib/continuity-context';

// Get full context
const { state, actions, notifications } = useContinuityContext();

// Get just status
const { isOnline, isSyncing, deviceCount } = useDeviceStatus();

// Get just actions
const { sync, transferTo, canTransfer } = useContinuityActions();

// Get just notifications
const { notifications, removeNotification } = useContinuityNotifications();
```

### Manual State Updates

```tsx
import { useContinuity } from '@/lib/hooks/useContinuity';

function ProjectComponent() {
  const [state, actions] = useContinuity();

  // Update state when project changes
  useEffect(() => {
    actions.updateState({
      activeProject: 'new-project-id',
      chatContext: {
        conversationId: 'conv-123',
        messageCount: 45,
        activeTopics: ['feature-request', 'bug-fix']
      }
    });
  }, [projectId]);
}
```

## API Reference

### Main Endpoint: `/api/agents/continuity`

#### POST Actions

**Sync State**
```json
{
  "action": "sync_state",
  "deviceId": "device-123",
  "userId": "user-456",
  "state": {
    "deviceId": "device-123",
    "userId": "user-456",
    "timestamp": 1703123456789,
    "activeProject": "project-abc",
    "chatContext": {
      "conversationId": "conv-123",
      "messageCount": 45,
      "activeTopics": ["feature-request"]
    },
    "uiState": {
      "openTabs": ["/project/abc", "/chat"],
      "activePanel": "main",
      "searchContext": "components"
    },
    "deviceInfo": {
      "platform": "Windows",
      "userAgent": "Chrome/120.0",
      "timezone": "America/New_York"
    }
  }
}
```

**Get State**
```json
{
  "action": "get_state",
  "deviceId": "device-123",
  "userId": "user-456"
}
```

**Transfer Session**
```json
{
  "action": "transfer_session",
  "userId": "user-456",
  "syncData": {
    "fromDevice": "device-123",
    "toDevice": "device-456"
  }
}
```

**Get Active Devices**
```json
{
  "action": "get_active_devices",
  "userId": "user-456"
}
```

### WebSocket Endpoints

**Connection**: `/api/agents/continuity/ws`
**Polling**: `/api/agents/continuity/ws/poll`

## Configuration Options

### Environment Variables

```bash
# Required
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
NEXTAUTH_URL=your_app_url

# Optional
CONTINUITY_SYNC_INTERVAL=30000  # milliseconds
CONTINUITY_STALE_THRESHOLD=300000  # 5 minutes
CONTINUITY_CLEANUP_INTERVAL=604800000  # 7 days
```

### Provider Options

```tsx
<ContinuityProvider
  userId="user-id"              // Required: User identifier
  enabled={true}                // Enable/disable continuity
  autoSync={true}               // Auto-sync every interval
  syncInterval={30000}          // Sync interval in ms
>
```

### Hook Options

```tsx
useContinuity({
  userId: 'user-id',            // User identifier
  autoSync: true,               // Auto-sync enabled
  syncInterval: 30000,          // Sync interval in ms
  enableRealtime: true,         // Enable WebSocket polling
  onTransferReceived: (data) => {}, // Transfer callback
  onConflictDetected: (conflicts) => {}, // Conflict callback
  onDeviceActivity: (activity) => {}     // Activity callback
})
```

## Troubleshooting

### Common Issues

**1. Sync Not Working**
- Check Google Drive API credentials
- Verify Supabase connection
- Check browser console for errors
- Ensure user is authenticated with Google

**2. Conflicts Not Resolving**
- Check conflict resolution strategy
- Verify state data format
- Check for network connectivity issues

**3. Real-time Updates Missing**
- Check WebSocket polling is enabled
- Verify database permissions
- Check notification table for entries

### Debug Mode

Add debug logging:

```tsx
// Enable debug mode
localStorage.setItem('continuity_debug', 'true');

// Check cache
import { ContinuityCache } from '@/lib/device-continuity';
console.log('Cache contents:', ContinuityCache.get('state_device-123'));
```

### Health Check

```bash
# Check API health
curl -X POST http://localhost:3000/api/agents/continuity \
  -H "Content-Type: application/json" \
  -d '{"action": "get_active_devices", "userId": "test"}'
```

## Security Considerations

### Data Privacy
- All state data is encrypted in transit via HTTPS
- Google Drive files are stored in a private folder
- Device fingerprints don't contain personally identifiable information
- Local cache is cleared on logout

### Access Control
- Each user can only access their own device states
- Device IDs are cryptographically generated
- Transfer tokens expire after 10 minutes
- Stale sessions are automatically cleaned up

### Best Practices
- Regularly clean up old device states
- Monitor for unusual device activity
- Use secure connection strings
- Implement proper error handling
- Log security events for audit

## Performance Optimization

### Caching Strategy
- Local storage for immediate access
- IndexedDB for larger data sets
- In-memory cache for current session
- Google Drive for persistence

### Bandwidth Optimization
- Delta sync (only changed data)
- Compressed JSON payloads
- Debounced state updates
- Smart conflict detection

### Monitoring
- Track sync success rates
- Monitor device activity patterns
- Alert on sync failures
- Performance metrics collection

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Review browser console logs
3. Check Supabase logs for database errors
4. Verify Google Drive API quota usage
5. Test with different devices/browsers

The Cross-Device Continuity Agent is designed to be robust and self-healing, automatically recovering from network interruptions and handling edge cases gracefully.