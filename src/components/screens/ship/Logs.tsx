import { useState, useEffect, useRef, useCallback } from 'react';
import { Badge, Button, Toggle } from '@/components/ui';
import { QuickActions } from '@/components/global';
import { useExecutionStore } from '@/stores';

interface LogEntry {
  id: string;
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  timestamp: Date;
  source?: string;
}

export function Logs() {
  const [isPaused, setIsPaused] = useState(false);
  const [errorsOnly, setErrorsOnly] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const { isRunning, currentTask } = useExecutionStore();
  const unsubscribeRef = useRef<(() => void) | null>(null);
  const logIdCounter = useRef(0);

  const addLog = useCallback((level: LogEntry['level'], message: string, source?: string) => {
    if (isPaused) return;

    setLogs(prev => {
      const newLog: LogEntry = {
        id: `log-${logIdCounter.current++}`,
        level,
        message,
        timestamp: new Date(),
        source,
      };
      // Keep last 500 logs
      const updated = [...prev, newLog];
      return updated.slice(-500);
    });
  }, [isPaused]);

  // Subscribe to Claude output events
  useEffect(() => {
    if (!window.electron) return;

    // Subscribe to Claude output
    const unsubOutput = window.electron.claude.onOutput((data: unknown) => {
      const message = typeof data === 'string' ? data : JSON.stringify(data);
      addLog('info', message, 'claude');
    });

    // Subscribe to Claude errors
    const unsubError = window.electron.claude.onError((data: unknown) => {
      const message = typeof data === 'string' ? data : JSON.stringify(data);
      addLog('error', message, 'claude');
    });

    // Subscribe to shell output
    const unsubShell = window.electron.shell.onOutput((data: unknown) => {
      const message = typeof data === 'string' ? data : JSON.stringify(data);
      addLog('debug', message, 'shell');
    });

    // Subscribe to MCP output
    const unsubMCP = window.electron.mcp.onOutput((data: unknown) => {
      const message = typeof data === 'string' ? data : JSON.stringify(data);
      addLog('info', message, 'mcp');
    });

    unsubscribeRef.current = () => {
      unsubOutput();
      unsubError();
      unsubShell();
      unsubMCP();
    };

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
    };
  }, [addLog]);

  // Add execution state logs
  useEffect(() => {
    if (isRunning && currentTask) {
      addLog('info', `Executing: ${currentTask}`, 'execution');
    }
  }, [isRunning, currentTask, addLog]);

  const filteredLogs = errorsOnly
    ? logs.filter(l => l.level === 'error' || l.level === 'warn')
    : logs;

  return (
    <div className="screen logs">
      <QuickActions />

      <div className="logs-toolbar">
        <div className="logs-filters">
          <Button
            variant={isPaused ? 'warning' : 'ghost'}
            size="sm"
            onClick={() => setIsPaused(!isPaused)}
          >
            {isPaused ? '▶ Resume' : '⏸ Pause'}
          </Button>
          <div className="logs-toggle">
            <span>Errors only</span>
            <Toggle checked={errorsOnly} onChange={setErrorsOnly} />
          </div>
          <Badge variant={isRunning ? 'success' : 'default'}>
            {isRunning ? 'Live' : 'Idle'}
          </Badge>
        </div>
        <div className="logs-actions">
          <Badge>{logs.length} entries</Badge>
          <Button variant="ghost" size="sm" onClick={() => setLogs([])}>Clear</Button>
        </div>
      </div>

      <div className="logs-content">
        {filteredLogs.length === 0 ? (
          <div className="logs-empty">
            {logs.length === 0
              ? 'No logs yet. Logs will appear when Claude or shell commands run.'
              : 'No matching logs (try disabling "Errors only" filter)'}
          </div>
        ) : (
          filteredLogs.map(log => (
            <div key={log.id} className={`log-entry ${log.level}`}>
              <span className="log-time">
                {log.timestamp.toLocaleTimeString()}
              </span>
              <Badge variant={
                log.level === 'error' ? 'error' :
                log.level === 'warn' ? 'warning' :
                log.level === 'debug' ? 'info' : 'default'
              }>
                {log.level}
              </Badge>
              <span className="log-message">{log.message}</span>
              {log.source && <span className="log-source">[{log.source}]</span>}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
