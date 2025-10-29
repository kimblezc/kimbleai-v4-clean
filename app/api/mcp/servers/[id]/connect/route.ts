/**
 * MCP Server Connect/Disconnect API
 *
 * Connect or disconnect a specific MCP server.
 *
 * @route POST /api/mcp/servers/[id]/connect - Connect to server
 * @route DELETE /api/mcp/servers/[id]/connect - Disconnect from server
 */

import { NextRequest, NextResponse } from 'next/server';
import { getMCPServerManager } from '@/lib/mcp/mcp-server-manager';

/**
 * POST /api/mcp/servers/[id]/connect
 * Connect to an MCP server
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const serverId = params.id;

    if (!serverId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Server ID is required',
        },
        { status: 400 }
      );
    }

    const manager = getMCPServerManager();

    // Check if manager needs initialization (serverless cold start)
    let server = manager.getServer(serverId);
    if (!server) {
      console.log('[MCP-CONNECT] Server not found in manager, initializing without auto-connect...');
      try {
        await manager.initializeWithoutConnect();
        server = manager.getServer(serverId);
        console.log('[MCP-CONNECT] Manager initialized, server found:', !!server);
      } catch (initError: any) {
        console.warn('[MCP-CONNECT] Manager initialization warning:', initError.message);
      }
    }

    // Check if server exists after initialization attempt
    if (!server) {
      return NextResponse.json(
        {
          success: false,
          error: `Server ${serverId} not found`,
        },
        { status: 404 }
      );
    }

    // Check if already connected
    if (server.status === 'connected') {
      return NextResponse.json({
        success: true,
        message: `Server ${server.config.name} is already connected`,
        server: {
          id: server.id,
          name: server.config.name,
          status: server.status,
          connectedAt: server.connectedAt?.toISOString(),
        },
      });
    }

    // Connect to server
    await manager.connectServer(serverId);

    // Get updated state
    const updatedServer = manager.getServer(serverId);

    return NextResponse.json({
      success: true,
      message: `Successfully connected to ${server.config.name}`,
      server: {
        id: updatedServer!.id,
        name: updatedServer!.config.name,
        status: updatedServer!.status,
        connectedAt: updatedServer!.connectedAt?.toISOString(),
        toolsCount: updatedServer!.availableTools?.length || 0,
        resourcesCount: updatedServer!.availableResources?.length || 0,
        promptsCount: updatedServer!.availablePrompts?.length || 0,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Error connecting to server:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to connect to server',
        details: error.message,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/mcp/servers/[id]/connect
 * Disconnect from an MCP server
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const serverId = params.id;

    if (!serverId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Server ID is required',
        },
        { status: 400 }
      );
    }

    const manager = getMCPServerManager();

    // Check if manager needs initialization (serverless cold start)
    let server = manager.getServer(serverId);
    if (!server) {
      console.log('[MCP-CONNECT] Server not found in manager, initializing without auto-connect...');
      try {
        await manager.initializeWithoutConnect();
        server = manager.getServer(serverId);
        console.log('[MCP-CONNECT] Manager initialized, server found:', !!server);
      } catch (initError: any) {
        console.warn('[MCP-CONNECT] Manager initialization warning:', initError.message);
      }
    }

    // Check if server exists after initialization attempt
    if (!server) {
      return NextResponse.json(
        {
          success: false,
          error: `Server ${serverId} not found`,
        },
        { status: 404 }
      );
    }

    // Check if already disconnected
    if (server.status === 'disconnected') {
      return NextResponse.json({
        success: true,
        message: `Server ${server.config.name} is already disconnected`,
        server: {
          id: server.id,
          name: server.config.name,
          status: server.status,
        },
      });
    }

    // Disconnect from server
    await manager.disconnectServer(serverId);

    // Get updated state
    const updatedServer = manager.getServer(serverId);

    return NextResponse.json({
      success: true,
      message: `Successfully disconnected from ${server.config.name}`,
      server: {
        id: updatedServer!.id,
        name: updatedServer!.config.name,
        status: updatedServer!.status,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Error disconnecting from server:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to disconnect from server',
        details: error.message,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
