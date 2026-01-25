import { useNavigationStore } from '@/stores';
import { Button } from '@/components/ui';
import type { ScreenId } from '@/types';

interface QuickAction {
  label: string;
  icon: string;
  variant?: 'primary' | 'success' | 'warning' | 'error' | 'secondary' | 'ghost';
  action: () => void;
}

const actionsByScreen: Record<ScreenId, QuickAction[]> = {
  dashboard: [
    { label: 'Continue execution', icon: '*', variant: 'primary', action: () => {} },
    { label: 'Start all tasks', icon: '>', variant: 'success', action: () => {} },
    { label: 'Fix blockers', icon: '#', variant: 'warning', action: () => {} },
  ],
  execution: [
    { label: 'Pause', icon: '||', variant: 'primary', action: () => {} },
    { label: 'Approve', icon: '+', variant: 'success', action: () => {} },
    { label: 'Skip task', icon: '>>', variant: 'warning', action: () => {} },
  ],
  tasks: [
    { label: 'Execute all', icon: '>', variant: 'primary', action: () => {} },
    { label: 'Run next', icon: '+', variant: 'success', action: () => {} },
  ],
  prompts: [
    { label: 'Generate prompts', icon: '*', variant: 'primary', action: () => {} },
  ],
  plan: [
    { label: 'Generate tasks', icon: '*', variant: 'primary', action: () => {} },
    { label: 'Execute plan', icon: '>', variant: 'success', action: () => {} },
  ],
  skills: [
    { label: 'Add skill', icon: '+', variant: 'primary', action: () => {} },
  ],
  mcp: [
    { label: 'Add MCP server', icon: '+', variant: 'primary', action: () => {} },
  ],
  settings: [
    { label: 'Save', icon: '@', variant: 'primary', action: () => {} },
  ],
  memory: [
    { label: 'Add memory', icon: '+', variant: 'primary', action: () => {} },
  ],
  code: [
    { label: 'AI review', icon: '*', variant: 'primary', action: () => {} },
    { label: 'Run dev server', icon: '>', variant: 'success', action: () => {} },
  ],
  debug: [
    { label: 'AI fix all', icon: '*', variant: 'primary', action: () => {} },
  ],
  tests: [
    { label: 'Run all', icon: '>', variant: 'primary', action: () => {} },
  ],
  deploy: [
    { label: 'Deploy production', icon: '^', variant: 'primary', action: () => {} },
    { label: 'Deploy staging', icon: '~', variant: 'success', action: () => {} },
  ],
  logs: [
    { label: 'Pause', icon: '||', variant: 'secondary', action: () => {} },
  ],
  analytics: [],
  connections: [
    { label: 'Add connection', icon: '+', variant: 'primary', action: () => {} },
  ],
  environment: [],
};

export function QuickActions() {
  const { currentScreen } = useNavigationStore();
  const actions = actionsByScreen[currentScreen] || [];

  if (actions.length === 0) return null;

  return (
    <div className="quick-actions">
      {actions.map((action, i) => (
        <Button
          key={i}
          variant={action.variant || 'secondary'}
          onClick={action.action}
        >
          {action.icon} {action.label}
        </Button>
      ))}
    </div>
  );
}
