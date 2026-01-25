import { create } from 'zustand';
import type { Agent, Task, ClaudeEvent, ExecutionMode } from '@/types';

interface ExecutionHistory {
  id: string;
  taskId?: string;
  startTime: Date;
  endTime?: Date;
  status: 'success' | 'failed' | 'cancelled';
  tokens?: number;
}

interface ExecutionState {
  isRunning: boolean;
  isPaused: boolean;
  mode: ExecutionMode;
  neverStop: boolean;
  currentTask: Task | null;
  activeAgents: Agent[];
  recentEvents: ClaudeEvent[];
  history: ExecutionHistory[];
  tokensUsed: number;

  setRunning: (running: boolean) => void;
  setPaused: (paused: boolean) => void;
  setMode: (mode: ExecutionMode) => void;
  setNeverStop: (neverStop: boolean) => void;
  setCurrentTask: (task: Task | null) => void;
  updateAgent: (agent: Agent) => void;
  addEvent: (event: ClaudeEvent) => void;
  clearEvents: () => void;
  addHistoryEntry: (entry: ExecutionHistory) => void;
  addTokens: (count: number) => void;
  reset: () => void;
}

const MAX_EVENTS = 100;

export const useExecutionStore = create<ExecutionState>((set) => ({
  isRunning: false,
  isPaused: false,
  mode: 'auto',
  neverStop: true,
  currentTask: null,
  activeAgents: [],
  recentEvents: [],
  history: [],
  tokensUsed: 0,

  setRunning: (isRunning) => set({ isRunning }),
  setPaused: (isPaused) => set({ isPaused }),
  setMode: (mode) => set({ mode }),
  setNeverStop: (neverStop) => set({ neverStop }),
  setCurrentTask: (currentTask) => set({ currentTask }),

  updateAgent: (agent) => set((state) => {
    const existing = state.activeAgents.findIndex(a => a.id === agent.id);
    if (existing >= 0) {
      const agents = [...state.activeAgents];
      agents[existing] = agent;
      return { activeAgents: agents };
    }
    return { activeAgents: [...state.activeAgents, agent] };
  }),

  addEvent: (event) => set((state) => ({
    recentEvents: [...state.recentEvents.slice(-MAX_EVENTS + 1), event]
  })),

  clearEvents: () => set({ recentEvents: [] }),

  addHistoryEntry: (entry) => set((state) => ({
    history: [...state.history, entry].slice(-100) // Keep last 100 entries
  })),

  addTokens: (count) => set((state) => ({
    tokensUsed: state.tokensUsed + count
  })),

  reset: () => set({
    isRunning: false,
    isPaused: false,
    currentTask: null,
    activeAgents: [],
    recentEvents: [],
    history: [],
    tokensUsed: 0,
  }),
}));
