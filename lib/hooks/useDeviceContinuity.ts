// lib/hooks/useDeviceContinuity.ts
// Client-side hook for device continuity

'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { generateDeviceId, detectDeviceType } from '@/lib/device-continuity';

interface DeviceContext {
  currentFile?: string;
  cursorPosition?: { line: number; column: number };
  openFiles?: string[];
  searchQuery?: string;
  projectId?: string;
  scrollPosition?: number;
  [key: string]: any;
}

interface UseDeviceContinuityOptions {
  userId: string;
  enabled?: boolean;
  heartbeatInterval?: number; // ms, default 10000 (10s)
  snapshotInterval?: number; // ms, default 30000 (30s)
  onContextRestored?: (context: any) => void;
  onOtherDeviceActive?: (device: any) => void;
}

export function useDeviceContinuity(options: UseDeviceContinuityOptions) {
  const {
    userId,
    enabled = true,
    heartbeatInterval = 10000,
    snapshotInterval = 30000,
    onContextRestored,
    onOtherDeviceActive
  } = options;

  const [deviceId] = useState(() => generateDeviceId());
  const [deviceType] = useState(() => detectDeviceType());
  const [isActive, setIsActive] = useState(true);
  const [activeDevices, setActiveDevices] = useState<any[]>([]);
  const [availableContext, setAvailableContext] = useState<any>(null);

  const currentContext = useRef<DeviceContext>({});
  const heartbeatTimer = useRef<NodeJS.Timeout>();
  const snapshotTimer = useRef<NodeJS.Timeout>();
  const syncCheckTimer = useRef<NodeJS.Timeout>();

  // Send heartbeat
  const sendHeartbeat = useCallback(async () => {
    if (!enabled || !userId) return;

    try {
      await fetch('/api/sync/heartbeat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          deviceId,
          currentContext: currentContext.current,
          deviceInfo: {
            deviceType,
            deviceName: typeof window !== 'undefined'
              ? `${navigator.platform} - ${navigator.userAgent.split(' ').pop()}`
              : 'Unknown',
            browserInfo: typeof window !== 'undefined' ? {
              userAgent: navigator.userAgent,
              platform: navigator.platform,
              language: navigator.language
            } : undefined
          }
        })
      });
    } catch (error) {
      console.error('[DEVICE-CONTINUITY] Heartbeat failed:', error);
    }
  }, [enabled, userId, deviceId, deviceType]);

  // Save context snapshot
  const saveSnapshot = useCallback(async () => {
    if (!enabled || !userId || Object.keys(currentContext.current).length === 0) return;

    try {
      await fetch('/api/sync/context', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          deviceId,
          snapshot: {
            snapshotType: 'full_state',
            contextData: currentContext.current,
            metadata: {
              deviceType,
              timestamp: new Date().toISOString()
            }
          }
        })
      });
    } catch (error) {
      console.error('[DEVICE-CONTINUITY] Snapshot failed:', error);
    }
  }, [enabled, userId, deviceId, deviceType]);

  // Check for available context from other devices
  const checkAvailableContext = useCallback(async () => {
    if (!enabled || !userId) return;

    try {
      const response = await fetch(
        `/api/sync/context?userId=${userId}&excludeDeviceId=${deviceId}`
      );
      const data = await response.json();

      if (data.success && data.context) {
        setAvailableContext(data.context);
        onContextRestored?.(data.context);
      }
    } catch (error) {
      console.error('[DEVICE-CONTINUITY] Context check failed:', error);
    }
  }, [enabled, userId, deviceId, onContextRestored]);

  // Get active devices
  const checkActiveDevices = useCallback(async () => {
    if (!enabled || !userId) return;

    try {
      const response = await fetch(`/api/sync/devices?userId=${userId}`);
      const data = await response.json();

      if (data.success) {
        setActiveDevices(data.devices);

        // Check if there's another device active in last 30 seconds
        const recentlyActive = data.devices.find((d: any) =>
          d.device_id !== deviceId && d.seconds_since_heartbeat < 30
        );

        if (recentlyActive) {
          onOtherDeviceActive?.(recentlyActive);
        }
      }
    } catch (error) {
      console.error('[DEVICE-CONTINUITY] Devices check failed:', error);
    }
  }, [enabled, userId, deviceId, onOtherDeviceActive]);

  // Update current context
  const updateContext = useCallback((updates: Partial<DeviceContext>) => {
    currentContext.current = {
      ...currentContext.current,
      ...updates
    };
  }, []);

  // Restore context
  const restoreContext = useCallback(async () => {
    if (!availableContext) return null;

    try {
      const contextData = availableContext.context_data;
      currentContext.current = contextData;
      return contextData;
    } catch (error) {
      console.error('[DEVICE-CONTINUITY] Restore failed:', error);
      return null;
    }
  }, [availableContext]);

  // Initialize and start timers
  useEffect(() => {
    if (!enabled || !userId) return;

    // Initial checks
    sendHeartbeat();
    checkAvailableContext();
    checkActiveDevices();

    // Start heartbeat
    heartbeatTimer.current = setInterval(sendHeartbeat, heartbeatInterval);

    // Start snapshot
    snapshotTimer.current = setInterval(saveSnapshot, snapshotInterval);

    // Start sync check
    syncCheckTimer.current = setInterval(checkActiveDevices, 15000); // Every 15s

    // Cleanup
    return () => {
      if (heartbeatTimer.current) clearInterval(heartbeatTimer.current);
      if (snapshotTimer.current) clearInterval(snapshotTimer.current);
      if (syncCheckTimer.current) clearInterval(syncCheckTimer.current);
    };
  }, [enabled, userId, sendHeartbeat, saveSnapshot, checkActiveDevices, heartbeatInterval, snapshotInterval]);

  // Handle visibility change
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleVisibilityChange = () => {
      const isVisible = !document.hidden;
      setIsActive(isVisible);

      if (isVisible) {
        // Page became visible, send immediate heartbeat and check for updates
        sendHeartbeat();
        checkAvailableContext();
        checkActiveDevices();
      } else {
        // Page hidden, save current state
        saveSnapshot();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [sendHeartbeat, saveSnapshot, checkAvailableContext, checkActiveDevices]);

  // Handle beforeunload (save state before leaving)
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleBeforeUnload = () => {
      saveSnapshot();
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [saveSnapshot]);

  return {
    deviceId,
    deviceType,
    isActive,
    activeDevices,
    availableContext,
    updateContext,
    restoreContext,
    saveSnapshot,
    sendHeartbeat
  };
}
