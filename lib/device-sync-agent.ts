/**
 * Device Sync Agent
 *
 * FOCUS: Cross-device conversation continuity and real-time synchronization
 *
 * Capabilities:
 * - Sync conversation state across devices (current message, scroll position)
 * - Resume conversations from last device
 * - Detect conflicts when same conversation edited on 2 devices simultaneously
 * - Sync project preferences and settings
 * - Show "Continue on [Device]" suggestions
 * - Queue sync tasks when offline
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export interface DeviceSession {
  id: string;
  deviceId: string;
  userId: string;
  deviceType: string;
  deviceName: string;
  isActive: boolean;
  lastHeartbeat: string;
  currentContext: any;
}

export interface SyncConflict {
  type: 'conversation_edit' | 'settings_change' | 'project_update';
  resourceId: string;
  deviceA: string;
  deviceB: string;
  timestampA: string;
  timestampB: string;
  conflictData: any;
  resolution?: 'keep_latest' | 'merge' | 'manual_review';
}

export interface SyncTask {
  id: string;
  type: 'context' | 'conversation' | 'settings' | 'project' | 'file';
  priority: number;
  status: 'pending' | 'syncing' | 'synced' | 'failed';
  fromDevice: string;
  toDevice?: string; // null = broadcast to all devices
  payload: any;
  createdAt: string;
}

export interface ContinuitySuggestion {
  type: 'continue_conversation' | 'resume_project' | 'sync_settings';
  title: string;
  description: string;
  sourceDevice: string;
  targetDevice: string;
  conversationId?: string;
  projectId?: string;
  confidence: number;
}

export class DeviceSyncAgent {
  private static instance: DeviceSyncAgent;
  private sessionId: string;

  private constructor() {
    this.sessionId = `sync_${Date.now()}`;
  }

  static getInstance(): DeviceSyncAgent {
    if (!DeviceSyncAgent.instance) {
      DeviceSyncAgent.instance = new DeviceSyncAgent();
    }
    return DeviceSyncAgent.instance;
  }

  /**
   * Main execution - sync all active devices for a user
   */
  async run(userId: string): Promise<{
    syncsProcessed: number;
    conflictsDetected: number;
    suggestionsGenerated: number;
    executionTime: number;
  }> {
    const startTime = Date.now();
    await this.log('info', '🔄 Device Sync Agent starting', { userId });

    try {
      // 1. Get all active devices
      const devices = await this.getActiveDevices(userId);
      await this.log('info', `Found ${devices.length} active devices`);

      // 2. Process pending sync tasks
      const syncsProcessed = await this.processPendingSyncs(userId);

      // 3. Detect conflicts
      const conflicts = await this.detectConflicts(userId);
      await this.log('info', `Detected ${conflicts.length} conflicts`);

      // 4. Resolve conflicts
      const resolvedConflicts = await this.resolveConflicts(conflicts);

      // 5. Generate continuity suggestions
      const suggestions = await this.generateContinuitySuggestions(userId, devices);
      await this.log('info', `Generated ${suggestions.length} continuity suggestions`);

      // 6. Sync conversation state
      await this.syncConversationState(userId, devices);

      // 7. Sync settings and preferences
      await this.syncSettings(userId, devices);

      // 8. Clean up old sync tasks
      await this.cleanupOldSyncTasks(userId);

      const executionTime = Date.now() - startTime;
      await this.log('info', `✅ Device Sync completed in ${executionTime}ms`, {
        syncsProcessed,
        conflictsDetected: conflicts.length,
        conflictsResolved: resolvedConflicts,
        suggestions: suggestions.length
      });

      return {
        syncsProcessed,
        conflictsDetected: conflicts.length,
        suggestionsGenerated: suggestions.length,
        executionTime
      };
    } catch (error: any) {
      await this.log('error', 'Device Sync execution failed', { error: error.message });
      throw error;
    }
  }

  /**
   * Get all active devices for a user
   */
  private async getActiveDevices(userId: string): Promise<DeviceSession[]> {
    const { data, error } = await supabase
      .from('device_sessions')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .gte('last_heartbeat', new Date(Date.now() - 10 * 60 * 1000).toISOString()) // Active in last 10 min
      .order('last_heartbeat', { ascending: false });

    if (error) {
      await this.log('error', 'Failed to get active devices', { error: error.message });
      return [];
    }

    return (data || []).map(d => ({
      id: d.id,
      deviceId: d.device_id,
      userId: d.user_id,
      deviceType: d.device_type,
      deviceName: d.device_name,
      isActive: d.is_active,
      lastHeartbeat: d.last_heartbeat,
      currentContext: d.current_context || {}
    }));
  }

  /**
   * Process pending sync tasks
   */
  private async processPendingSyncs(userId: string): Promise<number> {
    const { data: pendingSyncs, error } = await supabase
      .from('sync_queue')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'pending')
      .order('priority', { ascending: false })
      .order('created_at', { ascending: true })
      .limit(50);

    if (error) {
      await this.log('error', 'Failed to fetch pending syncs', { error: error.message });
      return 0;
    }

    let processed = 0;

    for (const sync of pendingSyncs || []) {
      try {
        // Mark as syncing
        await supabase
          .from('sync_queue')
          .update({ status: 'syncing' })
          .eq('id', sync.id);

        // Process based on type
        const success = await this.executeSyncTask(sync);

        // Update status
        await supabase
          .from('sync_queue')
          .update({
            status: success ? 'synced' : 'failed',
            synced_at: success ? new Date().toISOString() : null
          })
          .eq('id', sync.id);

        if (success) processed++;
      } catch (error: any) {
        await this.log('error', `Failed to process sync task ${sync.id}`, { error: error.message });
      }
    }

    return processed;
  }

  /**
   * Execute a single sync task
   */
  private async executeSyncTask(sync: any): Promise<boolean> {
    try {
      switch (sync.sync_type) {
        case 'context':
          return await this.syncContext(sync);
        case 'conversation':
          return await this.syncConversation(sync);
        case 'settings':
          return await this.syncSettingsTask(sync);
        case 'project':
          return await this.syncProject(sync);
        default:
          await this.log('warn', `Unknown sync type: ${sync.sync_type}`);
          return false;
      }
    } catch (error: any) {
      await this.log('error', 'Sync task execution failed', { error: error.message, syncId: sync.id });
      return false;
    }
  }

  /**
   * Sync context (current view, scroll position, etc.)
   */
  private async syncContext(sync: any): Promise<boolean> {
    const { payload, to_device_id } = sync;

    // Update context for target device(s)
    const updateData = {
      current_context: payload,
      updated_at: new Date().toISOString()
    };

    if (to_device_id) {
      // Sync to specific device
      await supabase
        .from('device_sessions')
        .update(updateData)
        .eq('device_id', to_device_id);
    } else {
      // Broadcast to all user's devices
      await supabase
        .from('device_sessions')
        .update(updateData)
        .eq('user_id', sync.user_id)
        .neq('device_id', sync.from_device_id); // Exclude source device
    }

    return true;
  }

  /**
   * Sync conversation updates
   */
  private async syncConversation(sync: any): Promise<boolean> {
    const { payload } = sync;
    const { conversationId, updates } = payload;

    // Apply updates to conversation
    await supabase
      .from('conversations')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', conversationId);

    return true;
  }

  /**
   * Sync settings/preferences
   */
  private async syncSettingsTask(sync: any): Promise<boolean> {
    const { payload } = sync;

    // Update device preferences
    await supabase
      .from('device_preferences')
      .upsert({
        user_id: sync.user_id,
        preferences: payload,
        updated_at: new Date().toISOString()
      });

    return true;
  }

  /**
   * Sync project updates
   */
  private async syncProject(sync: any): Promise<boolean> {
    const { payload } = sync;
    const { projectId, updates } = payload;

    await supabase
      .from('projects')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', projectId);

    return true;
  }

  /**
   * Detect conflicts between devices
   */
  private async detectConflicts(userId: string): Promise<SyncConflict[]> {
    const conflicts: SyncConflict[] = [];

    // Check for simultaneous conversation edits
    const conversationConflicts = await this.detectConversationConflicts(userId);
    conflicts.push(...conversationConflicts);

    // Check for settings conflicts
    const settingsConflicts = await this.detectSettingsConflicts(userId);
    conflicts.push(...settingsConflicts);

    return conflicts;
  }

  /**
   * Detect conversation edit conflicts
   */
  private async detectConversationConflicts(userId: string): Promise<SyncConflict[]> {
    const conflicts: SyncConflict[] = [];

    // Get recent conversation updates
    const { data: updates } = await supabase
      .from('sync_queue')
      .select('*')
      .eq('user_id', userId)
      .eq('sync_type', 'conversation')
      .gte('created_at', new Date(Date.now() - 5 * 60 * 1000).toISOString()) // Last 5 minutes
      .order('created_at', { ascending: true });

    if (!updates || updates.length < 2) return conflicts;

    // Group by conversation ID
    const updatesByConv = new Map<string, any[]>();
    for (const update of updates) {
      const convId = update.payload?.conversationId;
      if (!convId) continue;

      if (!updatesByConv.has(convId)) {
        updatesByConv.set(convId, []);
      }
      updatesByConv.get(convId)!.push(update);
    }

    // Find conflicts (multiple devices editing same conversation)
    for (const [convId, convUpdates] of Array.from(updatesByConv.entries())) {
      if (convUpdates.length > 1) {
        const devices = new Set(convUpdates.map(u => u.from_device_id));
        if (devices.size > 1) {
          // Conflict detected
          const sorted = convUpdates.sort((a, b) =>
            new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
          );

          conflicts.push({
            type: 'conversation_edit',
            resourceId: convId,
            deviceA: sorted[0].from_device_id,
            deviceB: sorted[sorted.length - 1].from_device_id,
            timestampA: sorted[0].created_at,
            timestampB: sorted[sorted.length - 1].created_at,
            conflictData: {
              updatesA: sorted[0].payload,
              updatesB: sorted[sorted.length - 1].payload
            }
          });
        }
      }
    }

    return conflicts;
  }

  /**
   * Detect settings conflicts
   */
  private async detectSettingsConflicts(userId: string): Promise<SyncConflict[]> {
    const conflicts: SyncConflict[] = [];

    // Get recent settings updates
    const { data: updates } = await supabase
      .from('sync_queue')
      .select('*')
      .eq('user_id', userId)
      .eq('sync_type', 'settings')
      .gte('created_at', new Date(Date.now() - 5 * 60 * 1000).toISOString())
      .order('created_at', { ascending: true });

    if (!updates || updates.length < 2) return conflicts;

    const devices = new Set(updates.map(u => u.from_device_id));
    if (devices.size > 1) {
      const sorted = updates.sort((a, b) =>
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );

      conflicts.push({
        type: 'settings_change',
        resourceId: 'user_settings',
        deviceA: sorted[0].from_device_id,
        deviceB: sorted[sorted.length - 1].from_device_id,
        timestampA: sorted[0].created_at,
        timestampB: sorted[sorted.length - 1].created_at,
        conflictData: {
          settingsA: sorted[0].payload,
          settingsB: sorted[sorted.length - 1].payload
        }
      });
    }

    return conflicts;
  }

  /**
   * Resolve conflicts (keep latest by default)
   */
  private async resolveConflicts(conflicts: SyncConflict[]): Promise<number> {
    let resolved = 0;

    for (const conflict of conflicts) {
      try {
        // Simple resolution: keep latest timestamp
        const isALatest = new Date(conflict.timestampA).getTime() > new Date(conflict.timestampB).getTime();
        const winner = isALatest ? 'A' : 'B';

        await this.log('info', `Resolving conflict for ${conflict.type}`, {
          resourceId: conflict.resourceId,
          winner,
          resolution: 'keep_latest'
        });

        // Log conflict resolution
        await supabase.from('agent_findings').insert({
          finding_type: 'warning',
          severity: 'medium',
          title: `Sync conflict resolved: ${conflict.type}`,
          description: `Conflict detected on ${conflict.resourceId} between ${conflict.deviceA} and ${conflict.deviceB}. Kept latest change from ${winner}.`,
          detection_method: 'device_sync',
          evidence: conflict
        });

        resolved++;
      } catch (error: any) {
        await this.log('error', 'Failed to resolve conflict', { error: error.message, conflict });
      }
    }

    return resolved;
  }

  /**
   * Generate continuity suggestions
   */
  private async generateContinuitySuggestions(
    userId: string,
    devices: DeviceSession[]
  ): Promise<ContinuitySuggestion[]> {
    const suggestions: ContinuitySuggestion[] = [];

    if (devices.length < 2) return suggestions;

    // Find conversations started on one device but could continue on another
    for (const device of devices) {
      const context = device.currentContext || {};

      if (context.activeConversation) {
        // Suggest continuing on other devices
        for (const otherDevice of devices) {
          if (otherDevice.deviceId === device.deviceId) continue;

          suggestions.push({
            type: 'continue_conversation',
            title: `Continue conversation on ${otherDevice.deviceName}`,
            description: `You were working on "${context.conversationTitle || 'a conversation'}" on ${device.deviceName}. Continue on ${otherDevice.deviceName}?`,
            sourceDevice: device.deviceName,
            targetDevice: otherDevice.deviceName,
            conversationId: context.activeConversation,
            confidence: 85
          });
        }
      }

      if (context.activeProject) {
        // Suggest resuming project work
        for (const otherDevice of devices) {
          if (otherDevice.deviceId === device.deviceId) continue;

          suggestions.push({
            type: 'resume_project',
            title: `Resume project on ${otherDevice.deviceName}`,
            description: `Continue working on "${context.projectName || 'your project'}" from ${device.deviceName}?`,
            sourceDevice: device.deviceName,
            targetDevice: otherDevice.deviceName,
            projectId: context.activeProject,
            confidence: 75
          });
        }
      }
    }

    // Save suggestions to database
    for (const suggestion of suggestions) {
      await supabase.from('agent_findings').insert({
        finding_type: 'insight',
        severity: 'info',
        title: suggestion.title,
        description: suggestion.description,
        detection_method: 'device_continuity',
        evidence: suggestion
      });
    }

    return suggestions;
  }

  /**
   * Sync conversation state across devices
   */
  private async syncConversationState(userId: string, devices: DeviceSession[]): Promise<void> {
    // Get active conversations for each device
    for (const device of devices) {
      const context = device.currentContext || {};

      if (context.activeConversation && context.scrollPosition !== undefined) {
        // Create sync task to share scroll position
        await supabase.from('sync_queue').insert({
          user_id: userId,
          from_device_id: device.deviceId,
          sync_type: 'context',
          payload: {
            activeConversation: context.activeConversation,
            scrollPosition: context.scrollPosition,
            currentMessage: context.currentMessage
          },
          status: 'pending',
          priority: 5
        });
      }
    }
  }

  /**
   * Sync settings and preferences
   */
  private async syncSettings(userId: string, devices: DeviceSession[]): Promise<void> {
    // Get latest preferences
    const { data: prefs } = await supabase
      .from('device_preferences')
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })
      .limit(1)
      .single();

    if (!prefs) return;

    // Sync to all devices
    for (const device of devices) {
      await supabase
        .from('device_sessions')
        .update({
          current_context: {
            ...(device.currentContext || {}),
            preferences: prefs.preferences
          }
        })
        .eq('device_id', device.deviceId);
    }
  }

  /**
   * Clean up old sync tasks
   */
  private async cleanupOldSyncTasks(userId: string): Promise<void> {
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();

    await supabase
      .from('sync_queue')
      .delete()
      .eq('user_id', userId)
      .eq('status', 'synced')
      .lt('synced_at', threeDaysAgo);
  }

  /**
   * Queue a sync task for offline processing
   */
  async queueOfflineSync(
    userId: string,
    deviceId: string,
    type: string,
    payload: any,
    priority: number = 5
  ): Promise<string | null> {
    try {
      const { data, error } = await supabase
        .from('sync_queue')
        .insert({
          user_id: userId,
          from_device_id: deviceId,
          sync_type: type,
          payload,
          status: 'pending',
          priority
        })
        .select('id')
        .single();

      if (error) throw error;

      await this.log('info', `Queued offline sync: ${type}`, { userId, deviceId });
      return data.id;
    } catch (error: any) {
      await this.log('error', 'Failed to queue offline sync', { error: error.message });
      return null;
    }
  }

  private async log(level: string, message: string, details?: any): Promise<void> {
    await supabase.from('agent_logs').insert({
      log_level: level,
      category: 'device-sync',
      message,
      details,
      session_id: this.sessionId
    });

    console.log(`[DEVICE-SYNC] [${level.toUpperCase()}] ${message}`, details || '');
  }
}
