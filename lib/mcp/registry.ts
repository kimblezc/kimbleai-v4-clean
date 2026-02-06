/**
 * MCP Server Registry - Pre-configured MCP servers for KimbleAI
 *
 * Contains configurations for popular MCP servers that can be connected.
 * Users can add custom servers through the settings UI.
 */

import { getMCPClient, type MCPServer } from './client';

export interface MCPServerConfig {
  id: string;
  name: string;
  description: string;
  category: 'productivity' | 'development' | 'data' | 'communication' | 'custom';
  transport: 'stdio' | 'http' | 'websocket';
  endpoint?: string;
  command?: string;
  args?: string[];
  requiredEnvVars?: string[];
  icon?: string;
  docsUrl?: string;
}

// Pre-configured MCP servers from the community
export const MCP_SERVER_CATALOG: MCPServerConfig[] = [
  // Development
  {
    id: 'github',
    name: 'GitHub',
    description: 'Access GitHub repositories, issues, PRs, and code',
    category: 'development',
    transport: 'http',
    requiredEnvVars: ['GITHUB_TOKEN'],
    icon: 'github',
    docsUrl: 'https://github.com/modelcontextprotocol/servers/tree/main/src/github',
  },
  {
    id: 'filesystem',
    name: 'File System',
    description: 'Read and write files on the local filesystem',
    category: 'data',
    transport: 'stdio',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-filesystem'],
    icon: 'folder',
    docsUrl: 'https://github.com/modelcontextprotocol/servers/tree/main/src/filesystem',
  },
  // Productivity
  {
    id: 'google-drive',
    name: 'Google Drive',
    description: 'Access files and folders in Google Drive',
    category: 'productivity',
    transport: 'http',
    requiredEnvVars: ['GOOGLE_ACCESS_TOKEN'],
    icon: 'google-drive',
    docsUrl: 'https://github.com/modelcontextprotocol/servers/tree/main/src/gdrive',
  },
  {
    id: 'slack',
    name: 'Slack',
    description: 'Read and send messages in Slack workspaces',
    category: 'communication',
    transport: 'http',
    requiredEnvVars: ['SLACK_TOKEN'],
    icon: 'slack',
    docsUrl: 'https://github.com/modelcontextprotocol/servers/tree/main/src/slack',
  },
  {
    id: 'notion',
    name: 'Notion',
    description: 'Access Notion pages, databases, and content',
    category: 'productivity',
    transport: 'http',
    requiredEnvVars: ['NOTION_TOKEN'],
    icon: 'notion',
    docsUrl: 'https://github.com/modelcontextprotocol/servers/tree/main/src/notion',
  },
  // Data
  {
    id: 'postgres',
    name: 'PostgreSQL',
    description: 'Query PostgreSQL databases',
    category: 'data',
    transport: 'http',
    requiredEnvVars: ['POSTGRES_URL'],
    icon: 'database',
    docsUrl: 'https://github.com/modelcontextprotocol/servers/tree/main/src/postgres',
  },
  {
    id: 'sqlite',
    name: 'SQLite',
    description: 'Query local SQLite databases',
    category: 'data',
    transport: 'stdio',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-sqlite'],
    icon: 'database',
    docsUrl: 'https://github.com/modelcontextprotocol/servers/tree/main/src/sqlite',
  },
  // Web
  {
    id: 'brave-search',
    name: 'Brave Search',
    description: 'Web search using Brave Search API',
    category: 'data',
    transport: 'http',
    requiredEnvVars: ['BRAVE_API_KEY'],
    icon: 'search',
    docsUrl: 'https://github.com/modelcontextprotocol/servers/tree/main/src/brave-search',
  },
  {
    id: 'puppeteer',
    name: 'Puppeteer',
    description: 'Web scraping and browser automation',
    category: 'data',
    transport: 'stdio',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-puppeteer'],
    icon: 'globe',
    docsUrl: 'https://github.com/modelcontextprotocol/servers/tree/main/src/puppeteer',
  },
];

/**
 * Initialize the MCP registry with available servers
 */
export function initializeMCPRegistry(): void {
  const client = getMCPClient();

  // Register built-in KimbleAI server
  client.registerServer({
    id: 'kimbleai',
    name: 'KimbleAI',
    description: 'Access KimbleAI data: conversations, files, projects, memories',
    transport: 'http',
    endpoint: '/api/mcp',
  });
}

/**
 * Get servers available for connection based on environment
 */
export function getAvailableServers(): MCPServerConfig[] {
  return MCP_SERVER_CATALOG.filter((server) => {
    // Check if required env vars are present
    if (server.requiredEnvVars) {
      return server.requiredEnvVars.every((varName) => !!process.env[varName]);
    }
    return true;
  });
}

/**
 * Get all servers in the catalog
 */
export function getAllCatalogServers(): MCPServerConfig[] {
  return MCP_SERVER_CATALOG;
}

/**
 * Get server config by ID
 */
export function getServerConfig(id: string): MCPServerConfig | undefined {
  return MCP_SERVER_CATALOG.find((s) => s.id === id);
}

/**
 * Check if a server's requirements are met
 */
export function checkServerRequirements(id: string): { met: boolean; missing: string[] } {
  const config = getServerConfig(id);
  if (!config) {
    return { met: false, missing: ['Server not found'] };
  }

  if (!config.requiredEnvVars || config.requiredEnvVars.length === 0) {
    return { met: true, missing: [] };
  }

  const missing = config.requiredEnvVars.filter((varName) => !process.env[varName]);
  return { met: missing.length === 0, missing };
}

/**
 * Format tools for AI model consumption
 */
export function formatToolsForModel(tools: any[]): any[] {
  return tools.map((tool) => ({
    type: 'function',
    function: {
      name: `mcp_${tool.serverId}_${tool.name}`,
      description: `[${tool.serverId}] ${tool.description}`,
      parameters: tool.inputSchema,
    },
  }));
}

/**
 * Parse a tool call from AI response
 */
export function parseToolCall(name: string): { serverId: string; toolName: string } | null {
  const match = name.match(/^mcp_([^_]+)_(.+)$/);
  if (match) {
    return { serverId: match[1], toolName: match[2] };
  }
  return null;
}
