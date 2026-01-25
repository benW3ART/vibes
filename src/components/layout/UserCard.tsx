import { StatusDot } from '@/components/ui';

export function UserCard() {
  return (
    <div className="user-card">
      <div className="user-avatar">
        <span>👤</span>
      </div>
      <div className="user-info">
        <div className="user-name">Developer</div>
        <div className="user-status">
          <StatusDot status="active" size="sm" />
          <span>Claude connected</span>
        </div>
      </div>
    </div>
  );
}
