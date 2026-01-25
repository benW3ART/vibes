export type ScreenId =
  // Command Center
  | 'dashboard'
  | 'execution'
  | 'tasks'
  | 'prompts'
  // .claude
  | 'plan'
  | 'skills'
  | 'mcp'
  | 'settings'
  | 'memory'
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
  | 'environment';

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
