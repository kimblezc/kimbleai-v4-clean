'use client';

/**
 * HUB SETTINGS PAGE
 *
 * Unified settings for all platform connections:
 * - Connect/disconnect platforms
 * - Configure sync schedules
 * - Manage API keys
 * - Set import preferences
 * - Data retention policies
 */

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import {
  Settings,
  Key,
  RefreshCw,
  Database,
  Shield,
  Bell,
  CheckCircle,
  XCircle,
  Loader2,
  Save,
  Trash2,
} from 'lucide-react';

interface PlatformConnection {
  id: string;
  platformType: string;
  platformName: string;
  status: string;
  syncSchedule: string;
  syncEnabled: boolean;
  lastSync?: string;
}

interface Settings {
  syncSchedule: string;
  autoSync: boolean;
  generateEmbeddings: boolean;
  detectDuplicates: boolean;
  uploadBackups: boolean;
  retentionDays: number;
  notifyOnSync: boolean;
  notifyOnError: boolean;
}

export default function HubSettingsPage() {
  const { data: session } = useSession();
  const router = useRouter();

  const [connections, setConnections] = useState<PlatformConnection[]>([]);
  const [settings, setSettings] = useState<Settings>({
    syncSchedule: '1hour',
    autoSync: true,
    generateEmbeddings: true,
    detectDuplicates: true,
    uploadBackups: true,
    retentionDays: 365,
    notifyOnSync: false,
    notifyOnError: true,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (session) {
      loadSettings();
    }
  }, [session]);

  const loadSettings = async () => {
    try {
      setLoading(true);

      const response = await fetch('/api/hub/platforms');
      const data = await response.json();

      if (data.connections) {
        setConnections(data.connections);
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      const response = await fetch('/api/hub/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });

      if (response.ok) {
        alert('Settings saved successfully');
      } else {
        alert('Failed to save settings');
      }
    } catch (error) {
      console.error('Failed to save settings:', error);
      alert('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const togglePlatform = async (connectionId: string, enabled: boolean) => {
    try {
      const response = await fetch(`/api/hub/platforms/${connectionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ syncEnabled: enabled }),
      });

      if (response.ok) {
        setConnections(
          connections.map((conn) =>
            conn.id === connectionId ? { ...conn, syncEnabled: enabled } : conn
          )
        );
      }
    } catch (error) {
      console.error('Failed to toggle platform:', error);
    }
  };

  if (!session) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-4">Please sign in</h1>
          <p className="text-gray-400">Access Hub Settings with your account</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900">
      {/* Header */}
      <div className="border-b border-gray-700/50 bg-gray-900/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <button
            onClick={() => router.push('/hub')}
            className="text-gray-400 hover:text-white mb-2 text-sm"
          >
            ← Back to Hub
          </button>
          <h1 className="text-3xl font-bold text-white mb-1">Hub Settings</h1>
          <p className="text-gray-400">Manage your platform connections and preferences</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-8">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Connected Platforms */}
            <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <Key className="w-5 h-5 text-purple-500" />
                Connected Platforms
              </h3>

              <div className="space-y-3">
                {connections.length === 0 ? (
                  <p className="text-gray-400 text-center py-8">
                    No platforms connected yet
                  </p>
                ) : (
                  connections.map((conn) => (
                    <div
                      key={conn.id}
                      className="flex items-center justify-between p-4 bg-gray-700/30 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        {conn.status === 'active' ? (
                          <CheckCircle className="w-5 h-5 text-green-500" />
                        ) : (
                          <XCircle className="w-5 h-5 text-red-500" />
                        )}
                        <div>
                          <p className="font-medium text-white">{conn.platformName}</p>
                          <p className="text-sm text-gray-400 capitalize">{conn.platformType}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="text-sm text-gray-400">Sync</p>
                          <p className="text-sm text-white">{conn.syncSchedule}</p>
                        </div>

                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={conn.syncEnabled}
                            onChange={(e) => togglePlatform(conn.id, e.target.checked)}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                        </label>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Sync Settings */}
            <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <RefreshCw className="w-5 h-5 text-blue-500" />
                Sync Settings
              </h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Default Sync Schedule
                  </label>
                  <select
                    value={settings.syncSchedule}
                    onChange={(e) => setSettings({ ...settings, syncSchedule: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="manual">Manual Only</option>
                    <option value="5min">Every 5 Minutes</option>
                    <option value="15min">Every 15 Minutes</option>
                    <option value="1hour">Every Hour</option>
                    <option value="6hours">Every 6 Hours</option>
                    <option value="24hours">Daily</option>
                  </select>
                </div>

                <label className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={settings.autoSync}
                    onChange={(e) => setSettings({ ...settings, autoSync: e.target.checked })}
                    className="mt-1 w-4 h-4 text-purple-600 border-gray-600 rounded focus:ring-purple-500"
                  />
                  <div>
                    <span className="text-sm font-medium text-white">Enable Auto-Sync</span>
                    <p className="text-xs text-gray-400">Automatically sync new data</p>
                  </div>
                </label>

                <label className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={settings.generateEmbeddings}
                    onChange={(e) =>
                      setSettings({ ...settings, generateEmbeddings: e.target.checked })
                    }
                    className="mt-1 w-4 h-4 text-purple-600 border-gray-600 rounded focus:ring-purple-500"
                  />
                  <div>
                    <span className="text-sm font-medium text-white">Generate Embeddings</span>
                    <p className="text-xs text-gray-400">Enable AI-powered semantic search</p>
                  </div>
                </label>

                <label className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={settings.detectDuplicates}
                    onChange={(e) =>
                      setSettings({ ...settings, detectDuplicates: e.target.checked })
                    }
                    className="mt-1 w-4 h-4 text-purple-600 border-gray-600 rounded focus:ring-purple-500"
                  />
                  <div>
                    <span className="text-sm font-medium text-white">Detect Duplicates</span>
                    <p className="text-xs text-gray-400">Skip duplicate content automatically</p>
                  </div>
                </label>
              </div>
            </div>

            {/* Data Settings */}
            <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <Database className="w-5 h-5 text-green-500" />
                Data Settings
              </h3>

              <div className="space-y-4">
                <label className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={settings.uploadBackups}
                    onChange={(e) =>
                      setSettings({ ...settings, uploadBackups: e.target.checked })
                    }
                    className="mt-1 w-4 h-4 text-purple-600 border-gray-600 rounded focus:ring-purple-500"
                  />
                  <div>
                    <span className="text-sm font-medium text-white">Upload Backups to Drive</span>
                    <p className="text-xs text-gray-400">Automatically backup imports to Google Drive</p>
                  </div>
                </label>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Data Retention (days): {settings.retentionDays}
                  </label>
                  <input
                    type="range"
                    min="30"
                    max="730"
                    value={settings.retentionDays}
                    onChange={(e) =>
                      setSettings({ ...settings, retentionDays: parseInt(e.target.value) })
                    }
                    className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    Keep imported data for {settings.retentionDays} days
                  </p>
                </div>
              </div>
            </div>

            {/* Notifications */}
            <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <Bell className="w-5 h-5 text-yellow-500" />
                Notifications
              </h3>

              <div className="space-y-4">
                <label className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={settings.notifyOnSync}
                    onChange={(e) =>
                      setSettings({ ...settings, notifyOnSync: e.target.checked })
                    }
                    className="mt-1 w-4 h-4 text-purple-600 border-gray-600 rounded focus:ring-purple-500"
                  />
                  <div>
                    <span className="text-sm font-medium text-white">Sync Notifications</span>
                    <p className="text-xs text-gray-400">Notify when syncs complete</p>
                  </div>
                </label>

                <label className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={settings.notifyOnError}
                    onChange={(e) =>
                      setSettings({ ...settings, notifyOnError: e.target.checked })
                    }
                    className="mt-1 w-4 h-4 text-purple-600 border-gray-600 rounded focus:ring-purple-500"
                  />
                  <div>
                    <span className="text-sm font-medium text-white">Error Notifications</span>
                    <p className="text-xs text-gray-400">Alert on sync errors</p>
                  </div>
                </label>
              </div>
            </div>

            {/* Save Button */}
            <button
              onClick={handleSaveSettings}
              disabled={saving}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {saving ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-5 h-5" />
                  Save Settings
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
