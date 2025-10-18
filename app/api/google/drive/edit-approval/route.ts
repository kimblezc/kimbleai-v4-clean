import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface EditProposal {
  fileId: string;
  fileName: string;
  fileType?: string;
  editType: 'content_replace' | 'content_append' | 'content_prepend' | 'rename' | 'move' | 'delete';
  originalContent?: string;
  newContent?: string;
  newName?: string;
  newFolderId?: string;
  reason: string;
  confidence?: number;
  expectedOutcome?: string;
}

// POST: Create edit proposal, approve/reject, or apply edit
export async function POST(request: NextRequest) {
  try {
    const { action, userId = 'zach', ...params } = await request.json();

    switch (action) {
      case 'propose':
        return await proposeEdit(userId, params as EditProposal);

      case 'approve':
        return await approveEdit(userId, params.proposalId);

      case 'reject':
        return await rejectEdit(userId, params.proposalId, params.reason);

      case 'apply':
        return await applyEdit(userId, params.proposalId);

      default:
        return NextResponse.json({
          error: 'Invalid action',
          availableActions: ['propose', 'approve', 'reject', 'apply']
        }, { status: 400 });
    }

  } catch (error: any) {
    console.error('[Edit Approval] Error:', error);
    return NextResponse.json({
      error: 'Operation failed',
      details: error.message
    }, { status: 500 });
  }
}

// GET: List pending edits or get proposal details
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action') || 'list';
    const userId = searchParams.get('userId') || 'zach';
    const proposalId = searchParams.get('proposalId');
    const status = searchParams.get('status') || 'pending';

    switch (action) {
      case 'list':
        return await listProposals(userId, status);

      case 'get':
        if (!proposalId) {
          return NextResponse.json({ error: 'proposalId required' }, { status: 400 });
        }
        return await getProposal(userId, proposalId);

      case 'history':
        return await getEditHistory(userId);

      default:
        return NextResponse.json({
          error: 'Invalid action',
          availableActions: ['list', 'get', 'history']
        }, { status: 400 });
    }

  } catch (error: any) {
    console.error('[Edit Approval] GET Error:', error);
    return NextResponse.json({
      error: 'Failed to fetch data',
      details: error.message
    }, { status: 500 });
  }
}

// Propose an edit (requires approval before applying)
async function proposeEdit(userId: string, proposal: EditProposal) {
  console.log(`[Edit Approval] Proposing edit for file ${proposal.fileId}`);

  // Get user from database
  const { data: userData } = await supabase
    .from('users')
    .select('id')
    .eq('name', userId === 'rebecca' ? 'Rebecca' : 'Zach')
    .single();

  if (!userData) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  // Calculate content diff if applicable
  let contentDiff = null;
  if (proposal.originalContent && proposal.newContent) {
    contentDiff = generateSimpleDiff(proposal.originalContent, proposal.newContent);
  }

  // Insert proposal into database
  const { data: proposalData, error } = await supabase
    .from('drive_edit_proposals')
    .insert({
      user_id: userData.id,
      file_id: proposal.fileId,
      file_name: proposal.fileName,
      file_type: proposal.fileType,
      edit_type: proposal.editType,
      original_content: proposal.originalContent,
      new_content: proposal.newContent,
      content_diff: contentDiff,
      new_name: proposal.newName,
      new_folder_id: proposal.newFolderId,
      reason: proposal.reason,
      ai_confidence: proposal.confidence || 0.8,
      expected_outcome: proposal.expectedOutcome,
      status: 'pending'
    })
    .select()
    .single();

  if (error) {
    console.error('[Edit Approval] Failed to create proposal:', error);
    return NextResponse.json({
      error: 'Failed to create edit proposal',
      details: error.message
    }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    message: 'Edit proposal created - awaiting approval',
    proposal: {
      id: proposalData.id,
      fileId: proposalData.file_id,
      fileName: proposalData.file_name,
      editType: proposalData.edit_type,
      status: proposalData.status,
      reason: proposalData.reason,
      confidence: proposalData.ai_confidence,
      createdAt: proposalData.created_at
    }
  });
}

// List pending edit proposals
async function listProposals(userId: string, status: string) {
  const { data: userData } = await supabase
    .from('users')
    .select('id')
    .eq('name', userId === 'rebecca' ? 'Rebecca' : 'Zach')
    .single();

  if (!userData) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  const { data: proposals, error } = await supabase
    .from('drive_edit_proposals')
    .select('*')
    .eq('user_id', userData.id)
    .eq('status', status)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) {
    return NextResponse.json({
      error: 'Failed to fetch proposals',
      details: error.message
    }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    count: proposals?.length || 0,
    proposals: proposals?.map(p => ({
      id: p.id,
      fileId: p.file_id,
      fileName: p.file_name,
      editType: p.edit_type,
      status: p.status,
      reason: p.reason,
      confidence: p.ai_confidence,
      createdAt: p.created_at,
      reviewedAt: p.reviewed_at,
      appliedAt: p.applied_at
    })) || []
  });
}

// Get specific proposal details
async function getProposal(userId: string, proposalId: string) {
  const { data: userData } = await supabase
    .from('users')
    .select('id')
    .eq('name', userId === 'rebecca' ? 'Rebecca' : 'Zach')
    .single();

  if (!userData) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  const { data: proposal, error } = await supabase
    .from('drive_edit_proposals')
    .select('*')
    .eq('id', proposalId)
    .eq('user_id', userData.id)
    .single();

  if (error || !proposal) {
    return NextResponse.json({
      error: 'Proposal not found',
      details: error?.message
    }, { status: 404 });
  }

  return NextResponse.json({
    success: true,
    proposal: {
      id: proposal.id,
      fileId: proposal.file_id,
      fileName: proposal.file_name,
      fileType: proposal.file_type,
      editType: proposal.edit_type,
      originalContent: proposal.original_content,
      newContent: proposal.new_content,
      contentDiff: proposal.content_diff,
      newName: proposal.new_name,
      newFolderId: proposal.new_folder_id,
      reason: proposal.reason,
      confidence: proposal.ai_confidence,
      expectedOutcome: proposal.expected_outcome,
      status: proposal.status,
      createdAt: proposal.created_at,
      reviewedAt: proposal.reviewed_at,
      appliedAt: proposal.applied_at,
      error: proposal.error_message
    }
  });
}

// Approve an edit proposal
async function approveEdit(userId: string, proposalId: string) {
  console.log(`[Edit Approval] Approving proposal ${proposalId}`);

  const { data: userData } = await supabase
    .from('users')
    .select('id')
    .eq('name', userId === 'rebecca' ? 'Rebecca' : 'Zach')
    .single();

  if (!userData) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  // Update proposal status to approved
  const { data: proposal, error } = await supabase
    .from('drive_edit_proposals')
    .update({
      status: 'approved',
      reviewed_at: new Date().toISOString()
    })
    .eq('id', proposalId)
    .eq('user_id', userData.id)
    .eq('status', 'pending')
    .select()
    .single();

  if (error || !proposal) {
    return NextResponse.json({
      error: 'Failed to approve proposal',
      details: error?.message || 'Proposal not found or already processed'
    }, { status: 400 });
  }

  return NextResponse.json({
    success: true,
    message: 'Edit approved - ready to apply',
    proposal: {
      id: proposal.id,
      status: proposal.status,
      reviewedAt: proposal.reviewed_at
    }
  });
}

// Reject an edit proposal
async function rejectEdit(userId: string, proposalId: string, reason?: string) {
  console.log(`[Edit Approval] Rejecting proposal ${proposalId}`);

  const { data: userData } = await supabase
    .from('users')
    .select('id')
    .eq('name', userId === 'rebecca' ? 'Rebecca' : 'Zach')
    .single();

  if (!userData) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  const { data: proposal, error } = await supabase
    .from('drive_edit_proposals')
    .update({
      status: 'rejected',
      reviewed_at: new Date().toISOString(),
      error_message: reason || 'Rejected by user'
    })
    .eq('id', proposalId)
    .eq('user_id', userData.id)
    .eq('status', 'pending')
    .select()
    .single();

  if (error || !proposal) {
    return NextResponse.json({
      error: 'Failed to reject proposal',
      details: error?.message || 'Proposal not found or already processed'
    }, { status: 400 });
  }

  return NextResponse.json({
    success: true,
    message: 'Edit rejected',
    proposal: {
      id: proposal.id,
      status: proposal.status,
      reviewedAt: proposal.reviewed_at
    }
  });
}

// Apply an approved edit to Google Drive
async function applyEdit(userId: string, proposalId: string) {
  console.log(`[Edit Approval] Applying edit ${proposalId}`);

  const { data: userData } = await supabase
    .from('users')
    .select('id')
    .eq('name', userId === 'rebecca' ? 'Rebecca' : 'Zach')
    .single();

  if (!userData) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  // Get the approved proposal
  const { data: proposal, error: fetchError } = await supabase
    .from('drive_edit_proposals')
    .select('*')
    .eq('id', proposalId)
    .eq('user_id', userData.id)
    .eq('status', 'approved')
    .single();

  if (fetchError || !proposal) {
    return NextResponse.json({
      error: 'Proposal not found or not approved',
      details: fetchError?.message
    }, { status: 400 });
  }

  // Get user's Google token
  const { data: tokenData } = await supabase
    .from('user_tokens')
    .select('access_token, refresh_token')
    .eq('user_id', userId)
    .single();

  if (!tokenData?.access_token) {
    return NextResponse.json({
      error: 'User not authenticated with Google'
    }, { status: 401 });
  }

  // Initialize Google Drive client
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID!,
    process.env.GOOGLE_CLIENT_SECRET!,
    process.env.NEXTAUTH_URL + '/api/auth/callback/google'
  );
  oauth2Client.setCredentials({
    access_token: tokenData.access_token,
    refresh_token: tokenData.refresh_token
  });

  const drive = google.drive({ version: 'v3', auth: oauth2Client });

  try {
    // Capture before state
    const beforeState = await captureFileState(drive, proposal.file_id);

    // Apply the edit based on type
    let result;
    switch (proposal.edit_type) {
      case 'content_replace':
      case 'content_append':
      case 'content_prepend':
        result = await applyContentEdit(drive, proposal);
        break;

      case 'rename':
        result = await applyRename(drive, proposal);
        break;

      case 'move':
        result = await applyMove(drive, proposal);
        break;

      case 'delete':
        result = await applyDelete(drive, proposal);
        break;

      default:
        throw new Error(`Unknown edit type: ${proposal.edit_type}`);
    }

    // Capture after state
    const afterState = await captureFileState(drive, proposal.file_id);

    // Update proposal status
    await supabase
      .from('drive_edit_proposals')
      .update({
        status: 'applied',
        applied_at: new Date().toISOString()
      })
      .eq('id', proposalId);

    // Record in history
    await supabase
      .from('drive_edit_history')
      .insert({
        proposal_id: proposalId,
        user_id: userData.id,
        file_id: proposal.file_id,
        file_name: proposal.file_name,
        edit_type: proposal.edit_type,
        action_taken: JSON.stringify(result),
        before_state: beforeState,
        after_state: afterState,
        applied_by: userId
      });

    return NextResponse.json({
      success: true,
      message: 'Edit applied successfully',
      result: {
        proposalId: proposalId,
        fileId: proposal.file_id,
        fileName: proposal.file_name,
        editType: proposal.edit_type,
        appliedAt: new Date().toISOString()
      }
    });

  } catch (error: any) {
    console.error('[Edit Approval] Failed to apply edit:', error);

    // Update proposal with error
    await supabase
      .from('drive_edit_proposals')
      .update({
        status: 'failed',
        error_message: error.message
      })
      .eq('id', proposalId);

    return NextResponse.json({
      error: 'Failed to apply edit',
      details: error.message
    }, { status: 500 });
  }
}

// Get edit history
async function getEditHistory(userId: string) {
  const { data: userData } = await supabase
    .from('users')
    .select('id')
    .eq('name', userId === 'rebecca' ? 'Rebecca' : 'Zach')
    .single();

  if (!userData) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  const { data: history, error } = await supabase
    .from('drive_edit_history')
    .select('*')
    .eq('user_id', userData.id)
    .order('applied_at', { ascending: false })
    .limit(100);

  if (error) {
    return NextResponse.json({
      error: 'Failed to fetch history',
      details: error.message
    }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    count: history?.length || 0,
    history: history || []
  });
}

// Helper: Apply content edit
async function applyContentEdit(drive: any, proposal: any) {
  const fileId = proposal.file_id;
  const newContent = proposal.new_content;

  // Get file metadata to determine type
  const metadata = await drive.files.get({
    fileId,
    fields: 'mimeType'
  });

  const mimeType = metadata.data.mimeType;

  // Update content based on file type
  if (mimeType === 'application/vnd.google-apps.document') {
    // For Google Docs, we need to use the Docs API
    // For now, we'll export and re-upload as plain text
    await drive.files.update({
      fileId,
      media: {
        mimeType: 'text/plain',
        body: newContent
      }
    });
  } else if (mimeType?.startsWith('text/')) {
    // For text files, direct update
    await drive.files.update({
      fileId,
      media: {
        mimeType: 'text/plain',
        body: newContent
      }
    });
  } else {
    throw new Error(`Unsupported file type for content edit: ${mimeType}`);
  }

  return { updated: true, contentLength: newContent.length };
}

// Helper: Apply rename
async function applyRename(drive: any, proposal: any) {
  await drive.files.update({
    fileId: proposal.file_id,
    resource: {
      name: proposal.new_name
    }
  });

  return { renamed: true, newName: proposal.new_name };
}

// Helper: Apply move
async function applyMove(drive: any, proposal: any) {
  // Get current parents
  const file = await drive.files.get({
    fileId: proposal.file_id,
    fields: 'parents'
  });

  const previousParents = file.data.parents?.join(',');

  // Move file
  await drive.files.update({
    fileId: proposal.file_id,
    addParents: proposal.new_folder_id,
    removeParents: previousParents,
    fields: 'id, parents'
  });

  return { moved: true, newParent: proposal.new_folder_id };
}

// Helper: Apply delete
async function applyDelete(drive: any, proposal: any) {
  await drive.files.delete({
    fileId: proposal.file_id
  });

  return { deleted: true };
}

// Helper: Capture file state for audit trail
async function captureFileState(drive: any, fileId: string) {
  try {
    const file = await drive.files.get({
      fileId,
      fields: 'id, name, mimeType, size, modifiedTime, parents'
    });

    return {
      id: file.data.id,
      name: file.data.name,
      mimeType: file.data.mimeType,
      size: file.data.size,
      modifiedTime: file.data.modifiedTime,
      parents: file.data.parents
    };
  } catch (error) {
    return null; // File might have been deleted
  }
}

// Helper: Generate simple diff (character-based)
function generateSimpleDiff(original: string, modified: string): string {
  const maxLength = 500;

  // Truncate for diff display
  const origShort = original.substring(0, maxLength);
  const modShort = modified.substring(0, maxLength);

  if (origShort === modShort) {
    return 'No visible changes in first 500 characters';
  }

  // Simple character-by-character comparison
  let diffLines: string[] = [];
  const origLines = origShort.split('\n');
  const modLines = modShort.split('\n');

  const maxLines = Math.max(origLines.length, modLines.length);
  for (let i = 0; i < maxLines && i < 20; i++) {
    const origLine = origLines[i] || '';
    const modLine = modLines[i] || '';

    if (origLine !== modLine) {
      if (origLine) diffLines.push(`- ${origLine}`);
      if (modLine) diffLines.push(`+ ${modLine}`);
    }
  }

  return diffLines.join('\n') || 'Changes detected';
}
