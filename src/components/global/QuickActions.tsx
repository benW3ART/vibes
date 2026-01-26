import { useNavigationStore, useExecutionStore, toast } from '@/stores';
import { Button } from '@/components/ui';
import type { ScreenId } from '@/types';

interface QuickAction {
  label: string;
  icon: string;
  variant?: 'primary' | 'success' | 'warning' | 'error' | 'secondary' | 'ghost';
  action: () => void;
}

// Helper to check if running in Electron
const isElectron = () => typeof window !== 'undefined' && !!window.electron;

// Helper to execute shell commands
const executeShell = async (command: string): Promise<{ success: boolean; output?: string; error?: string }> => {
  if (!isElectron()) {
    return { success: false, error: 'Electron not available' };
  }
  try {
    const result = await window.electron.shell.exec(command);
    if (result.success) {
      return { success: true, output: result.output || result.stdout };
    } else {
      return { success: false, error: result.error || result.stderr };
    }
  } catch (error) {
    return { success: false, error: String(error) };
  }
};

// Create actions factory that uses stores
const createActions = (
  setScreen: (screen: ScreenId) => void,
  setRunning: (running: boolean) => void,
  setPaused: (paused: boolean) => void,
  toggleChatPanel: () => void,
  toggleXrayPanel: () => void
): Record<ScreenId, QuickAction[]> => ({
  dashboard: [
    {
      label: 'Continue execution',
      icon: '*',
      variant: 'primary',
      action: () => {
        setRunning(true);
        setPaused(false);
        toast.success('Execution resumed');
      }
    },
    {
      label: 'Start all tasks',
      icon: '>',
      variant: 'success',
      action: () => {
        setRunning(true);
        setPaused(false);
        toast.success('Starting all tasks...');
        setScreen('execution');
      }
    },
    {
      label: 'Fix blockers',
      icon: '#',
      variant: 'warning',
      action: () => {
        setScreen('tasks');
        toast.info('Showing blocked tasks');
      }
    },
  ],
  execution: [
    {
      label: 'Pause',
      icon: '||',
      variant: 'primary',
      action: () => {
        setPaused(true);
        toast.warning('Execution paused');
      }
    },
    {
      label: 'Approve',
      icon: '+',
      variant: 'success',
      action: () => {
        toast.success('Task approved, continuing...');
      }
    },
    {
      label: 'Skip task',
      icon: '>>',
      variant: 'warning',
      action: () => {
        toast.warning('Task skipped, moving to next...');
      }
    },
  ],
  tasks: [
    {
      label: 'Execute all',
      icon: '>',
      variant: 'primary',
      action: () => {
        setRunning(true);
        setPaused(false);
        toast.success('Executing all tasks...');
        setScreen('execution');
      }
    },
    {
      label: 'Run next',
      icon: '+',
      variant: 'success',
      action: () => {
        setRunning(true);
        toast.success('Running next task...');
      }
    },
  ],
  prompts: [
    {
      label: 'Generate prompts',
      icon: '*',
      variant: 'primary',
      action: () => {
        toggleChatPanel();
        toast.info('Open the chat to generate prompts from your plan');
      }
    },
  ],
  plan: [
    {
      label: 'Generate tasks',
      icon: '*',
      variant: 'primary',
      action: () => {
        toggleChatPanel();
        toast.info('Chat with Claude to generate your task list');
      }
    },
    {
      label: 'Execute plan',
      icon: '>',
      variant: 'success',
      action: () => {
        setRunning(true);
        setPaused(false);
        toast.success('Executing plan...');
        setScreen('execution');
      }
    },
  ],
  skills: [
    {
      label: 'Add skill',
      icon: '+',
      variant: 'primary',
      action: () => {
        toggleXrayPanel();
        toast.info('Browse available skills in the X-Ray panel');
      }
    },
  ],
  mcp: [
    {
      label: 'Add MCP server',
      icon: '+',
      variant: 'primary',
      action: () => {
        toast.info('MCP server configuration coming soon');
      }
    },
  ],
  settings: [
    {
      label: 'Save',
      icon: '@',
      variant: 'primary',
      action: () => {
        // Settings are auto-saved via zustand persist
        toast.success('Settings saved');
      }
    },
  ],
  memory: [
    {
      label: 'Add memory',
      icon: '+',
      variant: 'primary',
      action: () => {
        toggleChatPanel();
        toast.info('Use the chat to add memories');
      }
    },
  ],
  code: [
    {
      label: 'AI review',
      icon: '*',
      variant: 'primary',
      action: () => {
        toggleChatPanel();
        toast.info('Ask Claude to review your code');
      }
    },
    {
      label: 'Run dev server',
      icon: '>',
      variant: 'success',
      action: async () => {
        if (isElectron()) {
          toast.info('Starting dev server...');
          const result = await executeShell('npm run dev');
          if (result.success) {
            toast.success('Dev server started');
          } else {
            toast.error(`Failed: ${result.error}`);
          }
        } else {
          toast.info('Dev server requires Electron mode');
        }
      }
    },
  ],
  debug: [
    {
      label: 'AI fix all',
      icon: '*',
      variant: 'primary',
      action: () => {
        toggleChatPanel();
        toast.info('Ask Claude to fix all issues');
      }
    },
  ],
  tests: [
    {
      label: 'Run all',
      icon: '>',
      variant: 'primary',
      action: async () => {
        if (isElectron()) {
          toast.info('Running tests...');
          const result = await executeShell('npm test');
          if (result.success) {
            toast.success('Tests completed');
          } else {
            toast.error('Tests failed');
          }
        } else {
          toast.info('Test runner requires Electron mode');
        }
      }
    },
  ],
  deploy: [
    {
      label: 'Deploy production',
      icon: '^',
      variant: 'primary',
      action: async () => {
        if (isElectron()) {
          toast.info('Deploying to production...');
          const result = await executeShell('vercel --prod');
          if (result.success) {
            toast.success('Production deployment complete');
          } else {
            toast.error('Deployment failed. Is Vercel CLI installed?');
          }
        } else {
          toast.info('Deployment requires Electron mode');
        }
      }
    },
    {
      label: 'Deploy staging',
      icon: '~',
      variant: 'success',
      action: async () => {
        if (isElectron()) {
          toast.info('Deploying to staging...');
          const result = await executeShell('vercel');
          if (result.success) {
            toast.success('Staging deployment complete');
          } else {
            toast.error('Deployment failed. Is Vercel CLI installed?');
          }
        } else {
          toast.info('Deployment requires Electron mode');
        }
      }
    },
  ],
  logs: [
    {
      label: 'Pause',
      icon: '||',
      variant: 'secondary',
      action: () => {
        toast.info('Log streaming paused');
      }
    },
  ],
  analytics: [],
  connections: [
    {
      label: 'Add connection',
      icon: '+',
      variant: 'primary',
      action: () => {
        toast.info('Connection options coming soon');
      }
    },
  ],
  environment: [],
  marketplace: [],
  updates: [],
});

export function QuickActions() {
  const { currentScreen, setScreen, toggleChatPanel, toggleXrayPanel } = useNavigationStore();
  const { setRunning, setPaused } = useExecutionStore();

  const actionsByScreen = createActions(setScreen, setRunning, setPaused, toggleChatPanel, toggleXrayPanel);
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
