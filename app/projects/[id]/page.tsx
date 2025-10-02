'use client';

import React, { useEffect, useState } from 'react';
import { DashboardLayout } from '../../../components/layout/DashboardLayout';
import { Card } from '../../../components/ui/Card';
import { Button, ButtonGroup } from '../../../components/ui/Button';
import { useRouter, useParams } from 'next/navigation';

export default function ProjectDetailPage() {
  const router = useRouter();
  const params = useParams();
  const projectId = params?.id as string;
  const [project, setProject] = useState<any>(null);
  const [conversations, setConversations] = useState<any[]>([]);
  const [files, setFiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'conversations' | 'files' | 'settings'>('overview');

  useEffect(() => {
    if (projectId) {
      loadProject();
    }
  }, [projectId]);

  const loadProject = async () => {
    try {
      setLoading(true);

      // Load project details
      const projectResponse = await fetch(`/api/projects/${projectId}`);
      if (projectResponse.ok) {
        const projectData = await projectResponse.json();
        setProject(projectData);
      }

      // Load conversations
      const convsResponse = await fetch(`/api/conversations?projectId=${projectId}&userId=zach`);
      if (convsResponse.ok) {
        const convsData = await convsResponse.json();
        setConversations(convsData.conversations || []);
      }

      // Load files
      const filesResponse = await fetch(`/api/files?projectId=${projectId}&userId=zach`);
      if (filesResponse.ok) {
        const filesData = await filesResponse.json();
        setFiles(filesData.files || []);
      }
    } catch (error) {
      console.error('Failed to load project:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent mx-auto mb-4" />
            <p className="text-gray-400">Loading project...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!project) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
          <div className="text-center">
            <span className="text-6xl mb-4 block">❌</span>
            <h2 className="text-2xl font-bold text-white mb-2">Project Not Found</h2>
            <p className="text-gray-400 mb-4">This project doesn&apos;t exist or you don&apos;t have access to it</p>
            <Button onClick={() => router.push('/projects')}>Back to Projects</Button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  const statusColors = {
    active: 'bg-green-500/20 text-green-500',
    completed: 'bg-blue-500/20 text-blue-500',
    paused: 'bg-orange-500/20 text-orange-500',
    archived: 'bg-gray-500/20 text-gray-500',
  };

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <Button
                variant="ghost"
                size="sm"
                icon="←"
                onClick={() => router.push('/projects')}
              >
                Back
              </Button>
            </div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-bold text-white">{project.name}</h1>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusColors[project.status as keyof typeof statusColors]}`}>
                {project.status}
              </span>
            </div>
            {project.description && (
              <p className="text-gray-400">{project.description}</p>
            )}
            {project.tags && project.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-3">
                {project.tags.map((tag: string, idx: number) => (
                  <span
                    key={idx}
                    className="px-2 py-1 bg-gray-800 text-gray-300 rounded text-sm"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            )}
          </div>
          <ButtonGroup>
            <Button icon="💬" onClick={() => router.push(`/?project=${projectId}`)}>
              New Chat
            </Button>
            <Button icon="⬆️" variant="secondary" onClick={() => router.push(`/files/upload?project=${projectId}`)}>
              Upload File
            </Button>
          </ButtonGroup>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <div className="text-center">
              <p className="text-3xl font-bold text-white mb-1">{project.stats?.total_conversations || 0}</p>
              <p className="text-sm text-gray-400">Conversations</p>
            </div>
          </Card>
          <Card>
            <div className="text-center">
              <p className="text-3xl font-bold text-white mb-1">{project.stats?.total_messages || 0}</p>
              <p className="text-sm text-gray-400">Messages</p>
            </div>
          </Card>
          <Card>
            <div className="text-center">
              <p className="text-3xl font-bold text-white mb-1">{files.length}</p>
              <p className="text-sm text-gray-400">Files</p>
            </div>
          </Card>
          <Card>
            <div className="text-center">
              <p className="text-3xl font-bold text-white mb-1">{project.stats?.active_tasks || 0}</p>
              <p className="text-sm text-gray-400">Active Tasks</p>
            </div>
          </Card>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-800">
          <div className="flex gap-6">
            {(['overview', 'conversations', 'files', 'settings'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`pb-3 px-1 font-medium capitalize transition-colors ${
                  activeTab === tab
                    ? 'text-blue-500 border-b-2 border-blue-500'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        <div>
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <Card>
                <h3 className="text-lg font-semibold text-white mb-4">Project Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-400 mb-1">Created</p>
                    <p className="text-white">{new Date(project.metadata?.created_at).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400 mb-1">Last Updated</p>
                    <p className="text-white">{new Date(project.metadata?.updated_at).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400 mb-1">Priority</p>
                    <p className="text-white capitalize">{project.priority}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400 mb-1">Owner</p>
                    <p className="text-white">{project.owner_id}</p>
                  </div>
                </div>
              </Card>
            </div>
          )}

          {activeTab === 'conversations' && (
            <div>
              {conversations.length === 0 ? (
                <Card>
                  <div className="text-center py-8">
                    <span className="text-5xl mb-3 block">💬</span>
                    <h3 className="text-lg font-semibold text-white mb-2">No conversations yet</h3>
                    <p className="text-gray-400 mb-4">Start a conversation in this project</p>
                    <Button onClick={() => router.push(`/?project=${projectId}`)}>
                      New Conversation
                    </Button>
                  </div>
                </Card>
              ) : (
                <div className="space-y-3">
                  {conversations.map((conv) => (
                    <Card
                      key={conv.id}
                      hover
                      onClick={() => router.push(`/?conversation=${conv.id}`)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="text-white font-medium mb-1">{conv.title || 'Untitled Conversation'}</h4>
                          <p className="text-sm text-gray-400">{conv.messageCount || 0} messages</p>
                        </div>
                        <span className="text-xs text-gray-500">{new Date(conv.updated_at).toLocaleDateString()}</span>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'files' && (
            <div>
              {files.length === 0 ? (
                <Card>
                  <div className="text-center py-8">
                    <span className="text-5xl mb-3 block">📁</span>
                    <h3 className="text-lg font-semibold text-white mb-2">No files yet</h3>
                    <p className="text-gray-400 mb-4">Upload files to this project</p>
                    <Button onClick={() => router.push(`/files/upload?project=${projectId}`)}>
                      Upload File
                    </Button>
                  </div>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {files.map((file) => (
                    <Card key={file.id} hover>
                      <div className="flex items-center gap-3">
                        <span className="text-3xl">📄</span>
                        <div className="flex-1 min-w-0">
                          <h4 className="text-sm font-medium text-white truncate">{file.filename}</h4>
                          <p className="text-xs text-gray-400">{file.file_size} bytes</p>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'settings' && (
            <Card>
              <h3 className="text-lg font-semibold text-white mb-4">Project Settings</h3>
              <p className="text-gray-400">Project settings functionality coming soon...</p>
            </Card>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
