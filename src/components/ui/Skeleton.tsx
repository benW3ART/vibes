import React from 'react';
import { cn } from '@/utils/cn';
import styles from './Skeleton.module.css';

export interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  variant?: 'text' | 'card' | 'circle';
  className?: string;
  count?: number;
}

export function Skeleton({
  width,
  height,
  variant = 'text',
  className,
  count = 1,
}: SkeletonProps) {
  const style: React.CSSProperties = {
    width: typeof width === 'number' ? `${width}px` : width,
    height: typeof height === 'number' ? `${height}px` : height,
  };

  const skeletons = Array.from({ length: count }, (_, i) => (
    <div
      key={i}
      className={cn(
        styles.skeleton,
        styles[variant],
        className
      )}
      style={style}
    />
  ));

  if (count === 1) {
    return skeletons[0];
  }

  return <div className={styles.skeletonGroup}>{skeletons}</div>;
}

export function SkeletonText({ lines = 3 }: { lines?: number }) {
  return (
    <div className={styles.skeletonText}>
      {Array.from({ length: lines }, (_, i) => (
        <Skeleton
          key={i}
          variant="text"
          width={i === lines - 1 ? '60%' : '100%'}
        />
      ))}
    </div>
  );
}

export function SkeletonCard() {
  return (
    <div className={styles.skeletonCard}>
      <div className={styles.skeletonCardHeader}>
        <Skeleton variant="circle" width={32} height={32} />
        <div className={styles.skeletonCardHeaderText}>
          <Skeleton variant="text" width="60%" height={14} />
          <Skeleton variant="text" width="40%" height={12} />
        </div>
      </div>
      <SkeletonText lines={2} />
    </div>
  );
}
