'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { DeviceContinuityManager, DeviceState, ConflictInfo } from '@/lib/device-continuity';
import { AdvancedDeviceFingerprinter } from '@/lib/device-fingerprint';
import { ContinuityCache } from '@/lib/device-continuity';

export interface ContinuityHookState {
  isOnline: boolean;
  isSyncing: boolean;
  lastSync: number;
  error: string | null;
  conflicts: ConflictInfo[];
  deviceId: string;
  activeDevices: any[];
  hasTransferAvailable: boolean;
}

export interface ContinuityHookActions {
  syncNow: () => Promise<void>;
  transferTo: (deviceId: string) => Promise<void>;
  resolveConflicts: (resolution: 'merge' | 'overwrite' | 'keep_local') => Promise<void>;
  updateState: (partialState: Partial<DeviceState>) => void;
  clearError: () => void;
}

export interface UseContinuityOptions {
  userId?: string;
  autoSync?: boolean;
  syncInterval?: number;
  enableRealtime?: boolean;
  onTransferReceived?: (transferData: any) => void;
  onConflictDetected?: (conflicts: ConflictInfo[]) => void;
  onDeviceActivity?: (deviceInfo: any) => void;
}

export function useContinuity(options: UseContinuityOptions = {}): [ContinuityHookState, ContinuityHookActions] {
  const {
    userId = 'zach',
    autoSync = true,
    syncInterval = 30000, // 30 seconds
    enableRealtime = true,
    onTransferReceived,
    onConflictDetected,
    onDeviceActivity
  } = options;

  // State
  const [state, setState] = useState<ContinuityHookState>({
    isOnline: navigator.onLine,
    isSyncing: false,
    lastSync: 0,
    error: null,
    conflicts: [],
    deviceId: '',
    activeDevices: [],
    hasTransferAvailable: false
  });

  // Refs
  const syncIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const managerRef = useRef<DeviceContinuityManager | null>(null);
  const lastSyncStateRef = useRef<Partial<DeviceState>>({});
  const connectionIdRef = useRef<string | null>(null);

  // Initialize device ID and manager
  useEffect(() => {
    const initializeDevice = async () => {
      try {
        const fingerprint = await AdvancedDeviceFingerprinter.generateFingerprint();
        const manager = new DeviceContinuityManager(userId);

        setState(prev => ({ ...prev, deviceId: fingerprint.deviceId }));
        managerRef.current = manager;

        // Get initial state
        await loadInitialState(manager, fingerprint.deviceId);

        // Setup real-time polling if enabled
        if (enableRealtime) {
          await setupRealtimeConnection(fingerprint.deviceId);
        }

      } catch (error: any) {
        console.error('Failed to initialize device continuity:', error);
        setState(prev => ({ ...prev, error: error.message }));
      }
    };

    initializeDevice();

    // Cleanup on unmount
    return () => {
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
      }
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, [userId, enableRealtime]);

  // Auto-sync setup
  useEffect(() => {
    if (!autoSync || !state.deviceId || !managerRef.current) return;

    syncIntervalRef.current = setInterval(() => {
      if (!state.isSyncing && navigator.onLine) {
        syncNow();
      }
    }, syncInterval);

    return () => {
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
      }
    };
  }, [autoSync, syncInterval, state.deviceId, state.isSyncing]);

  // Online/offline detection
  useEffect(() => {
    const handleOnline = () => {
      setState(prev => ({ ...prev, isOnline: true, error: null }));
      if (autoSync && state.deviceId) {
        syncNow();
      }
    };

    const handleOffline = () => {
      setState(prev => ({ ...prev, isOnline: false }));
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [autoSync, state.deviceId]);

  // Load initial state
  const loadInitialState = async (manager: DeviceContinuityManager, deviceId: string) => {
    try {
      // Try local cache first
      const cachedState = ContinuityCache.get(`state_${deviceId}`);
      if (cachedState) {
        setState(prev => ({
          ...prev,
          lastSync: cachedState.timestamp,
          activeDevices: cachedState.activeDevices || []
        }));
      }

      // Load from remote
      const remoteState = await manager.getFromCloud(deviceId);
      if (remoteState) {
        setState(prev => ({ ...prev, lastSync: remoteState.timestamp }));
        lastSyncStateRef.current = remoteState;
      }

      // Load active devices
      const devices = await manager.getActiveDevices();
      setState(prev => ({
        ...prev,
        activeDevices: devices.filter(d => d.deviceId !== deviceId),
        hasTransferAvailable: devices.some(d => d.deviceId !== deviceId &&
          manager.getDeviceStatus(d) === 'active')
      }));

    } catch (error: any) {
      console.error('Failed to load initial state:', error);
      setState(prev => ({ ...prev, error: error.message }));
    }
  };

  // Setup real-time connection
  const setupRealtimeConnection = async (deviceId: string) => {
    try {
      const response = await fetch(`/api/agents/continuity/ws?deviceId=${deviceId}&userId=${userId}`, {
        method: 'GET'
      });

      const result = await response.json();

      if (result.success) {
        connectionIdRef.current = result.connectionId;

        // Start polling for real-time updates
        pollingIntervalRef.current = setInterval(async () => {
          await pollForUpdates(deviceId);
        }, 5000); // Poll every 5 seconds

        // Send initial heartbeat
        await sendHeartbeat(deviceId);
      }

    } catch (error) {
      console.error('Failed to setup real-time connection:', error);
    }
  };

  // Poll for real-time updates
  const pollForUpdates = async (deviceId: string) => {
    if (!connectionIdRef.current) return;

    try {
      const response = await fetch(
        `/api/agents/continuity/ws/poll?connectionId=${connectionIdRef.current}&deviceId=${deviceId}&userId=${userId}&lastCheck=${state.lastSync}`,
        { method: 'GET' }
      );

      const result = await response.json();

      if (result.success && result.events.length > 0) {
        await handleRealtimeEvents(result.events);
      }

    } catch (error) {
      console.error('Polling error:', error);
    }
  };

  // Handle real-time events
  const handleRealtimeEvents = async (events: any[]) => {
    for (const event of events) {
      switch (event.type) {
        case 'state_updated':
          if (onDeviceActivity) {
            onDeviceActivity({
              deviceId: event.sourceDevice,
              type: 'state_updated',
              timestamp: event.timestamp
            });
          }
          // Refresh active devices
          if (managerRef.current) {
            const devices = await managerRef.current.getActiveDevices();
            setState(prev => ({
              ...prev,
              activeDevices: devices.filter(d => d.deviceId !== state.deviceId)
            }));
          }
          break;

        case 'session_transferred':
          if (onTransferReceived) {
            onTransferReceived(event.data);
          }
          break;

        case 'conflict_detected':
          if (onConflictDetected) {
            onConflictDetected(event.data.conflicts);
          }
          setState(prev => ({
            ...prev,
            conflicts: event.data.conflicts
          }));
          break;
      }
    }
  };

  // Send heartbeat
  const sendHeartbeat = async (deviceId: string) => {
    if (!connectionIdRef.current) return;

    try {
      await fetch('/api/agents/continuity/ws/poll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'heartbeat',
          connectionId: connectionIdRef.current,
          deviceId: deviceId,
          userId: userId
        })
      });
    } catch (error) {
      console.error('Heartbeat error:', error);
    }
  };

  // Get current application state
  const getCurrentState = useCallback((): Partial<DeviceState> => {
    const fingerprint = AdvancedDeviceFingerprinter.generateFingerprint();

    return {
      deviceId: state.deviceId,
      userId: userId,
      timestamp: Date.now(),
      activeProject: getCurrentProject(),
      chatContext: getChatContext(),
      uiState: getUIState(),
      fileUploads: getFileUploads(),
      deviceInfo: {
        platform: navigator.platform,
        userAgent: navigator.userAgent,
        screenResolution: `${screen.width}x${screen.height}`,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
      }
    };
  }, [state.deviceId, userId]);

  // Helper functions to extract app state
  const getCurrentProject = () => {
    const path = window.location.pathname;
    const projectMatch = path.match(/\/project\/([^\/]+)/);
    return projectMatch ? projectMatch[1] : undefined;
  };

  const getChatContext = () => {
    // This should integrate with your actual chat system
    return {
      conversationId: 'current-conversation',
      messageCount: 0,
      lastMessage: '',
      activeTopics: []
    };
  };

  const getUIState = () => {
    return {
      openTabs: [window.location.pathname],
      activePanel: 'main',
      searchContext: '',
      settings: {}
    };
  };

  const getFileUploads = () => {
    // This should integrate with your actual file upload system
    return {
      inProgress: [],
      completed: []
    };
  };

  // Actions
  const syncNow = useCallback(async () => {
    if (!managerRef.current || state.isSyncing) return;

    setState(prev => ({ ...prev, isSyncing: true, error: null }));

    try {
      const currentState = getCurrentState();

      // Check if state has actually changed
      const stateChanged = JSON.stringify(currentState) !== JSON.stringify(lastSyncStateRef.current);

      if (stateChanged) {
        const result = await managerRef.current.syncToCloud(state.deviceId, currentState as DeviceState);

        if (result.success) {
          setState(prev => ({
            ...prev,
            lastSync: Date.now(),
            conflicts: result.conflicts,
            error: null
          }));

          lastSyncStateRef.current = currentState;

          // Cache successful sync
          ContinuityCache.set(`state_${state.deviceId}`, {
            ...currentState,
            timestamp: Date.now()
          });

          // Notify of conflicts if any
          if (result.conflicts.length > 0 && onConflictDetected) {
            onConflictDetected(result.conflicts);
          }

        } else {
          throw new Error(result.error || 'Sync failed');
        }
      } else {
        // Just update timestamp for "heartbeat"
        setState(prev => ({ ...prev, lastSync: Date.now() }));
      }

      // Refresh active devices
      const devices = await managerRef.current.getActiveDevices();
      setState(prev => ({
        ...prev,
        activeDevices: devices.filter(d => d.deviceId !== state.deviceId),
        hasTransferAvailable: devices.some(d => d.deviceId !== state.deviceId &&
          managerRef.current!.getDeviceStatus(d) === 'active')
      }));

    } catch (error: any) {
      console.error('Sync error:', error);
      setState(prev => ({
        ...prev,
        error: error.message,
        isOnline: false
      }));
    } finally {
      setState(prev => ({ ...prev, isSyncing: false }));
    }
  }, [state.deviceId, state.isSyncing, getCurrentState]);

  const transferTo = useCallback(async (targetDeviceId: string) => {
    if (!managerRef.current) return;

    try {
      setState(prev => ({ ...prev, isSyncing: true, error: null }));

      const response = await fetch('/api/agents/continuity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'transfer_session',
          userId: userId,
          syncData: {
            fromDevice: state.deviceId,
            toDevice: targetDeviceId
          }
        })
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Transfer failed');
      }

    } catch (error: any) {
      console.error('Transfer error:', error);
      setState(prev => ({ ...prev, error: error.message }));
    } finally {
      setState(prev => ({ ...prev, isSyncing: false }));
    }
  }, [state.deviceId, userId]);

  const resolveConflicts = useCallback(async (resolution: 'merge' | 'overwrite' | 'keep_local') => {
    if (!managerRef.current || state.conflicts.length === 0) return;

    try {
      setState(prev => ({ ...prev, isSyncing: true, error: null }));

      const result = await managerRef.current.resolveConflicts(
        state.deviceId,
        { conflicts: state.conflicts, remoteState: lastSyncStateRef.current },
        resolution
      );

      setState(prev => ({
        ...prev,
        conflicts: [],
        lastSync: Date.now()
      }));

      lastSyncStateRef.current = result.state;

    } catch (error: any) {
      console.error('Conflict resolution error:', error);
      setState(prev => ({ ...prev, error: error.message }));
    } finally {
      setState(prev => ({ ...prev, isSyncing: false }));
    }
  }, [state.deviceId, state.conflicts]);

  const updateState = useCallback((partialState: Partial<DeviceState>) => {
    lastSyncStateRef.current = { ...lastSyncStateRef.current, ...partialState };

    // Trigger sync if auto-sync is enabled
    if (autoSync && !state.isSyncing) {
      setTimeout(syncNow, 1000); // Debounce by 1 second
    }
  }, [autoSync, state.isSyncing, syncNow]);

  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  return [
    state,
    {
      syncNow,
      transferTo,
      resolveConflicts,
      updateState,
      clearError
    }
  ];
}

// Additional hook for device detection
export function useDeviceDetection() {
  const [deviceInfo, setDeviceInfo] = useState<any>(null);
  const [capabilities, setCapabilities] = useState<any>(null);

  useEffect(() => {
    const detectDevice = async () => {
      const fingerprint = await AdvancedDeviceFingerprinter.generateFingerprint();
      const caps = await AdvancedDeviceFingerprinter.getCapabilities();

      setDeviceInfo(fingerprint);
      setCapabilities(caps);
    };

    detectDevice();
  }, []);

  return { deviceInfo, capabilities };
}