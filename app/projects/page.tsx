/**
 * Projects Page
 *
 * Project management dashboard
 */

'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { redirect, useRouter } from 'next/navigation';
import Link from 'next/link';
import toast, { Toaster } from 'react-hot-toast';
import Sidebar from '@/components/layout/Sidebar';
import ProjectModal from '@/components/projects/ProjectModal';
import VersionFooter from '@/components/layout/VersionFooter';
import {
  PlusIcon,
  FolderIcon,
  PencilIcon,
  TrashIcon,
  ArrowLeftIcon,
  ChatBubbleLeftRightIcon,
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
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);

  // Navigate to main page with project context
  const handleProjectClick = (projectId: string) => {
    router.push(`/?projectId=${projectId}`);
  };

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
        <header className="px-6 py-6 bg-neutral-900 border-b border-neutral-800">
          {/* Back Navigation */}
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-neutral-400 hover:text-white transition-colors mb-4"
          >
            <ArrowLeftIcon className="w-4 h-4" />
            <span className="text-sm">Back to Chat</span>
          </Link>

          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-white">Projects</h1>
              <p className="text-neutral-500 mt-1">Manage your projects and conversations</p>
            </div>
            <button
              onClick={() => handleOpenModal()}
              className="flex items-center gap-2 px-4 py-2 bg-white hover:bg-neutral-100 text-black rounded-lg font-medium transition-colors"
            >
              <PlusIcon className="w-5 h-5" />
              New Project
            </button>
          </div>

        </header>

        {/* Projects Grid */}
        <main className="flex-1 overflow-y-auto p-6 scrollbar-thin">
          {projects.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <FolderIcon className="w-20 h-20 text-neutral-700 mb-4" />
              <h3 className="text-xl font-semibold text-neutral-300 mb-2">No projects yet</h3>
              <p className="text-neutral-500 mb-6">Create your first project to get started</p>
              <button
                onClick={() => handleOpenModal()}
                className="flex items-center gap-2 px-6 py-3 bg-white hover:bg-neutral-100 text-black rounded-lg font-medium transition-colors"
              >
                <PlusIcon className="w-5 h-5" />
                Create Project
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {projects.map((project) => (
                  <div
                    key={project.id}
                    onClick={() => handleProjectClick(project.id)}
                    className="group relative bg-neutral-900 border border-neutral-800 rounded-xl p-6 hover:border-neutral-600 hover:bg-neutral-800/50 transition-all cursor-pointer"
                  >
                    {/* Action Buttons */}
                    <div className="absolute top-4 right-4 flex items-center gap-2">
                      <button
                        onClick={(e) => { e.stopPropagation(); handleOpenModal(project); }}
                        className="p-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-white rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                        title="Edit"
                      >
                        <PencilIcon className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDeleteProject(project.id); }}
                        className="p-2 bg-neutral-800 hover:bg-red-600 text-neutral-400 hover:text-white rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                        title="Delete"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Icon */}
                    <div className="w-12 h-12 rounded-lg bg-neutral-800 p-2.5 mb-4">
                      <FolderSolidIcon className="w-full h-full text-neutral-400" />
                    </div>

                    {/* Content */}
                    <h3 className="text-lg font-semibold text-white mb-2 truncate pr-16">
                      {project.name}
                    </h3>

                    {project.description && (
                      <p className="text-sm text-neutral-500 mb-4 line-clamp-2">
                        {project.description}
                      </p>
                    )}

                    {/* Stats */}
                    <div className="flex items-center justify-between text-sm text-neutral-600">
                      {project.conversation_count !== undefined && (
                        <span>{project.conversation_count} chats</span>
                      )}
                    </div>

                    {project.total_cost_usd !== undefined && (
                      <div className="mt-3 pt-3 border-t border-neutral-800">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-neutral-600">Cost</span>
                          <span className="text-sm font-mono text-neutral-400">
                            ${project.total_cost_usd.toFixed(4)}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Click hint */}
                    <div className="mt-4 pt-3 border-t border-neutral-800 flex items-center gap-2 text-xs text-neutral-500 group-hover:text-neutral-400 transition-colors">
                      <ChatBubbleLeftRightIcon className="w-4 h-4" />
                      <span>Click to view chats</span>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </main>
      </div>

      {/* Version Footer */}
      <VersionFooter />
    </div>
  );
}
