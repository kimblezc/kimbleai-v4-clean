import { useState, useCallback, useEffect } from 'react';

export interface Project {
  id: string;
  name: string;
  description?: string;
  category_id?: string;
  status: string;
  metadata?: any;
  tags?: string[];
  stats?: {
    total_conversations?: number;
    total_files?: number;
  };
}

export function useProjects(userId: string) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentProject, setCurrentProject] = useState('');

  const loadProjects = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/projects?userId=${userId}`);
      if (response.ok) {
        const data = await response.json();
        setProjects(data.projects || []);
      }
    } catch (error) {
      console.error('Failed to load projects:', error);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  const createProject = useCallback(
    async (projectData: { name: string; description?: string; status?: string; priority?: string }) => {
      try {
        const response = await fetch('/api/projects', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'create',
            userId,
            projectData,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          await loadProjects();
          return data.project;
        } else {
          const error = await response.json();
          throw new Error(error.error || 'Failed to create project');
        }
      } catch (error) {
        console.error('Failed to create project:', error);
        throw error;
      }
    },
    [userId, loadProjects]
  );

  const deleteProject = useCallback(
    async (projectId: string) => {
      try {
        const response = await fetch('/api/projects/delete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            projectId,
            userId,
          }),
        });

        if (response.ok) {
          await loadProjects();
          if (currentProject === projectId) {
            setCurrentProject('');
          }
        } else {
          const error = await response.json();
          throw new Error(error.error || 'Failed to delete project');
        }
      } catch (error) {
        console.error('Failed to delete project:', error);
        throw error;
      }
    },
    [userId, loadProjects, currentProject]
  );

  const selectProject = useCallback((projectId: string) => {
    setCurrentProject(projectId);
  }, []);

  const clearProject = useCallback(() => {
    setCurrentProject('');
  }, []);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  return {
    projects,
    loading,
    currentProject,
    loadProjects,
    createProject,
    deleteProject,
    selectProject,
    clearProject,
    setCurrentProject,
  };
}
