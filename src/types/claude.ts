export type ClaudeEventType =
  | 'thinking'
  | 'reading'
  | 'writing'
  | 'executing'
  | 'success'
  | 'error'
  | 'task_start'
  | 'task_complete'
  | 'agent_switch'
  | 'output';

export interface ClaudeEvent {
  type: ClaudeEventType;
  content?: string;
  file?: string;
  lines?: number;
  command?: string;
  message?: string;
  taskId?: string;
  agent?: string;
  timestamp: Date;
}

export interface ClaudeProcess {
  pid: number;
  status: 'running' | 'paused' | 'stopped';
  startedAt: Date;
  projectPath: string;
}

export type ExecutionMode = 'plan' | 'ask' | 'auto';

export interface ClaudeConfig {
  mode: ExecutionMode;
  neverStop: boolean;
  autoApprove: boolean;
  maxTokens?: number;
}
