/**
 * MCP Client - Model Context Protocol Client for KimbleAI
 *
 * Connects to MCP servers to enable standardized tool access.
 * Based on the MCP specification adopted by OpenAI, Anthropic, and Google.
 *
 * @see https://modelcontextprotocol.io/
 */

export interface MCPServer {
  id: string;
  name: string;
  description: string;
  transport: 'stdio' | 'http' | 'websocket';
  endpoint?: string;
  command?: string;
  args?: string[];
  env?: Record<string, string>;
  status: 'connected' | 'disconnected' | 'error';
  tools: MCPTool[];
  resources: MCPResource[];
}

export interface MCPTool {
  name: string;
  description: string;
  inputSchema: Record<string, any>;
  serverId: string;
}

export interface MCPResource {
  uri: string;
  name: string;
  description?: string;
  mimeType?: string;
  serverId: string;
}

export interface MCPToolCall {
  tool: string;
  arguments: Record<string, any>;
  serverId: string;
}

export interface MCPToolResult {
  success: boolean;
  content: any;
  error?: string;
  isError?: boolean;
}

export class MCPClient {
  private servers: Map<string, MCPServer> = new Map();
  private connections: Map<string, WebSocket | null> = new Map();

  /**
   * Register an MCP server
   */
  registerServer(server: Omit<MCPServer, 'status' | 'tools' | 'resources'>): void {
    this.servers.set(server.id, {
      ...server,
      status: 'disconnected',
      tools: [],
      resources: [],
    });
  }

  /**
   * Connect to an MCP server
   */
  async connect(serverId: string): Promise<void> {
    const server = this.servers.get(serverId);
    if (!server) {
      throw new Error(`Server ${serverId} not found`);
    }

    try {
      if (server.transport === 'websocket' && server.endpoint) {
        const ws = new WebSocket(server.endpoint);

        await new Promise<void>((resolve, reject) => {
          ws.onopen = () => {
            this.connections.set(serverId, ws);
            server.status = 'connected';
            resolve();
          };
          ws.onerror = (err) => {
            server.status = 'error';
            reject(err);
          };
        });

        // Request available tools
        await this.discoverTools(serverId);
        await this.discoverResources(serverId);
      } else if (server.transport === 'http' && server.endpoint) {
        // HTTP transport - just verify endpoint is reachable
        const response = await fetch(`${server.endpoint}/health`);
        if (response.ok) {
          server.status = 'connected';
          await this.discoverTools(serverId);
          await this.discoverResources(serverId);
        } else {
          server.status = 'error';
        }
      }
    } catch (error) {
      server.status = 'error';
      console.error(`[MCP] Failed to connect to ${serverId}:`, error);
      throw error;
    }
  }

  /**
   * Discover available tools from a server
   */
  private async discoverTools(serverId: string): Promise<void> {
    const server = this.servers.get(serverId);
    if (!server || server.status !== 'connected') return;

    try {
      if (server.transport === 'http' && server.endpoint) {
        const response = await fetch(`${server.endpoint}/tools/list`);
        if (response.ok) {
          const data = await response.json();
          server.tools = (data.tools || []).map((tool: any) => ({
            ...tool,
            serverId,
          }));
        }
      }
    } catch (error) {
      console.error(`[MCP] Failed to discover tools from ${serverId}:`, error);
    }
  }

  /**
   * Discover available resources from a server
   */
  private async discoverResources(serverId: string): Promise<void> {
    const server = this.servers.get(serverId);
    if (!server || server.status !== 'connected') return;

    try {
      if (server.transport === 'http' && server.endpoint) {
        const response = await fetch(`${server.endpoint}/resources/list`);
        if (response.ok) {
          const data = await response.json();
          server.resources = (data.resources || []).map((resource: any) => ({
            ...resource,
            serverId,
          }));
        }
      }
    } catch (error) {
      console.error(`[MCP] Failed to discover resources from ${serverId}:`, error);
    }
  }

  /**
   * Execute a tool call
   */
  async callTool(call: MCPToolCall): Promise<MCPToolResult> {
    const server = this.servers.get(call.serverId);
    if (!server) {
      return { success: false, content: null, error: `Server ${call.serverId} not found`, isError: true };
    }

    if (server.status !== 'connected') {
      return { success: false, content: null, error: `Server ${call.serverId} not connected`, isError: true };
    }

    try {
      if (server.transport === 'http' && server.endpoint) {
        const response = await fetch(`${server.endpoint}/tools/call`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: call.tool,
            arguments: call.arguments,
          }),
        });

        const data = await response.json();
        return {
          success: !data.isError,
          content: data.content,
          error: data.isError ? data.content : undefined,
          isError: data.isError,
        };
      }

      return { success: false, content: null, error: 'Unsupported transport', isError: true };
    } catch (error) {
      return {
        success: false,
        content: null,
        error: error instanceof Error ? error.message : 'Unknown error',
        isError: true,
      };
    }
  }

  /**
   * Read a resource
   */
  async readResource(serverId: string, uri: string): Promise<MCPToolResult> {
    const server = this.servers.get(serverId);
    if (!server || server.status !== 'connected') {
      return { success: false, content: null, error: 'Server not connected', isError: true };
    }

    try {
      if (server.transport === 'http' && server.endpoint) {
        const response = await fetch(`${server.endpoint}/resources/read`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ uri }),
        });

        const data = await response.json();
        return { success: true, content: data.contents };
      }

      return { success: false, content: null, error: 'Unsupported transport', isError: true };
    } catch (error) {
      return {
        success: false,
        content: null,
        error: error instanceof Error ? error.message : 'Unknown error',
        isError: true,
      };
    }
  }

  /**
   * Get all available tools across all connected servers
   */
  getAllTools(): MCPTool[] {
    const tools: MCPTool[] = [];
    for (const server of this.servers.values()) {
      if (server.status === 'connected') {
        tools.push(...server.tools);
      }
    }
    return tools;
  }

  /**
   * Get all available resources across all connected servers
   */
  getAllResources(): MCPResource[] {
    const resources: MCPResource[] = [];
    for (const server of this.servers.values()) {
      if (server.status === 'connected') {
        resources.push(...server.resources);
      }
    }
    return resources;
  }

  /**
   * Get all registered servers
   */
  getServers(): MCPServer[] {
    return Array.from(this.servers.values());
  }

  /**
   * Disconnect from a server
   */
  disconnect(serverId: string): void {
    const server = this.servers.get(serverId);
    if (server) {
      server.status = 'disconnected';
      const ws = this.connections.get(serverId);
      if (ws) {
        ws.close();
        this.connections.delete(serverId);
      }
    }
  }

  /**
   * Disconnect from all servers
   */
  disconnectAll(): void {
    for (const serverId of this.servers.keys()) {
      this.disconnect(serverId);
    }
  }
}

// Singleton instance
let mcpClientInstance: MCPClient | null = null;

export function getMCPClient(): MCPClient {
  if (!mcpClientInstance) {
    mcpClientInstance = new MCPClient();
  }
  return mcpClientInstance;
}
