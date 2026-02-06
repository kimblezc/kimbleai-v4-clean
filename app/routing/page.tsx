'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Sidebar from '@/components/layout/Sidebar';
import VersionFooter from '@/components/layout/VersionFooter';
import {
  ArrowLeftIcon,
  ArrowPathIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  XCircleIcon,
  ChartBarIcon,
  CpuChipIcon,
  ClockIcon,
  CurrencyDollarIcon,
} from '@heroicons/react/24/outline';

interface RoutingStats {
  model: string;
  count: number;
  percentage: number;
  cost: number;
}

interface RoutingHealth {
  status: 'healthy' | 'warning' | 'critical';
  message: string;
  dominantModel: string | null;
  dominantPercentage: number;
  diversity: number;
}

interface RecentDecision {
  model: string;
  timestamp: string;
  cost: number;
}

interface RoutingData {
  userId: string;
  period: string;
  totalRequests: number;
  stats: RoutingStats[];
  health: RoutingHealth;
  recentDecisions: RecentDecision[];
  timestamp: string;
}

const modelColors: Record<string, string> = {
  'gpt-5.2': 'from-green-500 to-emerald-600',
  'gpt-5.2-pro': 'from-green-600 to-teal-700',
  'gpt-5.2-codex': 'from-green-400 to-cyan-500',
  'gpt-4o': 'from-green-300 to-lime-400',
  'claude-opus-4.5': 'from-orange-500 to-amber-600',
  'claude-sonnet-4.5': 'from-orange-400 to-yellow-500',
  'claude-haiku-4.5': 'from-yellow-400 to-orange-400',
  'gemini-3-pro': 'from-blue-500 to-indigo-600',
  'gemini-3-flash': 'from-blue-400 to-purple-500',
  'deepgram-nova-3': 'from-purple-500 to-pink-600',
};

const getModelColor = (model: string): string => modelColors[model] || 'from-neutral-500 to-neutral-600';

const getProviderFromModel = (model: string): string => {
  if (model.startsWith('gpt') || model.startsWith('text-embedding') || model === 'whisper-1') return 'OpenAI';
  if (model.startsWith('claude')) return 'Anthropic';
  if (model.startsWith('gemini')) return 'Google';
  if (model.startsWith('deepgram')) return 'Deepgram';
  return 'Unknown';
};

export default function RoutingStatsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [data, setData] = useState<RoutingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState(30);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/');
  }, [status, router]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`/api/routing?days=${period}`);
      if (!response.ok) throw new Error(response.status === 401 ? 'Please sign in' : 'Failed to fetch');
      const result = await response.json();
      setData(result);
      setLastRefresh(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (status === 'authenticated') fetchData();
  }, [status, period]);

  useEffect(() => {
    if (status !== 'authenticated') return;
    const interval = setInterval(fetchData, 60000);
    return () => clearInterval(interval);
  }, [status, period]);

  if (status === 'loading') {
    return <div className="flex h-screen items-center justify-center bg-neutral-950"><div className="text-neutral-400">Loading...</div></div>;
  }

  const getHealthIcon = (health: RoutingHealth['status']) => {
    switch (health) {
      case 'healthy': return <CheckCircleIcon className="w-8 h-8 text-green-500" />;
      case 'warning': return <ExclamationTriangleIcon className="w-8 h-8 text-yellow-500" />;
      case 'critical': return <XCircleIcon className="w-8 h-8 text-red-500" />;
    }
  };

  const getHealthBgColor = (health: RoutingHealth['status']) => {
    switch (health) {
      case 'healthy': return 'bg-green-500/10 border-green-500/30';
      case 'warning': return 'bg-yellow-500/10 border-yellow-500/30';
      case 'critical': return 'bg-red-500/10 border-red-500/30';
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-neutral-950">
      <Sidebar conversations={[]} activeConversationId="" onSelectConversation={() => {}} onNewConversation={() => router.push('/')} onDeleteConversation={() => {}} onRenameConversation={() => {}} />
      <div className="flex-1 flex flex-col lg:ml-72">
        <header className="px-6 py-6 bg-gray-800/50 backdrop-blur-sm border-b border-gray-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/" className="p-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 transition-colors">
                <ArrowLeftIcon className="w-5 h-5 text-neutral-400" />
              </Link>
              <div>
                <h1 className="text-3xl font-bold text-gradient flex items-center gap-3">
                  <CpuChipIcon className="w-8 h-8" />Model Routing Statistics
                </h1>
                <p className="text-gray-400 mt-1">Smart routing health and model distribution</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <select value={period} onChange={(e) => setPeriod(Number(e.target.value))} className="px-4 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white text-sm">
                <option value={7}>Last 7 days</option>
                <option value={14}>Last 14 days</option>
                <option value={30}>Last 30 days</option>
                <option value={90}>Last 90 days</option>
              </select>
              <button onClick={fetchData} disabled={loading} className="p-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 disabled:opacity-50">
                <ArrowPathIcon className={`w-5 h-5 text-neutral-400 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-6 scrollbar-thin">
          <div className="max-w-7xl mx-auto space-y-6">
            {error ? (
              <div className="card-dnd p-6 text-center">
                <XCircleIcon className="w-12 h-12 text-red-500 mx-auto mb-4" />
                <p className="text-red-400">{error}</p>
                <button onClick={fetchData} className="mt-4 px-4 py-2 bg-neutral-800 hover:bg-neutral-700 rounded-lg text-white">Retry</button>
              </div>
            ) : loading && !data ? (
              <div className="card-dnd p-12 text-center">
                <ArrowPathIcon className="w-12 h-12 text-neutral-500 mx-auto mb-4 animate-spin" />
                <p className="text-neutral-400">Loading routing statistics...</p>
              </div>
            ) : data ? (
              <>
                <div className={`card-dnd p-6 border ${getHealthBgColor(data.health.status)}`}>
                  <div className="flex items-start gap-4">
                    {getHealthIcon(data.health.status)}
                    <div className="flex-1">
                      <h2 className="text-xl font-semibold text-white capitalize">Routing Health: {data.health.status}</h2>
                      <p className="text-neutral-300 mt-1">{data.health.message}</p>
                      <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div><p className="text-xs text-neutral-500 uppercase">Total Requests</p><p className="text-2xl font-bold text-white">{data.totalRequests}</p></div>
                        <div><p className="text-xs text-neutral-500 uppercase">Models Used</p><p className="text-2xl font-bold text-white">{data.stats.length}</p></div>
                        <div><p className="text-xs text-neutral-500 uppercase">Diversity Score</p><p className="text-2xl font-bold text-white">{(data.health.diversity * 100).toFixed(0)}%</p></div>
                        <div><p className="text-xs text-neutral-500 uppercase">Period</p><p className="text-2xl font-bold text-white">{data.period}</p></div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="card-dnd p-6">
                    <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2"><ChartBarIcon className="w-5 h-5 text-arcane-400" />Model Distribution</h3>
                    {data.stats.length === 0 ? <p className="text-neutral-500 text-center py-8">No data</p> : (
                      <div className="space-y-3">
                        {data.stats.map((stat) => (
                          <div key={stat.model} className="space-y-1">
                            <div className="flex items-center justify-between text-sm">
                              <div className="flex items-center gap-2">
                                <span className="text-white font-medium">{stat.model}</span>
                                <span className="text-neutral-600 text-xs">({getProviderFromModel(stat.model)})</span>
                              </div>
                              <div className="flex items-center gap-3">
                                <span className="text-neutral-400">{stat.count} requests</span>
                                <span className="text-white font-medium w-16 text-right">{stat.percentage.toFixed(1)}%</span>
                              </div>
                            </div>
                            <div className="h-2 bg-neutral-800 rounded-full overflow-hidden">
                              <div className={`h-full bg-gradient-to-r ${getModelColor(stat.model)} transition-all duration-500`} style={{ width: `${stat.percentage}%` }} />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="card-dnd p-6">
                    <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2"><CurrencyDollarIcon className="w-5 h-5 text-gold-400" />Cost by Model</h3>
                    {data.stats.length === 0 ? <p className="text-neutral-500 text-center py-8">No data</p> : (
                      <div className="space-y-2">
                        {data.stats.filter(s => s.cost > 0).sort((a, b) => b.cost - a.cost).map((stat) => (
                          <div key={stat.model} className="flex items-center justify-between p-3 bg-neutral-800/50 rounded-lg">
                            <div><p className="text-white font-medium">{stat.model}</p><p className="text-neutral-500 text-xs">{stat.count} requests</p></div>
                            <p className="text-lg font-mono text-gold-400">${stat.cost.toFixed(4)}</p>
                          </div>
                        ))}
                        <div className="flex items-center justify-between p-3 bg-neutral-900 rounded-lg border border-neutral-700 mt-4">
                          <p className="text-white font-semibold">Total Cost</p>
                          <p className="text-xl font-mono text-white">${data.stats.reduce((sum, s) => sum + s.cost, 0).toFixed(4)}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="card-dnd p-6">
                  <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2"><ClockIcon className="w-5 h-5 text-blue-400" />Recent Routing Decisions</h3>
                  {data.recentDecisions.length === 0 ? <p className="text-neutral-500 text-center py-8">No recent decisions</p> : (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead><tr className="text-left text-neutral-500 text-sm border-b border-neutral-800"><th className="pb-3 font-medium">Model</th><th className="pb-3 font-medium">Provider</th><th className="pb-3 font-medium">Cost</th><th className="pb-3 font-medium text-right">Time</th></tr></thead>
                        <tbody>
                          {data.recentDecisions.map((decision, idx) => (
                            <tr key={idx} className="border-b border-neutral-800/50">
                              <td className="py-3"><span className="text-white font-medium">{decision.model}</span></td>
                              <td className="py-3"><span className="text-neutral-400">{getProviderFromModel(decision.model)}</span></td>
                              <td className="py-3"><span className="font-mono text-gold-400">${decision.cost.toFixed(6)}</span></td>
                              <td className="py-3 text-right"><span className="text-neutral-500 text-sm">{new Date(decision.timestamp).toLocaleString()}</span></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap gap-4">
                  <Link href="/analytics" className="flex-1 card-dnd p-4 hover:bg-neutral-800 transition-colors text-center">
                    <ChartBarIcon className="w-6 h-6 text-arcane-400 mx-auto mb-2" /><p className="text-white font-medium">Full Analytics</p><p className="text-neutral-500 text-sm">Budget & cost breakdown</p>
                  </Link>
                  <Link href="/settings" className="flex-1 card-dnd p-4 hover:bg-neutral-800 transition-colors text-center">
                    <CpuChipIcon className="w-6 h-6 text-blue-400 mx-auto mb-2" /><p className="text-white font-medium">Settings</p><p className="text-neutral-500 text-sm">Configure model preferences</p>
                  </Link>
                  <Link href="/" className="flex-1 card-dnd p-4 hover:bg-neutral-800 transition-colors text-center">
                    <ArrowLeftIcon className="w-6 h-6 text-green-400 mx-auto mb-2" /><p className="text-white font-medium">Back to Chat</p><p className="text-neutral-500 text-sm">Return to main interface</p>
                  </Link>
                </div>

                {lastRefresh && <p className="text-center text-neutral-600 text-sm">Last updated: {lastRefresh.toLocaleTimeString()}</p>}
              </>
            ) : null}
          </div>
        </main>
      </div>
      <VersionFooter />
    </div>
  );
}
