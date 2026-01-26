import { useProjectStore } from '@/stores';
import type { ProjectStatus, OpenProject } from '@/types';

// Status to color mapping using CSS variables
const STATUS_COLORS: Record<ProjectStatus, string> = {
  running: 'var(--success)',
  error: 'var(--error)',
  waiting: 'var(--info)',
  paused: 'var(--info)',
  idle: 'var(--text-dim)',
};

interface TabProps {
  project: OpenProject;
  isActive: boolean;
  index: number;
  onActivate: () => void;
  onClose: (e: React.MouseEvent) => void;
}

function Tab({ project, isActive, index, onActivate, onClose }: TabProps) {
  return (
    <div
      className={`tab-bar-tab ${isActive ? 'tab-bar-tab-active' : ''}`}
      onClick={onActivate}
      role="tab"
      aria-selected={isActive}
      tabIndex={isActive ? 0 : -1}
      title={project.path}
    >
      {/* Status indicator */}
      <span
        className={`tab-bar-status status-${project.status}`}
        style={{ backgroundColor: STATUS_COLORS[project.status] }}
      />

      {/* Project name */}
      <span className="tab-bar-name">
        {project.name}
      </span>

      {/* Keyboard shortcut hint (for tabs 1-9) */}
      {index < 9 && (
        <span className="tab-bar-shortcut">
          {index + 1}
        </span>
      )}

      {/* Close button */}
      <button
        className="tab-bar-close"
        onClick={onClose}
        aria-label={`Close ${project.name}`}
      >
        ×
      </button>
    </div>
  );
}

export function TabBar() {
  const {
    openProjects,
    activeProjectId,
    setActiveProject,
    closeProject,
  } = useProjectStore();

  // Don't render if no tabs open
  if (openProjects.length === 0) {
    return null;
  }

  const handleClose = (e: React.MouseEvent, projectId: string) => {
    e.stopPropagation();
    closeProject(projectId);
  };

  return (
    <div className="tab-bar" role="tablist">
      <div className="tab-bar-tabs">
        {openProjects.map((project, index) => (
          <Tab
            key={project.id}
            project={project}
            isActive={project.id === activeProjectId}
            index={index}
            onActivate={() => setActiveProject(project.id)}
            onClose={(e) => handleClose(e, project.id)}
          />
        ))}
      </div>

      <div className="tab-bar-actions">
        {/* Future: Add new project button */}
      </div>
    </div>
  );
}
