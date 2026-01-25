import type { Agent } from './agent';
import type { Task } from './task';
import type { ClaudeEvent, ExecutionMode } from './claude';

export interface ExecutionState {
  isRunning: boolean;
  isPaused: boolean;
  mode: ExecutionMode;
  neverStop: boolean;
  currentTask: Task | null;
  activeAgents: Agent[];
  recentEvents: ClaudeEvent[];
  progress: ExecutionProgress;
}

export interface ExecutionProgress {
  total: number;
  completed: number;
  failed: number;
  skipped: number;
  currentPhase: string;
  estimatedRemaining?: number;
}

export interface ExecutionMetrics {
  tokensUsed: number;
  tasksPerHour: number;
  avgTaskDuration: number;
  successRate: number;
}
