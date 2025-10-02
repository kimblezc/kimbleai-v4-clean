# Device Continuity API Reference

## Base URL
All endpoints are relative to your application's base URL.

Example: `https://yourdomain.com/api/sync/*`

## Authentication
The `/api/sync/*` endpoints are **public** (no authentication required) to support cross-device synchronization without session cookies.

**Security:** User IDs and device IDs are used for authorization. Ensure device IDs are kept secure.

---

## Endpoints

### 1. Device Heartbeat

#### `POST /api/sync/heartbeat`

Register or update a device session and send heartbeat signal.

**Request Body:**
```json
{
  "userId": "string",           // Required
  "deviceId": "string",          // Required, unique device identifier
  "currentContext": {            // Optional, current device state
    "activeProject": "string",
    "chatContext": {},
    "uiState": {},
    "fileUploads": {}
  },
  "deviceInfo": {                // Optional, device metadata
    "deviceType": "pc|laptop|mobile|web",
    "deviceName": "string",
    "browserInfo": {
      "userAgent": "string",
      "platform": "string",
      "language": "string"
    }
  }
}
```

**Success Response (200):**
```json
{
  "success": true,
  "timestamp": "2025-10-02T18:15:02.061Z"
}
```

**Error Responses:**
- `400` - Missing userId or deviceId
- `500` - Device not registered (call with deviceInfo first)

**Notes:**
- First call must include `deviceInfo` to register device
- Subsequent calls can omit `deviceInfo` to just update heartbeat
- Heartbeat marks device as active
- Recommended interval: 10-30 seconds

---

#### `GET /api/sync/heartbeat?deviceId={deviceId}`

Check device status and last heartbeat.

**Query Parameters:**
- `deviceId` (required): Device identifier

**Success Response (200):**
```json
{
  "deviceId": "string",
  "deviceType": "pc|laptop|mobile|web",
  "deviceName": "string",
  "isActive": true,
  "lastHeartbeat": "2025-10-02T18:15:01.746Z",
  "secondsSinceHeartbeat": 3,
  "currentContext": {}
}
```

**Error Responses:**
- `400` - Missing deviceId
- `404` - Device not found

---

### 2. Context Snapshots

#### `POST /api/sync/context`

Save a context snapshot for later restoration.

**Request Body:**
```json
{
  "userId": "string",        // Required
  "deviceId": "string",      // Required
  "snapshot": {              // Required
    "snapshotType": "full_state|file_edit|search|project|conversation",
    "contextData": {},       // Any JSON object
    "metadata": {            // Optional metadata
      "deviceType": "string",
      "timestamp": "ISO date",
      "description": "string"
    }
  }
}
```

**Success Response (200):**
```json
{
  "success": true,
  "snapshotId": "uuid",
  "timestamp": "2025-10-02T18:15:02.334Z"
}
```

**Error Responses:**
- `400` - Missing required fields
- `500` - Database error

**Notes:**
- Snapshots are kept for 1 hour by default
- Use for saving work state before device sleep/close
- `contextData` can contain any serializable state

---

#### `GET /api/sync/context?userId={userId}&excludeDeviceId={deviceId}`

Get the most recent context snapshot from other devices.

**Query Parameters:**
- `userId` (required): User identifier
- `excludeDeviceId` (optional): Exclude snapshots from this device

**Success Response (200) - With context:**
```json
{
  "success": true,
  "context": {
    "snapshot_id": "uuid",
    "device_id": "string",
    "snapshot_type": "string",
    "context_data": {},
    "created_at": "2025-10-02T18:14:34.238Z",
    "device_type": "pc",
    "device_name": "Windows PC"
  }
}
```

**Success Response (200) - No context:**
```json
{
  "success": true,
  "context": null,
  "message": "No recent context found"
}
```

**Error Responses:**
- `400` - Missing userId
- `500` - Database error

**Notes:**
- Returns most recent snapshot from last hour
- Excludes snapshots from specified device
- Used for "Continue on another device" feature

---

### 3. Active Devices

#### `GET /api/sync/devices?userId={userId}`

Get all currently active devices for a user.

**Query Parameters:**
- `userId` (required): User identifier

**Success Response (200):**
```json
{
  "success": true,
  "devices": [
    {
      "device_id": "string",
      "device_type": "pc|laptop|mobile|web",
      "device_name": "string",
      "last_heartbeat": "2025-10-02T18:15:01.746Z",
      "current_context": {},
      "seconds_since_heartbeat": 3
    }
  ],
  "count": 1
}
```

**Error Responses:**
- `400` - Missing userId
- `500` - Database error

**Notes:**
- Only returns devices active in last 5 minutes
- Devices are ordered by most recent heartbeat
- Use for displaying device list in UI

---

### 4. Sync Queue

#### `POST /api/sync/queue`

Queue a sync operation to be sent to another device.

**Request Body:**
```json
{
  "userId": "string",           // Required
  "fromDeviceId": "string",     // Required
  "toDeviceId": "string",       // Optional, null for broadcast
  "payload": {                  // Required
    "type": "context|file|search|project|notification",
    "data": {},
    "priority": 0               // Optional, default 0
  }
}
```

**Success Response (200):**
```json
{
  "success": true,
  "syncId": "uuid"
}
```

**Error Responses:**
- `400` - Missing required fields
- `500` - Database error

**Notes:**
- If `toDeviceId` is null, sync is broadcast to all user's devices
- Payload `type` must be one of: context, file, search, project, notification
- Items expire after 1 hour if not synced
- Higher priority items are processed first

---

#### `GET /api/sync/queue?deviceId={deviceId}`

Get pending sync operations for a device.

**Query Parameters:**
- `deviceId` (required): Device identifier

**Success Response (200):**
```json
{
  "success": true,
  "syncs": [
    {
      "id": "uuid",
      "user_id": "string",
      "from_device_id": "string",
      "to_device_id": "string",
      "sync_type": "context",
      "payload": {},
      "status": "pending",
      "priority": 0,
      "created_at": "2025-10-02T18:14:36.783Z",
      "synced_at": null,
      "expires_at": "2025-10-02T19:14:36.783Z"
    }
  ],
  "count": 1
}
```

**Error Responses:**
- `400` - Missing deviceId
- `500` - Database error

**Notes:**
- Returns only pending items for the device
- Ordered by priority (desc) then created_at (asc)
- Poll this endpoint regularly to receive syncs

---

#### `PUT /api/sync/queue`

Mark a sync operation as completed.

**Request Body:**
```json
{
  "syncId": "uuid"  // Required
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Sync marked as completed"
}
```

**Error Responses:**
- `400` - Missing syncId
- `500` - Database error

**Notes:**
- Call this after successfully processing a sync
- Completed syncs are deleted after 24 hours
- Prevents duplicate processing

---

## Error Response Format

All endpoints return errors in this format:

```json
{
  "error": "Error message",
  "details": "Additional details (optional)"
}
```

Common HTTP status codes:
- `200` - Success
- `400` - Bad Request (missing/invalid parameters)
- `401` - Unauthorized (should not occur for sync endpoints)
- `404` - Not Found
- `500` - Internal Server Error

---

## Rate Limiting

**Recommended client behavior:**
- Heartbeat: 10-30 seconds
- Context snapshot: 30-60 seconds
- Active devices check: 15-30 seconds
- Sync queue poll: 5-15 seconds

**Server limits:**
- No hard limits currently enforced
- Use client-side throttling to prevent spam

---

## Data Retention

- **Heartbeats**: Kept indefinitely, marked inactive after 10 min
- **Context Snapshots**: Automatically cleaned after 1 hour
- **Sync Queue**: Expired items deleted after 24 hours
- **Device Sessions**: Kept until manually removed

---

## Example Flows

### 1. Initial Device Registration
```javascript
// Step 1: Register device
await fetch('/api/sync/heartbeat', {
  method: 'POST',
  body: JSON.stringify({
    userId: 'user-123',
    deviceId: 'device-abc',
    deviceInfo: {
      deviceType: 'pc',
      deviceName: 'Windows PC',
      browserInfo: { userAgent: navigator.userAgent }
    }
  })
});

// Step 2: Check for context from other devices
const res = await fetch('/api/sync/context?userId=user-123&excludeDeviceId=device-abc');
const { context } = await res.json();

if (context) {
  // Restore context
  restoreState(context.context_data);
}
```

### 2. Continuous Sync
```javascript
// Send heartbeat every 10 seconds
setInterval(async () => {
  await fetch('/api/sync/heartbeat', {
    method: 'POST',
    body: JSON.stringify({
      userId: 'user-123',
      deviceId: 'device-abc',
      currentContext: getCurrentState()
    })
  });
}, 10000);

// Save snapshot every 30 seconds
setInterval(async () => {
  await fetch('/api/sync/context', {
    method: 'POST',
    body: JSON.stringify({
      userId: 'user-123',
      deviceId: 'device-abc',
      snapshot: {
        snapshotType: 'full_state',
        contextData: getCurrentState()
      }
    })
  });
}, 30000);
```

### 3. Session Transfer
```javascript
// On source device - queue transfer
await fetch('/api/sync/queue', {
  method: 'POST',
  body: JSON.stringify({
    userId: 'user-123',
    fromDeviceId: 'device-abc',
    toDeviceId: 'device-xyz',
    payload: {
      type: 'context',
      data: getCurrentState()
    }
  })
});

// On target device - poll for syncs
const res = await fetch('/api/sync/queue?deviceId=device-xyz');
const { syncs } = await res.json();

for (const sync of syncs) {
  if (sync.sync_type === 'context') {
    applyState(sync.payload.data);

    // Mark as completed
    await fetch('/api/sync/queue', {
      method: 'PUT',
      body: JSON.stringify({ syncId: sync.id })
    });
  }
}
```

---

## Client Libraries

### JavaScript/TypeScript

Use the provided React hook:

```typescript
import { useDeviceContinuity } from '@/lib/hooks/useDeviceContinuity';

const { updateContext, restoreContext, activeDevices } = useDeviceContinuity({
  userId: 'user-123',
  enabled: true
});
```

### Node.js

Use the helper functions:

```typescript
import {
  sendHeartbeat,
  saveContextSnapshot,
  getLatestContext,
  getActiveDevices
} from '@/lib/device-continuity';

await sendHeartbeat('device-id', { state: 'active' }, 'user-123');
```

---

## Webhook Integration (Future)

Coming soon: Webhook support for real-time notifications when:
- Another device becomes active
- Context is updated
- Transfer is initiated

---

## Support

For API issues or feature requests, contact the development team or file an issue in the repository.
