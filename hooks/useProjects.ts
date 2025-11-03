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
      console.log('[useProjects] Loading projects for user:', userId);
      setLoading(true);
      const response = await fetch(`/api/projects?userId=${userId}`);
      console.log('[useProjects] API response status:', response.status);
      if (response.ok) {
        const data = await response.json();
        console.log('[useProjects] Projects received:', data.projects?.length || 0, 'projects');
        console.log('[useProjects] Projects data:', data.projects);
        setProjects(data.projects || []);
      } else {
        console.error('[useProjects] API returned error:', response.status, response.statusText);
      }
    } catch (error) {
      console.error('[useProjects] Failed to load projects:', error);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  const createProject = useCallback(
    async (projectData: { name: string; description?: string; status?: string; priority?: string }) => {
      // Generate temporary ID for optimistic update
      const tempId = `temp-${Date.now()}`;
      const optimisticProject: Project = {
        id: tempId,
        name: projectData.name,
        description: projectData.description,
        status: projectData.status || 'active',
        metadata: {
          created_at: new Date().toISOString(),
          isOptimistic: true,
        },
      };

      // Optimistic update - add project immediately
      setProjects(prev => [...prev, optimisticProject]);

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
          // Replace optimistic project with real one
          setProjects(prev =>
            prev.map(p => p.id === tempId ? data.project : p)
          );
          return data.project;
        } else {
          const error = await response.json();
          // Revert optimistic update on error
          setProjects(prev => prev.filter(p => p.id !== tempId));
          throw new Error(error.error || 'Failed to create project');
        }
      } catch (error) {
        console.error('Failed to create project:', error);
        // Revert optimistic update on error
        setProjects(prev => prev.filter(p => p.id !== tempId));
        throw error;
      }
    },
    [userId]
  );

  const updateProject = useCallback(
    async (projectId: string, updates: { name?: string; description?: string; status?: string }) => {
      // Store original project for rollback
      const originalProject = projects.find(p => p.id === projectId);

      // Optimistic update - update project immediately
      setProjects(prev =>
        prev.map(p =>
          p.id === projectId
            ? { ...p, ...updates, metadata: { ...p.metadata, updated_at: new Date().toISOString() } }
            : p
        )
      );

      try {
        const response = await fetch('/api/projects', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'update',
            userId,
            projectData: {
              id: projectId,
              ...updates
            }
          }),
        });

        if (response.ok) {
          const data = await response.json();
          // Replace with actual server response
          setProjects(prev =>
            prev.map(p => p.id === projectId ? data.project : p)
          );
        } else {
          const error = await response.json();
          // Revert optimistic update on error
          if (originalProject) {
            setProjects(prev =>
              prev.map(p => p.id === projectId ? originalProject : p)
            );
          }
          throw new Error(error.error || 'Failed to update project');
        }
      } catch (error) {
        console.error('Failed to update project:', error);
        // Revert optimistic update on error
        if (originalProject) {
          setProjects(prev =>
            prev.map(p => p.id === projectId ? originalProject : p)
          );
        }
        throw error;
      }
    },
    [userId, projects]
  );

  const deleteProject = useCallback(
    async (projectId: string) => {
      // Store the project for potential rollback
      const deletedProject = projects.find(p => p.id === projectId);

      // Optimistic update - remove project immediately
      setProjects(prev => prev.filter(p => p.id !== projectId));

      // Clear current project if it's the one being deleted
      if (currentProject === projectId) {
        setCurrentProject('');
      }

      try {
        const response = await fetch('/api/projects/delete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            projectId,
            userId,
          }),
        });

        if (!response.ok) {
          const error = await response.json();
          // Revert optimistic update on error
          if (deletedProject) {
            setProjects(prev => [...prev, deletedProject]);
          }
          throw new Error(error.error || 'Failed to delete project');
        }
      } catch (error) {
        console.error('Failed to delete project:', error);
        // Revert optimistic update on error
        if (deletedProject) {
          setProjects(prev => [...prev, deletedProject]);
        }
        throw error;
      }
    },
    [userId, projects, currentProject]
  );

  const selectProject = useCallback((projectId: string) => {
    setCurrentProject(projectId);
  }, []);

  const clearProject = useCallback(() => {
    setCurrentProject('');
  }, []);

  useEffect(() => {
    console.log('[useProjects] useEffect triggered, calling loadProjects()');
    loadProjects();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]); // Only re-run when userId changes, not when loadProjects callback changes

  return {
    projects,
    loading,
    currentProject,
    loadProjects,
    createProject,
    updateProject,
    deleteProject,
    selectProject,
    clearProject,
    setCurrentProject,
  };
}
