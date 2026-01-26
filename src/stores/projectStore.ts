import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Project, Task, Prompt, ProjectStatus, OpenProject } from '@/types';

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
      openProject: (project) => set((state) => {
        const exists = state.openProjects.find(p => p.id === project.id);
        if (exists) {
          // Already open - just activate it
          return {
            activeProjectId: project.id,
            currentProject: project,
          };
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

        return {
          openProjects: [...state.openProjects, newOpenProject],
          activeProjectId: project.id,
          currentProject: project,
          recentProjects: [
            project,
            ...state.recentProjects.filter(p => p.id !== project.id)
          ].slice(0, 5),
        };
      }),

      closeProject: (projectId) => set((state) => {
        const filtered = state.openProjects.filter(p => p.id !== projectId);
        const wasActive = state.activeProjectId === projectId;

        // Determine new active project if closing the active one
        let newActiveId: string | null = state.activeProjectId;
        let newCurrentProject: Project | null = state.currentProject;

        if (wasActive && filtered.length > 0) {
          // Activate the next tab, or the previous if closing the last tab
          const closedIndex = state.openProjects.findIndex(p => p.id === projectId);
          const newActiveIndex = Math.min(closedIndex, filtered.length - 1);
          newActiveId = filtered[newActiveIndex].id;
          // Current project will be loaded by component when switching
          newCurrentProject = null;
        } else if (filtered.length === 0) {
          newActiveId = null;
          newCurrentProject = null;
        }

        return {
          openProjects: filtered.map((p, i) => ({ ...p, order: i })),
          activeProjectId: newActiveId,
          currentProject: newCurrentProject,
        };
      }),

      setActiveProject: (projectId) => set((state) => {
        const project = state.openProjects.find(p => p.id === projectId);
        if (!project) return state;

        return {
          activeProjectId: projectId,
          // Current project will be loaded by component
        };
      }),

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

      closeOtherProjects: (projectId) => set((state) => ({
        openProjects: state.openProjects
          .filter(p => p.id === projectId)
          .map((p, i) => ({ ...p, order: i })),
      })),

      closeAllProjects: () => set({
        openProjects: [],
        activeProjectId: null,
        currentProject: null,
      }),

      getProjectByIndex: (index) => {
        const state = get();
        return state.openProjects[index - 1];
      },
    }),
    {
      name: 'vibes-projects',
      partialize: (state) => ({
        // Persist only what's needed for session restoration
        openProjects: state.openProjects,
        activeProjectId: state.activeProjectId,
        recentProjects: state.recentProjects,
      }),
    }
  )
);
