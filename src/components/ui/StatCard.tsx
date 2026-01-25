import React from 'react';
import { cn } from '@/utils/cn';

export interface StatCardProps {
  label: string;
  value: string | number;
  icon?: React.ReactNode;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  className?: string;
}

export function StatCard({ label, value, icon, trend, trendValue, className }: StatCardProps) {
  return (
    <div className={cn('stat-card', className)}>
      <div className="stat-header">
        {icon && <span className="stat-icon">{icon}</span>}
        <span className="stat-label">{label}</span>
      </div>
      <div className="stat-value">{value}</div>
      {trendValue && (
        <div className={cn('stat-trend', trend && `stat-trend-${trend}`)}>
          {trend === 'up' ? '\u2191' : trend === 'down' ? '\u2193' : '\u2192'} {trendValue}
        </div>
      )}
    </div>
  );
}
