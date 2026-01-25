import { useEffect, useRef } from 'react';
import { cn } from '@/utils/cn';
import type { ClaudeEvent } from '@/types';

export interface LiveOutputProps {
  events: ClaudeEvent[];
  isLive?: boolean;
  className?: string;
}

export function LiveOutput({ events, isLive = false, className }: LiveOutputProps) {
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (contentRef.current) {
      contentRef.current.scrollTop = contentRef.current.scrollHeight;
    }
  }, [events]);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { hour12: false });
  };

  const getLineClass = (type: string) => {
    switch (type) {
      case 'thinking': return 'thinking';
      case 'reading':
      case 'writing': return 'file';
      case 'executing': return 'action';
      case 'success': return 'success';
      case 'error': return 'error';
      default: return '';
    }
  };

  return (
    <div className={cn('live-output', className)}>
      <div className="live-output-header">
        <span className="live-output-title">Live Output</span>
        {isLive && <span className="badge badge-live">LIVE</span>}
      </div>
      <div className="live-output-content" ref={contentRef}>
        {events.map((event, i) => (
          <div key={i} className={cn('live-line', getLineClass(event.type))}>
            <span className="live-line-timestamp">{formatTime(event.timestamp)}</span>
            <span className="live-line-content">
              {event.content || event.message || event.file || event.command}
            </span>
          </div>
        ))}
        {isLive && <span className="live-cursor" />}
      </div>
    </div>
  );
}
