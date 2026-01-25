import { useState } from 'react';
import { useProjectStore } from '@/stores';
import { StatusDot, Badge } from '@/components/ui';
import { logger } from '@/utils/logger';

export function ProjectSelector() {
  const { currentProject, recentProjects, setCurrentProject } = useProjectStore();
  const [isOpen, setIsOpen] = useState(false);
  const [showNewProjectModal, setShowNewProjectModal] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');

  const handleOpenProject = async () => {
    setIsOpen(false);

    if (!window.electron) {
      alert('Open Project requires Electron');
      return;
    }

    const path = await window.electron.dialog.openDirectory();
    if (path) {
      setCurrentProject({
        id: Date.now().toString(),
        name: path.split('/').pop() || 'Project',
        path,
        status: 'idle',
        lastOpened: new Date(),
        createdAt: new Date(),
      });
    }
  };

  const handleNewProjectClick = () => {
    setIsOpen(false);
    setShowNewProjectModal(true);
    setNewProjectName('');
  };

  const handleCreateProject = async () => {
    if (!newProjectName.trim()) return;

    setShowNewProjectModal(false);

    if (!window.electron) {
      // For browser/demo mode, create a mock project
      setCurrentProject({
        id: Date.now().toString(),
        name: newProjectName,
        path: `/Users/me/Projects/${newProjectName}`,
        status: 'idle',
        lastOpened: new Date(),
        createdAt: new Date(),
      });
      return;
    }

    // For Electron, let user select directory then create project
    const basePath = await window.electron.dialog.openDirectory();
    logger.debug('[ProjectSelector] Selected basePath:', basePath);
    if (basePath) {
      logger.debug('[ProjectSelector] Creating project:', newProjectName, 'at', basePath);
      const result = await window.electron.project.create(newProjectName, basePath);
      logger.debug('[ProjectSelector] Result:', result);
      if (result.success && result.path) {
        setCurrentProject({
          id: Date.now().toString(),
          name: newProjectName,
          path: result.path,
          status: 'idle',
          lastOpened: new Date(),
          createdAt: new Date(),
        });
      } else {
        alert(`Failed to create project: ${result.error}`);
      }
    }
  };

  const handleCancelNewProject = () => {
    setShowNewProjectModal(false);
    setNewProjectName('');
  };

  return (
    <>
      <div className="project-selector">
        <div className="project-current" onClick={() => setIsOpen(!isOpen)}>
          <StatusDot
            status={currentProject?.status === 'running' ? 'active' : 'idle'}
            pulse={currentProject?.status === 'running'}
          />
          <span className="project-name">
            {currentProject?.name || 'No project'}
          </span>
          <span className="project-arrow">{isOpen ? '▲' : '▼'}</span>
        </div>

        {isOpen && (
          <div className="project-dropdown">
            {recentProjects.map((project) => (
              <div
                key={project.id}
                className="project-item"
                onClick={() => {
                  setCurrentProject(project);
                  setIsOpen(false);
                }}
              >
                <span>{project.name}</span>
                <Badge>{project.status}</Badge>
              </div>
            ))}
            <div className="project-item project-add" onClick={handleNewProjectClick}>
              <span>+ New Project</span>
            </div>
            <div className="project-item project-open" onClick={handleOpenProject}>
              <span>📂 Open Project</span>
            </div>
          </div>
        )}
      </div>

      {/* New Project Modal */}
      {showNewProjectModal && (
        <div className="modal-overlay" onClick={handleCancelNewProject}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2 className="modal-title">Create New Project</h2>
            <p className="modal-description">
              Enter a name for your new project. A folder with Genius Team architecture will be created.
            </p>
            <input
              type="text"
              className="modal-input"
              placeholder="my-awesome-project"
              value={newProjectName}
              onChange={(e) => setNewProjectName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCreateProject();
                if (e.key === 'Escape') handleCancelNewProject();
              }}
              autoFocus
            />
            <div className="modal-actions">
              <button className="modal-button modal-button-secondary" onClick={handleCancelNewProject}>
                Cancel
              </button>
              <button
                className="modal-button modal-button-primary"
                onClick={handleCreateProject}
                disabled={!newProjectName.trim()}
              >
                Create Project
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
