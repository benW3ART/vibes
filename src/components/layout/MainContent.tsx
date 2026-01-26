import { useNavigationStore } from '@/stores';
import { Header } from './Header';
import {
  Dashboard,
  Execution,
  Tasks,
  Prompts,
  Plan,
  Skills,
  MCP,
  Settings,
  Memory,
  Marketplace,
  Code,
  Debug,
  Tests,
  Deploy,
  Logs,
  Analytics,
  Connections,
  Environment,
  Updates,
} from '@/components/screens';

export function MainContent() {
  const { currentScreen } = useNavigationStore();

  const renderScreen = () => {
    switch (currentScreen) {
      case 'dashboard': return <Dashboard />;
      case 'execution': return <Execution />;
      case 'tasks': return <Tasks />;
      case 'prompts': return <Prompts />;
      case 'plan': return <Plan />;
      case 'skills': return <Skills />;
      case 'mcp': return <MCP />;
      case 'settings': return <Settings />;
      case 'memory': return <Memory />;
      case 'marketplace': return <Marketplace />;
      case 'code': return <Code />;
      case 'debug': return <Debug />;
      case 'tests': return <Tests />;
      case 'deploy': return <Deploy />;
      case 'logs': return <Logs />;
      case 'analytics': return <Analytics />;
      case 'connections': return <Connections />;
      case 'environment': return <Environment />;
      case 'updates': return <Updates />;
      default: return <Dashboard />;
    }
  };

  return (
    <main className="main-content">
      <Header />
      <div className="screen-container">
        {renderScreen()}
      </div>
    </main>
  );
}
