import { useMemo } from 'react';
import { StatCard, SectionTitle, EmptyState, ProgressBar } from '@/components/ui';
import { QuickActions } from '@/components/global';
import { useProjectStore, useExecutionStore } from '@/stores';

export function Analytics() {
  const { tasks } = useProjectStore();
  const { history, tokensUsed } = useExecutionStore();

  const stats = useMemo(() => {
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(t => t.status === 'done').length;
    const failedTasks = tasks.filter(t => t.status === 'blocked').length;

    // Calculate success rate
    const finishedTasks = completedTasks + failedTasks;
    const successRate = finishedTasks > 0
      ? Math.round((completedTasks / finishedTasks) * 100)
      : 0;

    // Calculate average duration from history
    const durationsMs = history
      .filter(h => h.endTime && h.startTime)
      .map(h => new Date(h.endTime!).getTime() - new Date(h.startTime).getTime());
    const avgDuration = durationsMs.length > 0
      ? Math.round(durationsMs.reduce((a, b) => a + b, 0) / durationsMs.length / 1000)
      : 0;

    // Format tokens with K suffix for readability
    const formattedTokens = tokensUsed >= 1000
      ? `${(tokensUsed / 1000).toFixed(1)}K`
      : String(tokensUsed);

    return {
      totalTasks,
      completedTasks,
      failedTasks,
      successRate,
      avgDuration,
      formattedTokens,
      tokensUsed,
      historyCount: history.length,
    };
  }, [tasks, history, tokensUsed]);

  const hasData = stats.totalTasks > 0 || stats.historyCount > 0;

  return (
    <div className="screen analytics">
      <QuickActions />

      <div className="analytics-content">
        <div className="analytics-stats">
          <StatCard label="Total Tasks" value={String(stats.totalTasks)} icon="list" />
          <StatCard label="Tokens Used" value={stats.formattedTokens} icon="target" />
          <StatCard label="Success Rate" value={`${stats.successRate}%`} icon="check" />
          <StatCard label="Avg Duration" value={`${stats.avgDuration}s`} icon="clock" />
        </div>

        {hasData ? (
          <>
            <div className="analytics-progress">
              <SectionTitle>Task Completion</SectionTitle>
              <div className="analytics-progress-bar">
                <ProgressBar
                  value={stats.totalTasks > 0 ? (stats.completedTasks / stats.totalTasks) * 100 : 0}
                  size="lg"
                  showLabel
                />
                <span className="analytics-progress-label">
                  {stats.completedTasks} / {stats.totalTasks} tasks completed
                </span>
              </div>
            </div>

            <div className="analytics-breakdown">
              <SectionTitle>Breakdown</SectionTitle>
              <div className="analytics-breakdown-grid">
                <div className="analytics-breakdown-item">
                  <span className="analytics-breakdown-value success">{stats.completedTasks}</span>
                  <span className="analytics-breakdown-label">Completed</span>
                </div>
                <div className="analytics-breakdown-item">
                  <span className="analytics-breakdown-value pending">{stats.totalTasks - stats.completedTasks - stats.failedTasks}</span>
                  <span className="analytics-breakdown-label">Pending</span>
                </div>
                <div className="analytics-breakdown-item">
                  <span className="analytics-breakdown-value error">{stats.failedTasks}</span>
                  <span className="analytics-breakdown-label">Failed</span>
                </div>
                <div className="analytics-breakdown-item">
                  <span className="analytics-breakdown-value">{stats.historyCount}</span>
                  <span className="analytics-breakdown-label">Executions</span>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="analytics-charts">
            <SectionTitle>Activity</SectionTitle>
            <EmptyState
              icon="chart"
              title="No data yet"
              description="Analytics will appear once you start executing tasks"
            />
          </div>
        )}
      </div>
    </div>
  );
}
