import { cn } from '@/utils/cn';

export interface StatusDotProps {
  status: 'active' | 'idle' | 'error' | 'warning';
  pulse?: boolean;
  size?: 'sm' | 'md';
  className?: string;
}

export function StatusDot({ status, pulse = false, size = 'md', className }: StatusDotProps) {
  return (
    <span
      className={cn(
        'status-dot',
        `status-dot-${status}`,
        `status-dot-${size}`,
        pulse && 'status-dot-pulse',
        className
      )}
    />
  );
}
