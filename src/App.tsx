import { Sidebar, MainContent, AmbientOrbs } from '@/components/layout';
import { ExecutionBar, AssistantGuide, XRayPanel, PanelOverlay, CommandPalette, OnboardingWizard } from '@/components/global';
import { ToastContainer } from '@/components/ui';
import { useKeyboardShortcuts } from '@/hooks';
import { DemoProvider } from '@/demo';
import { useProjectStore, useNavigationStore, useConnectionsStore } from '@/stores';
import { useEffect } from 'react';

function App() {
  useKeyboardShortcuts();
  const { currentProject } = useProjectStore();
  const { setChatPanelOpen } = useNavigationStore();
  const { loadGitHubToken } = useConnectionsStore();

  // Load GitHub token from secure storage on app start
  useEffect(() => {
    const timer = setTimeout(() => {
      if (window.electron?.github && typeof window.electron.github.loadToken === 'function') {
        loadGitHubToken();
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [loadGitHubToken]);

  // Auto-open assistant panel when no project is loaded
  useEffect(() => {
    if (!currentProject) {
      setChatPanelOpen(true);
    }
  }, [currentProject, setChatPanelOpen]);

  return (
    <DemoProvider>
      <div className="app">
        <AmbientOrbs />
        <div className="app-container">
          <Sidebar />
          <div className="main-area">
            <ExecutionBar />
            <MainContent />
          </div>
        </div>
        <AssistantGuide />
        <XRayPanel />
        <PanelOverlay />
        <CommandPalette />
        <ToastContainer />
        <OnboardingWizard />
      </div>
    </DemoProvider>
  );
}

export default App;
