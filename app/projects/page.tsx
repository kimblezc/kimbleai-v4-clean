/**
 * Projects Page
 *
 * Project management dashboard
 */

'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { redirect } from 'next/navigation';
import toast, { Toaster } from 'react-hot-toast';
import Sidebar from '@/components/layout/Sidebar';
import ProjectModal from '@/components/projects/ProjectModal';
import {
  PlusIcon,
  FolderIcon,
  SparklesIcon,
  FireIcon,
  BoltIcon,
  PencilIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';
import { FolderIcon as FolderSolidIcon } from '@heroicons/react/24/solid';

interface Project {
  id: string;
  name: string;
  description?: string;
  status: 'active' | 'archived' | 'completed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  color?: string;
  icon?: string;
  conversation_count?: number;
  total_cost_usd?: number;
  created_at: string;
}

const priorityConfig = {
  low: {
    color: 'from-blue-500 to-blue-600',
    icon: SparklesIcon,
    label: 'Low Priority',
  },
  medium: {
    color: 'from-green-500 to-emerald-600',
    icon: BoltIcon,
    label: 'Medium Priority',
  },
  high: {
    color: 'from-purple-500 to-pink-600',
    icon: FireIcon,
    label: 'High Priority',
  },
  urgent: {
    color: 'from-red-500 to-orange-600',
    icon: FireIcon,
    label: 'Urgent',
  },
};

const statusLabels = {
  active: 'In Progress',
  archived: 'On Hold',
  completed: 'Completed',
};

export default function ProjectsPage() {
  const { data: session, status} = useSession();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<'recent' | 'alpha' | 'priority'>('recent');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'archived' | 'completed'>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);

  // Redirect if not authenticated
  if (status === 'unauthenticated') {
    redirect('/api/auth/signin');
  }

  useEffect(() => {
    if (session) {
      fetchProjects();
    }
  }, [session, sortBy, filterStatus]);

  const fetchProjects = async () => {
    try {
      const params = new URLSearchParams();
      if (sortBy) params.append('sortBy', sortBy);
      if (filterStatus !== 'all') params.append('status', filterStatus);

      const response = await fetch(`/api/projects?${params}`);
      if (response.ok) {
        const data = await response.json();
        setProjects(data.projects || []);
      }
    } catch (error) {
      console.error('Failed to fetch projects:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (project?: Project) => {
    setEditingProject(project || null);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingProject(null);
  };

  const handleSaveProject = async (projectData: any) => {
    try {
      if (editingProject) {
        // Update existing project
        const response = await fetch(`/api/projects/${editingProject.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(projectData),
        });

        if (response.ok) {
          toast.success('Project updated successfully', {
            style: {
              background: '#1f2937',
              color: '#fff',
              border: '1px solid #10b981',
            },
          });
          fetchProjects();
        } else {
          throw new Error('Failed to update project');
        }
      } else {
        // Create new project
        const response = await fetch('/api/projects', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(projectData),
        });

        if (response.ok) {
          toast.success('Project created successfully', {
            style: {
              background: '#1f2937',
              color: '#fff',
              border: '1px solid #10b981',
            },
          });
          fetchProjects();
        } else {
          throw new Error('Failed to create project');
        }
      }
    } catch (error) {
      console.error('Failed to save project:', error);
      toast.error('Failed to save project', {
        style: {
          background: '#1f2937',
          color: '#fff',
          border: '1px solid #ef4444',
        },
      });
      throw error;
    }
  };

  const handleDeleteProject = async (projectId: string) => {
    if (!confirm('Are you sure you want to delete this project? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await fetch(`/api/projects/${projectId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast.success('Project deleted successfully', {
          style: {
            background: '#1f2937',
            color: '#fff',
            border: '1px solid #10b981',
          },
        });
        fetchProjects();
      } else {
        throw new Error('Failed to delete project');
      }
    } catch (error) {
      console.error('Failed to delete project:', error);
      toast.error('Failed to delete project', {
        style: {
          background: '#1f2937',
          color: '#fff',
          border: '1px solid #ef4444',
        },
      });
    }
  };

  if (status === 'loading' || loading) {
    return (
      <div className="flex h-screen">
        <Sidebar />
        <div className="flex-1 flex items-center justify-center lg:ml-72">
          <div className="text-center">
            <div className="inline-block animate-spin-slow">
              <SparklesIcon className="w-12 h-12 text-purple-500" />
            </div>
            <p className="mt-4 text-gray-400">Loading projects...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Toaster position="top-right" />
      <Sidebar />

      <ProjectModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onSave={handleSaveProject}
        project={editingProject}
      />

      <div className="flex-1 flex flex-col lg:ml-72">
        {/* Header */}
        <header className="px-6 py-6 bg-gray-800/50 backdrop-blur-sm border-b border-gray-700">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gradient">Projects</h1>
              <p className="text-gray-400 mt-1">Manage your projects and conversations</p>
            </div>
            <button
              onClick={() => handleOpenModal()}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all"
            >
              <PlusIcon className="w-5 h-5" />
              New Project
            </button>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-400">Sort by:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="px-3 py-1.5 bg-gray-700 border border-gray-600 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="recent">Recent Activity</option>
                <option value="alpha">Alphabetical</option>
                <option value="priority">Priority</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-400">Filter:</span>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as any)}
                className="px-3 py-1.5 bg-gray-700 border border-gray-600 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="all">All Projects</option>
                <option value="active">In Progress</option>
                <option value="archived">On Hold</option>
                <option value="completed">Completed</option>
              </select>
            </div>
          </div>
        </header>

        {/* Projects Grid */}
        <main className="flex-1 overflow-y-auto p-6 scrollbar-thin">
          {projects.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <FolderIcon className="w-20 h-20 text-gray-600 mb-4" />
              <h3 className="text-xl font-semibold text-gray-300 mb-2">No projects yet</h3>
              <p className="text-gray-500 mb-6">Create your first project to get started</p>
              <button
                onClick={() => handleOpenModal()}
                className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all"
              >
                <PlusIcon className="w-5 h-5" />
                Create Project
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {projects.map((project) => {
                const priorityInfo = priorityConfig[project.priority];

                return (
                  <div
                    key={project.id}
                    className="group relative bg-gray-800 border border-gray-700 rounded-xl p-6 hover:scale-105 transition-all duration-200"
                  >
                    {/* Action Buttons */}
                    <div className="absolute top-4 right-4 flex items-center gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenModal(project);
                        }}
                        className="p-2 bg-gray-700 hover:bg-gray-600 text-gray-300 hover:text-white rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                        title="Edit project"
                      >
                        <PencilIcon className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteProject(project.id);
                        }}
                        className="p-2 bg-red-600 hover:bg-red-700 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                        title="Delete project"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Priority Badge */}
                    <div className={`absolute top-16 right-4 px-3 py-1 rounded-full text-xs font-bold text-white bg-gradient-to-r ${priorityInfo.color}`}>
                      {priorityInfo.label}
                    </div>

                    {/* Icon */}
                    <div className={`w-14 h-14 rounded-lg bg-gradient-to-r ${priorityInfo.color} p-3 mb-4`}>
                      <FolderSolidIcon className="w-full h-full text-white" />
                    </div>

                    {/* Content */}
                    <h3 className="text-xl font-bold text-white mb-2 truncate">
                      {project.name}
                    </h3>

                    {project.description && (
                      <p className="text-sm text-gray-400 mb-4 line-clamp-2">
                        {project.description}
                      </p>
                    )}

                    {/* Stats */}
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500">
                        {statusLabels[project.status]}
                      </span>
                      {project.conversation_count !== undefined && (
                        <span className="text-gray-500">
                          {project.conversation_count} conversations
                        </span>
                      )}
                    </div>

                    {project.total_cost_usd !== undefined && (
                      <div className="mt-3 pt-3 border-t border-gray-700">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-500">Total Cost</span>
                          <span className="text-sm font-mono font-semibold text-gold-400">
                            ${project.total_cost_usd.toFixed(4)}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
