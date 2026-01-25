import { cn } from '@/utils/cn';
import type { Agent } from '@/types';
import { StatusDot } from './StatusDot';
import { Badge } from './Badge';

export interface AgentCardProps {
  agent: Agent;
  compact?: boolean;
  onClick?: () => void;
}

const agentIcons: Record<string, string> = {
  orchestrator: '\uD83C\uDFAF',
  developer: '\uD83D\uDCBB',
  debugger: '\uD83D\uDD27',
  reviewer: '\uD83D\uDC40',
  qa: '\u2705',
};

export function AgentCard({ agent, compact = false, onClick }: AgentCardProps) {
  if (compact) {
    return (
      <div className="agent-card-compact" onClick={onClick}>
        <span className="agent-icon">{agentIcons[agent.type] || '\uD83E\uDD16'}</span>
        <StatusDot
          status={agent.status === 'active' ? 'active' : agent.status === 'error' ? 'error' : 'idle'}
          size="sm"
          pulse={agent.status === 'active'}
        />
      </div>
    );
  }

  return (
    <div className={cn('agent-card', agent.status)} onClick={onClick}>
      <div className="agent-card-header">
        <span className="agent-icon">{agentIcons[agent.type] || '\uD83E\uDD16'}</span>
        <span className="agent-name">{agent.name}</span>
        <StatusDot
          status={agent.status === 'active' ? 'active' : agent.status === 'error' ? 'error' : 'idle'}
          pulse={agent.status === 'active'}
        />
      </div>
      {agent.currentTask && (
        <div className="agent-task">{agent.currentTask}</div>
      )}
      {agent.tokensUsed && (
        <div className="agent-tokens">
          <Badge>{agent.tokensUsed.toLocaleString()} tokens</Badge>
        </div>
      )}
    </div>
  );
}
