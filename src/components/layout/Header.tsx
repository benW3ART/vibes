import { useNavigationStore, useProjectStore } from '@/stores';
import { Button, Badge } from '@/components/ui';
import type { ScreenId } from '@/types';

const screenTitles: Record<ScreenId, string> = {
  dashboard: 'Dashboard',
  execution: 'Execution',
  tasks: 'Tasks',
  prompts: 'Prompts',
  plan: 'Plan',
  skills: 'Skills',
  mcp: 'MCP Servers',
  settings: 'Settings',
  memory: 'Memory',
  code: 'Code',
  debug: 'Debug',
  tests: 'Tests',
  deploy: 'Deploy',
  logs: 'Logs',
  analytics: 'Analytics',
  connections: 'Connections',
  environment: 'Environment',
};

export function Header() {
  const { currentScreen, toggleChatPanel, toggleXrayPanel, toggleCommandPalette } = useNavigationStore();
  const { currentProject } = useProjectStore();

  return (
    <header className="header app-drag-region">
      <div className="header-left">
        <h1 className="header-title">{screenTitles[currentScreen]}</h1>
        {currentProject && (
          <Badge>{currentProject.name}</Badge>
        )}
      </div>
      <div className="header-right">
        <Button variant="ghost" size="sm" onClick={toggleCommandPalette}>
          Cmd+K
        </Button>
        <Button variant="ghost" size="sm" onClick={toggleXrayPanel}>
          X-Ray
        </Button>
        <Button variant="ghost" size="sm" onClick={toggleChatPanel}>
          Chat
        </Button>
      </div>
    </header>
  );
}
