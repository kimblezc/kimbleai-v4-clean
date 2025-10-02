'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Monitor, Smartphone, Laptop, Wifi, WifiOff, Clock, ArrowRightLeft,
         CheckCircle, AlertTriangle, RefreshCw, Settings, X } from 'lucide-react';
import { DeviceFingerprinter, ContinuityCache } from '@/lib/device-continuity';

interface DeviceInfo {
  deviceId: string;
  platform: string;
  lastActive: number;
  isCurrentDevice: boolean;
  activeProject?: string;
  status: 'active' | 'idle' | 'stale';
}

interface SyncStatus {
  isOnline: boolean;
  lastSync: number;
  isPending: boolean;
  error?: string;
  conflicts: any[];
}

interface DeviceContinuityStatusProps {
  className?: string;
  showDetails?: boolean;
  onTransferRequest?: (targetDevice: string) => void;
  userId?: string;
}

export default function DeviceContinuityStatus({
  className = '',
  showDetails = false,
  onTransferRequest,
  userId = 'zach'
}: DeviceContinuityStatusProps) {
  const [devices, setDevices] = useState<DeviceInfo[]>([]);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    isOnline: true,
    lastSync: Date.now(),
    isPending: false,
    conflicts: []
  });
  const [currentDeviceId, setCurrentDeviceId] = useState<string>('');
  const [isExpanded, setIsExpanded] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showSettings, setShowSettings] = useState(false);

  // Initialize device ID
  useEffect(() => {
    const deviceId = DeviceFingerprinter.generateDeviceId();
    setCurrentDeviceId(deviceId);
  }, []);

  // Auto-sync state every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      if (currentDeviceId) {
        syncDeviceState();
        fetchActiveDevices();
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [currentDeviceId]);

  // Initial load
  useEffect(() => {
    if (currentDeviceId) {
      fetchActiveDevices();
      checkSyncStatus();
    }
  }, [currentDeviceId]);

  const syncDeviceState = useCallback(async () => {
    if (!currentDeviceId) return;

    setSyncStatus(prev => ({ ...prev, isPending: true }));

    try {
      const deviceInfo = DeviceFingerprinter.getDeviceInfo();

      // Gather current state from the application
      const currentState = {
        deviceId: currentDeviceId,
        userId: userId,
        timestamp: Date.now(),
        activeProject: getCurrentProject(),
        chatContext: getChatContext(),
        uiState: getUIState(),
        fileUploads: getFileUploads(),
        deviceInfo: deviceInfo
      };

      const response = await fetch('/api/agents/continuity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'sync_state',
          deviceId: currentDeviceId,
          userId: userId,
          state: currentState
        })
      });

      const result = await response.json();

      if (result.success) {
        setSyncStatus(prev => ({
          ...prev,
          lastSync: Date.now(),
          isPending: false,
          error: undefined,
          conflicts: result.conflicts || []
        }));

        // Cache successful sync
        ContinuityCache.set(`sync_${currentDeviceId}`, result);
      } else {
        throw new Error(result.error || 'Sync failed');
      }

    } catch (error: any) {
      console.error('Sync error:', error);
      setSyncStatus(prev => ({
        ...prev,
        isPending: false,
        error: error.message,
        isOnline: false
      }));
    }
  }, [currentDeviceId, userId]);

  const fetchActiveDevices = useCallback(async () => {
    if (!currentDeviceId) return;

    try {
      // Try cache first
      const cached = ContinuityCache.get(`devices_${userId}`);
      if (cached && Date.now() - cached.timestamp < 30000) {
        setDevices(cached.devices.map((d: DeviceInfo) => ({
          ...d,
          isCurrentDevice: d.deviceId === currentDeviceId
        })));
        setIsLoading(false);
        return;
      }

      const response = await fetch('/api/agents/continuity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'get_active_devices',
          userId: userId
        })
      });

      const result = await response.json();

      if (result.success) {
        const devicesWithCurrent = result.devices.map((device: DeviceInfo) => ({
          ...device,
          isCurrentDevice: device.deviceId === currentDeviceId
        }));

        setDevices(devicesWithCurrent);

        // Cache the result
        ContinuityCache.set(`devices_${userId}`, {
          devices: devicesWithCurrent,
          timestamp: Date.now()
        });

        setSyncStatus(prev => ({ ...prev, isOnline: true }));
      } else {
        throw new Error(result.error || 'Failed to fetch devices');
      }

    } catch (error: any) {
      console.error('Fetch devices error:', error);
      setSyncStatus(prev => ({ ...prev, isOnline: false, error: error.message }));
    } finally {
      setIsLoading(false);
    }
  }, [currentDeviceId, userId]);

  const checkSyncStatus = useCallback(async () => {
    if (!currentDeviceId) return;

    try {
      const response = await fetch('/api/agents/continuity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'get_sync_status',
          deviceId: currentDeviceId,
          userId: userId
        })
      });

      const result = await response.json();

      if (result.success) {
        setSyncStatus(prev => ({
          ...prev,
          lastSync: result.status.lastSync,
          isOnline: true
        }));
      }

    } catch (error: any) {
      console.error('Check sync status error:', error);
      setSyncStatus(prev => ({ ...prev, isOnline: false }));
    }
  }, [currentDeviceId, userId]);

  const handleTransferSession = async (targetDeviceId: string) => {
    if (!currentDeviceId || targetDeviceId === currentDeviceId) return;

    try {
      const response = await fetch('/api/agents/continuity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'transfer_session',
          userId: userId,
          syncData: {
            fromDevice: currentDeviceId,
            toDevice: targetDeviceId
          }
        })
      });

      const result = await response.json();

      if (result.success) {
        onTransferRequest?.(targetDeviceId);
        // Show success notification
        showNotification('Session transfer initiated', 'success');
      } else {
        throw new Error(result.error || 'Transfer failed');
      }

    } catch (error: any) {
      console.error('Transfer error:', error);
      showNotification(`Transfer failed: ${error.message}`, 'error');
    }
  };

  const handleManualSync = () => {
    syncDeviceState();
    fetchActiveDevices();
  };

  const handleCleanupStale = async () => {
    try {
      const response = await fetch('/api/agents/continuity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'cleanup_stale_sessions',
          userId: userId
        })
      });

      const result = await response.json();

      if (result.success) {
        showNotification(`Cleaned up ${result.cleaned} stale sessions`, 'success');
        fetchActiveDevices();
      }

    } catch (error: any) {
      console.error('Cleanup error:', error);
      showNotification(`Cleanup failed: ${error.message}`, 'error');
    }
  };

  // Helper functions to gather current application state
  const getCurrentProject = () => {
    if (typeof window === 'undefined') return undefined;
    // Extract from URL or app state
    const path = window.location.pathname;
    const projectMatch = path.match(/\/project\/([^\/]+)/);
    return projectMatch ? projectMatch[1] : undefined;
  };

  const getChatContext = () => {
    // This would integrate with your chat system
    return {
      conversationId: 'current-conversation',
      messageCount: 0,
      lastMessage: '',
      activeTopics: []
    };
  };

  const getUIState = () => {
    if (typeof window === 'undefined') return {};

    return {
      openTabs: [window.location.pathname],
      activePanel: 'main',
      searchContext: '',
      settings: {}
    };
  };

  const getFileUploads = () => {
    // This would integrate with your file upload system
    return {
      inProgress: [],
      completed: []
    };
  };

  const showNotification = (message: string, type: 'success' | 'error' | 'info') => {
    // This would integrate with your notification system
    console.log(`${type.toUpperCase()}: ${message}`);
  };

  const getDeviceIcon = (platform: string) => {
    const p = platform.toLowerCase();
    if (p.includes('mobile') || p.includes('android') || p.includes('iphone')) {
      return <Smartphone className="w-4 h-4" />;
    }
    if (p.includes('mac') || p.includes('laptop')) {
      return <Laptop className="w-4 h-4" />;
    }
    return <Monitor className="w-4 h-4" />;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-green-500';
      case 'idle': return 'text-yellow-500';
      case 'stale': return 'text-gray-400';
      default: return 'text-gray-400';
    }
  };

  const formatLastActive = (timestamp: number) => {
    const diff = Date.now() - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return 'now';
  };

  if (isLoading) {
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        <RefreshCw className="w-4 h-4 animate-spin" />
        <span className="text-sm text-gray-500">Loading devices...</span>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      {/* Compact Status Indicator */}
      <div className="flex items-center space-x-2">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center space-x-2 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          title="Device Continuity Status"
        >
          {syncStatus.isOnline ? (
            <Wifi className="w-4 h-4 text-green-500" />
          ) : (
            <WifiOff className="w-4 h-4 text-red-500" />
          )}

          <span className="text-sm font-medium">
            {devices.length} device{devices.length !== 1 ? 's' : ''}
          </span>

          {syncStatus.conflicts.length > 0 && (
            <AlertTriangle className="w-4 h-4 text-yellow-500" />
          )}

          {syncStatus.isPending && (
            <RefreshCw className="w-3 h-3 animate-spin" />
          )}
        </button>

        <button
          onClick={handleManualSync}
          className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800"
          title="Manual sync"
        >
          <RefreshCw className="w-3 h-3" />
        </button>

        <button
          onClick={() => setShowSettings(!showSettings)}
          className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800"
          title="Settings"
        >
          <Settings className="w-3 h-3" />
        </button>
      </div>

      {/* Expanded Device List */}
      {isExpanded && (
        <div className="absolute top-full left-0 mt-2 w-80 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50">
          <div className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900 dark:text-white">
                Device Continuity
              </h3>
              <button
                onClick={() => setIsExpanded(false)}
                className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Sync Status */}
            <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  {syncStatus.isOnline ? (
                    <CheckCircle className="w-4 h-4 text-green-500" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-red-500" />
                  )}
                  <span className="text-sm">
                    {syncStatus.isOnline ? 'Synced' : 'Offline'}
                  </span>
                </div>
                <div className="flex items-center space-x-1 text-xs text-gray-500">
                  <Clock className="w-3 h-3" />
                  <span>{formatLastActive(syncStatus.lastSync)}</span>
                </div>
              </div>

              {syncStatus.error && (
                <div className="mt-2 text-xs text-red-600 dark:text-red-400">
                  {syncStatus.error}
                </div>
              )}

              {syncStatus.conflicts.length > 0 && (
                <div className="mt-2 text-xs text-yellow-600 dark:text-yellow-400">
                  {syncStatus.conflicts.length} conflict(s) detected
                </div>
              )}
            </div>

            {/* Device List */}
            <div className="space-y-2">
              {devices.map((device) => (
                <div
                  key={device.deviceId}
                  className={`p-3 rounded-lg border ${
                    device.isCurrentDevice
                      ? 'border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-900/20'
                      : 'border-gray-200 dark:border-gray-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      {getDeviceIcon(device.platform)}
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="text-sm font-medium">
                            {device.platform}
                          </span>
                          {device.isCurrentDevice && (
                            <span className="text-xs bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 px-2 py-1 rounded">
                              Current
                            </span>
                          )}
                        </div>
                        <div className="flex items-center space-x-2 text-xs text-gray-500">
                          <span className={getStatusColor(device.status)}>
                            ● {device.status}
                          </span>
                          <span>•</span>
                          <span>{formatLastActive(device.lastActive)}</span>
                        </div>
                      </div>
                    </div>

                    {!device.isCurrentDevice && device.status !== 'stale' && (
                      <button
                        onClick={() => handleTransferSession(device.deviceId)}
                        className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800"
                        title="Transfer session to this device"
                      >
                        <ArrowRightLeft className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  {device.activeProject && (
                    <div className="mt-2 text-xs text-gray-600 dark:text-gray-400">
                      Project: {device.activeProject}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {devices.length === 0 && (
              <div className="text-center text-gray-500 py-4">
                No active devices found
              </div>
            )}

            {/* Actions */}
            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
              <div className="flex space-x-2">
                <button
                  onClick={handleManualSync}
                  className="flex-1 text-sm px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                  disabled={syncStatus.isPending}
                >
                  {syncStatus.isPending ? 'Syncing...' : 'Sync Now'}
                </button>
                <button
                  onClick={handleCleanupStale}
                  className="text-sm px-3 py-2 border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  Cleanup
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Settings Panel */}
      {showSettings && (
        <div className="absolute top-full right-0 mt-2 w-64 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50">
          <div className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">Continuity Settings</h3>
              <button
                onClick={() => setShowSettings(false)}
                className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="flex items-center space-x-2">
                  <input type="checkbox" defaultChecked className="rounded" />
                  <span className="text-sm">Auto-sync every 30s</span>
                </label>
              </div>

              <div>
                <label className="flex items-center space-x-2">
                  <input type="checkbox" defaultChecked className="rounded" />
                  <span className="text-sm">Sync chat context</span>
                </label>
              </div>

              <div>
                <label className="flex items-center space-x-2">
                  <input type="checkbox" defaultChecked className="rounded" />
                  <span className="text-sm">Sync file uploads</span>
                </label>
              </div>

              <div>
                <label className="flex items-center space-x-2">
                  <input type="checkbox" defaultChecked className="rounded" />
                  <span className="text-sm">Show notifications</span>
                </label>
              </div>

              <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
                <div className="text-xs text-gray-500">
                  Device ID: {currentDeviceId.slice(0, 8)}...
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}