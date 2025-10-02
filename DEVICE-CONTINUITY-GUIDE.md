# Device Continuity System - Complete Guide

## Overview

The Device Continuity Agent enables seamless transitions between PC, Laptop, Mobile, and Web devices. Users can start work on one device and continue exactly where they left off on another device.

## Architecture

### Dual-Backend System

1. **Supabase (Primary)** - Real-time database for device sessions and context
2. **Google Drive (Backup)** - Cloud storage for file continuity and offline support

### Core Components

- **DeviceContinuityManager** - Main orchestrator class
- **DeviceFingerprinter** - Generates unique device IDs
- **ContinuityCache** - Client-side caching
- **API Endpoints** - RESTful sync API
- **React Hook** - `useDeviceContinuity` for client integration
- **React Component** - `DeviceContinuityStatus` for UI

## Database Schema

### Tables

1. **device_sessions** - Active device tracking
   - `id` (uuid, primary key)
   - `user_id` (text, required)
   - `device_id` (text, unique, required)
   - `device_type` (text: 'pc' | 'laptop' | 'mobile' | 'web')
   - `device_name` (text)
   - `browser_info` (jsonb)
   - `last_heartbeat` (timestamptz)
   - `current_context` (jsonb)
   - `is_active` (boolean)

2. **context_snapshots** - Work state snapshots
   - `id` (uuid, primary key)
   - `user_id` (text, required)
   - `device_id` (text, required)
   - `session_id` (uuid, FK to device_sessions)
   - `snapshot_type` (text: 'file_edit' | 'search' | 'project' | 'conversation' | 'full_state')
   - `context_data` (jsonb)
   - `metadata` (jsonb)

3. **sync_queue** - Cross-device sync operations
   - `id` (uuid, primary key)
   - `user_id` (text, required)
   - `from_device_id` (text)
   - `to_device_id` (text, nullable)
   - `sync_type` (text: 'context' | 'file' | 'search' | 'project' | 'notification')
   - `payload` (jsonb)
   - `status` (text: 'pending' | 'synced' | 'failed' | 'expired')
   - `priority` (integer)
   - `expires_at` (timestamptz, default: 1 hour)

4. **device_preferences** - Per-device settings
   - `id` (uuid, primary key)
   - `user_id` (text)
   - `device_id` (text)
   - `preferences` (jsonb)

5. **user_tokens** - OAuth tokens (existing)
6. **device_states** - Legacy state table (existing)

### Database Functions

- `get_active_devices(p_user_id)` - Returns active devices within 5 minutes
- `get_latest_context(p_user_id, p_device_id)` - Gets most recent context from other devices
- `cleanup_inactive_devices()` - Marks devices as inactive after 10 minutes
- `cleanup_expired_sync_queue()` - Removes old sync items

## API Endpoints

### 1. POST /api/sync/heartbeat

**Purpose:** Register/update device session and send heartbeat

**Request:**
```json
{
  "userId": "string (required)",
  "deviceId": "string (required)",
  "currentContext": {
    "activeProject": "string",
    "chatContext": {},
    "uiState": {},
    "fileUploads": {}
  },
  "deviceInfo": {
    "deviceType": "pc | laptop | mobile | web",
    "deviceName": "string",
    "browserInfo": {
      "userAgent": "string",
      "platform": "string",
      "language": "string"
    }
  }
}
```

**Response:**
```json
{
  "success": true,
  "timestamp": "2025-10-02T18:15:02.061Z"
}
```

### 2. GET /api/sync/heartbeat?deviceId={deviceId}

**Purpose:** Check device status

**Response:**
```json
{
  "deviceId": "string",
  "deviceType": "string",
  "deviceName": "string",
  "isActive": true,
  "lastHeartbeat": "2025-10-02T18:15:01.746Z",
  "secondsSinceHeartbeat": 3,
  "currentContext": {}
}
```

### 3. POST /api/sync/context

**Purpose:** Save context snapshot

**Request:**
```json
{
  "userId": "string (required)",
  "deviceId": "string (required)",
  "snapshot": {
    "snapshotType": "full_state | file_edit | search | project | conversation",
    "contextData": {},
    "metadata": {
      "deviceType": "string",
      "timestamp": "ISO date"
    }
  }
}
```

**Response:**
```json
{
  "success": true,
  "snapshotId": "uuid",
  "timestamp": "ISO date"
}
```

### 4. GET /api/sync/context?userId={userId}&excludeDeviceId={deviceId}

**Purpose:** Get latest context from other devices

**Response:**
```json
{
  "success": true,
  "context": {
    "snapshot_id": "uuid",
    "device_id": "string",
    "snapshot_type": "string",
    "context_data": {},
    "created_at": "ISO date",
    "device_type": "string",
    "device_name": "string"
  }
}
```

### 5. GET /api/sync/devices?userId={userId}

**Purpose:** Get all active devices for user

**Response:**
```json
{
  "success": true,
  "devices": [
    {
      "device_id": "string",
      "device_type": "string",
      "device_name": "string",
      "last_heartbeat": "ISO date",
      "current_context": {},
      "seconds_since_heartbeat": 3
    }
  ],
  "count": 1
}
```

### 6. POST /api/sync/queue

**Purpose:** Queue sync operation for another device

**Request:**
```json
{
  "userId": "string (required)",
  "fromDeviceId": "string (required)",
  "toDeviceId": "string (optional)",
  "payload": {
    "type": "context | file | search | project | notification",
    "data": {}
  }
}
```

**Response:**
```json
{
  "success": true,
  "syncId": "uuid"
}
```

### 7. GET /api/sync/queue?deviceId={deviceId}

**Purpose:** Get pending sync operations

**Response:**
```json
{
  "success": true,
  "syncs": [
    {
      "id": "uuid",
      "from_device_id": "string",
      "to_device_id": "string",
      "sync_type": "string",
      "payload": {},
      "status": "pending",
      "created_at": "ISO date"
    }
  ],
  "count": 1
}
```

### 8. PUT /api/sync/queue

**Purpose:** Mark sync as completed

**Request:**
```json
{
  "syncId": "uuid (required)"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Sync marked as completed"
}
```

## React Hook Usage

### Basic Setup

```typescript
import { useDeviceContinuity } from '@/lib/hooks/useDeviceContinuity';

function MyComponent() {
  const {
    deviceId,
    deviceType,
    isActive,
    activeDevices,
    availableContext,
    updateContext,
    restoreContext,
    saveSnapshot,
    sendHeartbeat
  } = useDeviceContinuity({
    userId: 'user-123',
    enabled: true,
    heartbeatInterval: 10000, // 10 seconds
    snapshotInterval: 30000, // 30 seconds
    onContextRestored: (context) => {
      console.log('Context restored:', context);
      // Apply context to your app
    },
    onOtherDeviceActive: (device) => {
      console.log('Other device active:', device);
      // Show notification
    }
  });

  // Update context when user makes changes
  const handleFileOpen = (filename: string) => {
    updateContext({
      currentFile: filename,
      timestamp: Date.now()
    });
  };

  // Manually restore context
  const handleRestore = async () => {
    const context = await restoreContext();
    if (context) {
      // Apply context
    }
  };

  return (
    <div>
      <p>Device: {deviceId}</p>
      <p>Type: {deviceType}</p>
      <p>Active Devices: {activeDevices.length}</p>
      {availableContext && (
        <button onClick={handleRestore}>
          Restore from {availableContext.device_name}
        </button>
      )}
    </div>
  );
}
```

## React Component Usage

```typescript
import DeviceContinuityStatus from '@/components/agents/DeviceContinuityStatus';

function AppLayout() {
  return (
    <div>
      <header>
        <DeviceContinuityStatus
          userId="user-123"
          showDetails={true}
          onTransferRequest={(targetDevice) => {
            console.log('Transfer to:', targetDevice);
          }}
        />
      </header>
    </div>
  );
}
```

## DeviceContinuityManager Class Usage

### Server-Side Usage

```typescript
import { DeviceContinuityManager } from '@/lib/device-continuity';

async function syncUserState(userId: string, deviceId: string) {
  const manager = new DeviceContinuityManager(userId);

  // Sync state to cloud
  const result = await manager.syncToCloud(deviceId, {
    deviceId,
    userId,
    timestamp: Date.now(),
    activeProject: 'project-123',
    chatContext: {},
    uiState: {},
    deviceInfo: {
      platform: 'Windows',
      userAgent: 'Chrome/120.0'
    }
  });

  // Get active devices
  const devices = await manager.getActiveDevices();

  // Create transfer package
  const { transferId } = await manager.createTransferPackage({
    fromDevice: deviceId,
    toDevice: 'target-device-id',
    transferType: 'full_state',
    payload: { /* state data */ },
    metadata: { reason: 'user_initiated' }
  });

  // Cleanup stale states
  const { cleaned, remaining } = await manager.cleanupStaleStates();
}
```

## Helper Functions

### generateDeviceId()
Generates a unique device ID based on browser fingerprint.

```typescript
import { generateDeviceId } from '@/lib/device-continuity';

const deviceId = generateDeviceId(); // e.g., "device-1234567890"
```

### detectDeviceType()
Detects device type from user agent.

```typescript
import { detectDeviceType } from '@/lib/device-continuity';

const type = detectDeviceType(); // "pc" | "laptop" | "mobile" | "web"
```

### registerDevice()
Registers a new device or updates existing device info.

```typescript
import { registerDevice } from '@/lib/device-continuity';

await registerDevice('user-123', {
  deviceId: 'device-abc',
  deviceType: 'pc',
  deviceName: 'Windows PC',
  browserInfo: {
    userAgent: navigator.userAgent,
    platform: navigator.platform
  }
});
```

### sendHeartbeat()
Send device heartbeat to keep session active.

```typescript
import { sendHeartbeat } from '@/lib/device-continuity';

await sendHeartbeat('device-abc', {
  activeProject: 'project-123',
  currentFile: 'index.ts'
}, 'user-123');
```

### saveContextSnapshot()
Save current work context.

```typescript
import { saveContextSnapshot } from '@/lib/device-continuity';

await saveContextSnapshot('user-123', 'device-abc', {
  snapshotType: 'full_state',
  contextData: {
    openFiles: ['index.ts', 'app.tsx'],
    cursorPosition: { line: 42, column: 10 }
  },
  metadata: { timestamp: new Date().toISOString() }
});
```

### getLatestContext()
Get most recent context from other devices.

```typescript
import { getLatestContext } from '@/lib/device-continuity';

const context = await getLatestContext('user-123', 'current-device-id');
```

### getActiveDevices()
Get all active devices for user.

```typescript
import { getActiveDevices } from '@/lib/device-continuity';

const devices = await getActiveDevices('user-123');
```

### queueSync()
Queue sync operation.

```typescript
import { queueSync } from '@/lib/device-continuity';

await queueSync('user-123', 'from-device', {
  type: 'context',
  data: { /* payload */ }
}, 'to-device');
```

## Middleware Configuration

The `/api/sync/*` endpoints are configured as public in `middleware.ts`:

```typescript
const PUBLIC_PATHS = [
  '/api/auth',
  '/api/sync', // Device continuity endpoints
  // ...
];
```

## Storage Configuration

The system uses a Supabase storage bucket named `thumbnails` for storing device context thumbnails and screenshots.

## Automatic Cleanup

Database functions handle automatic cleanup:

- **Inactive devices**: Marked inactive after 10 minutes
- **Expired syncs**: Removed after 24 hours if synced/expired/failed
- **Stale states**: Manually triggered via `DeviceContinuityManager.cleanupStaleStates()`

## Testing

### Run Database Health Check
```bash
node test-device-continuity-db.js
```

### Run API Endpoints Test
```bash
node test-api-endpoints.js
```

Both tests validate:
- ✅ Database tables and functions
- ✅ Storage buckets
- ✅ API endpoint responses
- ✅ Error handling

## Security Considerations

1. **Row Level Security (RLS)** is enabled on database tables
2. **User isolation** - each user can only access their own data
3. **Token expiration** - sync queue items expire after 1 hour
4. **Device validation** - device IDs are validated before operations
5. **Public endpoints** - sync endpoints don't require auth for cross-device support

## Performance Optimizations

1. **Client-side caching** - `ContinuityCache` reduces API calls
2. **Database indexes** - optimized for common queries
3. **Heartbeat batching** - 10-second intervals prevent spam
4. **Snapshot throttling** - 30-second intervals for state saves
5. **Stale cleanup** - automatic removal of old data

## Troubleshooting

### Device not appearing in active list
- Check last_heartbeat is within 5 minutes
- Verify userId matches across devices
- Check is_active is true

### Context not syncing
- Verify snapshot is being saved (check context_snapshots table)
- Check excludeDeviceId parameter in GET /api/sync/context
- Ensure snapshot was created within last hour

### Transfer not working
- Check sync_queue table for pending items
- Verify sync_type is one of: context, file, search, project, notification
- Check target device is polling sync_queue

## Future Enhancements

1. **WebSocket support** for real-time notifications
2. **Conflict resolution UI** for concurrent edits
3. **Offline mode** with Google Drive fallback
4. **File transfer** for large payloads
5. **Analytics dashboard** for device usage
6. **Admin panel** for device management

## Support

For issues or questions, contact the development team or file an issue in the repository.
