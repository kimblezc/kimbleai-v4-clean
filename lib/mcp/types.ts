/**
 * MCP (Model Context Protocol) Type Definitions
 *
 * Comprehensive type definitions for the MCP integration system.
 * Based on @modelcontextprotocol/sdk types with KimbleAI-specific extensions.
 *
 * @module lib/mcp/types
 * @version 1.0.0
 */

import type { Client } from '@modelcontextprotocol/sdk/client/index.js';
import type { Tool, Resource, Prompt } from '@modelcontextprotocol/sdk/types.js';

// ================================================================
// Server Configuration Types
// ================================================================

/**
 * MCP Transport Type
 * Defines how the client communicates with the MCP server
 */
export type MCPTransportType = 'stdio' | 'sse' | 'http';

/**
 * MCP Server Status
 * Lifecycle status of an MCP server connection
 */
export type MCPServerStatus =
  | 'disconnected'   // Server is not connected
  | 'connecting'     // Connection in progress
  | 'connected'      // Server is connected and healthy
  | 'error'          // Server encountered an error
  | 'disabled';      // Server is manually disabled

/**
 * MCP Server Configuration
 * Configuration needed to connect to and manage an MCP server
 */
export interface MCPServerConfig {
  /** Unique identifier for the server */
  id: string;

  /** Human-readable name */
  name: string;

  /** Optional description */
  description?: string;

  /** Transport mechanism */
  transport: MCPTransportType;

  /** Whether the server is enabled */
  enabled: boolean;

  /** Priority for tool resolution (1-10, higher = more priority) */
  priority: number;

  // ============ Stdio Transport Config ============
  /** Command to execute (for stdio transport) */
  command?: string;

  /** Command arguments (for stdio transport) */
  args?: string[];

  // ============ HTTP/SSE Transport Config ============
  /** Server URL (for HTTP/SSE transport) */
  url?: string;

  // ============ Environment & Security ============
  /** Environment variables (API keys, tokens, etc.) */
  env?: Record<string, string>;

  // ============ Capabilities ============
  /** Server capabilities */
  capabilities?: {
    tools?: boolean;
    resources?: boolean;
    prompts?: boolean;
  };

  // ============ Connection Settings ============
  /** Request timeout in milliseconds */
  timeout?: number;

  /** Number of retry attempts on failure */
  retryAttempts?: number;

  /** Delay between retries in milliseconds */
  retryDelay?: number;

  // ============ Health Check Settings ============
  /** Health check interval in milliseconds */
  healthCheckInterval?: number;

  /** Health check timeout in milliseconds */
  healthCheckTimeout?: number;

  // ============ Metadata ============
  /** Tags for categorization */
  tags?: string[];

  /** Creation timestamp */
  createdAt?: Date;

  /** Last update timestamp */
  updatedAt?: Date;
}

/**
 * MCP Server Instance
 * Runtime representation of an MCP server with connection state
 */
export interface MCPServerInstance {
  /** Unique identifier */
  id: string;

  /** Server configuration */
  config: MCPServerConfig;

  /** MCP client instance (null if disconnected) */
  client: Client | null;

  /** Current connection status */
  status: MCPServerStatus;

  /** Last health check timestamp */
  lastHealthCheck?: Date;

  /** Last error encountered */
  lastError?: Error;

  /** Timestamp when connection was established */
  connectedAt?: Date;

  /** Server metrics */
  metrics: MCPServerMetrics;

  /** Available tools (cached from server) */
  availableTools?: Tool[];

  /** Available resources (cached from server) */
  availableResources?: Resource[];

  /** Available prompts (cached from server) */
  availablePrompts?: Prompt[];
}

/**
 * MCP Server Metrics
 * Performance and reliability metrics for monitoring
 */
export interface MCPServerMetrics {
  /** Total number of requests */
  totalRequests: number;

  /** Number of successful requests */
  successfulRequests: number;

  /** Number of failed requests */
  failedRequests: number;

  /** Average response time in milliseconds */
  averageResponseTime: number;

  /** Minimum response time in milliseconds */
  minResponseTime?: number;

  /** Maximum response time in milliseconds */
  maxResponseTime?: number;

  /** Last request timestamp */
  lastRequestAt?: Date;

  /** Server uptime in milliseconds */
  uptime?: number;

  /** Uptime percentage (0-100) */
  uptimePercentage?: number;

  /** Error rate percentage (0-100) */
  errorRate?: number;
}

// ================================================================
// Tool Invocation Types
// ================================================================

/**
 * Tool Invocation Request
 * Request to invoke a tool on an MCP server
 */
export interface ToolInvocationRequest {
  /** Server ID to invoke the tool on */
  serverId: string;

  /** Name of the tool to invoke */
  toolName: string;

  /** Tool arguments */
  arguments: Record<string, any>;

  /** Optional timeout override (milliseconds) */
  timeout?: number;

  /** User ID for tracking */
  userId?: string;

  /** Conversation ID for context */
  conversationId?: string;
}

/**
 * Tool Invocation Result
 * Result of a tool invocation
 */
export interface ToolInvocationResult {
  /** Whether the invocation was successful */
  success: boolean;

  /** Server ID that executed the tool */
  serverId: string;

  /** Tool name that was executed */
  toolName: string;

  /** Tool output content */
  content?: any;

  /** Structured content (if tool supports it) */
  structuredContent?: any;

  /** Error message (if failed) */
  error?: string;

  /** Error code (if failed) */
  errorCode?: string;

  /** Execution time in milliseconds */
  executionTime: number;

  /** Timestamp */
  timestamp?: Date;
}

/**
 * Tool Discovery Result
 * Result of listing tools from a server
 */
export interface ToolDiscoveryResult {
  /** Server ID */
  serverId: string;

  /** Server name */
  serverName: string;

  /** List of available tools */
  tools: Tool[];
}

// ================================================================
// Resource Access Types
// ================================================================

/**
 * Resource Access Request
 * Request to access a resource on an MCP server
 */
export interface ResourceAccessRequest {
  /** Server ID to access the resource on */
  serverId: string;

  /** Resource URI */
  uri: string;

  /** Optional parameters for resource templates */
  parameters?: Record<string, any>;

  /** User ID for tracking */
  userId?: string;
}

/**
 * Resource Access Result
 * Result of accessing a resource
 */
export interface ResourceAccessResult {
  /** Whether the access was successful */
  success: boolean;

  /** Server ID that provided the resource */
  serverId: string;

  /** Resource URI */
  uri: string;

  /** Resource content */
  content?: any;

  /** MIME type of the content */
  mimeType?: string;

  /** Error message (if failed) */
  error?: string;

  /** Error code (if failed) */
  errorCode?: string;

  /** Timestamp */
  timestamp?: Date;
}

/**
 * Resource Discovery Result
 * Result of listing resources from a server
 */
export interface ResourceDiscoveryResult {
  /** Server ID */
  serverId: string;

  /** Server name */
  serverName: string;

  /** List of available resources */
  resources: Resource[];
}

// ================================================================
// Connection Events Types
// ================================================================

/**
 * Connection Event Type
 */
export type MCPConnectionEventType =
  | 'connected'
  | 'disconnected'
  | 'error'
  | 'health_check';

/**
 * MCP Connection Event
 * Event emitted during server lifecycle
 */
export interface MCPConnectionEvent {
  /** Event type */
  type: MCPConnectionEventType;

  /** Server ID */
  serverId: string;

  /** Event timestamp */
  timestamp: Date;

  /** Additional event data */
  data?: any;

  /** Error (if applicable) */
  error?: Error;
}

/**
 * Health Check Result
 * Result of a server health check
 */
export interface HealthCheckResult {
  /** Server ID */
  serverId: string;

  /** Whether the server is healthy */
  healthy: boolean;

  /** Response time in milliseconds */
  responseTime?: number;

  /** Error message (if unhealthy) */
  error?: string;

  /** Timestamp of the check */
  timestamp: Date;
}

// ================================================================
// Database Record Types
// ================================================================

/**
 * MCP Server Database Record
 * Matches the mcp_servers table schema
 */
export interface MCPServerRecord {
  id: string;
  name: string;
  description: string | null;
  transport: string;
  command: string | null;
  args: any;
  url: string | null;
  env: any;
  capabilities: any;
  timeout: number;
  retry_attempts: number;
  retry_delay: number;
  health_check_interval: number;
  health_check_timeout: number;
  enabled: boolean;
  priority: number;
  created_at: string;
  updated_at: string;
  tags: string[];
}

/**
 * MCP Connection Log Database Record
 * Matches the mcp_connection_logs table schema
 */
export interface MCPConnectionLogRecord {
  id: string;
  server_id: string;
  event_type: string;
  status: string | null;
  error_message: string | null;
  error_code: string | null;
  metadata: any;
  created_at: string;
}

/**
 * MCP Tool Invocation Database Record
 * Matches the mcp_tool_invocations table schema
 */
export interface MCPToolInvocationRecord {
  id: string;
  server_id: string;
  tool_name: string;
  arguments: any;
  result: any;
  success: boolean;
  execution_time: number | null;
  error_message: string | null;
  error_code: string | null;
  invoked_by: string | null;
  conversation_id: string | null;
  created_at: string;
}

/**
 * MCP Server Metrics Database Record
 * Matches the mcp_server_metrics table schema
 */
export interface MCPServerMetricsRecord {
  id: string;
  server_id: string;
  date: string;
  total_requests: number;
  successful_requests: number;
  failed_requests: number;
  average_response_time: number;
  min_response_time: number | null;
  max_response_time: number | null;
  uptime_percentage: number;
  total_downtime: number;
  error_rate: number;
  created_at: string;
  updated_at: string;
}

// ================================================================
// Manager Types
// ================================================================

/**
 * Server Manager Configuration
 * Configuration for the MCP Server Manager
 */
export interface ServerManagerConfig {
  /** Whether to auto-connect on startup */
  autoConnect?: boolean;

  /** Whether to auto-reconnect on failure */
  autoReconnect?: boolean;

  /** Maximum number of concurrent connections */
  maxConnections?: number;

  /** Whether to enable connection pooling */
  enablePooling?: boolean;
}

/**
 * Connection Pool Statistics
 */
export interface ConnectionPoolStats {
  /** Total connections in pool */
  totalConnections: number;

  /** Active connections */
  activeConnections: number;

  /** Idle connections */
  idleConnections: number;

  /** Failed connections */
  failedConnections: number;

  /** Average connection time in milliseconds */
  averageConnectionTime: number;
}

// ================================================================
// Error Types
// ================================================================

/**
 * MCP Error
 * Custom error type for MCP operations
 */
export class MCPError extends Error {
  constructor(
    message: string,
    public code: string,
    public serverId?: string,
    public originalError?: Error
  ) {
    super(message);
    this.name = 'MCPError';
  }
}

/**
 * Connection Error
 * Error during server connection
 */
export class MCPConnectionError extends MCPError {
  constructor(message: string, serverId: string, originalError?: Error) {
    super(message, 'CONNECTION_ERROR', serverId, originalError);
    this.name = 'MCPConnectionError';
  }
}

/**
 * Tool Invocation Error
 * Error during tool execution
 */
export class MCPToolInvocationError extends MCPError {
  constructor(
    message: string,
    public toolName: string,
    serverId: string,
    originalError?: Error
  ) {
    super(message, 'TOOL_INVOCATION_ERROR', serverId, originalError);
    this.name = 'MCPToolInvocationError';
  }
}

/**
 * Resource Access Error
 * Error during resource access
 */
export class MCPResourceAccessError extends MCPError {
  constructor(
    message: string,
    public uri: string,
    serverId: string,
    originalError?: Error
  ) {
    super(message, 'RESOURCE_ACCESS_ERROR', serverId, originalError);
    this.name = 'MCPResourceAccessError';
  }
}

// ================================================================
// Utility Types
// ================================================================

/**
 * Server Stats for Dashboard
 */
export interface ServerDashboardStats {
  /** Total number of servers */
  totalServers: number;

  /** Connected servers */
  connectedServers: number;

  /** Disconnected servers */
  disconnectedServers: number;

  /** Servers with errors */
  serversWithErrors: number;

  /** Total tools available across all servers */
  totalToolsAvailable: number;

  /** Total resources available across all servers */
  totalResourcesAvailable: number;

  /** Total tool invocations (all time) */
  totalToolInvocations: number;

  /** Tool invocations today */
  toolInvocationsToday: number;

  /** Average response time across all servers (ms) */
  averageResponseTime: number;

  /** Overall success rate percentage */
  overallSuccessRate: number;
}

/**
 * Server List Item for UI
 */
export interface ServerListItem {
  id: string;
  name: string;
  description: string;
  status: MCPServerStatus;
  transport: MCPTransportType;
  priority: number;
  tags: string[];
  metrics: {
    totalRequests: number;
    successRate: number;
    averageResponseTime: number;
    uptime: number;
  };
  lastHealthCheck?: Date;
  availableToolsCount: number;
  availableResourcesCount: number;
}
