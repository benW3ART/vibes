export type TaskStatus =
  | 'pending'
  | 'queued'
  | 'running'
  | 'blocked'
  | 'done'
  | 'failed'
  | 'skipped';

export type TaskPriority = 'low' | 'medium' | 'high' | 'critical';

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  phase: string;
  dependencies?: string[];
  assignedAgent?: string;
  estimatedTokens?: number;
  actualTokens?: number;
  startedAt?: Date;
  completedAt?: Date;
  error?: string;
  tags?: string[];
}

export interface TaskGroup {
  phase: string;
  tasks: Task[];
  progress: number;
}
