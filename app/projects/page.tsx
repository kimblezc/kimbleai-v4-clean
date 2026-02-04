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
  PencilIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';
import { FolderIcon as FolderSolidIcon } from '@heroicons/react/24/solid';

interface Project {
  id: string;
  name: string;
  description?: string;
  color?: string;
  icon?: string;
  conversation_count?: number;
  total_cost_usd?: number;
  created_at: string;
  updated_at: string;
}

export default function ProjectsPage() {
  const { data: session, status} = useSession();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
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
  }, [session]);

  const fetchProjects = async () => {
    try {
      // Always sort by most recently updated
      const response = await fetch('/api/projects?sortBy=recent');
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
        const response = await fetch(`/api/projects/${editingProject.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(projectData),
        });

        if (response.ok) {
          toast.success('Project updated', {
            style: { background: '#262626', color: '#fff', border: '1px solid #404040' },
          });
          fetchProjects();
        } else {
          throw new Error('Failed to update project');
        }
      } else {
        const response = await fetch('/api/projects', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(projectData),
        });

        if (response.ok) {
          toast.success('Project created', {
            style: { background: '#262626', color: '#fff', border: '1px solid #404040' },
          });
          fetchProjects();
        } else {
          throw new Error('Failed to create project');
        }
      }
    } catch (error) {
      console.error('Failed to save project:', error);
      toast.error('Failed to save project', {
        style: { background: '#262626', color: '#fff', border: '1px solid #dc2626' },
      });
      throw error;
    }
  };

  const handleDeleteProject = async (projectId: string) => {
    if (!confirm('Delete this project?')) return;

    try {
      const response = await fetch(`/api/projects/${projectId}`, { method: 'DELETE' });

      if (response.ok) {
        toast.success('Project deleted', {
          style: { background: '#262626', color: '#fff', border: '1px solid #404040' },
        });
        fetchProjects();
      } else {
        throw new Error('Failed to delete project');
      }
    } catch (error) {
      console.error('Failed to delete project:', error);
      toast.error('Failed to delete project', {
        style: { background: '#262626', color: '#fff', border: '1px solid #dc2626' },
      });
    }
  };

  if (status === 'loading' || loading) {
    return (
      <div className="flex h-screen bg-neutral-950">
        <Sidebar />
        <div className="flex-1 flex items-center justify-center lg:ml-64">
          <div className="text-center">
            <div className="inline-block animate-spin-slow">
              <FolderIcon className="w-12 h-12 text-neutral-500" />
            </div>
            <p className="mt-4 text-neutral-500">Loading projects...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-neutral-950">
      <Toaster position="top-right" />
      <Sidebar />

      <ProjectModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onSave={handleSaveProject}
        project={editingProject}
      />

      <div className="flex-1 flex flex-col lg:ml-64">
        {/* Header */}
        <header className="px-4 sm:px-6 py-4 sm:py-6 bg-neutral-900 border-b border-neutral-800 pt-16 lg:pt-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 sm:gap-0">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-white">Projects</h1>
              <p className="text-sm sm:text-base text-neutral-500 mt-1">Manage your projects and conversations</p>
            </div>
            <button
              onClick={() => handleOpenModal()}
              className="flex items-center justify-center gap-2 px-4 py-2.5 sm:py-2 bg-white hover:bg-neutral-100 active:bg-neutral-200 text-black rounded-lg font-medium transition-colors touch-manipulation min-h-[44px] w-full sm:w-auto"
            >
              <PlusIcon className="w-5 h-5" />
              New Project
            </button>
          </div>

        </header>

        {/* Projects Grid */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 scrollbar-thin">
          {projects.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center px-4">
              <FolderIcon className="w-16 h-16 sm:w-20 sm:h-20 text-neutral-700 mb-4" />
              <h3 className="text-lg sm:text-xl font-semibold text-neutral-300 mb-2">No projects yet</h3>
              <p className="text-sm sm:text-base text-neutral-500 mb-6">Create your first project to get started</p>
              <button
                onClick={() => handleOpenModal()}
                className="flex items-center gap-2 px-6 py-3 bg-white hover:bg-neutral-100 active:bg-neutral-200 text-black rounded-lg font-medium transition-colors touch-manipulation min-h-[48px]"
              >
                <PlusIcon className="w-5 h-5" />
                Create Project
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {projects.map((project) => (
                  <div
                    key={project.id}
                    className="group relative bg-neutral-900 border border-neutral-800 rounded-xl p-4 sm:p-6 hover:border-neutral-700 active:border-neutral-600 transition-all touch-manipulation"
                  >
                    {/* Action Buttons - Always visible on mobile */}
                    <div className="absolute top-3 sm:top-4 right-3 sm:right-4 flex items-center gap-1.5 sm:gap-2">
                      <button
                        onClick={(e) => { e.stopPropagation(); handleOpenModal(project); }}
                        className="p-2 sm:p-2 bg-neutral-800 hover:bg-neutral-700 active:bg-neutral-600 text-neutral-400 hover:text-white rounded-lg opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-all touch-manipulation min-w-[36px] min-h-[36px] sm:min-w-0 sm:min-h-0 flex items-center justify-center"
                        title="Edit"
                      >
                        <PencilIcon className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDeleteProject(project.id); }}
                        className="p-2 sm:p-2 bg-neutral-800 hover:bg-red-600 active:bg-red-700 text-neutral-400 hover:text-white rounded-lg opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-all touch-manipulation min-w-[36px] min-h-[36px] sm:min-w-0 sm:min-h-0 flex items-center justify-center"
                        title="Delete"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Icon */}
                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-neutral-800 p-2 sm:p-2.5 mb-3 sm:mb-4">
                      <FolderSolidIcon className="w-full h-full text-neutral-400" />
                    </div>

                    {/* Content */}
                    <h3 className="text-base sm:text-lg font-semibold text-white mb-1.5 sm:mb-2 truncate pr-20 sm:pr-16">
                      {project.name}
                    </h3>

                    {project.description && (
                      <p className="text-xs sm:text-sm text-neutral-500 mb-3 sm:mb-4 line-clamp-2">
                        {project.description}
                      </p>
                    )}

                    {/* Stats */}
                    <div className="flex items-center justify-between text-xs sm:text-sm text-neutral-600">
                      {project.conversation_count !== undefined && (
                        <span>{project.conversation_count} chats</span>
                      )}
                    </div>

                    {project.total_cost_usd !== undefined && (
                      <div className="mt-2 sm:mt-3 pt-2 sm:pt-3 border-t border-neutral-800">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-neutral-600">Cost</span>
                          <span className="text-xs sm:text-sm font-mono text-neutral-400">
                            ${project.total_cost_usd.toFixed(4)}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
