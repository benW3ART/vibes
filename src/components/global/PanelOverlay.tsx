import { useNavigationStore } from '@/stores';

export function PanelOverlay() {
  const { chatPanelOpen, xrayPanelOpen, closeAllPanels } = useNavigationStore();
  const isVisible = chatPanelOpen || xrayPanelOpen;

  return (
    <div
      className={`panel-overlay ${isVisible ? 'visible' : ''}`}
      onClick={closeAllPanels}
    />
  );
}
