export type ScreenId =
  // Command Center
  | 'dashboard'
  | 'execution'
  | 'tasks'
  | 'prompts'
  // Discovery (workflow phases)
  | 'phase-detail'
  // .claude
  | 'plan'
  | 'skills'
  | 'mcp'
  | 'settings'
  | 'memory'
  | 'marketplace'
  // Build
  | 'code'
  | 'debug'
  | 'tests'
  // Ship
  | 'deploy'
  | 'logs'
  | 'analytics'
  // System
  | 'connections'
  | 'environment'
  | 'updates';

export interface NavSection {
  id: string;
  title: string;
  items: NavItem[];
}

export interface NavItem {
  id: ScreenId;
  label: string;
  icon: string;
  shortcut?: string;
  badge?: string | number;
}
