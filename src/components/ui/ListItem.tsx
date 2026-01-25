import React from 'react';
import { cn } from '@/utils/cn';

export interface ListItemProps {
  children: React.ReactNode;
  icon?: React.ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'error';
  onClick?: () => void;
  className?: string;
}

export function ListItem({ children, icon, variant = 'default', onClick, className }: ListItemProps) {
  return (
    <div
      className={cn('list-item', variant !== 'default' && `list-item-${variant}`, className)}
      onClick={onClick}
    >
      {icon && <span className="list-item-icon">{icon}</span>}
      <div className="list-item-content">{children}</div>
    </div>
  );
}
