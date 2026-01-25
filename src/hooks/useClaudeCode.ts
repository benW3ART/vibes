import { useEffect, useCallback } from 'react';
import { useExecutionStore } from '@/stores';
import { useClaudeStore } from '@/stores';
import type { ClaudeEvent } from '@/types';

export function useClaudeCode() {
  const {
    isRunning,
    isPaused,
    setRunning,
    setPaused,
    addEvent,
    clearEvents,
    recentEvents
  } = useExecutionStore();

  const {
    process,
    isConnected,
    setProcess,
    setConnected,
    setError
  } = useClaudeStore();

  useEffect(() => {
    if (typeof window === 'undefined' || !window.electron) return;

    const unsubOutput = window.electron.claude.onOutput((event: unknown) => {
      addEvent(event as ClaudeEvent);
    });

    const unsubError = window.electron.claude.onError((event: unknown) => {
      const e = event as { message?: string };
      setError(e.message || 'Unknown error');
      addEvent({ type: 'error', message: e.message, timestamp: new Date() } as ClaudeEvent);
    });

    const unsubExit = window.electron.claude.onExit((code: unknown) => {
      setRunning(false);
      setProcess(null);
      addEvent({
        type: 'output',
        content: `Process exited with code ${code}`,
        timestamp: new Date()
      } as ClaudeEvent);
    });

    const unsubStatus = window.electron.claude.onStatus((status: unknown) => {
      const s = status as { running?: boolean; paused?: boolean };
      setRunning(s.running ?? false);
      setPaused(s.paused ?? false);
    });

    return () => {
      unsubOutput();
      unsubError();
      unsubExit();
      unsubStatus();
    };
  }, [addEvent, setError, setRunning, setPaused, setProcess]);

  const spawn = useCallback(async (projectPath: string) => {
    if (!window.electron) return false;
    clearEvents();
    const result = await window.electron.claude.spawn(projectPath);
    if (result) {
      setConnected(true);
    }
    return result;
  }, [clearEvents, setConnected]);

  const send = useCallback(async (command: string) => {
    if (!window.electron) return false;
    return window.electron.claude.send(command);
  }, []);

  const pause = useCallback(async () => {
    if (!window.electron) return false;
    return window.electron.claude.pause();
  }, []);

  const resume = useCallback(async () => {
    if (!window.electron) return false;
    return window.electron.claude.resume();
  }, []);

  const stop = useCallback(async () => {
    if (!window.electron) return false;
    const result = await window.electron.claude.stop();
    if (result) {
      setConnected(false);
    }
    return result;
  }, [setConnected]);

  return {
    isRunning,
    isPaused,
    isConnected,
    process,
    events: recentEvents,
    spawn,
    send,
    pause,
    resume,
    stop,
  };
}
