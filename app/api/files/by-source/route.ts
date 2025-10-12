import { NextRequest, NextResponse } from 'next/server';
import { UnifiedFileSystem, FileSource } from '@/lib/unified-file-system';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * GET /api/files/by-source
 * Get files by source and source ID
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const source = searchParams.get('source') as FileSource;
    const sourceId = searchParams.get('sourceId');
    const userId = searchParams.get('userId') || 'zach';

    if (!source || !sourceId) {
      return NextResponse.json({
        success: false,
        error: 'source and sourceId are required'
      }, { status: 400 });
    }

    // Get user data
    const { data: userData } = await supabase
      .from('users')
      .select('id')
      .eq('name', userId === 'rebecca' ? 'Rebecca' : 'Zach')
      .single();

    if (!userData) {
      return NextResponse.json({
        success: false,
        error: 'User not found'
      }, { status: 404 });
    }

    const files = await UnifiedFileSystem.getFilesBySource(userData.id, source, sourceId);

    return NextResponse.json({
      success: true,
      files,
      total: files.length
    });

  } catch (error: any) {
    console.error('[FILE API] Error:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to get files by source'
    }, { status: 500 });
  }
}
