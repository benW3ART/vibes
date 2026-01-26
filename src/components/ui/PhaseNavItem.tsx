import type { WorkflowPhase, PhaseStatus } from '@/stores/workflowStore';

interface PhaseNavItemProps {
  phase: WorkflowPhase;
  label: string;
  icon: string;
  status: PhaseStatus;
  isActive: boolean;
  onClick: () => void;
}

export function PhaseNavItem({ label, icon, status, isActive, onClick }: PhaseNavItemProps) {
  const getStatusIndicator = () => {
    switch (status) {
      case 'completed':
      case 'approved':
        return <span className="phase-status phase-status-completed">✓</span>;
      case 'in_progress':
      case 'awaiting_approval':
        return <span className="phase-status phase-status-active">●</span>;
      case 'pending':
      default:
        return <span className="phase-status phase-status-pending">○</span>;
    }
  };

  return (
    <button
      className={`phase-nav-item ${isActive ? 'active' : ''} status-${status}`}
      onClick={onClick}
    >
      {getStatusIndicator()}
      <span className="phase-icon">{icon}</span>
      <span className="phase-label">{label}</span>
    </button>
  );
}
