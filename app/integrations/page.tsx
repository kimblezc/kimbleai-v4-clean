'use client';

import React, { useState } from 'react';
import { DashboardLayout } from '../../components/layout/DashboardLayout';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/Button';
import { signIn, signOut, useSession } from 'next-auth/react';
import { GmailInbox } from '../../components/GmailInbox';
import { GoogleDriveBrowser } from '../../components/GoogleDriveBrowser';
import { CalendarView } from '../../components/CalendarView';

type TabType = 'overview' | 'gmail' | 'drive' | 'calendar' | 'settings';

export default function IntegrationsPage() {
  const { data: session } = useSession();
  const [activeTab, setActiveTab] = useState<TabType>('overview');

  const tabs = [
    { id: 'overview' as TabType, label: 'Overview', icon: '🏠' },
    { id: 'gmail' as TabType, label: 'Gmail', icon: '📧' },
    { id: 'drive' as TabType, label: 'Drive', icon: '📁' },
    { id: 'calendar' as TabType, label: 'Calendar', icon: '📅' },
    { id: 'settings' as TabType, label: 'Settings', icon: '⚙️' }
  ];

  return (
    <DashboardLayout>
      <div className="flex flex-col h-screen">
        <div className="p-6 pb-0">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Google Workspace Integration</h1>
            <p className="text-gray-400">Access your Gmail, Drive, and Calendar from one place</p>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 mt-6 border-b border-gray-700">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-3 font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'text-blue-400 border-b-2 border-blue-400'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        <div className="flex-1 p-6 overflow-auto">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Google Workspace Card */}
                <Card>
                  <div className="text-center space-y-4">
                    <div className="w-16 h-16 mx-auto bg-gradient-to-br from-blue-500 to-red-500 rounded-full flex items-center justify-center">
                      <span className="text-3xl">G</span>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-white mb-1">Google Workspace</h3>
                      <p className="text-sm text-gray-400">Drive, Gmail, Calendar</p>
                    </div>
                    {session ? (
                      <>
                        <div className="flex items-center justify-center gap-2 text-sm">
                          <span className="w-2 h-2 bg-green-500 rounded-full" />
                          <span className="text-green-500">Connected</span>
                        </div>
                        <Button
                          variant="secondary"
                          fullWidth
                          onClick={() => signOut()}
                        >
                          Disconnect
                        </Button>
                      </>
                    ) : (
                      <>
                        <div className="flex items-center justify-center gap-2 text-sm">
                          <span className="w-2 h-2 bg-gray-500 rounded-full" />
                          <span className="text-gray-500">Not Connected</span>
                        </div>
                        <Button
                          fullWidth
                          onClick={() => signIn('google')}
                        >
                          Connect
                        </Button>
                      </>
                    )}
                  </div>
                </Card>

                {/* Gmail Card */}
                <Card>
                  <div className="text-center space-y-4">
                    <div className="w-16 h-16 mx-auto bg-gradient-to-br from-red-500 to-pink-500 rounded-full flex items-center justify-center">
                      <span className="text-3xl">📧</span>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-white mb-1">Gmail</h3>
                      <p className="text-sm text-gray-400">Emails & Inbox</p>
                    </div>
                    <Button
                      fullWidth
                      onClick={() => setActiveTab('gmail')}
                      disabled={!session}
                    >
                      Open Inbox
                    </Button>
                  </div>
                </Card>

                {/* Drive Card */}
                <Card>
                  <div className="text-center space-y-4">
                    <div className="w-16 h-16 mx-auto bg-gradient-to-br from-blue-500 to-green-500 rounded-full flex items-center justify-center">
                      <span className="text-3xl">📁</span>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-white mb-1">Google Drive</h3>
                      <p className="text-sm text-gray-400">Files & Folders</p>
                    </div>
                    <Button
                      fullWidth
                      onClick={() => setActiveTab('drive')}
                      disabled={!session}
                    >
                      Browse Files
                    </Button>
                  </div>
                </Card>

                {/* Calendar Card */}
                <Card>
                  <div className="text-center space-y-4">
                    <div className="w-16 h-16 mx-auto bg-gradient-to-br from-purple-500 to-blue-500 rounded-full flex items-center justify-center">
                      <span className="text-3xl">📅</span>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-white mb-1">Google Calendar</h3>
                      <p className="text-sm text-gray-400">Events & Meetings</p>
                    </div>
                    <Button
                      fullWidth
                      onClick={() => setActiveTab('calendar')}
                      disabled={!session}
                    >
                      View Calendar
                    </Button>
                  </div>
                </Card>

                {/* OpenAI */}
                <Card>
                  <div className="text-center space-y-4">
                    <div className="w-16 h-16 mx-auto bg-gradient-to-br from-green-400 to-blue-500 rounded-full flex items-center justify-center">
                      <span className="text-3xl">🤖</span>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-white mb-1">OpenAI</h3>
                      <p className="text-sm text-gray-400">GPT-4, Embeddings</p>
                    </div>
                    <div className="flex items-center justify-center gap-2 text-sm">
                      <span className="w-2 h-2 bg-green-500 rounded-full" />
                      <span className="text-green-500">Connected</span>
                    </div>
                    <Button variant="secondary" fullWidth disabled>
                      Configured
                    </Button>
                  </div>
                </Card>

                {/* Supabase */}
                <Card>
                  <div className="text-center space-y-4">
                    <div className="w-16 h-16 mx-auto bg-gradient-to-br from-green-500 to-teal-500 rounded-full flex items-center justify-center">
                      <span className="text-3xl">📊</span>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-white mb-1">Supabase</h3>
                      <p className="text-sm text-gray-400">Database & Storage</p>
                    </div>
                    <div className="flex items-center justify-center gap-2 text-sm">
                      <span className="w-2 h-2 bg-green-500 rounded-full" />
                      <span className="text-green-500">Connected</span>
                    </div>
                    <Button variant="secondary" fullWidth disabled>
                      Configured
                    </Button>
                  </div>
                </Card>
              </div>

              {/* Quick Stats */}
              {session && (
                <Card>
                  <h3 className="text-lg font-semibold text-white mb-4">Integration Status</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Email</span>
                      <span className="text-white">{session.user?.email}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Status</span>
                      <span className="text-green-500">Active</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Services</span>
                      <span className="text-white">Gmail, Drive, Calendar</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Scopes</span>
                      <span className="text-white">Read, Write, Send</span>
                    </div>
                  </div>
                </Card>
              )}

              {!session && (
                <Card>
                  <div className="text-center py-8">
                    <div className="text-5xl mb-4">🔐</div>
                    <h3 className="text-xl font-semibold text-white mb-2">Connect Your Google Account</h3>
                    <p className="text-gray-400 mb-6">
                      Sign in to access your Gmail, Drive, and Calendar
                    </p>
                    <Button onClick={() => signIn('google')}>
                      Sign in with Google
                    </Button>
                  </div>
                </Card>
              )}
            </div>
          )}

          {activeTab === 'gmail' && (
            <div className="h-full">
              <GmailInbox />
            </div>
          )}

          {activeTab === 'drive' && (
            <div className="h-full">
              <GoogleDriveBrowser />
            </div>
          )}

          {activeTab === 'calendar' && (
            <div className="h-full">
              <CalendarView />
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="space-y-6">
              <Card>
                <h3 className="text-lg font-semibold text-white mb-4">Sync Settings</h3>
                <p className="text-gray-400 mb-4">
                  Configure how your Google Workspace data syncs with KimbleAI
                </p>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-gray-800/50 rounded">
                    <div>
                      <div className="text-white font-medium">Auto-sync Gmail</div>
                      <div className="text-sm text-gray-400">Automatically import new emails</div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" className="sr-only peer" />
                      <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-gray-800/50 rounded">
                    <div>
                      <div className="text-white font-medium">Auto-sync Drive</div>
                      <div className="text-sm text-gray-400">Automatically index Drive files</div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" className="sr-only peer" />
                      <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-gray-800/50 rounded">
                    <div>
                      <div className="text-white font-medium">Sync Calendar Events</div>
                      <div className="text-sm text-gray-400">Add events to knowledge base</div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" className="sr-only peer" />
                      <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>
                </div>
              </Card>

              <Card>
                <h3 className="text-lg font-semibold text-white mb-4">Privacy & Security</h3>
                <div className="space-y-3 text-sm">
                  <div className="flex items-start gap-2">
                    <span className="text-green-500 mt-1">✓</span>
                    <span className="text-gray-400">Your data is encrypted in transit and at rest</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-green-500 mt-1">✓</span>
                    <span className="text-gray-400">We only access data you explicitly authorize</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-green-500 mt-1">✓</span>
                    <span className="text-gray-400">You can revoke access at any time</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-green-500 mt-1">✓</span>
                    <span className="text-gray-400">Limited to Zach and Rebecca only</span>
                  </div>
                </div>
              </Card>

              {session && (
                <Card>
                  <h3 className="text-lg font-semibold text-white mb-4">Manage Connection</h3>
                  <p className="text-gray-400 mb-4">
                    Disconnect your Google account if you no longer want KimbleAI to access your data
                  </p>
                  <Button variant="secondary" onClick={() => signOut()}>
                    Disconnect Google Account
                  </Button>
                </Card>
              )}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
