import { useExecutionStore } from '@/stores';
import { AgentCard } from '@/components/ui';

export function AgentActivityBar() {
  const { activeAgents } = useExecutionStore();

  if (activeAgents.length === 0) {
    return null;
  }

  return (
    <div className="agent-activity-bar">
      <div className="agent-activity-label">Active Agents</div>
      <div className="agent-activity-list">
        {activeAgents.map((agent) => (
          <AgentCard key={agent.id} agent={agent} compact />
        ))}
      </div>
    </div>
  );
}
