import { useProjectStore, useExecutionStore } from '@/stores';
import { StatCard, PhaseCard, TaskCard, SectionTitle, Badge, ProgressBar } from '@/components/ui';
import { QuickActions } from '@/components/global';
import type { TaskGroup } from '@/types';

export function Dashboard() {
  const { tasks, currentProject } = useProjectStore();
  const { isRunning, activeAgents, mode } = useExecutionStore();

  const completedTasks = tasks.filter(t => t.status === 'done').length;
  const runningTasks = tasks.filter(t => t.status === 'running');
  const blockedTasks = tasks.filter(t => t.status === 'blocked');
  const progress = tasks.length > 0 ? (completedTasks / tasks.length) * 100 : 0;

  // Group tasks by phase
  const phases = tasks.reduce((acc, task) => {
    const phase = task.phase || 'Other';
    if (!acc[phase]) {
      acc[phase] = { phase, tasks: [], progress: 0 };
    }
    acc[phase].tasks.push(task);
    return acc;
  }, {} as Record<string, TaskGroup>);

  // Calculate phase progress
  Object.values(phases).forEach(phase => {
    const done = phase.tasks.filter(t => t.status === 'done').length;
    phase.progress = phase.tasks.length > 0 ? (done / phase.tasks.length) * 100 : 0;
  });

  // Suppress unused variable warnings
  void currentProject;
  void isRunning;

  return (
    <div className="screen dashboard">
      <QuickActions />

      <div className="dashboard-content">
        <div className="dashboard-stats">
          <StatCard
            label="Progress"
            value={`${Math.round(progress)}%`}
            icon="chart"
          />
          <StatCard
            label="Tasks"
            value={`${completedTasks}/${tasks.length}`}
            icon="list"
          />
          <StatCard
            label="Running"
            value={runningTasks.length}
            icon="play"
          />
          <StatCard
            label="Blocked"
            value={blockedTasks.length}
            icon="block"
          />
          <StatCard
            label="Agents"
            value={activeAgents.length}
            icon="agent"
          />
          <StatCard
            label="Mode"
            value={mode}
            icon="settings"
          />
        </div>

        <div className="dashboard-progress">
          <SectionTitle>Overall Progress</SectionTitle>
          <ProgressBar value={progress} size="lg" showLabel />
        </div>

        <div className="dashboard-phases">
          <SectionTitle>Phases</SectionTitle>
          <div className="phases-grid">
            {Object.values(phases).map((phase) => (
              <PhaseCard
                key={phase.phase}
                phase={phase}
                isActive={phase.tasks.some(t => t.status === 'running')}
              />
            ))}
          </div>
        </div>

        {runningTasks.length > 0 && (
          <div className="dashboard-running">
            <SectionTitle>Currently Running</SectionTitle>
            {runningTasks.map(task => (
              <TaskCard key={task.id} task={task} />
            ))}
          </div>
        )}

        {blockedTasks.length > 0 && (
          <div className="dashboard-blocked">
            <SectionTitle>
              Blocked <Badge variant="error">{blockedTasks.length}</Badge>
            </SectionTitle>
            {blockedTasks.map(task => (
              <TaskCard key={task.id} task={task} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
