/**
 * Analytics Page
 *
 * D&D-themed cost tracking and usage analytics (Character Sheet)
 */

'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { redirect } from 'next/navigation';
import Sidebar from '@/components/layout/Sidebar';
import BudgetStatus from '@/components/analytics/BudgetStatus';
import {
  ChartBarIcon,
  CurrencyDollarIcon,
  SparklesIcon,
  BoltIcon,
} from '@heroicons/react/24/outline';

interface AnalyticsData {
  budgetStatus: {
    currentSpend: number;
    monthlyBudget: number;
    remaining: number;
    isOverBudget: boolean;
  };
  byProvider: Array<{
    provider: string;
    totalCost: number;
    requestCount: number;
  }>;
  byModel: Array<{
    model: string;
    totalCost: number;
    requestCount: number;
  }>;
  dailyTrend: Array<{
    date: string;
    cost: number;
  }>;
  routingStats: {
    autoRoutedCount: number;
    manualCount: number;
    totalSaved: number;
  };
}

const providerColors: Record<string, string> = {
  openai: 'from-green-500 to-emerald-600',
  anthropic: 'from-orange-500 to-amber-600',
  google: 'from-blue-500 to-indigo-600',
  deepgram: 'from-purple-500 to-pink-600',
};

export default function AnalyticsPage() {
  const { data: session, status } = useSession();
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  // Redirect if not authenticated
  if (status === 'unauthenticated') {
    redirect('/api/auth/signin');
  }

  useEffect(() => {
    if (session) {
      fetchAnalytics();
    }
  }, [session]);

  const fetchAnalytics = async () => {
    try {
      const response = await fetch('/api/analytics');
      if (response.ok) {
        const data = await response.json();
        setAnalytics(data);
      }
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (status === 'loading' || loading) {
    return (
      <div className="flex h-screen">
        <Sidebar />
        <div className="flex-1 flex items-center justify-center lg:ml-72">
          <div className="text-center">
            <div className="inline-block animate-spin-slow">
              <ChartBarIcon className="w-12 h-12 text-purple-500" />
            </div>
            <p className="mt-4 text-gray-400">Loading character sheet...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="flex h-screen">
        <Sidebar />
        <div className="flex-1 flex items-center justify-center lg:ml-72">
          <p className="text-gray-400">Failed to load analytics</p>
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
            <h1 className="text-3xl font-bold text-gradient">Character Sheet</h1>
            <p className="text-gray-400 mt-1">Track your adventures and expenditures</p>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-6 scrollbar-thin">
          <div className="max-w-7xl mx-auto space-y-6">
            {/* Budget Status Card */}
            <BudgetStatus />

            {/* Routing Stats */}
            <div className="card-dnd p-6">
              <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <BoltIcon className="w-6 h-6 text-gold-400" />
                Smart Routing Performance
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center p-4 bg-gray-800/50 rounded-lg">
                  <div className="text-3xl font-bold text-green-400 mb-2">
                    {analytics.routingStats.autoRoutedCount}
                  </div>
                  <div className="text-sm text-gray-400">Auto-Routed Requests</div>
                </div>

                <div className="text-center p-4 bg-gray-800/50 rounded-lg">
                  <div className="text-3xl font-bold text-blue-400 mb-2">
                    {analytics.routingStats.manualCount}
                  </div>
                  <div className="text-sm text-gray-400">Manual Selections</div>
                </div>

                <div className="text-center p-4 bg-gray-800/50 rounded-lg">
                  <div className="text-3xl font-bold text-gold-400 mb-2">
                    ${analytics.routingStats.totalSaved?.toFixed(2) || '0.00'}
                  </div>
                  <div className="text-sm text-gray-400">Estimated Savings</div>
                </div>
              </div>
            </div>

            {/* Provider Breakdown */}
            <div className="card-dnd p-6">
              <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <SparklesIcon className="w-6 h-6 text-purple-400" />
                Cost by Provider
              </h2>

              <div className="space-y-4">
                {analytics.byProvider.map((provider) => {
                  const totalCost = analytics.byProvider.reduce((sum, p) => sum + p.totalCost, 0);
                  const percentage = totalCost > 0 ? (provider.totalCost / totalCost) * 100 : 0;
                  const gradient = providerColors[provider.provider] || 'from-gray-500 to-gray-600';

                  return (
                    <div key={provider.provider}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <span className="text-white font-medium capitalize">
                            {provider.provider}
                          </span>
                          <span className="text-sm text-gray-400">
                            {provider.requestCount} requests
                          </span>
                        </div>
                        <span className="text-gold-400 font-mono font-semibold">
                          ${provider.totalCost.toFixed(4)}
                        </span>
                      </div>
                      <div className="h-3 bg-gray-800 rounded-full overflow-hidden">
                        <div
                          className={`h-full bg-gradient-to-r ${gradient} transition-all duration-500`}
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Model Breakdown */}
            <div className="card-dnd p-6">
              <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <CurrencyDollarIcon className="w-6 h-6 text-gold-400" />
                Cost by Model
              </h2>

              <div className="space-y-3">
                {analytics.byModel.map((model) => (
                  <div
                    key={model.model}
                    className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg"
                  >
                    <div>
                      <div className="text-white font-medium">{model.model}</div>
                      <div className="text-xs text-gray-400">
                        {model.requestCount} requests
                      </div>
                    </div>
                    <div className="text-gold-400 font-mono font-semibold">
                      ${model.totalCost.toFixed(4)}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Daily Trend */}
            {analytics.dailyTrend && analytics.dailyTrend.length > 0 && (
              <div className="card-dnd p-6">
                <h2 className="text-xl font-bold text-white mb-4">Daily Spending Trend</h2>
                <div className="h-64 flex items-end justify-between gap-2">
                  {analytics.dailyTrend.slice(-14).map((day, index) => {
                    const maxCost = Math.max(...analytics.dailyTrend.map(d => d.cost));
                    const height = maxCost > 0 ? (day.cost / maxCost) * 100 : 0;

                    return (
                      <div key={index} className="flex-1 flex flex-col items-center group">
                        <div
                          className="w-full bg-gradient-arcane rounded-t-lg transition-all group-hover:shadow-arcane"
                          style={{ height: `${height}%`, minHeight: day.cost > 0 ? '4px' : '0' }}
                        />
                        <div className="mt-2 text-xs text-gray-500 rotate-45 origin-left">
                          {new Date(day.date).toLocaleDateString(undefined, {
                            month: 'short',
                            day: 'numeric',
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
