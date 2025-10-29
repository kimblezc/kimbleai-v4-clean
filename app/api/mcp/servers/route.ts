/**
 * MCP Servers Management API
 *
 * CRUD operations for managing MCP server configurations.
 *
 * @route GET /api/mcp/servers - List all servers
 * @route POST /api/mcp/servers - Create a new server
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getMCPServerManager } from '@/lib/mcp/mcp-server-manager';
import type { MCPServerConfig, MCPServerRecord } from '@/lib/mcp/types';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

/**
 * GET /api/mcp/servers
 * List all MCP servers (both from database and runtime state)
 *
 * Query parameters:
 * - enabled: Filter by enabled status (true/false)
 * - transport: Filter by transport type (stdio/sse/http)
 * - tag: Filter by tag
 */
export async function GET(request: NextRequest) {
  try {
    console.log('[MCP-LIST] Fetching MCP servers list');
    const { searchParams } = new URL(request.url);
    const enabledFilter = searchParams.get('enabled');
    const transportFilter = searchParams.get('transport');
    const tagFilter = searchParams.get('tag');
    console.log('[MCP-LIST] Filters:', { enabledFilter, transportFilter, tagFilter });

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Build query
    let query = supabase.from('mcp_servers').select('*').order('priority', { ascending: false });

    if (enabledFilter !== null) {
      query = query.eq('enabled', enabledFilter === 'true');
    }

    if (transportFilter) {
      query = query.eq('transport', transportFilter);
    }

    if (tagFilter) {
      query = query.contains('tags', [tagFilter]);
    }

    console.log('[MCP-LIST] Querying database...');
    const { data, error } = await query;

    if (error) {
      console.error('[MCP-LIST] Database query failed');
      console.error('[MCP-LIST] Error:', error);
      console.error('[MCP-LIST] Error message:', error.message);
      console.error('[MCP-LIST] Error code:', error.code);
      throw error;
    }

    console.log('[MCP-LIST] Database query successful, found', data?.length || 0, 'servers');

    // Get runtime state from manager
    console.log('[MCP-LIST] Getting runtime state from manager...');
    const manager = getMCPServerManager();

    // Check if manager needs initialization (serverless cold start)
    let runtimeServers = manager.getAllServers();
    if (runtimeServers.length === 0 && data && data.length > 0) {
      console.log('[MCP-LIST] Manager empty but DB has servers, initializing without auto-connect...');
      try {
        await manager.initializeWithoutConnect();
        runtimeServers = manager.getAllServers();
        console.log('[MCP-LIST] Manager initialized with', runtimeServers.length, 'servers');
      } catch (initError: any) {
        console.warn('[MCP-LIST] Manager initialization warning:', initError.message);
      }
    } else {
      console.log('[MCP-LIST] Runtime servers:', runtimeServers.length);
    }

    // Merge database records with runtime state
    const servers = (data as MCPServerRecord[]).map((record) => {
      const runtimeServer = runtimeServers.find((s) => s.id === record.id);

      return {
        id: record.id,
        name: record.name,
        description: record.description,
        transport: record.transport,
        command: record.command,
        args: record.args,
        url: record.url,
        env: record.env,
        capabilities: record.capabilities,
        timeout: record.timeout,
        retryAttempts: record.retry_attempts,
        retryDelay: record.retry_delay,
        healthCheckInterval: record.health_check_interval,
        healthCheckTimeout: record.health_check_timeout,
        enabled: record.enabled,
        priority: record.priority,
        tags: record.tags,
        createdAt: record.created_at,
        updatedAt: record.updated_at,
        // Runtime state
        status: runtimeServer?.status || 'disconnected',
        isConnected: runtimeServer?.status === 'connected',
        connectedAt: runtimeServer?.connectedAt?.toISOString(),
        lastHealthCheck: runtimeServer?.lastHealthCheck?.toISOString(),
        lastError: runtimeServer?.lastError
          ? {
              message: runtimeServer.lastError.message,
              code: (runtimeServer.lastError as any).code,
            }
          : null,
        metrics: runtimeServer?.metrics || {
          totalRequests: 0,
          successfulRequests: 0,
          failedRequests: 0,
          averageResponseTime: 0,
        },
        toolsCount: runtimeServer?.availableTools?.length || 0,
        resourcesCount: runtimeServer?.availableResources?.length || 0,
        promptsCount: runtimeServer?.availablePrompts?.length || 0,
      };
    });

    console.log('[MCP-LIST] Successfully merged data, returning', servers.length, 'servers');
    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      servers,
      total: servers.length,
      connected: servers.filter((s) => s.isConnected).length,
      disconnected: servers.filter((s) => !s.isConnected).length,
    });
  } catch (error: any) {
    console.error('[MCP-LIST] Failed to fetch servers');
    console.error('[MCP-LIST] Error:', error);
    console.error('[MCP-LIST] Error message:', error.message);
    console.error('[MCP-LIST] Error stack:', error.stack);
    console.error('[MCP-LIST] Error name:', error.name);

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch servers',
        details: error.message,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/mcp/servers
 * Create a new MCP server configuration
 *
 * Request body: MCPServerConfig (without id, createdAt, updatedAt)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('[MCP-INSTALL] Received server installation request');
    console.log('[MCP-INSTALL] Server name:', body.name);
    console.log('[MCP-INSTALL] Transport:', body.transport);
    console.log('[MCP-INSTALL] Command:', body.command);
    console.log('[MCP-INSTALL] Args:', body.args);

    // Validate required fields
    const requiredFields = ['name', 'transport', 'priority'];
    for (const field of requiredFields) {
      if (!body[field]) {
        return NextResponse.json(
          {
            success: false,
            error: `Field '${field}' is required`,
          },
          { status: 400 }
        );
      }
    }

    // Validate transport-specific requirements
    if (body.transport === 'stdio' && !body.command) {
      return NextResponse.json(
        {
          success: false,
          error: 'Command is required for stdio transport',
        },
        { status: 400 }
      );
    }

    if ((body.transport === 'sse' || body.transport === 'http') && !body.url) {
      return NextResponse.json(
        {
          success: false,
          error: 'URL is required for SSE/HTTP transport',
        },
        { status: 400 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Process args - replace __WORKING_DIR__ placeholder with actual working directory
    let processedArgs = body.args || [];
    if (Array.isArray(processedArgs)) {
      processedArgs = processedArgs.map((arg: string) =>
        arg === '__WORKING_DIR__' ? process.cwd() : arg
      );
    }
    console.log('[MCP-INSTALL] Processed args:', processedArgs);

    // Insert server configuration
    console.log('[MCP-INSTALL] Inserting server into database...');
    const { data, error } = await supabase
      .from('mcp_servers')
      .insert({
        name: body.name,
        description: body.description || null,
        transport: body.transport,
        command: body.command || null,
        args: processedArgs,
        url: body.url || null,
        env: body.env || {},
        capabilities: body.capabilities || {},
        timeout: body.timeout || 30000,
        retry_attempts: body.retryAttempts || 3,
        retry_delay: body.retryDelay || 1000,
        health_check_interval: body.healthCheckInterval || 60000,
        health_check_timeout: body.healthCheckTimeout || 5000,
        enabled: body.enabled !== undefined ? body.enabled : true,
        priority: body.priority,
        tags: body.tags || [],
      })
      .select()
      .single();

    if (error) {
      console.error('[MCP-INSTALL] Database insert failed');
      console.error('[MCP-INSTALL] Error:', error);
      console.error('[MCP-INSTALL] Error message:', error.message);
      console.error('[MCP-INSTALL] Error code:', error.code);
      throw error;
    }

    console.log('[MCP-INSTALL] Database insert successful, server ID:', data.id);

    // Add server to manager if enabled
    if (data.enabled) {
      console.log('[MCP-INSTALL] Server is enabled, adding to manager...');
      const manager = getMCPServerManager();

      // Check if manager is initialized (has servers loaded)
      const existingServers = manager.getAllServers();
      console.log('[MCP-INSTALL] Manager has', existingServers.length, 'servers currently');

      // If manager is empty, it needs initialization (serverless cold start)
      if (existingServers.length === 0) {
        console.log('[MCP-INSTALL] Manager is empty, initializing without auto-connect...');
        try {
          await manager.initializeWithoutConnect();
          console.log('[MCP-INSTALL] Manager initialized successfully');
        } catch (initError: any) {
          console.warn('[MCP-INSTALL] Manager initialization warning:', initError.message);
        }
      }
      const config: MCPServerConfig = {
        id: data.id,
        name: data.name,
        description: data.description || undefined,
        transport: data.transport as any,
        enabled: data.enabled,
        priority: data.priority,
        command: data.command || undefined,
        args: data.args || undefined,
        url: data.url || undefined,
        env: data.env || undefined,
        capabilities: data.capabilities || undefined,
        timeout: data.timeout,
        retryAttempts: data.retry_attempts,
        retryDelay: data.retry_delay,
        healthCheckInterval: data.health_check_interval,
        healthCheckTimeout: data.health_check_timeout,
        tags: data.tags || undefined,
      };

      try {
        await manager.addServer(config);
        console.log('[MCP-INSTALL] Server added to manager successfully');
      } catch (error: any) {
        console.error('[MCP-INSTALL] Failed to add server to manager');
        console.error('[MCP-INSTALL] Error:', error);
        console.error('[MCP-INSTALL] Error message:', error.message);
        console.error('[MCP-INSTALL] Error stack:', error.stack);
        throw error;
      }

      // Auto-connect if enabled
      console.log('[MCP-INSTALL] Attempting to auto-connect server...');
      try {
        await manager.connectServer(data.id);
        console.log('[MCP-INSTALL] Server auto-connected successfully');
      } catch (error: any) {
        console.error('[MCP-INSTALL] Failed to auto-connect server');
        console.error('[MCP-INSTALL] Error:', error);
        console.error('[MCP-INSTALL] Error message:', error.message);
        console.error('[MCP-INSTALL] Error stack:', error.stack);
      }
    }

    console.log('[MCP-INSTALL] Server installation completed successfully');
    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      server: data,
    });
  } catch (error: any) {
    console.error('[MCP-INSTALL] Server installation failed');
    console.error('[MCP-INSTALL] Error:', error);
    console.error('[MCP-INSTALL] Error message:', error.message);
    console.error('[MCP-INSTALL] Error stack:', error.stack);
    console.error('[MCP-INSTALL] Error name:', error.name);

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to create server',
        details: error.message,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/mcp/servers
 * Update an existing MCP server configuration
 *
 * Request body: Partial<MCPServerConfig> with required id
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.id) {
      return NextResponse.json(
        {
          success: false,
          error: 'Server ID is required',
        },
        { status: 400 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Build update object (only include provided fields)
    const updates: any = {};

    if (body.name !== undefined) updates.name = body.name;
    if (body.description !== undefined) updates.description = body.description;
    if (body.transport !== undefined) updates.transport = body.transport;
    if (body.command !== undefined) updates.command = body.command;
    if (body.args !== undefined) updates.args = body.args;
    if (body.url !== undefined) updates.url = body.url;
    if (body.env !== undefined) updates.env = body.env;
    if (body.capabilities !== undefined) updates.capabilities = body.capabilities;
    if (body.timeout !== undefined) updates.timeout = body.timeout;
    if (body.retryAttempts !== undefined)
      updates.retry_attempts = body.retryAttempts;
    if (body.retryDelay !== undefined) updates.retry_delay = body.retryDelay;
    if (body.healthCheckInterval !== undefined)
      updates.health_check_interval = body.healthCheckInterval;
    if (body.healthCheckTimeout !== undefined)
      updates.health_check_timeout = body.healthCheckTimeout;
    if (body.enabled !== undefined) updates.enabled = body.enabled;
    if (body.priority !== undefined) updates.priority = body.priority;
    if (body.tags !== undefined) updates.tags = body.tags;

    // Update in database
    const { data, error } = await supabase
      .from('mcp_servers')
      .update(updates)
      .eq('id', body.id)
      .select()
      .single();

    if (error) throw error;

    // Update in manager
    const manager = getMCPServerManager();
    const server = manager.getServer(body.id);

    if (server) {
      // If enabled status changed
      if (body.enabled !== undefined && body.enabled !== server.config.enabled) {
        if (body.enabled) {
          // Reconnect server
          try {
            await manager.connectServer(body.id);
          } catch (error) {
            console.warn(`Failed to reconnect server ${data.name}:`, error);
          }
        } else {
          // Disconnect server
          await manager.disconnectServer(body.id);
        }
      } else if (server.status === 'connected') {
        // If other settings changed and server is connected, reconnect
        await manager.disconnectServer(body.id);
        try {
          await manager.connectServer(body.id);
        } catch (error) {
          console.warn(`Failed to reconnect server ${data.name}:`, error);
        }
      }
    }

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      server: data,
    });
  } catch (error: any) {
    console.error('Error updating server:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to update server',
        details: error.message,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/mcp/servers
 * Delete an MCP server configuration
 *
 * Query parameter: id
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const serverId = searchParams.get('id');

    if (!serverId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Server ID is required',
        },
        { status: 400 }
      );
    }

    // Remove from manager first
    const manager = getMCPServerManager();
    try {
      await manager.removeServer(serverId);
    } catch (error) {
      console.warn('Server not in manager:', error);
    }

    // Delete from database
    const supabase = createClient(supabaseUrl, supabaseKey);
    const { error } = await supabase
      .from('mcp_servers')
      .delete()
      .eq('id', serverId);

    if (error) throw error;

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      message: `Server ${serverId} deleted successfully`,
    });
  } catch (error: any) {
    console.error('Error deleting server:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to delete server',
        details: error.message,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
