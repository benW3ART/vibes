import React from 'react';
import { cn } from '@/utils/cn';

export interface SectionTitleProps {
  children: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}

export function SectionTitle({ children, action, className }: SectionTitleProps) {
  return (
    <div className={cn('section-title', className)}>
      <h2 className="section-title-text">{children}</h2>
      {action && <div className="section-title-action">{action}</div>}
    </div>
  );
}
