import { cn } from '@/utils/cn';
import type { TaskGroup } from '@/types';
import { ProgressBar } from './ProgressBar';

export interface PhaseCardProps {
  phase: TaskGroup;
  isActive?: boolean;
  onClick?: () => void;
}

export function PhaseCard({ phase, isActive, onClick }: PhaseCardProps) {
  const completedCount = phase.tasks.filter(t => t.status === 'done').length;

  return (
    <div className={cn('phase-card', isActive && 'phase-card-active')} onClick={onClick}>
      <div className="phase-card-header">
        <span className="phase-name">{phase.phase}</span>
        <span className="phase-count">{completedCount}/{phase.tasks.length}</span>
      </div>
      <ProgressBar value={phase.progress} size="sm" />
    </div>
  );
}
