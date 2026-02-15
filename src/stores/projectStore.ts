import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Project, Task, Prompt, ProjectStatus, OpenProject } from '@/types';
import { useWorkflowStore } from './workflowStore';

// Generate a consistent project ID from path (so reopening same folder preserves data)
export function generateProjectId(path: string): string {
  let hash = 0;
  for (let i = 0; i < path.length; i++) {
    hash = ((hash << 5) - hash) + path.charCodeAt(i);
    hash |= 0; // Convert to 32bit integer
  }
  return `project-${Math.abs(hash).toString(36)}`;
}

interface ProjectState {
  // Existing state
  currentProject: Project | null;
  recentProjects: Project[];
  tasks: Task[];
  prompts: Prompt[];

  // Multi-project tab state
  openProjects: OpenProject[];
  activeProjectId: string | null;

  // Existing actions
  setCurrentProject: (project: Project | null) => void;
  updateProjectStatus: (status: ProjectStatus) => void;
  addRecentProject: (project: Project) => void;
  setTasks: (tasks: Task[]) => void;
  updateTask: (taskId: string, updates: Partial<Task>) => void;
  setPrompts: (prompts: Prompt[]) => void;
  addPrompt: (prompt: Prompt) => void;
  updatePrompt: (promptId: string, updates: Partial<Prompt>) => void;
  removePrompt: (promptId: string) => void;

  // Tab management actions
  openProject: (project: Project) => void;
  closeProject: (projectId: string) => void;
  setActiveProject: (projectId: string) => void;
  reorderProjects: (fromIndex: number, toIndex: number) => void;
  updateOpenProjectStatus: (projectId: string, status: ProjectStatus) => void;
  closeOtherProjects: (projectId: string) => void;
  closeAllProjects: () => void;
  getProjectByIndex: (index: number) => OpenProject | undefined;
}

export const useProjectStore = create<ProjectState>()(
  persist(
    (set, get) => ({
      // Initial state
      currentProject: null,
      recentProjects: [],
      tasks: [],
      prompts: [],
      openProjects: [],
      activeProjectId: null,

      // Existing actions
      setCurrentProject: (currentProject) => set({ currentProject }),

      updateProjectStatus: (status) => set((state) => {
        // Update both currentProject and openProjects
        const updates: Partial<ProjectState> = {
          currentProject: state.currentProject
            ? { ...state.currentProject, status }
            : null,
        };

        if (state.currentProject) {
          updates.openProjects = state.openProjects.map(p =>
            p.id === state.currentProject!.id ? { ...p, status } : p
          );
        }

        return updates;
      }),

      addRecentProject: (project) => set((state) => ({
        recentProjects: [
          project,
          ...state.recentProjects.filter(p => p.id !== project.id)
        ].slice(0, 5)
      })),

      setTasks: (tasks) => set({ tasks }),

      updateTask: (taskId, updates) => set((state) => ({
        tasks: state.tasks.map(t =>
          t.id === taskId ? { ...t, ...updates } : t
        )
      })),

      setPrompts: (prompts) => set({ prompts }),

      addPrompt: (prompt) => set((state) => ({
        prompts: [...state.prompts, prompt]
      })),

      updatePrompt: (promptId, updates) => set((state) => ({
        prompts: state.prompts.map(p =>
          p.id === promptId ? { ...p, ...updates } : p
        )
      })),

      removePrompt: (promptId) => set((state) => ({
        prompts: state.prompts.filter(p => p.id !== promptId)
      })),

      // Tab management actions
      openProject: (project) => {
        const state = get();
        const exists = state.openProjects.find(p => p.id === project.id);

        // Register the project path with Electron (required for file access)
        if (window.electron?.project?.registerPath) {
          window.electron.project.registerPath(project.path).catch(console.warn);
        }

        // Sync workflow store
        const workflowStore = useWorkflowStore.getState();
        if (exists) {
          // Already open - just switch to it
          workflowStore.switchToProject(project.id);
        } else {
          // New project - initialize workflow
          workflowStore.initProjectWorkflow(project.id);
        }

        if (exists) {
          // Already open - just activate it
          return set({
            activeProjectId: project.id,
            currentProject: project,
          });
        }

        // Add to open projects
        const newOpenProject: OpenProject = {
          id: project.id,
          name: project.name,
          path: project.path,
          status: project.status,
          order: state.openProjects.length,
          openedAt: new Date(),
        };

        return set({
          openProjects: [...state.openProjects, newOpenProject],
          activeProjectId: project.id,
          currentProject: project,
          recentProjects: [
            project,
            ...state.recentProjects.filter(p => p.id !== project.id)
          ].slice(0, 5),
        });
      },

      closeProject: (projectId) => {
        const state = get();
        const filtered = state.openProjects.filter(p => p.id !== projectId);
        const wasActive = state.activeProjectId === projectId;

        // Determine new active project if closing the active one
        let newActiveId: string | null = state.activeProjectId;
        let newCurrentProject: Project | null = state.currentProject;

        if (wasActive && filtered.length > 0) {
          // Activate the next tab, or the previous if closing the last tab
          const closedIndex = state.openProjects.findIndex(p => p.id === projectId);
          const newActiveIndex = Math.min(closedIndex, filtered.length - 1);
          const nextOpenProject = filtered[newActiveIndex];
          newActiveId = nextOpenProject.id;

          // Reconstruct Project from OpenProject
          newCurrentProject = {
            id: nextOpenProject.id,
            name: nextOpenProject.name,
            path: nextOpenProject.path,
            status: nextOpenProject.status,
            lastOpened: new Date(),
            createdAt: nextOpenProject.openedAt,
          };

          // Switch workflow to new active project
          useWorkflowStore.getState().switchToProject(newActiveId);
        } else if (filtered.length === 0) {
          newActiveId = null;
          newCurrentProject = null;

          // No projects left - reset workflow
          useWorkflowStore.getState().switchToProject(null);
        }

        set({
          openProjects: filtered.map((p, i) => ({ ...p, order: i })),
          activeProjectId: newActiveId,
          currentProject: newCurrentProject,
        });
      },

      setActiveProject: (projectId) => {
        const state = get();
        const openProject = state.openProjects.find(p => p.id === projectId);
        if (!openProject) return;

        // Sync workflow store
        useWorkflowStore.getState().switchToProject(projectId);

        // Reconstruct Project from OpenProject
        const project: Project = {
          id: openProject.id,
          name: openProject.name,
          path: openProject.path,
          status: openProject.status,
          lastOpened: new Date(),
          createdAt: openProject.openedAt,
        };

        set({
          activeProjectId: projectId,
          currentProject: project,
        });
      },

      reorderProjects: (fromIndex, toIndex) => set((state) => {
        const projects = [...state.openProjects];
        const [moved] = projects.splice(fromIndex, 1);
        projects.splice(toIndex, 0, moved);

        return {
          openProjects: projects.map((p, i) => ({ ...p, order: i })),
        };
      }),

      updateOpenProjectStatus: (projectId, status) => set((state) => ({
        openProjects: state.openProjects.map(p =>
          p.id === projectId ? { ...p, status } : p
        ),
        currentProject: state.currentProject?.id === projectId
          ? { ...state.currentProject, status }
          : state.currentProject,
      })),

      closeOtherProjects: (projectId) => {
        const state = get();
        const keptProject = state.openProjects.find(p => p.id === projectId);
        if (!keptProject) return;

        // Switch workflow to the kept project
        useWorkflowStore.getState().switchToProject(projectId);

        // Reconstruct Project from OpenProject
        const project: Project = {
          id: keptProject.id,
          name: keptProject.name,
          path: keptProject.path,
          status: keptProject.status,
          lastOpened: new Date(),
          createdAt: keptProject.openedAt,
        };

        set({
          openProjects: [{ ...keptProject, order: 0 }],
          activeProjectId: projectId,
          currentProject: project,
        });
      },

      closeAllProjects: () => {
        // Reset workflow to no project
        useWorkflowStore.getState().switchToProject(null);

        set({
          openProjects: [],
          activeProjectId: null,
          currentProject: null,
        });
      },

      getProjectByIndex: (index) => {
        const state = get();
        return state.openProjects[index - 1];
      },
    }),
    {
      name: 'vibes-projects',
      partialize: (state) => ({
        // Persist project state for session restoration
        openProjects: state.openProjects,
        activeProjectId: state.activeProjectId,
        recentProjects: state.recentProjects,
        currentProject: state.currentProject, // Persist directly
      }),
    }
  )
);

// Initialize project paths on app startup
// Call this once in App.tsx or main entry point
export async function initializeProjectPaths(): Promise<void> {
  if (!window.electron?.project?.registerPath) {
    console.warn('[ProjectStore] Electron project API not available');
    return;
  }

  const state = useProjectStore.getState();
  const pathsToRegister = new Set<string>();

  // Collect all project paths from open projects
  for (const project of state.openProjects) {
    if (project.path) {
      pathsToRegister.add(project.path);
    }
  }

  // Also register paths from recent projects
  for (const project of state.recentProjects) {
    if (project.path) {
      pathsToRegister.add(project.path);
    }
  }

  // Also register current project path
  if (state.currentProject?.path) {
    pathsToRegister.add(state.currentProject.path);
  }

  // Register all paths with Electron
  console.log('[ProjectStore] Registering', pathsToRegister.size, 'project paths');
  for (const path of pathsToRegister) {
    try {
      await window.electron.project.registerPath(path);
    } catch (error) {
      console.warn('[ProjectStore] Failed to register path:', path, error);
    }
  }
}
