/**
 * MCP Server Manager
 *
 * Central orchestrator for managing multiple MCP server connections.
 * Handles lifecycle management, health checks, connection pooling,
 * and metrics tracking for all MCP servers.
 *
 * @module lib/mcp/mcp-server-manager
 * @version 1.0.0
 */

import { createClient } from '@supabase/supabase-js';
import { MCPClient } from './mcp-client';
import { broadcastActivity } from '../activity-stream';
import type {
  MCPServerConfig,
  MCPServerInstance,
  MCPServerStatus,
  MCPServerMetrics,
  MCPConnectionEvent,
  HealthCheckResult,
  ServerManagerConfig,
  ConnectionPoolStats,
  ToolInvocationRequest,
  ToolInvocationResult,
  ResourceAccessRequest,
  ResourceAccessResult,
  MCPServerRecord,
} from './types';

/**
 * MCP Server Manager (Singleton)
 * Manages all MCP server connections and operations
 */
export class MCPServerManager {
  private static instance: MCPServerManager | null = null;
  private servers: Map<string, MCPServerInstance> = new Map();
  private healthCheckIntervals: Map<string, NodeJS.Timeout> = new Map();
  private config: ServerManagerConfig;
  private supabase: ReturnType<typeof createClient>;

  private constructor(config: ServerManagerConfig = {}) {
    this.config = {
      autoConnect: config.autoConnect ?? true,
      autoReconnect: config.autoReconnect ?? true,
      maxConnections: config.maxConnections ?? 10,
      enablePooling: config.enablePooling ?? true,
    };

    // Initialize Supabase client
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  /**
   * Get singleton instance
   */
  static getInstance(config?: ServerManagerConfig): MCPServerManager {
    if (!MCPServerManager.instance) {
      MCPServerManager.instance = new MCPServerManager(config);
    }
    return MCPServerManager.instance;
  }

  /**
   * Initialize manager and load servers from database (without auto-connecting)
   * Use this for serverless environments to avoid timeouts
   */
  async initializeWithoutConnect(): Promise<void> {
    console.log('🚀 Initializing MCP Server Manager (no auto-connect)...');

    try {
      // Load server configurations from database
      const configs = await this.loadServerConfigs();
      console.log(`📦 Loaded ${configs.length} server configurations`);

      // Initialize server instances (but don't connect)
      for (const config of configs) {
        await this.addServer(config);
      }

      console.log('✅ MCP Server Manager initialized successfully (no connections made)');
    } catch (error: any) {
      console.error('❌ Failed to initialize MCP Server Manager:', error);
      throw error;
    }
  }

  /**
   * Initialize manager and load servers from database
   */
  async initialize(): Promise<void> {
    console.log('🚀 Initializing MCP Server Manager...');

    try {
      // Load server configurations from database
      const configs = await this.loadServerConfigs();
      console.log(`📦 Loaded ${configs.length} server configurations`);

      // Initialize server instances
      for (const config of configs) {
        await this.addServer(config);
      }

      // Auto-connect enabled servers
      if (this.config.autoConnect) {
        await this.connectAllServers();
      }

      // Broadcast initialization
      await broadcastActivity({
        category: 'system',
        level: 'info',
        message: `MCP Server Manager initialized with ${configs.length} servers`,
        context: {
          serversLoaded: configs.length,
          autoConnect: this.config.autoConnect,
        },
      });

      console.log('✅ MCP Server Manager initialized successfully');
    } catch (error: any) {
      console.error('❌ Failed to initialize MCP Server Manager:', error);
      throw error;
    }
  }

  /**
   * Load server configurations from database
   * @private
   */
  private async loadServerConfigs(): Promise<MCPServerConfig[]> {
    try {
      const { data, error } = await this.supabase
        .from('mcp_servers')
        .select('*')
        .eq('enabled', true)
        .order('priority', { ascending: false });

      if (error) throw error;

      // Transform database records to MCPServerConfig
      return (data as MCPServerRecord[]).map(this.transformDatabaseRecord);
    } catch (error: any) {
      console.error('Error loading server configs:', error);
      throw error;
    }
  }

  /**
   * Transform database record to MCPServerConfig
   * @private
   */
  private transformDatabaseRecord(record: MCPServerRecord): MCPServerConfig {
    return {
      id: record.id,
      name: record.name,
      description: record.description || undefined,
      transport: record.transport as any,
      enabled: record.enabled,
      priority: record.priority,
      command: record.command || undefined,
      args: record.args || undefined,
      url: record.url || undefined,
      env: record.env || undefined,
      capabilities: record.capabilities || undefined,
      timeout: record.timeout,
      retryAttempts: record.retry_attempts,
      retryDelay: record.retry_delay,
      healthCheckInterval: record.health_check_interval,
      healthCheckTimeout: record.health_check_timeout,
      tags: record.tags || undefined,
      createdAt: new Date(record.created_at),
      updatedAt: new Date(record.updated_at),
    };
  }

  /**
   * Add a new server to the manager
   */
  async addServer(config: MCPServerConfig): Promise<void> {
    if (this.servers.has(config.id)) {
      console.warn(`Server ${config.name} already exists, skipping...`);
      return;
    }

    // Check max connections limit
    if (
      this.config.maxConnections &&
      this.servers.size >= this.config.maxConnections
    ) {
      throw new Error(
        `Maximum connection limit reached (${this.config.maxConnections})`
      );
    }

    // Create server instance
    const instance: MCPServerInstance = {
      id: config.id,
      config,
      client: null,
      status: 'disconnected',
      metrics: {
        totalRequests: 0,
        successfulRequests: 0,
        failedRequests: 0,
        averageResponseTime: 0,
      },
    };

    this.servers.set(config.id, instance);
    console.log(`✅ Added server: ${config.name}`);
  }

  /**
   * Remove a server from the manager
   */
  async removeServer(serverId: string): Promise<void> {
    const instance = this.servers.get(serverId);
    if (!instance) {
      throw new Error(`Server ${serverId} not found`);
    }

    // Disconnect if connected
    if (instance.status === 'connected') {
      await this.disconnectServer(serverId);
    }

    // Stop health checks
    this.stopHealthCheck(serverId);

    // Remove from map
    this.servers.delete(serverId);
    console.log(`✅ Removed server: ${instance.config.name}`);
  }

  /**
   * Connect to a specific server
   */
  async connectServer(serverId: string): Promise<void> {
    const instance = this.servers.get(serverId);
    if (!instance) {
      throw new Error(`Server ${serverId} not found`);
    }

    if (instance.status === 'connected') {
      console.log(`Server ${instance.config.name} already connected`);
      return;
    }

    try {
      instance.status = 'connecting';

      // Create and connect client
      const client = new MCPClient(instance.config);
      await client.connect();

      // Update instance
      instance.client = client.getClient();
      instance.status = 'connected';
      instance.connectedAt = new Date();

      // Load capabilities
      await this.loadServerCapabilities(serverId);

      // Start health checks
      this.startHealthCheck(serverId);

      // Log connection event
      await this.logConnectionEvent({
        type: 'connected',
        serverId,
        timestamp: new Date(),
      });

      // Broadcast activity
      await broadcastActivity({
        category: 'system',
        level: 'info',
        message: `Connected to MCP server: ${instance.config.name}`,
        context: {
          serverId,
          serverName: instance.config.name,
          transport: instance.config.transport,
        },
      });

      console.log(`✅ Connected to server: ${instance.config.name}`);
    } catch (error: any) {
      instance.status = 'error';
      instance.lastError = error;

      // Log error event
      await this.logConnectionEvent({
        type: 'error',
        serverId,
        timestamp: new Date(),
        error,
      });

      // Broadcast error
      await broadcastActivity({
        category: 'system',
        level: 'error',
        message: `Failed to connect to MCP server: ${instance.config.name}`,
        context: {
          serverId,
          serverName: instance.config.name,
          error: error.message,
        },
      });

      // Auto-reconnect if enabled
      if (this.config.autoReconnect) {
        this.scheduleReconnect(serverId);
      }

      throw error;
    }
  }

  /**
   * Disconnect from a specific server
   */
  async disconnectServer(serverId: string): Promise<void> {
    const instance = this.servers.get(serverId);
    if (!instance) {
      throw new Error(`Server ${serverId} not found`);
    }

    if (instance.status !== 'connected') {
      console.log(`Server ${instance.config.name} not connected`);
      return;
    }

    try {
      // Stop health checks
      this.stopHealthCheck(serverId);

      // Disconnect client
      const client = new MCPClient(instance.config);
      await client.disconnect();

      // Update instance
      instance.client = null;
      instance.status = 'disconnected';
      instance.connectedAt = undefined;

      // Log disconnection event
      await this.logConnectionEvent({
        type: 'disconnected',
        serverId,
        timestamp: new Date(),
      });

      console.log(`✅ Disconnected from server: ${instance.config.name}`);
    } catch (error: any) {
      console.error(
        `Error disconnecting from ${instance.config.name}:`,
        error
      );
      throw error;
    }
  }

  /**
   * Connect to all enabled servers
   */
  async connectAllServers(): Promise<void> {
    console.log('🔗 Connecting to all enabled servers...');

    const promises = Array.from(this.servers.values())
      .filter((instance) => instance.config.enabled)
      .map((instance) =>
        this.connectServer(instance.id).catch((error) => {
          console.error(
            `Failed to connect to ${instance.config.name}:`,
            error
          );
        })
      );

    await Promise.all(promises);
    console.log('✅ Connection attempts completed');
  }

  /**
   * Disconnect from all servers
   */
  async disconnectAllServers(): Promise<void> {
    console.log('🔌 Disconnecting from all servers...');

    const promises = Array.from(this.servers.values()).map((instance) =>
      this.disconnectServer(instance.id).catch((error) => {
        console.error(`Failed to disconnect from ${instance.config.name}:`, error);
      })
    );

    await Promise.all(promises);
    console.log('✅ All servers disconnected');
  }

  /**
   * Load server capabilities (tools, resources, prompts)
   * @private
   */
  private async loadServerCapabilities(serverId: string): Promise<void> {
    const instance = this.servers.get(serverId);
    if (!instance) return;

    try {
      const client = new MCPClient(instance.config);

      // Load tools
      if (instance.config.capabilities?.tools !== false) {
        instance.availableTools = await client.listTools();
      }

      // Load resources
      if (instance.config.capabilities?.resources !== false) {
        instance.availableResources = await client.listResources();
      }

      // Load prompts
      if (instance.config.capabilities?.prompts !== false) {
        instance.availablePrompts = await client.listPrompts();
      }

      console.log(
        `📋 Loaded capabilities for ${instance.config.name}: ${instance.availableTools?.length || 0} tools, ${instance.availableResources?.length || 0} resources`
      );
    } catch (error: any) {
      console.error(
        `Error loading capabilities for ${instance.config.name}:`,
        error
      );
    }
  }

  /**
   * Start health check for a server
   * @private
   */
  private startHealthCheck(serverId: string): void {
    const instance = this.servers.get(serverId);
    if (!instance) return;

    // Stop existing health check
    this.stopHealthCheck(serverId);

    const interval = instance.config.healthCheckInterval || 60000;

    const intervalId = setInterval(async () => {
      await this.performHealthCheck(serverId);
    }, interval);

    this.healthCheckIntervals.set(serverId, intervalId);
  }

  /**
   * Stop health check for a server
   * @private
   */
  private stopHealthCheck(serverId: string): void {
    const intervalId = this.healthCheckIntervals.get(serverId);
    if (intervalId) {
      clearInterval(intervalId);
      this.healthCheckIntervals.delete(serverId);
    }
  }

  /**
   * Perform health check on a server
   * @private
   */
  private async performHealthCheck(serverId: string): Promise<void> {
    const instance = this.servers.get(serverId);
    if (!instance) return;

    const startTime = Date.now();

    try {
      const client = new MCPClient(instance.config);
      const healthy = await client.ping();

      const responseTime = Date.now() - startTime;

      const result: HealthCheckResult = {
        serverId,
        healthy,
        responseTime,
        timestamp: new Date(),
      };

      instance.lastHealthCheck = new Date();

      // Log health check event
      await this.logConnectionEvent({
        type: 'health_check',
        serverId,
        timestamp: new Date(),
        data: result,
      });

      // If unhealthy, try to reconnect
      if (!healthy && this.config.autoReconnect) {
        console.warn(`Health check failed for ${instance.config.name}`);
        this.scheduleReconnect(serverId);
      }
    } catch (error: any) {
      console.error(
        `Health check error for ${instance.config.name}:`,
        error
      );
      instance.status = 'error';
      instance.lastError = error;

      if (this.config.autoReconnect) {
        this.scheduleReconnect(serverId);
      }
    }
  }

  /**
   * Schedule reconnection attempt
   * @private
   */
  private scheduleReconnect(serverId: string): void {
    const instance = this.servers.get(serverId);
    if (!instance) return;

    const delay = instance.config.retryDelay || 5000;

    console.log(
      `⏱️  Scheduling reconnect for ${instance.config.name} in ${delay}ms`
    );

    setTimeout(async () => {
      try {
        await this.connectServer(serverId);
      } catch (error) {
        console.error(`Reconnect failed for ${instance.config.name}:`, error);
      }
    }, delay);
  }

  /**
   * Log connection event to database
   * @private
   */
  private async logConnectionEvent(event: MCPConnectionEvent): Promise<void> {
    try {
      await this.supabase.from('mcp_connection_logs').insert({
        server_id: event.serverId,
        event_type: event.type,
        status: event.error ? 'failure' : 'success',
        error_message: event.error?.message,
        error_code: (event.error as any)?.code,
        metadata: event.data || {},
      });
    } catch (error: any) {
      console.error('Error logging connection event:', error);
    }
  }

  /**
   * Get server instance by ID
   */
  getServer(serverId: string): MCPServerInstance | undefined {
    return this.servers.get(serverId);
  }

  /**
   * Get all server instances
   */
  getAllServers(): MCPServerInstance[] {
    return Array.from(this.servers.values());
  }

  /**
   * Get connected servers
   */
  getConnectedServers(): MCPServerInstance[] {
    return Array.from(this.servers.values()).filter(
      (instance) => instance.status === 'connected'
    );
  }

  /**
   * Get connection pool statistics
   */
  getPoolStats(): ConnectionPoolStats {
    const servers = Array.from(this.servers.values());

    return {
      totalConnections: servers.length,
      activeConnections: servers.filter((s) => s.status === 'connected').length,
      idleConnections: servers.filter((s) => s.status === 'disconnected')
        .length,
      failedConnections: servers.filter((s) => s.status === 'error').length,
      averageConnectionTime: 0, // TODO: Calculate from metrics
    };
  }

  /**
   * Invoke a tool on a specific server
   */
  async invokeTool(
    request: ToolInvocationRequest
  ): Promise<ToolInvocationResult> {
    const instance = this.servers.get(request.serverId);
    if (!instance) {
      throw new Error(`Server ${request.serverId} not found`);
    }

    if (instance.status !== 'connected') {
      throw new Error(`Server ${instance.config.name} is not connected`);
    }

    const client = new MCPClient(instance.config);
    const result = await client.invokeTool(request);

    // Update metrics
    this.updateMetrics(request.serverId, result);

    // Log invocation to database
    await this.logToolInvocation(request, result);

    return result;
  }

  /**
   * Access a resource on a specific server
   */
  async accessResource(
    request: ResourceAccessRequest
  ): Promise<ResourceAccessResult> {
    const instance = this.servers.get(request.serverId);
    if (!instance) {
      throw new Error(`Server ${request.serverId} not found`);
    }

    if (instance.status !== 'connected') {
      throw new Error(`Server ${instance.config.name} is not connected`);
    }

    const client = new MCPClient(instance.config);
    return await client.accessResource(request);
  }

  /**
   * Update server metrics
   * @private
   */
  private updateMetrics(
    serverId: string,
    result: ToolInvocationResult
  ): void {
    const instance = this.servers.get(serverId);
    if (!instance) return;

    instance.metrics.totalRequests++;

    if (result.success) {
      instance.metrics.successfulRequests++;
    } else {
      instance.metrics.failedRequests++;
    }

    // Update average response time
    const totalTime =
      instance.metrics.averageResponseTime * (instance.metrics.totalRequests - 1);
    instance.metrics.averageResponseTime =
      (totalTime + result.executionTime) / instance.metrics.totalRequests;

    // Update min/max response times
    if (
      !instance.metrics.minResponseTime ||
      result.executionTime < instance.metrics.minResponseTime
    ) {
      instance.metrics.minResponseTime = result.executionTime;
    }

    if (
      !instance.metrics.maxResponseTime ||
      result.executionTime > instance.metrics.maxResponseTime
    ) {
      instance.metrics.maxResponseTime = result.executionTime;
    }

    instance.metrics.lastRequestAt = new Date();
  }

  /**
   * Log tool invocation to database
   * @private
   */
  private async logToolInvocation(
    request: ToolInvocationRequest,
    result: ToolInvocationResult
  ): Promise<void> {
    try {
      await this.supabase.from('mcp_tool_invocations').insert({
        server_id: request.serverId,
        tool_name: request.toolName,
        arguments: request.arguments,
        result: result.content,
        success: result.success,
        execution_time: result.executionTime,
        error_message: result.error,
        error_code: result.errorCode,
        invoked_by: request.userId,
        conversation_id: request.conversationId,
      });
    } catch (error: any) {
      console.error('Error logging tool invocation:', error);
    }
  }

  /**
   * Cleanup and shutdown
   */
  async shutdown(): Promise<void> {
    console.log('🛑 Shutting down MCP Server Manager...');

    // Disconnect all servers
    await this.disconnectAllServers();

    // Clear health check intervals
    for (const intervalId of this.healthCheckIntervals.values()) {
      clearInterval(intervalId);
    }
    this.healthCheckIntervals.clear();

    // Clear servers
    this.servers.clear();

    console.log('✅ MCP Server Manager shut down successfully');
  }
}

/**
 * Get the global MCP Server Manager instance
 */
export function getMCPServerManager(
  config?: ServerManagerConfig
): MCPServerManager {
  return MCPServerManager.getInstance(config);
}

/**
 * Initialize the global MCP Server Manager
 */
export async function initializeMCPServerManager(
  config?: ServerManagerConfig
): Promise<MCPServerManager> {
  const manager = getMCPServerManager(config);
  await manager.initialize();
  return manager;
}
