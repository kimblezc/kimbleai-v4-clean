import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { createClient } from '@supabase/supabase-js';
import { DeviceContinuityManager } from '@/lib/device-continuity';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface DeviceState {
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

export async function POST(request: NextRequest) {
  try {
    const {
      action,
      deviceId,
      userId = 'zach',
      state,
      syncData,
      conflictResolution = 'merge'
    } = await request.json();

    // Initialize device continuity manager
    const continuityManager = new DeviceContinuityManager(userId);

    switch (action) {
      case 'sync_state':
        return await syncDeviceState(continuityManager, deviceId, userId, state);

      case 'get_state':
        return await getDeviceState(continuityManager, deviceId, userId);

      case 'get_active_devices':
        return await getActiveDevices(continuityManager, userId);

      case 'transfer_session':
        return await transferSession(continuityManager, syncData.fromDevice, syncData.toDevice, userId);

      case 'resolve_conflict':
        return await resolveConflict(continuityManager, deviceId, userId, syncData, conflictResolution);

      case 'cleanup_stale_sessions':
        return await cleanupStaleSessions(continuityManager, userId);

      case 'get_sync_status':
        return await getSyncStatus(continuityManager, deviceId, userId);

      default:
        return NextResponse.json({
          error: 'Invalid action specified'
        }, { status: 400 });
    }

  } catch (error: any) {
    console.error('Device continuity error:', error);
    return NextResponse.json({
      error: 'Failed to process device continuity request',
      details: error.message
    }, { status: 500 });
  }
}

async function syncDeviceState(
  manager: DeviceContinuityManager,
  deviceId: string,
  userId: string,
  state: DeviceState
): Promise<NextResponse> {
  try {
    // Validate device state
    if (!deviceId || !state.deviceInfo) {
      return NextResponse.json({
        error: 'Invalid device state data'
      }, { status: 400 });
    }

    // Check for conflicts with other active devices
    const activeDevices = await manager.getActiveDevices();
    const conflicts = await manager.detectConflicts(deviceId, state, activeDevices);

    if (conflicts.length > 0) {
      return NextResponse.json({
        success: false,
        conflicts: conflicts,
        requiresResolution: true,
        state: state
      });
    }

    // Sync state to Google Drive
    const syncResult = await manager.syncToCloud(deviceId, state);

    // Update local database
    await manager.updateLocalState(deviceId, state);

    // Notify other devices of the update
    await manager.notifyDevices(userId, deviceId, 'state_updated');

    return NextResponse.json({
      success: true,
      deviceId: deviceId,
      syncedAt: new Date().toISOString(),
      cloudFileId: syncResult.fileId,
      conflicts: []
    });

  } catch (error: any) {
    console.error('Sync state error:', error);
    return NextResponse.json({
      error: 'Failed to sync device state',
      details: error.message
    }, { status: 500 });
  }
}

async function getDeviceState(
  manager: DeviceContinuityManager,
  deviceId: string,
  userId: string
): Promise<NextResponse> {
  try {
    // Try to get from local cache first
    let state = await manager.getLocalState(deviceId);

    if (!state) {
      // Fallback to cloud storage
      state = await manager.getFromCloud(deviceId);
    }

    if (!state) {
      return NextResponse.json({
        success: false,
        error: 'No state found for device'
      }, { status: 404 });
    }

    // Check if state is stale
    const isStale = await manager.isStateStale(state);

    return NextResponse.json({
      success: true,
      state: state,
      isStale: isStale,
      lastSync: state.timestamp,
      deviceId: deviceId
    });

  } catch (error: any) {
    console.error('Get state error:', error);
    return NextResponse.json({
      error: 'Failed to retrieve device state',
      details: error.message
    }, { status: 500 });
  }
}

async function getActiveDevices(
  manager: DeviceContinuityManager,
  userId: string
): Promise<NextResponse> {
  try {
    const devices = await manager.getActiveDevices();

    // Filter and enrich device information
    const enrichedDevices = devices.map(device => ({
      deviceId: device.deviceId,
      platform: device.deviceInfo.platform,
      lastActive: device.timestamp,
      isCurrentDevice: false, // Will be set by client
      activeProject: device.activeProject,
      status: manager.getDeviceStatus(device)
    }));

    return NextResponse.json({
      success: true,
      devices: enrichedDevices,
      totalDevices: enrichedDevices.length
    });

  } catch (error: any) {
    console.error('Get active devices error:', error);
    return NextResponse.json({
      error: 'Failed to get active devices',
      details: error.message
    }, { status: 500 });
  }
}

async function transferSession(
  manager: DeviceContinuityManager,
  fromDevice: string,
  toDevice: string,
  userId: string
): Promise<NextResponse> {
  try {
    // Get source device state
    const sourceState = await manager.getLocalState(fromDevice) || await manager.getFromCloud(fromDevice);

    if (!sourceState) {
      return NextResponse.json({
        error: 'Source device state not found'
      }, { status: 404 });
    }

    // Create transfer package with essential data
    const transferPackage = {
      chatContext: sourceState.chatContext,
      activeProject: sourceState.activeProject,
      uiState: {
        searchContext: sourceState.uiState?.searchContext,
        activePanel: sourceState.uiState?.activePanel
      },
      fileUploads: sourceState.fileUploads,
      transferredAt: new Date().toISOString(),
      fromDevice: fromDevice,
      toDevice: toDevice
    };

    // Save transfer package to cloud
    const transferResult = await manager.createTransferPackage(transferPackage);

    // Mark source device as transferred
    await manager.markDeviceTransferred(fromDevice);

    // Notify devices
    await manager.notifyDevices(userId, toDevice, 'session_transferred', transferPackage);

    return NextResponse.json({
      success: true,
      transferId: transferResult.transferId,
      transferPackage: transferPackage,
      message: 'Session transfer initiated'
    });

  } catch (error: any) {
    console.error('Transfer session error:', error);
    return NextResponse.json({
      error: 'Failed to transfer session',
      details: error.message
    }, { status: 500 });
  }
}

async function resolveConflict(
  manager: DeviceContinuityManager,
  deviceId: string,
  userId: string,
  syncData: any,
  resolution: 'merge' | 'overwrite' | 'keep_local'
): Promise<NextResponse> {
  try {
    const conflictResult = await manager.resolveConflicts(deviceId, syncData, resolution);

    return NextResponse.json({
      success: true,
      resolution: resolution,
      mergedState: conflictResult.state,
      conflictsResolved: conflictResult.conflictsResolved
    });

  } catch (error: any) {
    console.error('Resolve conflict error:', error);
    return NextResponse.json({
      error: 'Failed to resolve conflicts',
      details: error.message
    }, { status: 500 });
  }
}

async function cleanupStaleSessions(
  manager: DeviceContinuityManager,
  userId: string
): Promise<NextResponse> {
  try {
    const cleanupResult = await manager.cleanupStaleStates();

    return NextResponse.json({
      success: true,
      cleaned: cleanupResult.cleaned,
      remaining: cleanupResult.remaining,
      message: `Cleaned up ${cleanupResult.cleaned} stale sessions`
    });

  } catch (error: any) {
    console.error('Cleanup error:', error);
    return NextResponse.json({
      error: 'Failed to cleanup stale sessions',
      details: error.message
    }, { status: 500 });
  }
}

async function getSyncStatus(
  manager: DeviceContinuityManager,
  deviceId: string,
  userId: string
): Promise<NextResponse> {
  try {
    const status = await manager.getSyncStatus(deviceId);

    return NextResponse.json({
      success: true,
      status: status,
      deviceId: deviceId,
      checkedAt: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('Get sync status error:', error);
    return NextResponse.json({
      error: 'Failed to get sync status',
      details: error.message
    }, { status: 500 });
  }
}

// WebSocket endpoint for real-time updates
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const deviceId = url.searchParams.get('deviceId');
    const userId = url.searchParams.get('userId') || 'zach';

    if (!deviceId) {
      return NextResponse.json({
        error: 'Device ID required for WebSocket connection'
      }, { status: 400 });
    }

    // This would typically establish a WebSocket connection
    // For now, return connection parameters
    return NextResponse.json({
      success: true,
      websocketUrl: `/api/agents/continuity/ws`,
      deviceId: deviceId,
      userId: userId,
      connectionToken: `${deviceId}-${Date.now()}`
    });

  } catch (error: any) {
    console.error('WebSocket setup error:', error);
    return NextResponse.json({
      error: 'Failed to setup WebSocket connection',
      details: error.message
    }, { status: 500 });
  }
}