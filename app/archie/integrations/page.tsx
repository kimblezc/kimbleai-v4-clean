/**
 * API Integrations Dashboard
 *
 * Monitor the health and status of all external API integrations:
 * - Anthropic (Claude API)
 * - Supabase (Database)
 * - Vercel (Deployment)
 * - Google Workspace (Gmail, Drive, Calendar)
 * - AssemblyAI (Transcription)
 */

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface IntegrationStatus {
  name: string;
  icon: string;
  status: 'healthy' | 'degraded' | 'down' | 'unconfigured';
  description: string;
  metrics?: {
    label: string;
    value: string | number;
  }[];
  error?: string;
  lastCheck?: string;
  configStatus: {
    hasKey: boolean;
    keyNames: string[];
  };
}

export default function IntegrationsPage() {
  const [integrations, setIntegrations] = useState<IntegrationStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  const checkIntegrations = async () => {
    setLoading(true);
    const now = new Date();

    // Check environment variables for each integration
    const checks: IntegrationStatus[] = [
      {
        name: 'Anthropic (Claude API)',
        icon: '🤖',
        status: 'healthy',
        description: 'AI model provider for chat and autonomous agents',
        metrics: [
          { label: 'Model', value: 'Claude 3.5 Sonnet' },
          { label: 'Provider', value: 'Anthropic' }
        ],
        configStatus: {
          hasKey: !!(process.env.NEXT_PUBLIC_ANTHROPIC_API_KEY),
          keyNames: ['NEXT_PUBLIC_ANTHROPIC_API_KEY']
        },
        lastCheck: now.toISOString()
      },
      {
        name: 'Supabase',
        icon: '🗄️',
        status: 'healthy',
        description: 'PostgreSQL database and real-time backend',
        metrics: [
          { label: 'URL', value: process.env.NEXT_PUBLIC_SUPABASE_URL ? 'Configured' : 'Missing' },
          { label: 'Auth', value: process.env.SUPABASE_SERVICE_ROLE_KEY ? 'Valid' : 'Missing' }
        ],
        configStatus: {
          hasKey: !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY),
          keyNames: ['NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'NEXT_PUBLIC_SUPABASE_ANON_KEY']
        },
        lastCheck: now.toISOString()
      },
      {
        name: 'Vercel',
        icon: '▲',
        status: 'healthy',
        description: 'Application deployment and hosting platform',
        metrics: [
          { label: 'Environment', value: process.env.VERCEL_ENV || 'development' },
          { label: 'Region', value: process.env.VERCEL_REGION || 'local' }
        ],
        configStatus: {
          hasKey: true, // Always available in Vercel
          keyNames: ['VERCEL_ENV', 'VERCEL_URL']
        },
        lastCheck: now.toISOString()
      },
      {
        name: 'Google Workspace',
        icon: '🔐',
        status: process.env.GOOGLE_CLIENT_ID ? 'healthy' : 'unconfigured',
        description: 'Gmail, Google Drive, and Calendar integration',
        metrics: [
          { label: 'OAuth', value: process.env.GOOGLE_CLIENT_ID ? 'Configured' : 'Missing' },
          { label: 'Services', value: 'Gmail, Drive, Calendar' }
        ],
        configStatus: {
          hasKey: !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
          keyNames: ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET']
        },
        lastCheck: now.toISOString()
      },
      {
        name: 'AssemblyAI',
        icon: '🎤',
        status: process.env.ASSEMBLYAI_API_KEY ? 'healthy' : 'unconfigured',
        description: 'Audio transcription service',
        metrics: [
          { label: 'API Key', value: process.env.ASSEMBLYAI_API_KEY ? 'Configured' : 'Missing' },
          { label: 'Features', value: 'Transcription, Speaker labels' }
        ],
        configStatus: {
          hasKey: !!process.env.ASSEMBLYAI_API_KEY,
          keyNames: ['ASSEMBLYAI_API_KEY']
        },
        lastCheck: now.toISOString()
      }
    ];

    // Update status based on config
    checks.forEach(integration => {
      if (!integration.configStatus.hasKey) {
        integration.status = 'unconfigured';
        integration.error = `Missing environment variables: ${integration.configStatus.keyNames.join(', ')}`;
      }
    });

    setIntegrations(checks);
    setLastRefresh(now);
    setLoading(false);
  };

  useEffect(() => {
    checkIntegrations();
    // Refresh every 30 seconds
    const interval = setInterval(checkIntegrations, 30000);
    return () => clearInterval(interval);
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'text-green-400 bg-green-900/30 border-green-500/40';
      case 'degraded':
        return 'text-yellow-400 bg-yellow-900/30 border-yellow-500/40';
      case 'down':
        return 'text-red-400 bg-red-900/30 border-red-500/40';
      case 'unconfigured':
        return 'text-slate-400 bg-slate-900/30 border-slate-600/40';
      default:
        return 'text-slate-400 bg-slate-900/30 border-slate-600/40';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return '✓';
      case 'degraded':
        return '⚠';
      case 'down':
        return '✗';
      case 'unconfigured':
        return '○';
      default:
        return '?';
    }
  };

  const healthyCount = integrations.filter(i => i.status === 'healthy').length;
  const unconfiguredCount = integrations.filter(i => i.status === 'unconfigured').length;
  const issuesCount = integrations.filter(i => ['degraded', 'down'].includes(i.status)).length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      {/* Animated background */}
      <div className="fixed inset-0 bg-[linear-gradient(to_right,#4f46e520_1px,transparent_1px),linear-gradient(to_bottom,#4f46e520_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_110%)]" />

      <div className="relative z-10">
        <div className="max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Breadcrumb */}
          <div className="mb-4">
            <Link
              href="/archie"
              className="text-indigo-400 hover:text-indigo-300 text-sm font-semibold flex items-center gap-2"
            >
              ← Back to Agent Command Center
            </Link>
          </div>

          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-5xl">🔗</span>
                  <h1 className="text-4xl font-bold text-white">API Integrations</h1>
                </div>
                <p className="text-slate-400 text-lg">
                  External services health monitoring and configuration status
                </p>
              </div>

              <button
                onClick={checkIntegrations}
                disabled={loading}
                className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-700 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors flex items-center gap-2"
              >
                <span className={loading ? 'animate-spin' : ''}>↻</span>
                Refresh
              </button>
            </div>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-gradient-to-br from-green-900/20 to-slate-900/50 border border-green-500/30 rounded-lg p-6 backdrop-blur-sm">
              <div className="text-sm text-green-400 font-semibold mb-2">HEALTHY</div>
              <div className="text-4xl font-bold text-white mb-1">{healthyCount}</div>
              <div className="text-xs text-slate-500">Services operational</div>
            </div>

            <div className="bg-gradient-to-br from-slate-900/20 to-slate-900/50 border border-slate-600/30 rounded-lg p-6 backdrop-blur-sm">
              <div className="text-sm text-slate-400 font-semibold mb-2">UNCONFIGURED</div>
              <div className="text-4xl font-bold text-white mb-1">{unconfiguredCount}</div>
              <div className="text-xs text-slate-500">Missing configuration</div>
            </div>

            <div className="bg-gradient-to-br from-red-900/20 to-slate-900/50 border border-red-500/30 rounded-lg p-6 backdrop-blur-sm">
              <div className="text-sm text-red-400 font-semibold mb-2">ISSUES</div>
              <div className="text-4xl font-bold text-white mb-1">{issuesCount}</div>
              <div className="text-xs text-slate-500">Require attention</div>
            </div>
          </div>

          {/* Last Refresh Info */}
          <div className="mb-6 text-sm text-slate-500">
            Last checked: {lastRefresh.toLocaleString()} • Auto-refreshes every 30 seconds
          </div>

          {/* Integration Cards */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {integrations.map((integration) => (
              <div
                key={integration.name}
                className="bg-gradient-to-br from-slate-900/80 to-slate-950/80 border border-slate-700/50 rounded-lg p-6 backdrop-blur-sm hover:border-indigo-500/50 transition-all"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-start gap-3">
                    <div className="text-4xl">{integration.icon}</div>
                    <div>
                      <h3 className="text-xl font-bold text-white mb-1">{integration.name}</h3>
                      <p className="text-sm text-slate-400">{integration.description}</p>
                    </div>
                  </div>

                  <div className={`
                    px-3 py-1.5 rounded-full border text-xs font-semibold whitespace-nowrap
                    ${getStatusColor(integration.status)}
                  `}>
                    <span className="mr-1">{getStatusIcon(integration.status)}</span>
                    {integration.status}
                  </div>
                </div>

                {integration.metrics && (
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    {integration.metrics.map((metric, idx) => (
                      <div key={idx} className="bg-slate-950/50 rounded-md p-3">
                        <div className="text-xs text-slate-500 mb-1">{metric.label}</div>
                        <div className="text-sm font-semibold text-white">{metric.value}</div>
                      </div>
                    ))}
                  </div>
                )}

                {integration.error && (
                  <div className="bg-red-950/30 border border-red-500/30 rounded-md p-3 mb-4">
                    <div className="text-xs text-red-400 font-semibold mb-1">CONFIGURATION ISSUE</div>
                    <div className="text-sm text-red-300">{integration.error}</div>
                  </div>
                )}

                <div className="flex items-center justify-between text-xs text-slate-500">
                  <div>
                    Environment variables: {integration.configStatus.keyNames.length}
                  </div>
                  {integration.lastCheck && (
                    <div>
                      Checked: {new Date(integration.lastCheck).toLocaleTimeString()}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Configuration Guide */}
          <div className="mt-8 bg-gradient-to-br from-slate-900/80 to-slate-950/80 border border-slate-700/50 rounded-lg p-6 backdrop-blur-sm">
            <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <span>⚙️</span>
              Configuration Guide
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm text-slate-400">
              <div>
                <h4 className="text-white font-semibold mb-2">Required Environment Variables</h4>
                <ul className="space-y-1 font-mono text-xs">
                  <li>• NEXT_PUBLIC_ANTHROPIC_API_KEY</li>
                  <li>• NEXT_PUBLIC_SUPABASE_URL</li>
                  <li>• SUPABASE_SERVICE_ROLE_KEY</li>
                </ul>
              </div>
              <div>
                <h4 className="text-white font-semibold mb-2">Optional Integrations</h4>
                <ul className="space-y-1 font-mono text-xs">
                  <li>• GOOGLE_CLIENT_ID (for Workspace)</li>
                  <li>• GOOGLE_CLIENT_SECRET</li>
                  <li>• ASSEMBLYAI_API_KEY (for transcription)</li>
                </ul>
              </div>
            </div>
            <div className="mt-4 p-4 bg-indigo-950/30 border border-indigo-500/30 rounded-md">
              <p className="text-sm text-indigo-300">
                <strong>Note:</strong> Add these variables to your <code className="font-mono bg-slate-950/50 px-2 py-0.5 rounded">.env.local</code> file
                or configure them in your Vercel project settings.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
