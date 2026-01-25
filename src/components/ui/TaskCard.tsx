import { cn } from '@/utils/cn';
import type { Task, TaskStatus } from '@/types';
import { Badge } from './Badge';

export interface TaskCardProps {
  task: Task;
  onClick?: () => void;
}

const statusIcons: Record<TaskStatus, string> = {
  pending: '\u25CB',
  queued: '\u25D0',
  running: '\u25CF',
  blocked: '\u2715',
  done: '\u2713',
  failed: '\u2715',
  skipped: '\u2298',
};

export function TaskCard({ task, onClick }: TaskCardProps) {
  return (
    <div className={cn('task-card', task.status)} onClick={onClick}>
      <div className="task-card-header">
        <span className={cn('task-status-icon', task.status)}>
          {statusIcons[task.status]}
        </span>
        <span className="task-id">{task.id}</span>
        <Badge variant={task.priority === 'critical' ? 'error' : task.priority === 'high' ? 'warning' : 'default'}>
          {task.priority}
        </Badge>
      </div>
      <div className="task-card-title">{task.title}</div>
      {task.description && (
        <div className="task-card-desc">{task.description}</div>
      )}
      {task.tags && task.tags.length > 0 && (
        <div className="task-card-tags">
          {task.tags.map(tag => (
            <span key={tag} className="task-tag">{tag}</span>
          ))}
        </div>
      )}
    </div>
  );
}
