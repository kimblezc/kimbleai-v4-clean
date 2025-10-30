/**
 * MCP Client Implementation
 *
 * Core client for connecting to and interacting with MCP servers.
 * Supports stdio, SSE, and HTTP transports.
 *
 * @module lib/mcp/mcp-client
 * @version 1.0.0
 */

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import type {
  MCPServerConfig,
  ToolInvocationRequest,
  ToolInvocationResult,
  ResourceAccessRequest,
  ResourceAccessResult,
  MCPConnectionError,
  MCPToolInvocationError,
  MCPResourceAccessError,
} from './types';

/**
 * MCP Client
 * Handles connection and communication with a single MCP server
 */
export class MCPClient {
  private client: Client | null = null;
  private config: MCPServerConfig;
  private connectionPromise: Promise<void> | null = null;

  constructor(config: MCPServerConfig) {
    this.config = config;
  }

  /**
   * Connect to the MCP server
   * @throws {MCPConnectionError} If connection fails
   */
  async connect(): Promise<void> {
    // Return existing connection promise if already connecting
    if (this.connectionPromise) {
      return this.connectionPromise;
    }

    // Already connected
    if (this.client) {
      return Promise.resolve();
    }

    this.connectionPromise = this.performConnection();

    try {
      await this.connectionPromise;
    } finally {
      this.connectionPromise = null;
    }
  }

  /**
   * Perform the actual connection
   * @private
   */
  private async performConnection(): Promise<void> {
    try {
      const transport = this.createTransport();

      this.client = new Client(
        {
          name: 'kimbleai-client',
          version: '4.0.0',
        },
        {
          capabilities: {},
        }
      );

      await this.client.connect(transport);

      console.log(`✅ Connected to MCP server: ${this.config.name}`);
    } catch (error: any) {
      const mcpError = new Error(
        `Failed to connect to ${this.config.name}: ${error.message}`
      ) as any;
      mcpError.code = 'CONNECTION_ERROR';
      mcpError.serverId = this.config.id;
      mcpError.originalError = error;

      console.error(`❌ Connection failed for ${this.config.name}:`, error);
      throw mcpError;
    }
  }

  /**
   * Create transport based on configuration
   * @private
   */
  private createTransport() {
    if (this.config.transport === 'stdio') {
      if (!this.config.command) {
        throw new Error('Stdio transport requires command');
      }

      console.log(`[MCP-CLIENT] Creating stdio transport for ${this.config.name}`);
      console.log(`[MCP-CLIENT] Command: ${this.config.command}`);
      console.log(`[MCP-CLIENT] Args:`, this.config.args);
      console.log(`[MCP-CLIENT] Working directory:`, process.cwd());

      const transport = new StdioClientTransport({
        command: this.config.command,
        args: this.config.args || [],
        env: {
          ...process.env,
          ...this.config.env,
        },
      });

      // Log stderr output from the child process
      if ((transport as any).stderr) {
        (transport as any).stderr.on('data', (data: Buffer) => {
          console.error(`[MCP-STDIO-STDERR] ${this.config.name}:`, data.toString());
        });
      }

      // Log process exit
      if ((transport as any).process) {
        (transport as any).process.on('exit', (code: number, signal: string) => {
          console.log(`[MCP-STDIO-EXIT] ${this.config.name} process exited with code ${code}, signal ${signal}`);
        });

        (transport as any).process.on('error', (error: Error) => {
          console.error(`[MCP-STDIO-PROCESS-ERROR] ${this.config.name}:`, error);
        });
      }

      return transport;
    }

    // SSE and HTTP transports will be added in future iterations
    throw new Error(`Transport ${this.config.transport} not yet implemented`);
  }

  /**
   * Disconnect from the MCP server
   */
  async disconnect(): Promise<void> {
    if (this.client) {
      try {
        await this.client.close();
        console.log(`✅ Disconnected from MCP server: ${this.config.name}`);
      } catch (error: any) {
        console.error(
          `⚠️  Error disconnecting from ${this.config.name}:`,
          error
        );
      } finally {
        this.client = null;
      }
    }
  }

  /**
   * Check if client is connected
   */
  isConnected(): boolean {
    return this.client !== null;
  }

  /**
   * List available tools from the server
   * @throws {MCPConnectionError} If not connected
   */
  async listTools() {
    if (!this.client) {
      throw new Error(`Client not connected to ${this.config.name}`);
    }

    try {
      const response = await this.client.listTools();
      return response.tools;
    } catch (error: any) {
      console.log(`[MCP-TOOLS-DEBUG] Caught error in listTools for ${this.config.name}:`, {
        errorName: error?.name,
        errorConstructor: error?.constructor?.name,
        hasIssues: !!error?.issues,
        isZodError: error?.name === 'ZodError',
        message: error?.message?.substring(0, 100)
      });

      // Handle Zod schema validation errors - extract raw tools by accessing internal transport
      if (error.name === 'ZodError' || error.constructor?.name === 'ZodError') {
        console.warn(`⚠️  Schema validation error for ${this.config.name}. Attempting to extract raw tools by bypassing validation...`);

        try {
          // Access the internal client to send raw request without validation
          const internalClient = (this.client as any)._client || this.client;

          // Send request directly through transport layer
          const rawResponse = await internalClient.request(
            { method: 'tools/list', params: {} },
            {} as any
          );

          console.log(`[MCP-TOOLS-DEBUG] Raw response received:`, {
            hasTools: !!rawResponse?.tools,
            toolsIsArray: Array.isArray(rawResponse?.tools),
            toolCount: rawResponse?.tools?.length
          });

          if (rawResponse && rawResponse.tools && Array.isArray(rawResponse.tools)) {
            console.log(`✅ Extracted ${rawResponse.tools.length} tools from ${this.config.name} (bypassing schema validation)`);

            // Return raw tools even if they don't match schema
            return rawResponse.tools;
          } else {
            console.error(`Raw response doesn't contain tools array:`, rawResponse);
          }
        } catch (rawError) {
          console.error(`Failed to extract raw tools from ${this.config.name}:`, rawError);
        }
      }

      console.error(`Error listing tools from ${this.config.name}:`, error);
      throw error;
    }
  }

  /**
   * Invoke a tool on the server
   * @throws {MCPToolInvocationError} If invocation fails
   */
  async invokeTool(
    request: ToolInvocationRequest
  ): Promise<ToolInvocationResult> {
    if (!this.client) {
      const error = new Error(
        `Client not connected to ${this.config.name}`
      ) as any;
      error.code = 'CONNECTION_ERROR';
      error.serverId = this.config.id;
      throw error;
    }

    const startTime = Date.now();

    try {
      const result = await this.client.callTool(
        {
          name: request.toolName,
          arguments: request.arguments,
        },
        {
          timeout: request.timeout || this.config.timeout,
        }
      );

      const executionTime = Date.now() - startTime;

      return {
        success: true,
        serverId: this.config.id,
        toolName: request.toolName,
        content: result.content,
        executionTime,
        timestamp: new Date(),
      };
    } catch (error: any) {
      const executionTime = Date.now() - startTime;

      const mcpError = new Error(
        `Tool invocation failed: ${error.message}`
      ) as any;
      mcpError.code = 'TOOL_INVOCATION_ERROR';
      mcpError.toolName = request.toolName;
      mcpError.serverId = this.config.id;
      mcpError.originalError = error;

      console.error(
        `❌ Tool invocation failed for ${request.toolName} on ${this.config.name}:`,
        error
      );

      return {
        success: false,
        serverId: this.config.id,
        toolName: request.toolName,
        error: error.message,
        errorCode: error.code || 'UNKNOWN_ERROR',
        executionTime,
        timestamp: new Date(),
      };
    }
  }

  /**
   * List available resources from the server
   * @throws {MCPConnectionError} If not connected
   */
  async listResources() {
    if (!this.client) {
      throw new Error(`Client not connected to ${this.config.name}`);
    }

    try {
      const response = await this.client.listResources();
      return response.resources;
    } catch (error: any) {
      console.error(
        `Error listing resources from ${this.config.name}:`,
        error
      );
      throw error;
    }
  }

  /**
   * Access a resource on the server
   * @throws {MCPResourceAccessError} If access fails
   */
  async accessResource(
    request: ResourceAccessRequest
  ): Promise<ResourceAccessResult> {
    if (!this.client) {
      const error = new Error(
        `Client not connected to ${this.config.name}`
      ) as any;
      error.code = 'CONNECTION_ERROR';
      error.serverId = this.config.id;
      throw error;
    }

    try {
      const result = await this.client.readResource({
        uri: request.uri,
      });

      return {
        success: true,
        serverId: this.config.id,
        uri: request.uri,
        content: result.contents,
        timestamp: new Date(),
      };
    } catch (error: any) {
      const mcpError = new Error(
        `Resource access failed: ${error.message}`
      ) as any;
      mcpError.code = 'RESOURCE_ACCESS_ERROR';
      mcpError.uri = request.uri;
      mcpError.serverId = this.config.id;
      mcpError.originalError = error;

      console.error(
        `❌ Resource access failed for ${request.uri} on ${this.config.name}:`,
        error
      );

      return {
        success: false,
        serverId: this.config.id,
        uri: request.uri,
        error: error.message,
        errorCode: error.code || 'UNKNOWN_ERROR',
        timestamp: new Date(),
      };
    }
  }

  /**
   * List available prompts from the server
   * @throws {MCPConnectionError} If not connected
   */
  async listPrompts() {
    if (!this.client) {
      throw new Error(`Client not connected to ${this.config.name}`);
    }

    try {
      const response = await this.client.listPrompts();
      return response.prompts;
    } catch (error: any) {
      console.error(`Error listing prompts from ${this.config.name}:`, error);
      throw error;
    }
  }

  /**
   * Get a prompt from the server
   */
  async getPrompt(name: string, arguments_?: Record<string, any>) {
    if (!this.client) {
      throw new Error(`Client not connected to ${this.config.name}`);
    }

    try {
      const result = await this.client.getPrompt({
        name,
        arguments: arguments_,
      });
      return result;
    } catch (error: any) {
      console.error(`Error getting prompt from ${this.config.name}:`, error);
      throw error;
    }
  }

  /**
   * Get server information
   */
  getServerInfo() {
    return {
      id: this.config.id,
      name: this.config.name,
      description: this.config.description,
      transport: this.config.transport,
      isConnected: this.isConnected(),
    };
  }

  /**
   * Ping the server to check connectivity
   * @returns True if server responds, false otherwise
   */
  async ping(): Promise<boolean> {
    if (!this.client) {
      return false;
    }

    try {
      // Simple health check by listing tools
      await this.client.listTools();
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get the raw client instance (use with caution)
   * @internal
   */
  getClient(): Client | null {
    return this.client;
  }
}

/**
 * Helper function to create and connect an MCP client
 * @param config Server configuration
 * @returns Connected MCP client
 */
export async function createConnectedClient(
  config: MCPServerConfig
): Promise<MCPClient> {
  const client = new MCPClient(config);
  await client.connect();
  return client;
}

/**
 * Helper function to safely disconnect a client
 * @param client MCP client to disconnect
 */
export async function safelyDisconnect(client: MCPClient): Promise<void> {
  try {
    await client.disconnect();
  } catch (error) {
    console.error('Error during client disconnect:', error);
  }
}
