'use client';

import React, { useEffect, useState } from 'react';
import { DashboardLayout } from '../../components/layout/DashboardLayout';
import { ProjectCard } from '../../components/ui/Card';
import { Button, ButtonGroup, IconButton } from '../../components/ui/Button';
import { SearchInput, Select } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { useRouter } from 'next/navigation';

export default function ProjectsPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<any[]>([]);
  const [filteredProjects, setFilteredProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('updated');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newProject, setNewProject] = useState({
    name: '',
    description: '',
    status: 'active',
    priority: 'medium',
  });

  useEffect(() => {
    loadProjects();
  }, []);

  useEffect(() => {
    filterAndSortProjects();
  }, [projects, searchQuery, statusFilter, sortBy]);

  const loadProjects = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/projects?userId=zach');
      if (response.ok) {
        const data = await response.json();
        setProjects(data.projects || []);
      }
    } catch (error) {
      console.error('Failed to load projects:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterAndSortProjects = () => {
    let filtered = [...projects];

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(
        (p) =>
          p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          p.description?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter((p) => p.status === statusFilter);
    }

    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'updated':
          return new Date(b.metadata?.updated_at || 0).getTime() - new Date(a.metadata?.updated_at || 0).getTime();
        case 'conversations':
          return (b.stats?.total_conversations || 0) - (a.stats?.total_conversations || 0);
        default:
          return 0;
      }
    });

    setFilteredProjects(filtered);
  };

  const handleCreateProject = async () => {
    try {
      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create',
          userId: 'zach',
          projectData: newProject,
        }),
      });

      if (response.ok) {
        setShowCreateModal(false);
        setNewProject({ name: '', description: '', status: 'active', priority: 'medium' });
        loadProjects();
      } else {
        const error = await response.json();
        console.error('Error creating project:', error);
        alert(`Failed to create project: ${error.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Failed to create project:', error);
      alert('Failed to create project. Please try again.');
    }
  };

  const handleDeleteProject = async (projectId: string) => {
    if (!confirm('Are you sure you want to delete this project?')) return;

    try {
      // Use the proper REST endpoint that actually deletes the project record
      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'delete',
          userId: 'zach', // Changed from 'zach-admin-001' to 'zach' to match getUser lookup
          projectData: { id: projectId }
        }),
      });

      if (response.ok) {
        loadProjects();
      } else {
        const data = await response.json();
        console.error('Delete failed:', data.error);
        alert(`Failed to delete project: ${data.error}`);
      }
    } catch (error) {
      console.error('Failed to delete project:', error);
      alert('Failed to delete project. Please try again.');
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent mx-auto mb-4" />
            <p className="text-gray-400">Loading projects...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Projects</h1>
            <p className="text-gray-400">Manage and organize your projects</p>
          </div>
          <Button icon="➕" onClick={() => setShowCreateModal(true)}>
            New Project
          </Button>
        </div>

        {/* Filters and Controls */}
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <SearchInput
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="Search projects..."
            />
          </div>
          <div className="flex gap-2">
            <Select
              value={statusFilter}
              onChange={setStatusFilter}
              options={[
                { value: 'all', label: 'All Status' },
                { value: 'active', label: 'Active' },
                { value: 'completed', label: 'Completed' },
                { value: 'paused', label: 'Paused' },
                { value: 'archived', label: 'Archived' },
              ]}
            />
            <Select
              value={sortBy}
              onChange={setSortBy}
              options={[
                { value: 'updated', label: 'Recently Updated' },
                { value: 'name', label: 'Name' },
                { value: 'conversations', label: 'Most Active' },
              ]}
            />
            <ButtonGroup>
              <IconButton
                icon="▦"
                variant={viewMode === 'grid' ? 'primary' : 'ghost'}
                onClick={() => setViewMode('grid')}
                tooltip="Grid view"
              />
              <IconButton
                icon="☰"
                variant={viewMode === 'list' ? 'primary' : 'ghost'}
                onClick={() => setViewMode('list')}
                tooltip="List view"
              />
            </ButtonGroup>
          </div>
        </div>

        {/* Projects Grid/List */}
        {filteredProjects.length === 0 ? (
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-12 text-center">
            <span className="text-6xl mb-4 block">📋</span>
            <h3 className="text-xl font-semibold text-white mb-2">
              {searchQuery || statusFilter !== 'all'
                ? 'No projects found'
                : 'No projects yet'}
            </h3>
            <p className="text-gray-400 mb-4">
              {searchQuery || statusFilter !== 'all'
                ? 'Try adjusting your filters'
                : 'Create your first project to get started'}
            </p>
            {!searchQuery && statusFilter === 'all' && (
              <Button onClick={() => setShowCreateModal(true)}>Create Project</Button>
            )}
          </div>
        ) : (
          <div
            className={
              viewMode === 'grid'
                ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'
                : 'space-y-4'
            }
          >
            {filteredProjects.map((project) => (
              <ProjectCard
                key={project.id}
                id={project.id}
                name={project.name}
                description={project.description}
                status={project.status}
                conversations={project.stats?.total_conversations || 0}
                files={project.stats?.total_files || 0}
                lastActivity={formatTimestamp(project.metadata?.updated_at)}
                tags={project.tags}
                onClick={() => router.push(`/projects/${project.id}`)}
                onDelete={() => handleDeleteProject(project.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Create Project Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Create New Project"
        footer={
          <>
            <Button variant="ghost" onClick={() => setShowCreateModal(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreateProject}
              disabled={!newProject.name.trim()}
            >
              Create Project
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Project Name *
            </label>
            <input
              type="text"
              value={newProject.name}
              onChange={(e) =>
                setNewProject({ ...newProject, name: e.target.value })
              }
              placeholder="My Awesome Project"
              className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Description
            </label>
            <textarea
              value={newProject.description}
              onChange={(e) =>
                setNewProject({ ...newProject, description: e.target.value })
              }
              placeholder="What is this project about?"
              rows={3}
              className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Status"
              value={newProject.status}
              onChange={(value) =>
                setNewProject({ ...newProject, status: value })
              }
              options={[
                { value: 'active', label: 'Active' },
                { value: 'paused', label: 'Paused' },
                { value: 'completed', label: 'Completed' },
              ]}
            />
            <Select
              label="Priority"
              value={newProject.priority}
              onChange={(value) =>
                setNewProject({ ...newProject, priority: value })
              }
              options={[
                { value: 'low', label: 'Low' },
                { value: 'medium', label: 'Medium' },
                { value: 'high', label: 'High' },
                { value: 'critical', label: 'Critical' },
              ]}
            />
          </div>
        </div>
      </Modal>
    </DashboardLayout>
  );
}

function formatTimestamp(isoString?: string): string {
  if (!isoString) return 'Never';
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}
