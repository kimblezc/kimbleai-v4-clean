'use client';

import React, { useState, useEffect } from 'react';
import { Monitor, Smartphone, Laptop, Wifi, WifiOff, Settings,
         ArrowRightLeft, Bell, CheckCircle, AlertTriangle } from 'lucide-react';
import {
  useContinuityContext,
  useDeviceStatus,
  useContinuityActions,
  useContinuityNotifications
} from '@/lib/continuity-context';
import DeviceContinuityStatus from './DeviceContinuityStatus';

/**
 * Example component showing how to integrate Cross-Device Continuity
 * This demonstrates real-world usage patterns and best practices
 */
export default function ContinuityExample() {
  const [activeTab, setActiveTab] = useState('status');
  const [showTransferDialog, setShowTransferDialog] = useState(false);

  // Get continuity context
  const { state, actions, isEnabled } = useContinuityContext();
  const { isOnline, isSyncing, deviceCount, hasConflicts } = useDeviceStatus();
  const { sync, transferTo, canTransfer, availableDevices } = useContinuityActions();
  const { notifications, removeNotification, clearNotifications } = useContinuityNotifications();

  // Simulate app state changes for demonstration
  const [currentProject, setCurrentProject] = useState('demo-project');
  const [chatMessages, setChatMessages] = useState(0);
  const [openTabs, setOpenTabs] = useState(['/', '/project/demo']);

  // Update continuity state when app state changes
  useEffect(() => {
    actions.updateState({
      activeProject: currentProject,
      chatContext: {
        conversationId: 'demo-conversation',
        messageCount: chatMessages,
        lastMessage: `Message ${chatMessages}`,
        activeTopics: ['demo', 'continuity']
      },
      uiState: {
        openTabs: openTabs,
        activePanel: activeTab,
        searchContext: 'continuity demo',
        settings: { theme: 'light', notifications: true }
      }
    });
  }, [currentProject, chatMessages, openTabs, activeTab]);

  const handleTransfer = async (deviceId: string) => {
    try {
      await transferTo(deviceId);
      setShowTransferDialog(false);
      // In a real app, you might redirect or show a success message
      alert('Session transfer initiated! Check the other device.');
    } catch (error) {
      console.error('Transfer failed:', error);
    }
  };

  const addMessage = () => {
    setChatMessages(prev => prev + 1);
  };

  const addTab = () => {
    const newTab = `/tab-${openTabs.length}`;
    setOpenTabs(prev => [...prev, newTab]);
  };

  const changeProject = () => {
    const projects = ['demo-project', 'test-project', 'sample-project'];
    const currentIndex = projects.indexOf(currentProject);
    const nextProject = projects[(currentIndex + 1) % projects.length];
    setCurrentProject(nextProject);
  };

  if (!isEnabled) {
    return (
      <div className="p-6 bg-gray-50 rounded-lg">
        <h2 className="text-xl font-bold mb-4">Cross-Device Continuity</h2>
        <p className="text-gray-600">
          Continuity is disabled. Enable it in the provider configuration.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">
            Cross-Device Continuity Demo
          </h1>
          <DeviceContinuityStatus
            showDetails={true}
            onTransferRequest={(deviceId) => {
              console.log('Transfer requested to:', deviceId);
              setShowTransferDialog(true);
            }}
          />
        </div>

        {/* Status Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="flex items-center space-x-2">
              {isOnline ? (
                <Wifi className="w-5 h-5 text-green-500" />
              ) : (
                <WifiOff className="w-5 h-5 text-red-500" />
              )}
              <span className="font-medium">
                {isOnline ? 'Online' : 'Offline'}
              </span>
            </div>
            <p className="text-sm text-gray-600 mt-1">
              {isSyncing ? 'Syncing...' : 'Ready'}
            </p>
          </div>

          <div className="bg-green-50 p-4 rounded-lg">
            <div className="flex items-center space-x-2">
              <Monitor className="w-5 h-5 text-blue-500" />
              <span className="font-medium">{deviceCount} Devices</span>
            </div>
            <p className="text-sm text-gray-600 mt-1">
              Active connections
            </p>
          </div>

          <div className="bg-yellow-50 p-4 rounded-lg">
            <div className="flex items-center space-x-2">
              {hasConflicts ? (
                <AlertTriangle className="w-5 h-5 text-yellow-500" />
              ) : (
                <CheckCircle className="w-5 h-5 text-green-500" />
              )}
              <span className="font-medium">
                {hasConflicts ? 'Conflicts' : 'Synced'}
              </span>
            </div>
            <p className="text-sm text-gray-600 mt-1">
              State consistency
            </p>
          </div>

          <div className="bg-purple-50 p-4 rounded-lg">
            <div className="flex items-center space-x-2">
              <Bell className="w-5 h-5 text-purple-500" />
              <span className="font-medium">{notifications.length} Alerts</span>
            </div>
            <p className="text-sm text-gray-600 mt-1">
              Pending notifications
            </p>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="border-b border-gray-200 mb-6">
          <nav className="-mb-px flex space-x-8">
            {['status', 'demo', 'devices', 'notifications'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        {activeTab === 'status' && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Current State</h3>
            <div className="bg-gray-50 p-4 rounded-lg">
              <pre className="text-sm overflow-auto">
                {JSON.stringify({
                  deviceId: state.deviceId.substring(0, 12) + '...',
                  activeProject: currentProject,
                  chatMessages: chatMessages,
                  openTabs: openTabs,
                  lastSync: new Date(state.lastSync).toLocaleTimeString(),
                  conflicts: state.conflicts.length
                }, null, 2)}
              </pre>
            </div>

            <div className="flex space-x-4">
              <button
                onClick={sync}
                disabled={isSyncing}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
              >
                {isSyncing ? 'Syncing...' : 'Sync Now'}
              </button>

              {canTransfer && (
                <button
                  onClick={() => setShowTransferDialog(true)}
                  className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                >
                  Transfer Session
                </button>
              )}
            </div>
          </div>
        )}

        {activeTab === 'demo' && (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold">Interactive Demo</h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-medium mb-2">Current Project</h4>
                <p className="text-lg mb-2">{currentProject}</p>
                <button
                  onClick={changeProject}
                  className="px-3 py-1 bg-blue-500 text-white rounded text-sm"
                >
                  Change Project
                </button>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-medium mb-2">Chat Messages</h4>
                <p className="text-lg mb-2">{chatMessages} messages</p>
                <button
                  onClick={addMessage}
                  className="px-3 py-1 bg-green-500 text-white rounded text-sm"
                >
                  Add Message
                </button>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-medium mb-2">Open Tabs</h4>
                <p className="text-lg mb-2">{openTabs.length} tabs</p>
                <button
                  onClick={addTab}
                  className="px-3 py-1 bg-purple-500 text-white rounded text-sm"
                >
                  Add Tab
                </button>
              </div>
            </div>

            <div className="bg-blue-50 p-4 rounded-lg">
              <h4 className="font-medium mb-2">Instructions</h4>
              <ol className="list-decimal list-inside space-y-1 text-sm">
                <li>Make changes using the buttons above</li>
                <li>Wait for auto-sync (30 seconds) or click "Sync Now"</li>
                <li>Open this app on another device</li>
                <li>See your changes synchronized automatically</li>
                <li>Try transferring your session to the other device</li>
              </ol>
            </div>
          </div>
        )}

        {activeTab === 'devices' && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Active Devices</h3>

            {state.activeDevices.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Monitor className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No other devices detected</p>
                <p className="text-sm">Open this app on another device to see it here</p>
              </div>
            ) : (
              <div className="space-y-3">
                {state.activeDevices.map((device) => (
                  <div
                    key={device.deviceId}
                    className="flex items-center justify-between p-4 border border-gray-200 rounded-lg"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                        {device.platform?.toLowerCase().includes('mobile') ? (
                          <Smartphone className="w-5 h-5" />
                        ) : device.platform?.toLowerCase().includes('mac') ? (
                          <Laptop className="w-5 h-5" />
                        ) : (
                          <Monitor className="w-5 h-5" />
                        )}
                      </div>

                      <div>
                        <p className="font-medium">{device.platform || 'Unknown Device'}</p>
                        <p className="text-sm text-gray-500">
                          {device.activeProject && `Project: ${device.activeProject}`}
                        </p>
                        <p className="text-xs text-gray-400">
                          Last active: {new Date(device.lastActive).toLocaleTimeString()}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <span className={`w-2 h-2 rounded-full ${
                        device.status === 'active' ? 'bg-green-500' :
                        device.status === 'idle' ? 'bg-yellow-500' : 'bg-gray-400'
                      }`} />

                      {device.status === 'active' && (
                        <button
                          onClick={() => handleTransfer(device.deviceId)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                          title="Transfer session to this device"
                        >
                          <ArrowRightLeft className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'notifications' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Notifications</h3>
              {notifications.length > 0 && (
                <button
                  onClick={clearNotifications}
                  className="text-sm text-gray-500 hover:text-gray-700"
                >
                  Clear All
                </button>
              )}
            </div>

            {notifications.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Bell className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No notifications</p>
              </div>
            ) : (
              <div className="space-y-3">
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`p-4 rounded-lg border-l-4 ${
                      notification.type === 'transfer' ? 'border-blue-500 bg-blue-50' :
                      notification.type === 'conflict' ? 'border-yellow-500 bg-yellow-50' :
                      notification.type === 'sync_error' ? 'border-red-500 bg-red-50' :
                      'border-gray-500 bg-gray-50'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="font-medium">{notification.title}</h4>
                        <p className="text-sm text-gray-600 mt-1">
                          {notification.message}
                        </p>
                        <p className="text-xs text-gray-400 mt-2">
                          {new Date(notification.timestamp).toLocaleString()}
                        </p>
                      </div>

                      <div className="flex items-center space-x-2 ml-4">
                        {notification.action && (
                          <button
                            onClick={notification.action.handler}
                            className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                          >
                            {notification.action.label}
                          </button>
                        )}

                        <button
                          onClick={() => removeNotification(notification.id)}
                          className="p-1 text-gray-400 hover:text-gray-600"
                        >
                          ×
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Transfer Dialog */}
      {showTransferDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Transfer Session</h3>

            <p className="text-gray-600 mb-4">
              Choose a device to transfer your current session to:
            </p>

            <div className="space-y-2 mb-6">
              {availableDevices.map((device) => (
                <button
                  key={device.deviceId}
                  onClick={() => handleTransfer(device.deviceId)}
                  className="w-full p-3 text-left border border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50"
                >
                  <div className="flex items-center space-x-3">
                    {device.platform?.toLowerCase().includes('mobile') ? (
                      <Smartphone className="w-5 h-5" />
                    ) : (
                      <Monitor className="w-5 h-5" />
                    )}
                    <div>
                      <p className="font-medium">{device.platform || 'Unknown Device'}</p>
                      <p className="text-sm text-gray-500">Active now</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>

            <div className="flex space-x-3">
              <button
                onClick={() => setShowTransferDialog(false)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}