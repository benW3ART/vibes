import { cn } from '@/utils/cn';
import { StatusDot } from './StatusDot';
import { Badge } from './Badge';

export interface Connection {
  id: string;
  name: string;
  type: string;
  status: 'connected' | 'disconnected' | 'error';
  lastPing?: Date;
}

export interface ConnectionCardProps {
  connection: Connection;
  onClick?: () => void;
}

export function ConnectionCard({ connection, onClick }: ConnectionCardProps) {
  return (
    <div className={cn('connection-card', connection.status)} onClick={onClick}>
      <div className="connection-header">
        <StatusDot
          status={connection.status === 'connected' ? 'active' : connection.status === 'error' ? 'error' : 'idle'}
          pulse={connection.status === 'connected'}
        />
        <span className="connection-name">{connection.name}</span>
        <Badge>{connection.type}</Badge>
      </div>
      {connection.lastPing && (
        <div className="connection-ping">
          Last ping: {connection.lastPing.toLocaleTimeString()}
        </div>
      )}
    </div>
  );
}
