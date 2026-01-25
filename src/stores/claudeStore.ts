import { create } from 'zustand';
import type { ClaudeProcess, ClaudeConfig } from '@/types';

interface ClaudeState {
  process: ClaudeProcess | null;
  config: ClaudeConfig;
  isConnected: boolean;
  lastError: string | null;

  setProcess: (process: ClaudeProcess | null) => void;
  setConfig: (config: Partial<ClaudeConfig>) => void;
  setConnected: (connected: boolean) => void;
  setError: (error: string | null) => void;
}

export const useClaudeStore = create<ClaudeState>((set) => ({
  process: null,
  config: {
    mode: 'auto',
    neverStop: true,
    autoApprove: false,
  },
  isConnected: false,
  lastError: null,

  setProcess: (process) => set({ process }),
  setConfig: (config) => set((state) => ({
    config: { ...state.config, ...config }
  })),
  setConnected: (isConnected) => set({ isConnected }),
  setError: (lastError) => set({ lastError }),
}));
