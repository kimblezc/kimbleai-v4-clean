/**
 * Settings Page
 *
 * D&D-themed settings and configuration (Spellbook)
 */

'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { redirect } from 'next/navigation';
import Sidebar from '@/components/layout/Sidebar';
import {
  Cog6ToothIcon,
  CurrencyDollarIcon,
  SparklesIcon,
  KeyIcon,
  UserIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

export default function SettingsPage() {
  const { data: session, status } = useSession();
  const [monthlyBudget, setMonthlyBudget] = useState('20.00');
  const [defaultModel, setDefaultModel] = useState('auto');
  const [autoRouting, setAutoRouting] = useState(true);
  const [saving, setSaving] = useState(false);

  // Redirect if not authenticated
  if (status === 'unauthenticated') {
    redirect('/api/auth/signin');
  }

  useEffect(() => {
    if (session) {
      // Load user settings
      // TODO: Fetch from API
    }
  }, [session]);

  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      // TODO: Save settings to API
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulated
      toast.success('Settings saved successfully');
    } catch (error) {
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  if (status === 'loading') {
    return (
      <div className="flex h-screen">
        <Sidebar />
        <div className="flex-1 flex items-center justify-center lg:ml-72">
          <div className="text-center">
            <div className="inline-block animate-spin-slow">
              <Cog6ToothIcon className="w-12 h-12 text-purple-500" />
            </div>
            <p className="mt-4 text-gray-400">Loading spellbook...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />

      <div className="flex-1 flex flex-col lg:ml-72">
        {/* Header */}
        <header className="px-6 py-6 bg-gray-800/50 backdrop-blur-sm border-b border-gray-700">
          <div>
            <h1 className="text-3xl font-bold text-gradient">Spellbook</h1>
            <p className="text-gray-400 mt-1">Configure your magical abilities</p>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-6 scrollbar-thin">
          <div className="max-w-4xl mx-auto space-y-6">
            {/* Account Section */}
            <div className="card-dnd p-6">
              <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                <UserIcon className="w-6 h-6 text-purple-400" />
                Account Information
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    Email
                  </label>
                  <div className="px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-lg text-white">
                    {session?.user?.email}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    Name
                  </label>
                  <div className="px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-lg text-white">
                    {session?.user?.name || 'Adventurer'}
                  </div>
                </div>
              </div>
            </div>

            {/* Budget Settings */}
            <div className="card-dnd p-6">
              <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                <CurrencyDollarIcon className="w-6 h-6 text-gold-400" />
                Budget Management
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    Monthly Budget (USD)
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                      $
                    </span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={monthlyBudget}
                      onChange={(e) => setMonthlyBudget(e.target.value)}
                      className="w-full pl-8 pr-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                  <p className="mt-2 text-xs text-gray-500">
                    Set your monthly spending limit. Requests will be blocked when exceeded.
                  </p>
                </div>

                <div className="flex items-center justify-between p-4 bg-gray-800/50 rounded-lg">
                  <div>
                    <div className="font-medium text-white">Budget Alerts</div>
                    <div className="text-xs text-gray-400 mt-1">
                      Get notified at 80% budget usage
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked
                      readOnly
                      className="w-5 h-5 rounded bg-gray-700 border-gray-600 text-purple-500 focus:ring-purple-500"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* AI Model Settings */}
            <div className="card-dnd p-6">
              <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                <SparklesIcon className="w-6 h-6 text-purple-400" />
                AI Model Preferences
              </h2>

              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-gray-800/50 rounded-lg">
                  <div>
                    <div className="font-medium text-white">Smart Routing</div>
                    <div className="text-xs text-gray-400 mt-1">
                      Automatically select the best model for each task
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={autoRouting}
                      onChange={(e) => setAutoRouting(e.target.checked)}
                      className="w-5 h-5 rounded bg-gray-700 border-gray-600 text-purple-500 focus:ring-purple-500"
                    />
                  </div>
                </div>

                {!autoRouting && (
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">
                      Default Model
                    </label>
                    <select
                      value={defaultModel}
                      onChange={(e) => setDefaultModel(e.target.value)}
                      className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                    >
                      <option value="gpt-5">GPT-5 (Highest accuracy)</option>
                      <option value="gpt-4.5">GPT-4.5 (Best balance)</option>
                      <option value="claude-sonnet-4.5">Claude Sonnet 4.5 (Code analysis)</option>
                      <option value="gemini-2.5-flash">Gemini 2.5 Flash (Fastest, cheapest)</option>
                    </select>
                  </div>
                )}
              </div>
            </div>

            {/* API Keys */}
            <div className="card-dnd p-6">
              <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                <KeyIcon className="w-6 h-6 text-gold-400" />
                API Keys
              </h2>

              <div className="space-y-3">
                {[
                  { name: 'OpenAI', status: 'active', required: true },
                  { name: 'Anthropic', status: 'active', required: false },
                  { name: 'Google AI', status: 'inactive', required: false },
                  { name: 'Deepgram', status: 'active', required: false },
                ].map((api) => (
                  <div
                    key={api.name}
                    className="flex items-center justify-between p-4 bg-gray-800/50 rounded-lg"
                  >
                    <div>
                      <div className="font-medium text-white">{api.name}</div>
                      <div className="text-xs text-gray-400 mt-1">
                        {api.required ? 'Required' : 'Optional'}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-medium ${
                          api.status === 'active'
                            ? 'bg-green-500/20 text-green-400'
                            : 'bg-gray-700 text-gray-400'
                        }`}
                      >
                        {api.status === 'active' ? 'Connected' : 'Not configured'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              <p className="mt-4 text-xs text-gray-500">
                API keys are configured via environment variables for security.
              </p>
            </div>

            {/* Save Button */}
            <div className="flex justify-end">
              <button
                onClick={handleSaveSettings}
                disabled={saving}
                className="px-6 py-3 bg-gradient-arcane text-white rounded-lg font-medium hover:shadow-arcane-lg transition-all disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
