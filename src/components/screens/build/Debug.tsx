import { useProjectStore } from '@/stores';
import { ListItem, SectionTitle, Badge, EmptyState } from '@/components/ui';
import { QuickActions } from '@/components/global';

export function Debug() {
  const { tasks } = useProjectStore();
  const failedTasks = tasks.filter(t => t.status === 'failed');
  const blockedTasks = tasks.filter(t => t.status === 'blocked');

  const issues = [...failedTasks, ...blockedTasks];

  return (
    <div className="screen debug">
      <QuickActions />

      <div className="debug-content">
        <div className="debug-summary">
          <div className="debug-stat">
            <span className="debug-stat-value">{failedTasks.length}</span>
            <span className="debug-stat-label">Failed</span>
          </div>
          <div className="debug-stat">
            <span className="debug-stat-value">{blockedTasks.length}</span>
            <span className="debug-stat-label">Blocked</span>
          </div>
        </div>

        {issues.length === 0 ? (
          <EmptyState
            icon="check"
            title="No issues found"
            description="Everything is running smoothly"
          />
        ) : (
          <div className="debug-issues">
            <SectionTitle>
              Issues <Badge variant="error">{issues.length}</Badge>
            </SectionTitle>
            {issues.map(task => (
              <ListItem key={task.id} variant={task.status === 'failed' ? 'error' : 'warning'}>
                <div className="debug-issue">
                  <div className="debug-issue-title">{task.id}: {task.title}</div>
                  {task.error && (
                    <div className="debug-issue-error">{task.error}</div>
                  )}
                </div>
              </ListItem>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
