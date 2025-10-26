/**
 * MCP Server Installer Component
 *
 * One-click installation wizard for popular MCP servers.
 * Includes pre-built templates and custom configuration.
 */

'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/Card';

interface ServerTemplate {
  id: string;
  name: string;
  description: string;
  icon: string;
  transport: 'stdio' | 'sse' | 'http';
  command?: string;
  args?: string[];
  url?: string;
  env?: Record<string, string>;
  capabilities: {
    tools: boolean;
    resources: boolean;
    prompts: boolean;
  };
  priority: number;
  tags: string[];
  requiresEnv?: string[]; // Required environment variables
}

const SERVER_TEMPLATES: ServerTemplate[] = [
  {
    id: 'github',
    name: 'GitHub',
    description: 'Repository access, code search, issue management, PR operations',
    icon: '🐙',
    transport: 'stdio',
    command: 'npx',
    args: ['@modelcontextprotocol/server-github'],
    capabilities: { tools: true, resources: true, prompts: false },
    priority: 10,
    tags: ['git', 'code', 'collaboration'],
    requiresEnv: ['GITHUB_PERSONAL_ACCESS_TOKEN'],
  },
  {
    id: 'filesystem',
    name: 'Filesystem',
    description: 'Secure local filesystem access with directory restrictions',
    icon: '📁',
    transport: 'stdio',
    command: 'npx',
    args: ['@modelcontextprotocol/server-filesystem'],
    capabilities: { tools: true, resources: true, prompts: false },
    priority: 9,
    tags: ['files', 'storage', 'local'],
  },
  {
    id: 'memory',
    name: 'Memory',
    description: 'Persistent memory and knowledge graph for context across sessions',
    icon: '🧠',
    transport: 'stdio',
    command: 'npx',
    args: ['@modelcontextprotocol/server-memory'],
    capabilities: { tools: true, resources: true, prompts: false },
    priority: 8,
    tags: ['memory', 'knowledge', 'context'],
  },
  {
    id: 'slack',
    name: 'Slack',
    description: 'Send messages, manage channels, read conversations',
    icon: '💬',
    transport: 'stdio',
    command: 'npx',
    args: ['@modelcontextprotocol/server-slack'],
    capabilities: { tools: true, resources: true, prompts: false },
    priority: 7,
    tags: ['chat', 'collaboration', 'messaging'],
    requiresEnv: ['SLACK_BOT_TOKEN', 'SLACK_TEAM_ID'],
  },
  {
    id: 'notion',
    name: 'Notion',
    description: 'Access pages, databases, create and update content',
    icon: '📝',
    transport: 'stdio',
    command: 'npx',
    args: ['@modelcontextprotocol/server-notion'],
    capabilities: { tools: true, resources: true, prompts: false },
    priority: 7,
    tags: ['notes', 'docs', 'database'],
    requiresEnv: ['NOTION_API_KEY'],
  },
  {
    id: 'postgres',
    name: 'PostgreSQL',
    description: 'Direct database access, schema inspection, query execution',
    icon: '🐘',
    transport: 'stdio',
    command: 'npx',
    args: ['@modelcontextprotocol/server-postgres'],
    capabilities: { tools: true, resources: true, prompts: false },
    priority: 6,
    tags: ['database', 'sql', 'data'],
    requiresEnv: ['POSTGRES_CONNECTION_STRING'],
  },
  {
    id: 'brave-search',
    name: 'Brave Search',
    description: 'Web search with privacy-focused Brave Search API',
    icon: '🔍',
    transport: 'stdio',
    command: 'npx',
    args: ['@modelcontextprotocol/server-brave-search'],
    capabilities: { tools: true, resources: false, prompts: false },
    priority: 6,
    tags: ['search', 'web', 'privacy'],
    requiresEnv: ['BRAVE_API_KEY'],
  },
  {
    id: 'puppeteer',
    name: 'Puppeteer',
    description: 'Browser automation for web scraping and testing',
    icon: '🎭',
    transport: 'stdio',
    command: 'npx',
    args: ['@modelcontextprotocol/server-puppeteer'],
    capabilities: { tools: true, resources: false, prompts: false },
    priority: 5,
    tags: ['automation', 'browser', 'scraping'],
  },
];

interface ServerInstallerProps {
  onInstalled: () => void;
  onClose: () => void;
}

export function ServerInstaller({ onInstalled, onClose }: ServerInstallerProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<ServerTemplate | null>(null);
  const [customConfig, setCustomConfig] = useState(false);
  const [installing, setInstalling] = useState(false);
  const [envVars, setEnvVars] = useState<Record<string, string>>({});

  const handleInstall = async (template: ServerTemplate) => {
    setInstalling(true);

    try {
      // Check for required environment variables
      if (template.requiresEnv && template.requiresEnv.length > 0) {
        const missingVars = template.requiresEnv.filter((key) => !envVars[key]);
        if (missingVars.length > 0) {
          alert(`Missing required environment variables: ${missingVars.join(', ')}`);
          setInstalling(false);
          return;
        }
      }

      // Build server configuration
      const config = {
        name: template.name.toLowerCase(),
        description: template.description,
        transport: template.transport,
        command: template.command,
        args: template.args,
        url: template.url,
        env: { ...template.env, ...envVars },
        capabilities: template.capabilities,
        priority: template.priority,
        tags: template.tags,
        enabled: true,
      };

      const response = await fetch('/api/mcp/servers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });

      const data = await response.json();

      if (data.success) {
        alert(`✅ ${template.name} server installed successfully!`);
        setSelectedTemplate(null);
        setEnvVars({});
        onInstalled();
        onClose();
      } else {
        alert(`Failed to install server: ${data.error}`);
      }
    } catch (error: any) {
      alert(`Error: ${error.message}`);
    } finally {
      setInstalling(false);
    }
  };

  return (
    <Card className="bg-slate-900/80 border-purple-500/30 backdrop-blur-xl">
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-white mb-1">⚡ Quick Install</h2>
            <p className="text-slate-400 text-sm">
              Choose from popular MCP servers or configure custom
            </p>
          </div>
          <button
            onClick={() => setCustomConfig(!customConfig)}
            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm font-semibold transition-colors"
          >
            {customConfig ? 'Templates' : 'Custom'}
          </button>
        </div>

        {!customConfig ? (
          <>
            {/* Template Selection */}
            {!selectedTemplate ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {SERVER_TEMPLATES.map((template) => (
                  <button
                    key={template.id}
                    onClick={() => setSelectedTemplate(template)}
                    className="p-4 bg-slate-800/50 hover:bg-slate-800 border border-purple-500/20 hover:border-purple-500/50 rounded-lg transition-all duration-200 hover:scale-105 text-left group"
                  >
                    <div className="text-4xl mb-2">{template.icon}</div>
                    <h3 className="text-white font-semibold mb-1 group-hover:text-purple-300 transition-colors">
                      {template.name}
                    </h3>
                    <p className="text-slate-400 text-xs line-clamp-2">{template.description}</p>
                    <div className="flex gap-1 mt-2">
                      {template.tags.slice(0, 2).map((tag) => (
                        <span
                          key={tag}
                          className="px-2 py-0.5 bg-purple-500/10 text-purple-300 text-xs rounded"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <>
                {/* Configuration Form */}
                <div className="mb-6">
                  <button
                    onClick={() => {
                      setSelectedTemplate(null);
                      setEnvVars({});
                    }}
                    className="text-slate-400 hover:text-white text-sm mb-4 transition-colors"
                  >
                    ← Back to templates
                  </button>

                  <div className="bg-slate-800/50 border border-purple-500/20 rounded-lg p-6">
                    <div className="flex items-start gap-4 mb-6">
                      <div className="text-5xl">{selectedTemplate.icon}</div>
                      <div>
                        <h3 className="text-2xl font-bold text-white mb-2">
                          {selectedTemplate.name}
                        </h3>
                        <p className="text-slate-400 text-sm">{selectedTemplate.description}</p>
                      </div>
                    </div>

                    {/* Environment Variables */}
                    {selectedTemplate.requiresEnv && selectedTemplate.requiresEnv.length > 0 && (
                      <div className="mb-6">
                        <h4 className="text-white font-semibold mb-3">
                          Required Configuration
                        </h4>
                        <div className="space-y-3">
                          {selectedTemplate.requiresEnv.map((envKey) => (
                            <div key={envKey}>
                              <label className="block text-sm text-slate-400 mb-1">
                                {envKey}
                              </label>
                              <input
                                type="text"
                                value={envVars[envKey] || ''}
                                onChange={(e) =>
                                  setEnvVars({ ...envVars, [envKey]: e.target.value })
                                }
                                placeholder={`Enter your ${envKey}`}
                                className="w-full px-3 py-2 bg-slate-900/50 border border-slate-500/20 rounded text-white placeholder-slate-500 focus:outline-none focus:border-purple-500/50"
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Server Details */}
                    <div className="mb-6 p-4 bg-slate-950/50 rounded border border-slate-500/20">
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <div className="text-slate-400 mb-1">Transport</div>
                          <div className="text-white font-semibold">{selectedTemplate.transport}</div>
                        </div>
                        <div>
                          <div className="text-slate-400 mb-1">Priority</div>
                          <div className="text-white font-semibold">{selectedTemplate.priority}</div>
                        </div>
                        <div>
                          <div className="text-slate-400 mb-1">Command</div>
                          <div className="text-white font-mono text-xs">{selectedTemplate.command}</div>
                        </div>
                        <div>
                          <div className="text-slate-400 mb-1">Capabilities</div>
                          <div className="flex gap-2">
                            {selectedTemplate.capabilities.tools && (
                              <span className="text-xs px-2 py-0.5 bg-indigo-500/20 text-indigo-300 rounded">
                                Tools
                              </span>
                            )}
                            {selectedTemplate.capabilities.resources && (
                              <span className="text-xs px-2 py-0.5 bg-pink-500/20 text-pink-300 rounded">
                                Resources
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Install Button */}
                    <button
                      onClick={() => handleInstall(selectedTemplate)}
                      disabled={installing}
                      className="w-full px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-lg font-semibold shadow-lg shadow-purple-500/30 transition-all duration-200 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {installing ? 'Installing...' : `Install ${selectedTemplate.name}`}
                    </button>
                  </div>
                </div>
              </>
            )}
          </>
        ) : (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">⚙️</div>
            <h3 className="text-xl text-white mb-2">Custom Configuration</h3>
            <p className="text-slate-400 text-sm mb-6">
              Advanced custom server configuration coming soon!
            </p>
            <button
              onClick={() => setCustomConfig(false)}
              className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold transition-colors"
            >
              Back to Templates
            </button>
          </div>
        )}
      </div>
    </Card>
  );
}
