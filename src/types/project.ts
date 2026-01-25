export type ProjectStatus = 'idle' | 'running' | 'paused' | 'error';

export interface Project {
  id: string;
  name: string;
  path: string;
  status: ProjectStatus;
  lastOpened: Date;
  createdAt: Date;
  description?: string;
  stats?: ProjectStats;
}

export interface ProjectStats {
  totalTasks: number;
  completedTasks: number;
  totalPrompts: number;
  sentPrompts: number;
  tokensUsed: number;
  lastActivity: Date;
}

export interface RecentProject {
  id: string;
  name: string;
  path: string;
  lastOpened: Date;
}
