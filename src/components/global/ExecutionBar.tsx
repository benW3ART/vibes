import { useExecutionStore, useProjectStore } from '@/stores';
import { Button, ProgressBar, Badge, StatusDot } from '@/components/ui';

export function ExecutionBar() {
  const { isRunning, isPaused, mode, currentTask, setRunning, setPaused } = useExecutionStore();
  const { tasks } = useProjectStore();

  const completedTasks = tasks.filter(t => t.status === 'done').length;
  const progress = tasks.length > 0 ? (completedTasks / tasks.length) * 100 : 0;

  const handlePlayPause = () => {
    if (isRunning) {
      setPaused(!isPaused);
    } else {
      setRunning(true);
    }
  };

  const handleStop = () => {
    setRunning(false);
    setPaused(false);
  };

  return (
    <div className="exec-bar">
      <div className="exec-bar-left">
        <Button
          variant={isRunning && !isPaused ? 'success' : 'primary'}
          onClick={handlePlayPause}
        >
          {isRunning && !isPaused ? '||' : '>'}
        </Button>
        {isRunning && (
          <Button variant="error" onClick={handleStop}>Stop</Button>
        )}
        <Badge variant={isRunning ? 'live' : undefined}>
          {isRunning ? (isPaused ? 'PAUSED' : 'RUNNING') : 'IDLE'}
        </Badge>
      </div>

      <div className="exec-bar-center">
        <div className="exec-progress">
          <ProgressBar value={progress} size="sm" />
        </div>
        <div className="exec-task">
          {currentTask ? (
            <>
              <StatusDot status="active" pulse />
              <span className="exec-task-id">{currentTask.id}</span>
              <span className="exec-task-title">{currentTask.title}</span>
            </>
          ) : (
            <span className="exec-task-idle">No active task</span>
          )}
        </div>
      </div>

      <div className="exec-bar-right">
        <span className="exec-count">{completedTasks}/{tasks.length}</span>
        <Badge>{mode}</Badge>
      </div>
    </div>
  );
}
