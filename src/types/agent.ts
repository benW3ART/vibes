export type AgentType =
  | 'orchestrator'
  | 'developer'
  | 'debugger'
  | 'reviewer'
  | 'qa';

export type AgentStatus = 'idle' | 'active' | 'waiting' | 'error';

export interface Agent {
  id: string;
  type: AgentType;
  name: string;
  status: AgentStatus;
  currentTask?: string;
  tokensUsed?: number;
  startedAt?: Date;
}

export interface AgentActivity {
  agentId: string;
  action: string;
  timestamp: Date;
  details?: string;
}
