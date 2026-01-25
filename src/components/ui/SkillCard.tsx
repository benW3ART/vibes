import { cn } from '@/utils/cn';
import type { Skill } from '@/types';
import { Toggle } from './Toggle';
import { Badge } from './Badge';

export interface SkillCardProps {
  skill: Skill;
  onToggle?: (enabled: boolean) => void;
  onClick?: () => void;
}

export function SkillCard({ skill, onToggle, onClick }: SkillCardProps) {
  return (
    <div className={cn('skill-card', !skill.enabled && 'skill-card-disabled')} onClick={onClick}>
      <div className="skill-card-header">
        <span className="skill-name">{skill.name}</span>
        <Toggle
          checked={skill.enabled}
          onChange={(checked) => onToggle?.(checked)}
        />
      </div>
      <div className="skill-desc">{skill.description}</div>
      <div className="skill-meta">
        <Badge>{skill.category}</Badge>
        {skill.triggers && skill.triggers.length > 0 && (
          <span className="skill-triggers">
            {skill.triggers.slice(0, 2).join(', ')}
          </span>
        )}
      </div>
    </div>
  );
}
