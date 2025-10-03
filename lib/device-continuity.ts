import { google } from 'googleapis';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export interface DeviceState {
  deviceId: string;
  userId: string;
  timestamp: number;
  activeProject?: string;
  chatContext?: {
    conversationId?: string;
    messageCount: number;
    lastMessage?: string;
    activeTopics: string[];
  };
  uiState?: {
    openTabs: string[];
    activePanel?: string;
    searchContext?: string;
    settings: Record<string, any>;
  };
  fileUploads?: {
    inProgress: Array<{
      fileName: string;
      progress: number;
      uploadId: string;
    }>;
    completed: string[];
  };
  deviceInfo: {
    platform: string;
    userAgent: string;
    screenResolution?: string;
    timezone: string;
  };
}

export interface ConflictInfo {
  field: string;
  localValue: any;
  remoteValue: any;
  timestamp: number;
  deviceId: string;
}

export interface SyncResult {
  success: boolean;
  fileId?: string;
  conflicts: ConflictInfo[];
  error?: string;
}

export interface TransferPackage {
  chatContext?: any;
  activeProject?: string;
  uiState?: any;
  fileUploads?: any;
  transferredAt: string;
  fromDevice: string;
  toDevice: string;
}

export class DeviceContinuityManager {
  private userId: string;
  private driveClient: any = null;
  private readonly CONTINUITY_FOLDER = 'KimbleAI-DeviceContinuity';
  private readonly STATE_FILE_PREFIX = 'device-state-';
  private readonly TRANSFER_FILE_PREFIX = 'transfer-';
  private readonly STALE_THRESHOLD = 5 * 60 * 1000; // 5 minutes

  constructor(userId: string) {
    this.userId = userId;
  }

  async initializeDriveClient(): Promise<void> {
    if (this.driveClient) return;

    try {
      // Get user's Google token
      const { data: tokenData } = await supabase
        .from('user_tokens')
        .select('access_token, refresh_token')
        .eq('user_id', this.userId)
        .single();

      if (!tokenData?.access_token) {
        throw new Error('User not authenticated with Google');
      }

      // Initialize Google Drive client
      const oauth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID!,
        process.env.GOOGLE_CLIENT_SECRET!,
        process.env.NEXTAUTH_URL + '/api/auth/callback/google'
      );

      oauth2Client.setCredentials({
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token
      });

      this.driveClient = google.drive({ version: 'v3', auth: oauth2Client });

      // Ensure continuity folder exists
      await this.ensureContinuityFolder();

    } catch (error) {
      console.error('Failed to initialize Drive client:', error);
      throw error;
    }
  }

  private async ensureContinuityFolder(): Promise<string> {
    try {
      // Check if folder exists
      const response = await this.driveClient.files.list({
        q: `name='${this.CONTINUITY_FOLDER}' and mimeType='application/vnd.google-apps.folder'`,
        fields: 'files(id, name)'
      });

      if (response.data.files && response.data.files.length > 0) {
        return response.data.files[0].id!;
      }

      // Create folder if it doesn't exist
      const createResponse = await this.driveClient.files.create({
        resource: {
          name: this.CONTINUITY_FOLDER,
          mimeType: 'application/vnd.google-apps.folder'
        },
        fields: 'id'
      });

      return createResponse.data.id!;

    } catch (error) {
      console.error('Failed to ensure continuity folder:', error);
      throw error;
    }
  }

  async syncToCloud(deviceId: string, state: DeviceState): Promise<SyncResult> {
    try {
      await this.initializeDriveClient();

      const folderId = await this.ensureContinuityFolder();
      const fileName = `${this.STATE_FILE_PREFIX}${deviceId}.json`;

      // Prepare state data with compression for large objects
      const stateData = {
        ...state,
        timestamp: Date.now(),
        userId: this.userId,
        syncVersion: 1
      };

      const compressedData = JSON.stringify(stateData);

      // Check if file already exists
      const existingResponse = await this.driveClient.files.list({
        q: `name='${fileName}' and parents in '${folderId}'`,
        fields: 'files(id, name)'
      });

      let fileId: string;

      if (existingResponse.data.files && existingResponse.data.files.length > 0) {
        // Update existing file
        fileId = existingResponse.data.files[0].id!;
        await this.driveClient.files.update({
          fileId: fileId,
          media: {
            mimeType: 'application/json',
            body: compressedData
          }
        });
      } else {
        // Create new file
        const createResponse = await this.driveClient.files.create({
          resource: {
            name: fileName,
            parents: [folderId]
          },
          media: {
            mimeType: 'application/json',
            body: compressedData
          },
          fields: 'id'
        });
        fileId = createResponse.data.id!;
      }

      return {
        success: true,
        fileId: fileId,
        conflicts: []
      };

    } catch (error: any) {
      console.error('Failed to sync to cloud:', error);
      return {
        success: false,
        conflicts: [],
        error: error.message
      };
    }
  }

  async getFromCloud(deviceId: string): Promise<DeviceState | null> {
    try {
      await this.initializeDriveClient();

      const folderId = await this.ensureContinuityFolder();
      const fileName = `${this.STATE_FILE_PREFIX}${deviceId}.json`;

      // Find the file
      const response = await this.driveClient.files.list({
        q: `name='${fileName}' and parents in '${folderId}'`,
        fields: 'files(id, name, modifiedTime)'
      });

      if (!response.data.files || response.data.files.length === 0) {
        return null;
      }

      const fileId = response.data.files[0].id!;

      // Get file content
      const contentResponse = await this.driveClient.files.get({
        fileId: fileId,
        alt: 'media'
      });

      const stateData = JSON.parse(contentResponse.data);
      return stateData as DeviceState;

    } catch (error) {
      console.error('Failed to get from cloud:', error);
      return null;
    }
  }

  async updateLocalState(deviceId: string, state: DeviceState): Promise<void> {
    try {
      // Store in Supabase for fast local access
      await supabase.from('device_states').upsert({
        device_id: deviceId,
        user_id: this.userId,
        state_data: state,
        updated_at: new Date().toISOString()
      });

    } catch (error) {
      console.error('Failed to update local state:', error);
      throw error;
    }
  }

  async getLocalState(deviceId: string): Promise<DeviceState | null> {
    try {
      const { data, error } = await supabase
        .from('device_states')
        .select('state_data, updated_at')
        .eq('device_id', deviceId)
        .eq('user_id', this.userId)
        .single();

      if (error || !data) {
        return null;
      }

      return data.state_data as DeviceState;

    } catch (error) {
      console.error('Failed to get local state:', error);
      return null;
    }
  }

  async getActiveDevices(): Promise<DeviceState[]> {
    try {
      const cutoffTime = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 hours ago

      const { data, error } = await supabase
        .from('device_states')
        .select('state_data')
        .eq('user_id', this.userId)
        .gte('updated_at', cutoffTime.toISOString())
        .order('updated_at', { ascending: false });

      if (error || !data) {
        return [];
      }

      return data.map(row => row.state_data as DeviceState);

    } catch (error) {
      console.error('Failed to get active devices:', error);
      return [];
    }
  }

  async detectConflicts(deviceId: string, newState: DeviceState, activeDevices: DeviceState[]): Promise<ConflictInfo[]> {
    const conflicts: ConflictInfo[] = [];

    for (const device of activeDevices) {
      if (device.deviceId === deviceId) continue;

      // Check for timing conflicts (simultaneous activity)
      const timeDiff = Math.abs(newState.timestamp - device.timestamp);
      if (timeDiff < 30000) { // 30 seconds
        // Check for conflicting active projects
        if (newState.activeProject && device.activeProject &&
            newState.activeProject !== device.activeProject) {
          conflicts.push({
            field: 'activeProject',
            localValue: newState.activeProject,
            remoteValue: device.activeProject,
            timestamp: device.timestamp,
            deviceId: device.deviceId
          });
        }

        // Check for conflicting file uploads
        if (newState.fileUploads?.inProgress && device.fileUploads?.inProgress) {
          const localFiles = new Set(newState.fileUploads.inProgress.map(f => f.fileName));
          const remoteFiles = new Set(device.fileUploads.inProgress.map(f => f.fileName));

          const conflictingFiles = [...localFiles].filter(f => remoteFiles.has(f));
          if (conflictingFiles.length > 0) {
            conflicts.push({
              field: 'fileUploads',
              localValue: conflictingFiles,
              remoteValue: conflictingFiles,
              timestamp: device.timestamp,
              deviceId: device.deviceId
            });
          }
        }
      }
    }

    return conflicts;
  }

  async resolveConflicts(
    deviceId: string,
    syncData: any,
    resolution: 'merge' | 'overwrite' | 'keep_local'
  ): Promise<{ state: DeviceState; conflictsResolved: number }> {
    const currentState = await this.getLocalState(deviceId);
    const remoteState = syncData.remoteState as DeviceState;

    if (!currentState || !remoteState) {
      throw new Error('Cannot resolve conflicts: missing state data');
    }

    let resolvedState: DeviceState;
    let conflictsResolved = 0;

    switch (resolution) {
      case 'overwrite':
        resolvedState = remoteState;
        conflictsResolved = syncData.conflicts?.length || 0;
        break;

      case 'keep_local':
        resolvedState = currentState;
        conflictsResolved = syncData.conflicts?.length || 0;
        break;

      case 'merge':
      default:
        resolvedState = this.mergeStates(currentState, remoteState);
        conflictsResolved = syncData.conflicts?.length || 0;
        break;
    }

    // Update both local and cloud storage
    await this.updateLocalState(deviceId, resolvedState);
    await this.syncToCloud(deviceId, resolvedState);

    return { state: resolvedState, conflictsResolved };
  }

  private mergeStates(local: DeviceState, remote: DeviceState): DeviceState {
    // Smart merge strategy: prefer most recent data for each field
    const merged: DeviceState = {
      ...local,
      timestamp: Math.max(local.timestamp, remote.timestamp)
    };

    // Merge chat context (prefer higher message count)
    if (remote.chatContext && (!local.chatContext ||
        remote.chatContext.messageCount > local.chatContext.messageCount)) {
      merged.chatContext = remote.chatContext;
    }

    // Merge UI state (combine tabs, prefer recent settings)
    if (remote.uiState && local.uiState) {
      merged.uiState = {
        openTabs: [...new Set([...(local.uiState.openTabs || []), ...(remote.uiState.openTabs || [])])],
        activePanel: remote.timestamp > local.timestamp ? remote.uiState.activePanel : local.uiState.activePanel,
        searchContext: remote.uiState.searchContext || local.uiState.searchContext,
        settings: { ...local.uiState.settings, ...remote.uiState.settings }
      };
    } else if (remote.uiState) {
      merged.uiState = remote.uiState;
    }

    // Merge file uploads (combine lists, prefer most recent progress)
    if (remote.fileUploads && local.fileUploads) {
      const allInProgress = new Map();

      // Add local files first
      local.fileUploads.inProgress?.forEach(file => {
        allInProgress.set(file.fileName, file);
      });

      // Override with remote files (they might have updated progress)
      remote.fileUploads.inProgress?.forEach(file => {
        const existing = allInProgress.get(file.fileName);
        if (!existing || file.progress > existing.progress) {
          allInProgress.set(file.fileName, file);
        }
      });

      merged.fileUploads = {
        inProgress: Array.from(allInProgress.values()),
        completed: [...new Set([...(local.fileUploads.completed || []), ...(remote.fileUploads.completed || [])])]
      };
    } else if (remote.fileUploads) {
      merged.fileUploads = remote.fileUploads;
    }

    return merged;
  }

  async createTransferPackage(transferData: TransferPackage): Promise<{ transferId: string }> {
    try {
      await this.initializeDriveClient();

      const folderId = await this.ensureContinuityFolder();
      const transferId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const fileName = `${this.TRANSFER_FILE_PREFIX}${transferId}.json`;

      const transferPackage = {
        ...transferData,
        transferId,
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString() // 10 minutes
      };

      await this.driveClient.files.create({
        resource: {
          name: fileName,
          parents: [folderId]
        },
        media: {
          mimeType: 'application/json',
          body: JSON.stringify(transferPackage)
        }
      });

      return { transferId };

    } catch (error) {
      console.error('Failed to create transfer package:', error);
      throw error;
    }
  }

  async notifyDevices(userId: string, targetDevice: string, event: string, data?: any): Promise<void> {
    try {
      // Store notification in database for polling/WebSocket delivery
      await supabase.from('device_notifications').insert({
        user_id: userId,
        target_device: targetDevice,
        event_type: event,
        event_data: data,
        created_at: new Date().toISOString()
      });

    } catch (error) {
      console.error('Failed to notify devices:', error);
    }
  }

  async markDeviceTransferred(deviceId: string): Promise<void> {
    try {
      await supabase
        .from('device_states')
        .update({
          transferred: true,
          updated_at: new Date().toISOString()
        })
        .eq('device_id', deviceId)
        .eq('user_id', this.userId);

    } catch (error) {
      console.error('Failed to mark device as transferred:', error);
    }
  }

  async cleanupStaleStates(): Promise<{ cleaned: number; remaining: number }> {
    try {
      const staleTime = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // 7 days ago

      const { data: staleStates } = await supabase
        .from('device_states')
        .select('device_id')
        .eq('user_id', this.userId)
        .lt('updated_at', staleTime.toISOString());

      const cleaned = staleStates?.length || 0;

      if (cleaned > 0) {
        await supabase
          .from('device_states')
          .delete()
          .eq('user_id', this.userId)
          .lt('updated_at', staleTime.toISOString());

        // Also cleanup cloud files
        await this.cleanupCloudFiles(staleStates?.map(s => s.device_id) || []);
      }

      const { data: remaining } = await supabase
        .from('device_states')
        .select('device_id', { count: 'exact' })
        .eq('user_id', this.userId);

      return { cleaned, remaining: remaining?.length || 0 };

    } catch (error) {
      console.error('Failed to cleanup stale states:', error);
      return { cleaned: 0, remaining: 0 };
    }
  }

  private async cleanupCloudFiles(deviceIds: string[]): Promise<void> {
    try {
      await this.initializeDriveClient();
      const folderId = await this.ensureContinuityFolder();

      for (const deviceId of deviceIds) {
        const fileName = `${this.STATE_FILE_PREFIX}${deviceId}.json`;

        const response = await this.driveClient.files.list({
          q: `name='${fileName}' and parents in '${folderId}'`,
          fields: 'files(id)'
        });

        if (response.data.files && response.data.files.length > 0) {
          await this.driveClient.files.delete({
            fileId: response.data.files[0].id!
          });
        }
      }

    } catch (error) {
      console.error('Failed to cleanup cloud files:', error);
    }
  }

  async getSyncStatus(deviceId: string): Promise<any> {
    try {
      const localState = await this.getLocalState(deviceId);
      const cloudState = await this.getFromCloud(deviceId);

      const localTimestamp = localState?.timestamp || 0;
      const cloudTimestamp = cloudState?.timestamp || 0;

      return {
        localExists: !!localState,
        cloudExists: !!cloudState,
        inSync: localTimestamp === cloudTimestamp,
        localTimestamp,
        cloudTimestamp,
        isStale: this.isStateStale(localState || cloudState),
        lastSync: Math.max(localTimestamp, cloudTimestamp)
      };

    } catch (error) {
      console.error('Failed to get sync status:', error);
      return {
        localExists: false,
        cloudExists: false,
        inSync: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  isStateStale(state: DeviceState | null): boolean {
    if (!state) return true;
    return (Date.now() - state.timestamp) > this.STALE_THRESHOLD;
  }

  getDeviceStatus(device: DeviceState): 'active' | 'idle' | 'stale' {
    const timeSinceLastActive = Date.now() - device.timestamp;

    if (timeSinceLastActive < 2 * 60 * 1000) return 'active'; // 2 minutes
    if (timeSinceLastActive < 30 * 60 * 1000) return 'idle'; // 30 minutes
    return 'stale';
  }
}

// Device fingerprinting utilities
export class DeviceFingerprinter {
  static generateDeviceId(): string {
    if (typeof window !== 'undefined') {
      // Browser environment
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      ctx?.fillText('Device fingerprint', 10, 10);
      const canvasFingerprint = canvas.toDataURL();

      const fingerprint = [
        navigator.userAgent,
        navigator.language,
        screen.width + 'x' + screen.height,
        new Date().getTimezoneOffset(),
        canvasFingerprint.slice(-50) // Last 50 chars of canvas fingerprint
      ].join('|');

      // Generate consistent device ID from fingerprint
      return this.hashString(fingerprint);
    } else {
      // Server environment - generate random ID
      return `server-${Math.random().toString(36).substr(2, 15)}`;
    }
  }

  static getDeviceInfo(): any {
    if (typeof window !== 'undefined') {
      return {
        platform: navigator.platform,
        userAgent: navigator.userAgent,
        screenResolution: `${screen.width}x${screen.height}`,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
      };
    } else {
      return {
        platform: 'server',
        userAgent: 'server',
        timezone: 'UTC'
      };
    }
  }

  private static hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(36);
  }
}

// Local storage utilities for caching
export class ContinuityCache {
  private static readonly CACHE_PREFIX = 'kimbleai_continuity_';
  private static readonly CACHE_EXPIRY = 5 * 60 * 1000; // 5 minutes

  static set(key: string, data: any): void {
    if (typeof window === 'undefined') return;

    const cacheData = {
      data,
      timestamp: Date.now(),
      expiry: Date.now() + this.CACHE_EXPIRY
    };

    try {
      localStorage.setItem(`${this.CACHE_PREFIX}${key}`, JSON.stringify(cacheData));
    } catch (error) {
      console.warn('Failed to cache data:', error);
    }
  }

  static get(key: string): any | null {
    if (typeof window === 'undefined') return null;

    try {
      const cached = localStorage.getItem(`${this.CACHE_PREFIX}${key}`);
      if (!cached) return null;

      const cacheData = JSON.parse(cached);

      if (Date.now() > cacheData.expiry) {
        this.remove(key);
        return null;
      }

      return cacheData.data;
    } catch (error) {
      console.warn('Failed to get cached data:', error);
      return null;
    }
  }

  static remove(key: string): void {
    if (typeof window === 'undefined') return;

    try {
      localStorage.removeItem(`${this.CACHE_PREFIX}${key}`);
    } catch (error) {
      console.warn('Failed to remove cached data:', error);
    }
  }

  static clear(): void {
    if (typeof window === 'undefined') return;

    try {
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.startsWith(this.CACHE_PREFIX)) {
          localStorage.removeItem(key);
        }
      });
    } catch (error) {
      console.warn('Failed to clear cache:', error);
    }
  }
}

// ============================================================================
// SUPABASE-BASED HELPER FUNCTIONS FOR API ROUTES
// ============================================================================
// These functions provide a simplified interface for the API endpoints
// to interact with the Supabase database (real-time layer)

/**
 * Send heartbeat to mark device as active
 */
export async function sendHeartbeat(
  deviceId: string,
  context: any,
  userId?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Check if device exists first
    const { data: existing } = await supabase
      .from('device_sessions')
      .select('id')
      .eq('device_id', deviceId)
      .single();

    if (existing) {
      // Update existing session
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
      // Need user_id for new session
      if (!userId) {
        return { success: false, error: 'User ID required for new device session' };
      }

      // Create new session (requires device_type, so this should only happen after registerDevice)
      return { success: false, error: 'Device not registered. Please register device first.' };
    }
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Register a new device or update existing device info
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
 * Generate a unique device ID using fingerprinting
 */
export function generateDeviceId(): string {
  return DeviceFingerprinter.generateDeviceId();
}

/**
 * Save a context snapshot to the database
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
    // Get session_id if it exists
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
 * Get the latest context snapshot from another device
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

    // get_latest_context returns a single row or empty
    const context = data && data.length > 0 ? data[0] : null;

    return { success: true, context };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Get all active devices for a user
 */
export async function getActiveDevices(
  userId: string
): Promise<{ success: boolean; devices?: any[]; error?: string }> {
  try {
    const { data, error } = await supabase
      .from('device_sessions')
      .select('*')
      .eq('user_id', userId)
      .order('last_heartbeat', { ascending: false });

    if (error) return { success: false, error: error.message };
    return { success: true, devices: data || [] };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Queue a sync operation to be sent to another device
 */
export async function queueSync(
  userId: string,
  fromDeviceId: string,
  payload: any,
  toDeviceId?: string
): Promise<{ success: boolean; syncId?: string; error?: string }> {
  try {
    const allowedTypes = ['context', 'file', 'search', 'project', 'notification'];
    const syncType = payload.type && allowedTypes.includes(payload.type)
      ? payload.type
      : 'context';

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
 * Get pending sync operations for a device
 */
export async function getPendingSyncs(
  deviceId: string
): Promise<{ success: boolean; syncs?: any[]; error?: string }> {
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
 * Mark a sync operation as completed
 */
export async function markSyncCompleted(
  syncId: string
): Promise<{ success: boolean; error?: string }> {
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