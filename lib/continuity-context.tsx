'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useContinuity, ContinuityHookState, ContinuityHookActions } from '@/lib/hooks/useContinuity';
import { ConflictInfo } from '@/lib/device-continuity';

interface ContinuityContextType {
  state: ContinuityHookState;
  actions: ContinuityHookActions;
  isEnabled: boolean;
  notifications: ContinuityNotification[];
  addNotification: (notification: Omit<ContinuityNotification, 'id' | 'timestamp'>) => void;
  removeNotification: (id: string) => void;
  clearNotifications: () => void;
}

interface ContinuityNotification {
  id: string;
  type: 'transfer' | 'conflict' | 'sync_error' | 'device_activity' | 'info';
  title: string;
  message: string;
  action?: {
    label: string;
    handler: () => void;
  };
  timestamp: number;
  autoClose?: number; // milliseconds
}

interface ContinuityProviderProps {
  children: ReactNode;
  userId?: string;
  enabled?: boolean;
  autoSync?: boolean;
  syncInterval?: number;
}

const ContinuityContext = createContext<ContinuityContextType | null>(null);

export function ContinuityProvider({
  children,
  userId = 'zach',
  enabled = true,
  autoSync = true,
  syncInterval = 30000
}: ContinuityProviderProps) {
  const [notifications, setNotifications] = useState<ContinuityNotification[]>([]);

  const [state, actions] = useContinuity({
    userId,
    autoSync: enabled && autoSync,
    syncInterval,
    enableRealtime: enabled,
    onTransferReceived: handleTransferReceived,
    onConflictDetected: handleConflictDetected,
    onDeviceActivity: handleDeviceActivity
  });

  // Handle transfer notifications
  function handleTransferReceived(transferData: any) {
    addNotification({
      type: 'transfer',
      title: 'Session Transfer Available',
      message: `A session was transferred from ${getDeviceName(transferData.fromDevice)}`,
      action: {
        label: 'Apply Transfer',
        handler: () => applyTransfer(transferData)
      },
      autoClose: 30000 // 30 seconds
    });
  }

  // Handle conflict notifications
  function handleConflictDetected(conflicts: ConflictInfo[]) {
    addNotification({
      type: 'conflict',
      title: 'Sync Conflicts Detected',
      message: `${conflicts.length} conflict(s) need resolution`,
      action: {
        label: 'Resolve',
        handler: () => showConflictDialog(conflicts)
      }
    });
  }

  // Handle device activity notifications
  function handleDeviceActivity(deviceInfo: any) {
    if (deviceInfo.type === 'state_updated') {
      addNotification({
        type: 'device_activity',
        title: 'Device Activity',
        message: `${getDeviceName(deviceInfo.deviceId)} just synced`,
        autoClose: 5000 // 5 seconds
      });
    }
  }

  // Notification management
  const addNotification = (notification: Omit<ContinuityNotification, 'id' | 'timestamp'>) => {
    const newNotification: ContinuityNotification = {
      ...notification,
      id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now()
    };

    setNotifications(prev => [newNotification, ...prev]);

    // Auto-remove if specified
    if (newNotification.autoClose) {
      setTimeout(() => {
        removeNotification(newNotification.id);
      }, newNotification.autoClose);
    }
  };

  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const clearNotifications = () => {
    setNotifications([]);
  };

  // Helper functions
  function getDeviceName(deviceId: string): string {
    const device = state.activeDevices.find(d => d.deviceId === deviceId);
    return device ? `${device.platform} Device` : 'Unknown Device';
  }

  function applyTransfer(transferData: any) {
    // This would integrate with your app's state management
    // to apply the transferred session data
    console.log('Applying transfer:', transferData);

    // Example: Update current project
    if (transferData.activeProject) {
      window.location.href = `/project/${transferData.activeProject}`;
    }

    // Example: Restore chat context
    if (transferData.chatContext) {
      // Update chat state
    }

    addNotification({
      type: 'info',
      title: 'Transfer Applied',
      message: 'Session has been restored from the other device',
      autoClose: 3000
    });
  }

  function showConflictDialog(conflicts: ConflictInfo[]) {
    // This would open a modal or dialog for conflict resolution
    // For now, auto-resolve with merge strategy
    actions.resolveConflicts('merge').then(() => {
      addNotification({
        type: 'info',
        title: 'Conflicts Resolved',
        message: 'Conflicts were automatically merged',
        autoClose: 3000
      });
    });
  }

  // Sync error handling
  useEffect(() => {
    if (state.error) {
      addNotification({
        type: 'sync_error',
        title: 'Sync Error',
        message: state.error,
        action: {
          label: 'Retry',
          handler: () => {
            actions.clearError();
            actions.syncNow();
          }
        }
      });
    }
  }, [state.error]);

  // Clean up old notifications
  useEffect(() => {
    const cleanup = setInterval(() => {
      const oneHourAgo = Date.now() - 60 * 60 * 1000;
      setNotifications(prev => prev.filter(n => n.timestamp > oneHourAgo));
    }, 5 * 60 * 1000); // Every 5 minutes

    return () => clearInterval(cleanup);
  }, []);

  const contextValue: ContinuityContextType = {
    state,
    actions,
    isEnabled: enabled,
    notifications,
    addNotification,
    removeNotification,
    clearNotifications
  };

  return (
    <ContinuityContext.Provider value={contextValue}>
      {children}
    </ContinuityContext.Provider>
  );
}

export function useContinuityContext(): ContinuityContextType {
  const context = useContext(ContinuityContext);
  if (!context) {
    throw new Error('useContinuityContext must be used within a ContinuityProvider');
  }
  return context;
}

// Hook for notifications only
export function useContinuityNotifications() {
  const { notifications, addNotification, removeNotification, clearNotifications } = useContinuityContext();
  return { notifications, addNotification, removeNotification, clearNotifications };
}

// Hook for device status only
export function useDeviceStatus() {
  const { state } = useContinuityContext();
  return {
    isOnline: state.isOnline,
    isSyncing: state.isSyncing,
    lastSync: state.lastSync,
    deviceCount: state.activeDevices.length,
    hasConflicts: state.conflicts.length > 0,
    hasTransferAvailable: state.hasTransferAvailable
  };
}

// Hook for quick actions
export function useContinuityActions() {
  const { actions, state } = useContinuityContext();

  return {
    sync: actions.syncNow,
    transferTo: actions.transferTo,
    resolveConflicts: actions.resolveConflicts,
    canTransfer: state.hasTransferAvailable && !state.isSyncing,
    availableDevices: state.activeDevices.filter(d => d.status === 'active')
  };
}