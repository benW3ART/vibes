import { create } from 'zustand';
import type { Project, Task, Prompt, ProjectStatus } from '@/types';

interface ProjectState {
  currentProject: Project | null;
  recentProjects: Project[];
  tasks: Task[];
  prompts: Prompt[];

  setCurrentProject: (project: Project | null) => void;
  updateProjectStatus: (status: ProjectStatus) => void;
  addRecentProject: (project: Project) => void;
  setTasks: (tasks: Task[]) => void;
  updateTask: (taskId: string, updates: Partial<Task>) => void;
  setPrompts: (prompts: Prompt[]) => void;
  addPrompt: (prompt: Prompt) => void;
  updatePrompt: (promptId: string, updates: Partial<Prompt>) => void;
  removePrompt: (promptId: string) => void;
}

export const useProjectStore = create<ProjectState>((set) => ({
  currentProject: null,
  recentProjects: [],
  tasks: [],
  prompts: [],

  setCurrentProject: (currentProject) => set({ currentProject }),

  updateProjectStatus: (status) => set((state) => ({
    currentProject: state.currentProject
      ? { ...state.currentProject, status }
      : null
  })),

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
}));
