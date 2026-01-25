import { useState } from 'react';
import { useProjectStore, useNavigationStore } from '@/stores';
import { TaskCard, SectionTitle, Badge, Button, EmptyState } from '@/components/ui';
import { QuickActions } from '@/components/global';
import type { TaskStatus } from '@/types';

const statusFilters: { id: TaskStatus | 'all'; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'pending', label: 'Pending' },
  { id: 'queued', label: 'Queued' },
  { id: 'running', label: 'Running' },
  { id: 'blocked', label: 'Blocked' },
  { id: 'done', label: 'Done' },
];

export function Tasks() {
  const { tasks } = useProjectStore();
  const { setScreen } = useNavigationStore();
  const [filter, setFilter] = useState<TaskStatus | 'all'>('all');
  const [search, setSearch] = useState('');

  // Show empty state if no tasks at all
  if (tasks.length === 0) {
    return (
      <div className="screen tasks">
        <QuickActions />
        <EmptyState
          icon="list-checks"
          title="No tasks yet"
          description="Tasks will appear here when you create a plan and start execution"
          action={{
            label: 'Go to Plan',
            onClick: () => setScreen('plan'),
          }}
        />
      </div>
    );
  }

  const filteredTasks = tasks.filter(task => {
    if (filter !== 'all' && task.status !== filter) return false;
    if (search && !task.title.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const groupedByPhase = filteredTasks.reduce((acc, task) => {
    const phase = task.phase || 'Other';
    if (!acc[phase]) acc[phase] = [];
    acc[phase].push(task);
    return acc;
  }, {} as Record<string, typeof tasks>);

  return (
    <div className="screen tasks">
      <QuickActions />

      <div className="tasks-toolbar">
        <input
          type="text"
          className="tasks-search"
          placeholder="Search tasks..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div className="tasks-filters">
          {statusFilters.map(f => (
            <Button
              key={f.id}
              variant={filter === f.id ? 'primary' : 'ghost'}
              size="sm"
              onClick={() => setFilter(f.id)}
            >
              {f.label}
              {f.id !== 'all' && (
                <Badge>{tasks.filter(t => t.status === f.id).length}</Badge>
              )}
            </Button>
          ))}
        </div>
      </div>

      <div className="tasks-content">
        {Object.entries(groupedByPhase).map(([phase, phaseTasks]) => (
          <div key={phase} className="tasks-phase">
            <SectionTitle>
              {phase} <Badge>{phaseTasks.length}</Badge>
            </SectionTitle>
            <div className="tasks-list">
              {phaseTasks.map(task => (
                <TaskCard key={task.id} task={task} />
              ))}
            </div>
          </div>
        ))}

        {filteredTasks.length === 0 && (
          <EmptyState
            title="No matching tasks"
            description="Try adjusting your search or filters"
          />
        )}
      </div>
    </div>
  );
}
