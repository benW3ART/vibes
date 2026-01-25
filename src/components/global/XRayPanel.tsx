import { useNavigationStore, useExecutionStore, useProjectStore } from '@/stores';
import { Button, Badge, ListItem } from '@/components/ui';

export function XRayPanel() {
  const { xrayPanelOpen, toggleXrayPanel } = useNavigationStore();
  const { recentEvents, activeAgents, mode } = useExecutionStore();
  const { currentProject, tasks } = useProjectStore();

  const runningTasks = tasks.filter(t => t.status === 'running');
  const blockedTasks = tasks.filter(t => t.status === 'blocked');

  return (
    <div className={`panel ${xrayPanelOpen ? 'open' : ''}`}>
      <div className="panel-header">
        <span className="panel-title">X-Ray</span>
        <Button variant="ghost" size="sm" onClick={toggleXrayPanel}>X</Button>
      </div>

      <div className="panel-content">
        <div className="xray-section">
          <h3 className="xray-section-title">Project</h3>
          <div className="xray-item">
            <span>Name</span>
            <span>{currentProject?.name || 'None'}</span>
          </div>
          <div className="xray-item">
            <span>Mode</span>
            <Badge>{mode}</Badge>
          </div>
        </div>

        <div className="xray-section">
          <h3 className="xray-section-title">Active Agents ({activeAgents.length})</h3>
          {activeAgents.map(agent => (
            <ListItem key={agent.id} variant="success">
              <div>
                <div className="xray-agent-name">{agent.name}</div>
                <div className="xray-agent-task">{agent.currentTask}</div>
              </div>
            </ListItem>
          ))}
          {activeAgents.length === 0 && (
            <div className="xray-empty">No active agents</div>
          )}
        </div>

        <div className="xray-section">
          <h3 className="xray-section-title">Running Tasks ({runningTasks.length})</h3>
          {runningTasks.map(task => (
            <ListItem key={task.id} variant="success">
              {task.id}: {task.title}
            </ListItem>
          ))}
        </div>

        {blockedTasks.length > 0 && (
          <div className="xray-section">
            <h3 className="xray-section-title">Blocked ({blockedTasks.length})</h3>
            {blockedTasks.map(task => (
              <ListItem key={task.id} variant="error">
                {task.id}: {task.title}
              </ListItem>
            ))}
          </div>
        )}

        <div className="xray-section">
          <h3 className="xray-section-title">Recent Events</h3>
          <div className="xray-events">
            {recentEvents.slice(-10).map((event, i) => (
              <div key={i} className="xray-event">
                <span className={`xray-event-type ${event.type}`}>{event.type}</span>
                <span className="xray-event-content">
                  {event.content || event.message || event.file}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
