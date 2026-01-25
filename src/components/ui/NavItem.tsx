import React from 'react';
import { cn } from '@/utils/cn';
import type { ScreenId } from '@/types';

export interface NavItemProps {
  id: ScreenId;
  label: string;
  icon: React.ReactNode;
  active?: boolean;
  badge?: string | number;
  shortcut?: string;
  onClick: (id: ScreenId) => void;
}

export function NavItem({ id, label, icon, active, badge, shortcut, onClick }: NavItemProps) {
  return (
    <div
      className={cn('nav-item', active && 'nav-item-active')}
      onClick={() => onClick(id)}
    >
      <span className="nav-item-icon">{icon}</span>
      <span className="nav-item-label">{label}</span>
      {badge && <span className="nav-item-badge">{badge}</span>}
      {shortcut && <span className="nav-item-shortcut">{shortcut}</span>}
    </div>
  );
}
