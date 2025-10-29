/**
 * Fix MCP Server Arguments
 * One-time endpoint to add required directory path for filesystem server
 */

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export const dynamic = 'force-dynamic';

export async function POST() {
  try {
    // Fix filesystem server - add /tmp directory path
    const { data: fsUpdate, error: fsError } = await supabase
      .from('mcp_servers')
      .update({
        args: ['@modelcontextprotocol/server-filesystem', '/tmp']
      })
      .eq('name', 'filesystem')
      .select();

    if (fsError) throw fsError;

    // Verify all servers
    const { data: servers, error: serversError } = await supabase
      .from('mcp_servers')
      .select('name, command, args, enabled')
      .order('priority', { ascending: false });

    if (serversError) throw serversError;

    return NextResponse.json({
      success: true,
      message: 'MCP server arguments fixed',
      updated: fsUpdate,
      servers,
    });
  } catch (error: any) {
    console.error('Error fixing MCP args:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
    }, { status: 500 });
  }
}
