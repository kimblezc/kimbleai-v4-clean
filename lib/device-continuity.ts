import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Simplified Device State - Only essentials
export interface DeviceState {
  deviceId: string;
  userId: string;
  timestamp: number;
  activeProject?: string;
  chatContext?: {
    conversationId?: string;
    messageCount: number;
    lastMessage?: string;
  };
  deviceInfo: {
    platform: string;
    userAgent: string;
    timezone: string;
  };
}

// In-memory cache for performance (5 minute expiry)
const stateCache = new Map<string, { data: DeviceState; expiry: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// ============================================================================
// CORE FUNCTIONS - Simplified and Fast
// ============================================================================

/**
 * Send heartbeat to mark device as active
 */
export async function sendHeartbeat(
  deviceId: string,
  context: any,
  userId?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { data: existing } = await supabase
      .from('device_sessions')
      .select('id')
      .eq('device_id', deviceId)
      .single();

    if (existing) {
      const { error } = await supabase
        .from('device_sessions')
        .update({
          last_heartbeat: new Date().toISOString(),
          current_context: context,
          is_active: true,
          updated_at: new Date().toISOString()
        })
        .eq('device_id', deviceId);

      return { success: !error, error: error?.message };
    } else {
      if (!userId) {
        return { success: false, error: 'User ID required for new device' };
      }
      return { success: false, error: 'Device not registered. Call registerDevice first.' };
    }
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Register a new device
 */
export async function registerDevice(
  userId: string,
  deviceInfo: {
    deviceId: string;
    deviceType: string;
    deviceName: string;
    browserInfo?: any;
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('device_sessions')
      .upsert({
        user_id: userId,
        device_id: deviceInfo.deviceId,
        device_type: deviceInfo.deviceType,
        device_name: deviceInfo.deviceName,
        browser_info: deviceInfo.browserInfo,
        is_active: true,
        last_heartbeat: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'device_id'
      });

    return { success: !error, error: error?.message };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Get device state from cache or database
 */
export async function getDeviceState(deviceId: string): Promise<DeviceState | null> {
  // Check cache first
  const cached = stateCache.get(deviceId);
  if (cached && cached.expiry > Date.now()) {
    return cached.data;
  }

  try {
    const { data, error } = await supabase
      .from('device_sessions')
      .select('*')
      .eq('device_id', deviceId)
      .single();

    if (error || !data) return null;

    const state: DeviceState = {
      deviceId: data.device_id,
      userId: data.user_id,
      timestamp: new Date(data.last_heartbeat).getTime(),
      activeProject: data.current_context?.activeProject,
      chatContext: data.current_context?.chatContext,
      deviceInfo: {
        platform: data.browser_info?.platform || 'unknown',
        userAgent: data.browser_info?.userAgent || 'unknown',
        timezone: data.browser_info?.timezone || 'UTC'
      }
    };

    // Cache it
    stateCache.set(deviceId, {
      data: state,
      expiry: Date.now() + CACHE_TTL
    });

    return state;
  } catch (err) {
    console.error('Failed to get device state:', err);
    return null;
  }
}

/**
 * Save device state (updates cache automatically)
 */
export async function saveDeviceState(state: DeviceState): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('device_sessions')
      .update({
        last_heartbeat: new Date(state.timestamp).toISOString(),
        current_context: {
          activeProject: state.activeProject,
          chatContext: state.chatContext
        },
        updated_at: new Date().toISOString()
      })
      .eq('device_id', state.deviceId);

    if (!error) {
      // Update cache
      stateCache.set(state.deviceId, {
        data: state,
        expiry: Date.now() + CACHE_TTL
      });
    }

    return { success: !error, error: error?.message };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Get all active devices for a user (cached)
 */
export async function getActiveDevices(userId: string): Promise<{ success: boolean; devices?: any[]; error?: string }> {
  try {
    const { data, error } = await supabase
      .from('device_sessions')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .gte('last_heartbeat', new Date(Date.now() - 10 * 60 * 1000).toISOString()) // Last 10 minutes
      .order('last_heartbeat', { ascending: false });

    if (error) return { success: false, error: error.message };
    return { success: true, devices: data || [] };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Save context snapshot
 */
export async function saveContextSnapshot(
  userId: string,
  deviceId: string,
  snapshot: {
    snapshotType: string;
    contextData: any;
    metadata?: any;
  }
): Promise<{ success: boolean; snapshotId?: string; error?: string }> {
  try {
    const { data: session } = await supabase
      .from('device_sessions')
      .select('id')
      .eq('device_id', deviceId)
      .single();

    const { data, error } = await supabase
      .from('context_snapshots')
      .insert({
        user_id: userId,
        device_id: deviceId,
        session_id: session?.id,
        snapshot_type: snapshot.snapshotType,
        context_data: snapshot.contextData,
        metadata: snapshot.metadata || {}
      })
      .select('id')
      .single();

    if (error) return { success: false, error: error.message };
    return { success: true, snapshotId: data.id };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Get latest context snapshot
 */
export async function getLatestContext(
  userId: string,
  excludeDeviceId?: string
): Promise<{ success: boolean; context?: any; error?: string }> {
  try {
    const { data, error } = await supabase
      .rpc('get_latest_context', {
        p_user_id: userId,
        p_device_id: excludeDeviceId || null
      });

    if (error) return { success: false, error: error.message };
    const context = data && data.length > 0 ? data[0] : null;
    return { success: true, context };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Queue a sync operation
 */
export async function queueSync(
  userId: string,
  fromDeviceId: string,
  payload: any,
  toDeviceId?: string
): Promise<{ success: boolean; syncId?: string; error?: string }> {
  try {
    const allowedTypes = ['context', 'file', 'search', 'project', 'notification'];
    const syncType = payload.type && allowedTypes.includes(payload.type) ? payload.type : 'context';

    const { data, error } = await supabase
      .from('sync_queue')
      .insert({
        user_id: userId,
        from_device_id: fromDeviceId,
        to_device_id: toDeviceId || null,
        sync_type: syncType,
        payload: payload,
        status: 'pending',
        priority: payload.priority || 0
      })
      .select('id')
      .single();

    if (error) return { success: false, error: error.message };
    return { success: true, syncId: data.id };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Get pending syncs for a device
 */
export async function getPendingSyncs(deviceId: string): Promise<{ success: boolean; syncs?: any[]; error?: string }> {
  try {
    const { data, error } = await supabase
      .from('sync_queue')
      .select('*')
      .or(`to_device_id.eq.${deviceId},to_device_id.is.null`)
      .eq('status', 'pending')
      .lte('created_at', new Date().toISOString())
      .order('priority', { ascending: false })
      .order('created_at', { ascending: true });

    if (error) return { success: false, error: error.message };
    return { success: true, syncs: data || [] };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Mark sync as completed
 */
export async function markSyncCompleted(syncId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('sync_queue')
      .update({
        status: 'synced',
        synced_at: new Date().toISOString()
      })
      .eq('id', syncId);

    return { success: !error, error: error?.message };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// ============================================================================
// DEVICE UTILITIES
// ============================================================================

/**
 * Detect device type from user agent
 */
export function detectDeviceType(): string {
  if (typeof window === 'undefined') return 'server';
  const ua = navigator.userAgent.toLowerCase();
  if (/mobile|android|iphone|ipod/.test(ua)) return 'mobile';
  if (/ipad|tablet/.test(ua)) return 'mobile';
  if (/mac/.test(ua)) return 'laptop';
  return 'pc';
}

/**
 * Generate device ID using simple fingerprinting
 */
export function generateDeviceId(): string {
  if (typeof window === 'undefined') {
    return `server-${Math.random().toString(36).substr(2, 15)}`;
  }

  const fingerprint = [
    navigator.userAgent,
    navigator.language,
    screen.width + 'x' + screen.height,
    new Date().getTimezoneOffset()
  ].join('|');

  return hashString(fingerprint);
}

function hashString(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
}

/**
 * Clear cache (use when needed)
 */
export function clearDeviceCache(): void {
  stateCache.clear();
}
