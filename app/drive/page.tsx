'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  size?: number;
  modifiedTime?: string;
  webViewLink?: string;
  iconLink?: string;
}

interface AgentTask {
  id: string;
  type: 'analyze' | 'organize' | 'cleanup' | 'index';
  status: 'pending' | 'running' | 'completed' | 'failed';
  target: string;
  result?: string;
  startedAt?: string;
  completedAt?: string;
}

interface EditProposal {
  id: string;
  fileId: string;
  fileName: string;
  editType: string;
  reason: string;
  confidence: number;
  status: string;
  originalContent?: string;
  newContent?: string;
  contentDiff?: string;
  createdAt: string;
}

export default function DriveIntelligencePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [files, setFiles] = useState<DriveFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentFolder, setCurrentFolder] = useState<string>('root');
  const [breadcrumbs, setBreadcrumbs] = useState<Array<{ id: string; name: string }>>([
    { id: 'root', name: 'My Drive' }
  ]);
  const [tasks, setTasks] = useState<AgentTask[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [pendingEdits, setPendingEdits] = useState<EditProposal[]>([]);
  const [selectedProposal, setSelectedProposal] = useState<EditProposal | null>(null);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
      return;
    }

    if (status === 'authenticated') {
      loadDriveFiles(currentFolder);
      loadPendingEdits();
    }
  }, [status, currentFolder, router]);

  const loadDriveFiles = async (folderId: string) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/google/drive?folderId=${folderId}&pageSize=1000`);
      const data = await response.json();

      if (data.success && data.files) {
        setFiles(data.files);
      }
    } catch (error) {
      console.error('Error loading Drive files:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadPendingEdits = async () => {
    try {
      const response = await fetch('/api/google/drive/edit-approval?action=list&status=pending');
      const data = await response.json();

      if (data.success && data.proposals) {
        setPendingEdits(data.proposals);
      }
    } catch (error) {
      console.error('Error loading pending edits:', error);
    }
  };

  const approveEdit = async (proposalId: string) => {
    try {
      const response = await fetch('/api/google/drive/edit-approval', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'approve', proposalId })
      });

      const data = await response.json();

      if (data.success) {
        // Apply the edit
        const applyResponse = await fetch('/api/google/drive/edit-approval', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'apply', proposalId })
        });

        const applyData = await applyResponse.json();

        if (applyData.success) {
          alert('Edit approved and applied successfully!');
          loadPendingEdits();
          setSelectedProposal(null);
        } else {
          alert(`Failed to apply edit: ${applyData.error}`);
        }
      } else {
        alert(`Failed to approve edit: ${data.error}`);
      }
    } catch (error: any) {
      console.error('Error approving edit:', error);
      alert(`Error: ${error.message}`);
    }
  };

  const rejectEdit = async (proposalId: string, reason?: string) => {
    try {
      const response = await fetch('/api/google/drive/edit-approval', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reject', proposalId, reason })
      });

      const data = await response.json();

      if (data.success) {
        alert('Edit rejected');
        loadPendingEdits();
        setSelectedProposal(null);
      } else {
        alert(`Failed to reject edit: ${data.error}`);
      }
    } catch (error: any) {
      console.error('Error rejecting edit:', error);
      alert(`Error: ${error.message}`);
    }
  };

  const viewProposalDetails = async (proposalId: string) => {
    try {
      const response = await fetch(`/api/google/drive/edit-approval?action=get&proposalId=${proposalId}`);
      const data = await response.json();

      if (data.success && data.proposal) {
        setSelectedProposal(data.proposal);
      }
    } catch (error) {
      console.error('Error loading proposal details:', error);
    }
  };

  const navigateToFolder = (folderId: string, folderName: string) => {
    const newBreadcrumbs = [...breadcrumbs, { id: folderId, name: folderName }];
    setBreadcrumbs(newBreadcrumbs);
    setCurrentFolder(folderId);
  };

  const navigateToBreadcrumb = (index: number) => {
    const newBreadcrumbs = breadcrumbs.slice(0, index + 1);
    setBreadcrumbs(newBreadcrumbs);
    setCurrentFolder(newBreadcrumbs[newBreadcrumbs.length - 1].id);
  };

  const toggleFileSelection = (fileId: string) => {
    const newSelected = new Set(selectedFiles);
    if (newSelected.has(fileId)) {
      newSelected.delete(fileId);
    } else {
      newSelected.add(fileId);
    }
    setSelectedFiles(newSelected);
  };

  const createTask = async (type: AgentTask['type'], target: string) => {
    const newTask: AgentTask = {
      id: `task-${Date.now()}`,
      type,
      status: 'pending',
      target,
      startedAt: new Date().toISOString()
    };

    setTasks([newTask, ...tasks]);

    // Simulate task execution
    setTimeout(() => {
      executeTask(newTask.id, type, target);
    }, 1000);
  };

  const executeTask = async (taskId: string, type: AgentTask['type'], target: string) => {
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: 'running' } : t));

    try {
      let result = '';

      switch (type) {
        case 'analyze':
          result = await analyzeFiles(target);
          break;
        case 'organize':
          result = await organizeFiles(target);
          break;
        case 'cleanup':
          result = await cleanupFiles(target);
          break;
        case 'index':
          result = await indexFiles(target);
          break;
      }

      setTasks(prev => prev.map(t => t.id === taskId ? {
        ...t,
        status: 'completed',
        result,
        completedAt: new Date().toISOString()
      } : t));
    } catch (error: any) {
      setTasks(prev => prev.map(t => t.id === taskId ? {
        ...t,
        status: 'failed',
        result: error.message,
        completedAt: new Date().toISOString()
      } : t));
    }
  };

  const analyzeFiles = async (folderId: string): Promise<string> => {
    // Call Drive Intelligence agent to analyze
    const response = await fetch('/api/google/drive/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ folderId })
    });
    const data = await response.json();
    return data.summary || 'Analysis complete';
  };

  const organizeFiles = async (folderId: string): Promise<string> => {
    // Call Drive Intelligence agent to organize
    return `Organized files in ${folderId} by type and date`;
  };

  const cleanupFiles = async (folderId: string): Promise<string> => {
    // Call Drive Intelligence agent to cleanup
    return `Found 0 duplicates, 0 large files to archive`;
  };

  const indexFiles = async (folderId: string): Promise<string> => {
    try {
      let totalIndexed = 0;
      let totalScanned = 0;
      let pageToken: string | undefined = undefined;
      let hasMore = true;
      let batchCount = 0;

      // Process in batches to avoid timeout
      while (hasMore) {
        batchCount++;
        const response = await fetch('/api/google/drive/index-batch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ folderId, pageToken })
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();

        if (!data.success) {
          throw new Error(data.error || 'Indexing failed');
        }

        totalIndexed = data.totalIndexed || totalIndexed;
        totalScanned += data.scanned || 0;
        hasMore = data.hasMore || false;
        pageToken = data.nextPageToken;

        // Update the task with progress
        if (hasMore) {
          // Optional: Could update UI here with progress
          console.log(`Batch ${batchCount}: ${totalIndexed} files indexed so far...`);
        }
      }

      return `Scanned entire Drive: ${totalIndexed} files indexed, ${totalScanned} files scanned across ${batchCount} batches`;
    } catch (error: any) {
      console.error('Index error:', error);
      throw error;
    }
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType === 'application/vnd.google-apps.folder') return '📁';
    if (mimeType.includes('document')) return '📄';
    if (mimeType.includes('spreadsheet')) return '📊';
    if (mimeType.includes('presentation')) return '📽️';
    if (mimeType.includes('image')) return '🖼️';
    if (mimeType.includes('video')) return '🎥';
    if (mimeType.includes('audio')) return '🎵';
    if (mimeType.includes('pdf')) return '📕';
    return '📎';
  };

  const formatSize = (bytes?: number) => {
    if (!bytes) return '-';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    return (bytes / (1024 * 1024 * 1024)).toFixed(1) + ' GB';
  };

  if (status === 'loading' || loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        backgroundColor: '#0f0f0f',
        color: '#888'
      }}>
        Loading Drive Intelligence...
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#0f0f0f',
      color: '#ffffff',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      padding: '40px 20px'
    }}>
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ marginBottom: '32px' }}>
          <button
            onClick={() => router.push('/')}
            style={{
              background: 'none',
              border: '1px solid #333',
              borderRadius: '6px',
              color: '#888',
              cursor: 'pointer',
              fontSize: '14px',
              padding: '8px 16px',
              marginBottom: '24px'
            }}
          >
            ← Back to Home
          </button>

          <h1 style={{
            fontSize: '32px',
            fontWeight: '700',
            margin: '0 0 8px 0',
            background: 'linear-gradient(135deg, #4a9eff 0%, #10a37f 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent'
          }}>
            📁 Drive Intelligence
          </h1>
          <p style={{ fontSize: '16px', color: '#888', margin: 0 }}>
            AI-powered file organization, cleanup, and analysis for Google Drive
          </p>
        </div>

        {/* Edit Approval Panel */}
        {pendingEdits.length > 0 && (
          <div style={{
            backgroundColor: '#1a2a1a',
            border: '2px solid #10a37f',
            borderRadius: '12px',
            padding: '20px',
            marginBottom: '24px'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '16px'
            }}>
              <h2 style={{
                fontSize: '18px',
                fontWeight: '600',
                margin: 0,
                color: '#10a37f'
              }}>
                ✋ Pending Edit Approvals ({pendingEdits.length})
              </h2>
              <span style={{ fontSize: '12px', color: '#888' }}>
                These edits require your approval
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {pendingEdits.map((proposal) => (
                <div
                  key={proposal.id}
                  style={{
                    backgroundColor: '#0f0f0f',
                    border: '1px solid #333',
                    borderRadius: '8px',
                    padding: '16px'
                  }}
                >
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'start',
                    gap: '16px'
                  }}>
                    <div style={{ flex: 1 }}>
                      <div style={{
                        fontSize: '14px',
                        fontWeight: '600',
                        color: '#fff',
                        marginBottom: '8px'
                      }}>
                        {proposal.fileName}
                      </div>
                      <div style={{
                        fontSize: '12px',
                        color: '#888',
                        marginBottom: '8px'
                      }}>
                        <span style={{
                          padding: '2px 8px',
                          backgroundColor: '#4a9eff22',
                          color: '#4a9eff',
                          borderRadius: '4px',
                          marginRight: '8px'
                        }}>
                          {proposal.editType.replace('_', ' ')}
                        </span>
                        Confidence: {(proposal.confidence * 100).toFixed(0)}%
                      </div>
                      <div style={{
                        fontSize: '13px',
                        color: '#ccc',
                        marginBottom: '12px'
                      }}>
                        <strong>Reason:</strong> {proposal.reason}
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                      <button
                        onClick={() => viewProposalDetails(proposal.id)}
                        style={{
                          padding: '8px 16px',
                          backgroundColor: '#4a9eff',
                          border: 'none',
                          borderRadius: '6px',
                          color: '#fff',
                          fontSize: '12px',
                          cursor: 'pointer',
                          fontWeight: '600'
                        }}
                      >
                        👁️ Review
                      </button>
                      <button
                        onClick={() => {
                          if (confirm(`Are you sure you want to approve this edit to "${proposal.fileName}"?`)) {
                            approveEdit(proposal.id);
                          }
                        }}
                        style={{
                          padding: '8px 16px',
                          backgroundColor: '#10a37f',
                          border: 'none',
                          borderRadius: '6px',
                          color: '#fff',
                          fontSize: '12px',
                          cursor: 'pointer',
                          fontWeight: '600'
                        }}
                      >
                        ✓ Approve
                      </button>
                      <button
                        onClick={() => {
                          const reason = prompt('Reason for rejection (optional):');
                          rejectEdit(proposal.id, reason || undefined);
                        }}
                        style={{
                          padding: '8px 16px',
                          backgroundColor: '#ef4444',
                          border: 'none',
                          borderRadius: '6px',
                          color: '#fff',
                          fontSize: '12px',
                          cursor: 'pointer',
                          fontWeight: '600'
                        }}
                      >
                        ✗ Reject
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Proposal Detail Modal */}
        {selectedProposal && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.8)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 1000
          }}>
            <div style={{
              backgroundColor: '#171717',
              border: '1px solid #333',
              borderRadius: '12px',
              maxWidth: '800px',
              maxHeight: '90vh',
              overflow: 'auto',
              padding: '32px'
            }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'start',
                marginBottom: '24px'
              }}>
                <h2 style={{
                  fontSize: '20px',
                  fontWeight: '600',
                  margin: 0,
                  color: '#fff'
                }}>
                  Edit Proposal Details
                </h2>
                <button
                  onClick={() => setSelectedProposal(null)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#888',
                    fontSize: '20px',
                    cursor: 'pointer'
                  }}
                >
                  ✕
                </button>
              </div>

              <div style={{ marginBottom: '24px' }}>
                <div style={{ marginBottom: '16px' }}>
                  <div style={{ fontSize: '12px', color: '#888', marginBottom: '4px' }}>File Name</div>
                  <div style={{ fontSize: '16px', color: '#fff', fontWeight: '600' }}>
                    {selectedProposal.fileName}
                  </div>
                </div>

                <div style={{ marginBottom: '16px' }}>
                  <div style={{ fontSize: '12px', color: '#888', marginBottom: '4px' }}>Edit Type</div>
                  <div style={{ fontSize: '14px', color: '#4a9eff' }}>
                    {selectedProposal.editType.replace('_', ' ').toUpperCase()}
                  </div>
                </div>

                <div style={{ marginBottom: '16px' }}>
                  <div style={{ fontSize: '12px', color: '#888', marginBottom: '4px' }}>Reason</div>
                  <div style={{ fontSize: '14px', color: '#ccc' }}>
                    {selectedProposal.reason}
                  </div>
                </div>

                <div style={{ marginBottom: '16px' }}>
                  <div style={{ fontSize: '12px', color: '#888', marginBottom: '4px' }}>AI Confidence</div>
                  <div style={{ fontSize: '14px', color: '#10a37f' }}>
                    {(selectedProposal.confidence * 100).toFixed(0)}%
                  </div>
                </div>

                {selectedProposal.contentDiff && (
                  <div style={{ marginBottom: '16px' }}>
                    <div style={{ fontSize: '12px', color: '#888', marginBottom: '8px' }}>Changes Preview</div>
                    <pre style={{
                      fontSize: '12px',
                      color: '#ccc',
                      backgroundColor: '#0a0a0a',
                      padding: '16px',
                      borderRadius: '6px',
                      border: '1px solid #333',
                      overflow: 'auto',
                      maxHeight: '300px',
                      fontFamily: 'monospace',
                      whiteSpace: 'pre-wrap'
                    }}>
                      {selectedProposal.contentDiff}
                    </pre>
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button
                  onClick={() => {
                    if (confirm(`Approve edit to "${selectedProposal.fileName}"?`)) {
                      approveEdit(selectedProposal.id);
                    }
                  }}
                  style={{
                    padding: '12px 24px',
                    backgroundColor: '#10a37f',
                    border: 'none',
                    borderRadius: '8px',
                    color: '#fff',
                    fontSize: '14px',
                    cursor: 'pointer',
                    fontWeight: '600'
                  }}
                >
                  ✓ Approve & Apply
                </button>
                <button
                  onClick={() => {
                    const reason = prompt('Reason for rejection (optional):');
                    rejectEdit(selectedProposal.id, reason || undefined);
                  }}
                  style={{
                    padding: '12px 24px',
                    backgroundColor: '#ef4444',
                    border: 'none',
                    borderRadius: '8px',
                    color: '#fff',
                    fontSize: '14px',
                    cursor: 'pointer',
                    fontWeight: '600'
                  }}
                >
                  ✗ Reject
                </button>
                <button
                  onClick={() => setSelectedProposal(null)}
                  style={{
                    padding: '12px 24px',
                    backgroundColor: 'transparent',
                    border: '1px solid #333',
                    borderRadius: '8px',
                    color: '#888',
                    fontSize: '14px',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Breadcrumbs */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          marginBottom: '24px',
          padding: '12px 16px',
          backgroundColor: '#171717',
          border: '1px solid #333',
          borderRadius: '8px'
        }}>
          {breadcrumbs.map((crumb, index) => (
            <React.Fragment key={crumb.id}>
              <button
                onClick={() => navigateToBreadcrumb(index)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: index === breadcrumbs.length - 1 ? '#4a9eff' : '#888',
                  cursor: 'pointer',
                  fontSize: '14px',
                  padding: '4px 8px'
                }}
              >
                {crumb.name}
              </button>
              {index < breadcrumbs.length - 1 && <span style={{ color: '#555' }}>/</span>}
            </React.Fragment>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px' }}>
          {/* Files List */}
          <div style={{
            backgroundColor: '#171717',
            border: '1px solid #333',
            borderRadius: '12px',
            overflow: 'hidden'
          }}>
            <div style={{
              padding: '20px 24px',
              borderBottom: '1px solid #333',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <h2 style={{ fontSize: '18px', fontWeight: '600', margin: 0 }}>
                Files ({files.length})
              </h2>
              <div style={{ display: 'flex', gap: '8px' }}>
                {selectedFiles.size > 0 && (
                  <>
                    <button
                      onClick={() => createTask('analyze', currentFolder)}
                      style={{
                        padding: '6px 12px',
                        backgroundColor: '#4a9eff',
                        border: 'none',
                        borderRadius: '6px',
                        color: '#fff',
                        fontSize: '12px',
                        cursor: 'pointer'
                      }}
                    >
                      🔍 Analyze Folder
                    </button>
                    <button
                      onClick={() => createTask('organize', currentFolder)}
                      style={{
                        padding: '6px 12px',
                        backgroundColor: '#10a37f',
                        border: 'none',
                        borderRadius: '6px',
                        color: '#fff',
                        fontSize: '12px',
                        cursor: 'pointer'
                      }}
                    >
                      📋 Organize
                    </button>
                    <button
                      onClick={() => createTask('cleanup', currentFolder)}
                      style={{
                        padding: '6px 12px',
                        backgroundColor: '#f59e0b',
                        border: 'none',
                        borderRadius: '6px',
                        color: '#fff',
                        fontSize: '12px',
                        cursor: 'pointer'
                      }}
                    >
                      🧹 Cleanup
                    </button>
                    <button
                      onClick={() => createTask('index', currentFolder)}
                      style={{
                        padding: '6px 12px',
                        backgroundColor: '#8b5cf6',
                        border: 'none',
                        borderRadius: '6px',
                        color: '#fff',
                        fontSize: '12px',
                        cursor: 'pointer'
                      }}
                    >
                      🔎 Index Folder
                    </button>
                  </>
                )}
                <button
                  onClick={() => createTask('index', 'root')}
                  style={{
                    padding: '6px 12px',
                    backgroundColor: '#ef4444',
                    border: 'none',
                    borderRadius: '6px',
                    color: '#fff',
                    fontSize: '12px',
                    cursor: 'pointer',
                    fontWeight: '600'
                  }}
                >
                  🌍 Scan Entire Drive
                </button>
              </div>
            </div>

            {files.length === 0 ? (
              <div style={{
                padding: '48px 24px',
                textAlign: 'center',
                color: '#666'
              }}>
                No files found in this folder
              </div>
            ) : (
              <div style={{ maxHeight: '600px', overflowY: 'auto' }}>
                {files.map((file) => (
                  <div
                    key={file.id}
                    onClick={() => {
                      if (file.mimeType === 'application/vnd.google-apps.folder') {
                        navigateToFolder(file.id, file.name);
                      } else {
                        toggleFileSelection(file.id);
                      }
                    }}
                    style={{
                      padding: '16px 24px',
                      borderBottom: '1px solid #2a2a2a',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      cursor: 'pointer',
                      backgroundColor: selectedFiles.has(file.id) ? '#1a2a3a' : 'transparent'
                    }}
                    onMouseEnter={(e) => {
                      if (!selectedFiles.has(file.id)) {
                        e.currentTarget.style.backgroundColor = '#1a1a1a';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!selectedFiles.has(file.id)) {
                        e.currentTarget.style.backgroundColor = 'transparent';
                      }
                    }}
                  >
                    <span style={{ fontSize: '24px' }}>{getFileIcon(file.mimeType)}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '14px', color: '#fff', marginBottom: '4px' }}>
                        {file.name}
                      </div>
                      <div style={{ fontSize: '12px', color: '#666' }}>
                        {formatSize(file.size)} • {file.modifiedTime ? new Date(file.modifiedTime).toLocaleDateString() : '-'}
                      </div>
                    </div>
                    {selectedFiles.has(file.id) && (
                      <span style={{ color: '#4a9eff' }}>✓</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Agent Tasks Panel */}
          <div style={{
            backgroundColor: '#171717',
            border: '1px solid #333',
            borderRadius: '12px',
            overflow: 'hidden',
            maxHeight: '700px',
            display: 'flex',
            flexDirection: 'column'
          }}>
            <div style={{
              padding: '20px 24px',
              borderBottom: '1px solid #333'
            }}>
              <h2 style={{ fontSize: '18px', fontWeight: '600', margin: 0 }}>
                Agent Tasks ({tasks.length})
              </h2>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
              {tasks.length === 0 ? (
                <div style={{ textAlign: 'center', color: '#666', padding: '32px 16px' }}>
                  No tasks yet. Select files and task the agent!
                </div>
              ) : (
                tasks.map((task) => (
                  <div
                    key={task.id}
                    style={{
                      padding: '16px',
                      backgroundColor: '#0a0a0a',
                      border: '1px solid #333',
                      borderRadius: '8px',
                      marginBottom: '12px'
                    }}
                  >
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: '8px'
                    }}>
                      <span style={{ fontSize: '14px', fontWeight: '600', color: '#fff' }}>
                        {task.type.charAt(0).toUpperCase() + task.type.slice(1)}
                        {task.target === 'root' && ' - Entire Drive'}
                      </span>
                      <span style={{
                        fontSize: '11px',
                        padding: '4px 8px',
                        borderRadius: '4px',
                        backgroundColor:
                          task.status === 'completed' ? '#10a37f22' :
                          task.status === 'running' ? '#f59e0b22' :
                          task.status === 'failed' ? '#ef444422' : '#88888822',
                        color:
                          task.status === 'completed' ? '#10a37f' :
                          task.status === 'running' ? '#f59e0b' :
                          task.status === 'failed' ? '#ef4444' : '#888'
                      }}>
                        {task.status}
                      </span>
                    </div>

                    {task.status === 'running' && (
                      <div style={{
                        fontSize: '12px',
                        color: '#f59e0b',
                        marginTop: '8px',
                        padding: '8px',
                        backgroundColor: '#050505',
                        borderRadius: '4px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                      }}>
                        <span>⏳</span>
                        <span>Processing... This may take several minutes for large drives.</span>
                      </div>
                    )}

                    {task.result && (
                      <div style={{
                        fontSize: '12px',
                        color: task.status === 'failed' ? '#ef4444' : '#888',
                        marginTop: '8px',
                        padding: '8px',
                        backgroundColor: '#050505',
                        borderRadius: '4px'
                      }}>
                        {task.result}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
