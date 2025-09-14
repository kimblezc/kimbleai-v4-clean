/**
 * Snapshot API - Create and restore session snapshots
 */

import { NextRequest, NextResponse } from 'next/server';
import { SessionContinuitySystem } from '@/lib/session-continuity-system';

export async function POST(req: NextRequest) {
  try {
    const { action, conversationId, userId, projectId, snapshotId } = await req.json();
    
    const continuitySystem = SessionContinuitySystem.getInstance();
    
    switch (action) {
      case 'create':
        if (!conversationId || !userId) {
          return NextResponse.json(
            { error: 'conversationId and userId are required' },
            { status: 400 }
          );
        }
        
        const snapshot = await continuitySystem.createSnapshot(
          conversationId,
          userId,
          projectId
        );
        
        return NextResponse.json({
          success: true,
          snapshot: {
            id: snapshot.id,
            timestamp: snapshot.timestamp,
            message_count: snapshot.message_count,
            token_count: snapshot.token_count,
            file_path: `D:\\OneDrive\\Documents\\kimbleai-v4-clean\\OPUS_4_TRANSITION_${snapshot.id}.md`
          },
          message: `Snapshot created successfully. Token count: ${snapshot.token_count}`
        });
        
      case 'restore':
        if (!snapshotId) {
          return NextResponse.json(
            { error: 'snapshotId is required' },
            { status: 400 }
          );
        }
        
        const restoredSnapshot = await continuitySystem.restoreFromSnapshot(snapshotId);
        
        return NextResponse.json({
          success: true,
          snapshot: restoredSnapshot,
          message: `Snapshot ${snapshotId} restored successfully`
        });
        
      default:
        return NextResponse.json(
          { error: 'Invalid action. Use "create" or "restore"' },
          { status: 400 }
        );
    }
    
  } catch (error: any) {
    console.error('Snapshot API error:', error);
    return NextResponse.json(
      { error: 'Snapshot operation failed', details: error.message },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const snapshotId = searchParams.get('id');
    
    if (!snapshotId) {
      return NextResponse.json(
        { error: 'Snapshot ID is required' },
        { status: 400 }
      );
    }
    
    const continuitySystem = SessionContinuitySystem.getInstance();
    const snapshot = await continuitySystem.restoreFromSnapshot(snapshotId);
    
    if (!snapshot) {
      return NextResponse.json(
        { error: 'Snapshot not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      snapshot,
      transition_file: `D:\\OneDrive\\Documents\\kimbleai-v4-clean\\OPUS_4_TRANSITION_${snapshotId}.md`
    });
    
  } catch (error: any) {
    console.error('Get snapshot error:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve snapshot', details: error.message },
      { status: 500 }
    );
  }
}