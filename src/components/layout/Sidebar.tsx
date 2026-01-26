import { useNavigationStore, useWorkflowStore, phaseDisplayInfo } from '@/stores';
import { NavItem, PhaseNavItem } from '@/components/ui';
import type { ScreenId } from '@/types';
import type { WorkflowPhase } from '@/stores/workflowStore';
import { ProjectSelector } from './ProjectSelector';
import { ModeSelector } from './ModeSelector';
import { UserCard } from './UserCard';
import { useDemo } from '@/demo';
import { useReleaseMonitor } from '@/hooks/useReleaseMonitor';

// Discovery phases to show in sidebar (pre-code phases only)
const discoveryPhases: WorkflowPhase[] = [
  'discovery',
  'market-analysis',
  'specifications',
  'design',
  'architecture',
];

interface NavSectionItem {
  id: ScreenId;
  label: string;
  icon: string;
  shortcut?: string;
}

interface NavSection {
  id: string;
  title: string;
  items: NavSectionItem[];
}

const navSections: NavSection[] = [
  {
    id: 'command',
    title: 'COMMAND',
    items: [
      { id: 'dashboard' as ScreenId, label: 'Dashboard', icon: '📊', shortcut: '⌘1' },
      { id: 'execution' as ScreenId, label: 'Execution', icon: '▶️', shortcut: '⌘2' },
      { id: 'tasks' as ScreenId, label: 'Tasks', icon: '📋', shortcut: '⌘3' },
      { id: 'prompts' as ScreenId, label: 'Prompts', icon: '💬', shortcut: '⌘4' },
    ],
  },
  {
    id: 'claude',
    title: '.CLAUDE',
    items: [
      { id: 'plan' as ScreenId, label: 'Plan', icon: '📝' },
      { id: 'skills' as ScreenId, label: 'Skills', icon: '⚡' },
      { id: 'mcp' as ScreenId, label: 'MCP', icon: '🔌' },
      { id: 'marketplace' as ScreenId, label: 'Marketplace', icon: '🛒' },
      { id: 'settings' as ScreenId, label: 'Settings', icon: '⚙️' },
      { id: 'memory' as ScreenId, label: 'Memory', icon: '🧠' },
    ],
  },
  {
    id: 'build',
    title: 'BUILD',
    items: [
      { id: 'code' as ScreenId, label: 'Code', icon: '💻' },
      { id: 'debug' as ScreenId, label: 'Debug', icon: '🔧' },
      { id: 'tests' as ScreenId, label: 'Tests', icon: '🧪' },
    ],
  },
  {
    id: 'ship',
    title: 'SHIP',
    items: [
      { id: 'deploy' as ScreenId, label: 'Deploy', icon: '🚀' },
      { id: 'logs' as ScreenId, label: 'Logs', icon: '📜' },
      { id: 'analytics' as ScreenId, label: 'Analytics', icon: '📈' },
    ],
  },
  {
    id: 'system',
    title: 'SYSTEM',
    items: [
      { id: 'connections' as ScreenId, label: 'Connections', icon: '🔗' },
      { id: 'environment' as ScreenId, label: 'Environment', icon: '🌐' },
      { id: 'updates' as ScreenId, label: 'Updates', icon: '🔄' },
    ],
  },
];

export function Sidebar() {
  const { currentScreen, setScreen, setChatPanelOpen } = useNavigationStore();
  const { phases, currentPhase, setPhase } = useWorkflowStore();
  const { startTutorial, isDemoMode, startDemo } = useDemo();
  const { hasUpdates, suggestions } = useReleaseMonitor();

  const handleHelpClick = () => {
    if (isDemoMode) {
      startTutorial();
    } else {
      startDemo();
      startTutorial();
    }
  };

  // Calculate discovery progress
  const completedCount = discoveryPhases.filter(
    p => phases[p]?.status === 'completed' || phases[p]?.status === 'approved'
  ).length;

  // Handle phase click - open chat panel and set phase
  const handlePhaseClick = (phase: WorkflowPhase) => {
    setPhase(phase);
    setChatPanelOpen(true);
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="logo">vibes</div>
      </div>

      <div className="sidebar-content">
        <ProjectSelector />
        <ModeSelector />

        {/* Discovery Section - Pre-code phases */}
        <div className="nav-section nav-section-discovery">
          <div className="nav-section-title">
            <span>DISCOVERY</span>
            <span className="discovery-progress">{completedCount}/{discoveryPhases.length}</span>
          </div>
          {discoveryPhases.map((phase) => (
            <PhaseNavItem
              key={phase}
              phase={phase}
              label={phaseDisplayInfo[phase].label}
              icon={phaseDisplayInfo[phase].icon}
              status={phases[phase]?.status || 'pending'}
              isActive={currentPhase === phase}
              onClick={() => handlePhaseClick(phase)}
            />
          ))}
        </div>

        {navSections.map((section) => (
          <div key={section.id} className="nav-section">
            <div className="nav-section-title">{section.title}</div>
            {section.items.map((item) => (
              <NavItem
                key={item.id}
                id={item.id}
                label={item.label}
                icon={<span>{item.icon}</span>}
                active={currentScreen === item.id}
                shortcut={item.shortcut}
                onClick={setScreen}
                badge={item.id === 'updates' && (hasUpdates || suggestions.length > 0)
                  ? (suggestions.length || '!')
                  : undefined}
              />
            ))}
          </div>
        ))}

        {/* Help & Tutorial */}
        <div className="nav-section nav-section-help">
          <button className="help-button" onClick={handleHelpClick}>
            <span className="help-icon">?</span>
            <span className="help-text">Help & Tutorial</span>
          </button>
        </div>
      </div>

      <div className="sidebar-footer">
        <UserCard />
      </div>
    </aside>
  );
}
