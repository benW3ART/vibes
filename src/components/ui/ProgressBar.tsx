import { cn } from '@/utils/cn';

export interface ProgressBarProps {
  value: number;
  max?: number;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  showLabel?: boolean;
}

export function ProgressBar({
  value,
  max = 100,
  size = 'md',
  className,
  showLabel
}: ProgressBarProps) {
  const percent = Math.min(100, Math.max(0, (value / max) * 100));

  return (
    <div className={cn('progress-container', className)}>
      <div className={cn('progress-bar', `progress-${size}`)}>
        <div className="progress-fill" style={{ width: `${percent}%` }} />
      </div>
      {showLabel && (
        <span className="progress-label">{Math.round(percent)}%</span>
      )}
    </div>
  );
}
