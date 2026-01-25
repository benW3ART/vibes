import { useExecutionStore, useProjectStore } from '@/stores';
import { LiveOutput, TaskCard, AgentCard, SectionTitle, Badge } from '@/components/ui';
import { QuickActions } from '@/components/global';

export function Execution() {
  const { isRunning, isPaused, currentTask, activeAgents, recentEvents } = useExecutionStore();
  const { tasks } = useProjectStore();

  const queuedTasks = tasks.filter(t => t.status === 'queued').slice(0, 5);

  return (
    <div className="screen execution">
      <QuickActions />

      <div className="execution-content">
        <div className="execution-main">
          <div className="execution-status">
            <SectionTitle>
              Status
              <Badge variant={isRunning ? (isPaused ? 'warning' : 'live') : 'default'}>
                {isRunning ? (isPaused ? 'PAUSED' : 'RUNNING') : 'IDLE'}
              </Badge>
            </SectionTitle>
          </div>

          <div className="execution-current">
            <SectionTitle>Current Task</SectionTitle>
            {currentTask ? (
              <TaskCard task={currentTask} />
            ) : (
              <div className="execution-empty">No task currently running</div>
            )}
          </div>

          <div className="execution-output">
            <SectionTitle>Live Output</SectionTitle>
            <LiveOutput events={recentEvents} isLive={isRunning && !isPaused} />
          </div>
        </div>

        <div className="execution-sidebar">
          <div className="execution-agents">
            <SectionTitle>Active Agents ({activeAgents.length})</SectionTitle>
            {activeAgents.length > 0 ? (
              activeAgents.map(agent => (
                <AgentCard key={agent.id} agent={agent} />
              ))
            ) : (
              <div className="execution-empty">No active agents</div>
            )}
          </div>

          <div className="execution-queue">
            <SectionTitle>Queue ({queuedTasks.length})</SectionTitle>
            {queuedTasks.map(task => (
              <TaskCard key={task.id} task={task} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
