import { useNavigationStore, useProjectStore } from '@/stores';
import { Button, Badge } from '@/components/ui';
import { GitHubSyncIndicator } from '@/components/global';
import type { ScreenId } from '@/types';

const screenTitles: Record<ScreenId, string> = {
  dashboard: 'Dashboard',
  execution: 'Execution',
  tasks: 'Tasks',
  prompts: 'Prompts',
  'phase-detail': 'Phase Details',
  plan: 'Plan',
  skills: 'Skills',
  mcp: 'MCP Servers',
  settings: 'Settings',
  memory: 'Memory',
  marketplace: 'Marketplace',
  code: 'Code',
  debug: 'Debug',
  tests: 'Tests',
  deploy: 'Deploy',
  logs: 'Logs',
  analytics: 'Analytics',
  connections: 'Connections',
  environment: 'Environment',
  updates: 'Updates',
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
      <div className="header-center">
        <GitHubSyncIndicator />
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
