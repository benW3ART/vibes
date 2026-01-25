import { useState, useEffect, useCallback, useRef } from 'react';
import { useExecutionStore } from '@/stores';
import type { ClaudeEvent } from '@/types';
import { mockLiveOutput, getTotalDuration, type MockOutputEvent } from './mockLiveOutput';
import styles from './LiveOutputSimulator.module.css';

type SimulatorSpeed = 1 | 2 | 4;
type SimulatorState = 'playing' | 'paused' | 'stopped';

interface LiveOutputSimulatorProps {
  autoPlay?: boolean;
  onComplete?: () => void;
}

export function LiveOutputSimulator({
  autoPlay = true,
  onComplete,
}: LiveOutputSimulatorProps) {
  const [state, setState] = useState<SimulatorState>(autoPlay ? 'playing' : 'stopped');
  const [speed, setSpeed] = useState<SimulatorSpeed>(1);
  const [currentTime, setCurrentTime] = useState(0);
  const [eventIndex, setEventIndex] = useState(0);

  const { addEvent, clearEvents } = useExecutionStore();
  const intervalRef = useRef<number | null>(null);
  const totalDuration = getTotalDuration();

  // Convert mock event to Claude event
  const convertToClaudeEvent = useCallback((event: MockOutputEvent): ClaudeEvent => {
    return {
      type: event.type,
      content: event.content,
      file: event.file,
      lines: event.lines,
      command: event.command,
      message: event.message,
      taskId: event.taskId,
      agent: event.agent,
      timestamp: new Date(),
    };
  }, []);

  // Process events up to current time
  const processEvents = useCallback(() => {
    const eventsToProcess = mockLiveOutput.filter(
      (event, index) => event.delay <= currentTime && index >= eventIndex
    );

    eventsToProcess.forEach((event) => {
      const claudeEvent = convertToClaudeEvent(event);
      addEvent(claudeEvent);
    });

    if (eventsToProcess.length > 0) {
      setEventIndex((prev) => prev + eventsToProcess.length);
    }
  }, [currentTime, eventIndex, addEvent, convertToClaudeEvent]);

  // Update time and process events
  useEffect(() => {
    if (state !== 'playing') return;

    intervalRef.current = window.setInterval(() => {
      setCurrentTime((prev) => {
        const newTime = prev + 100 * speed;
        if (newTime >= totalDuration) {
          setState('stopped');
          onComplete?.();
          return totalDuration;
        }
        return newTime;
      });
    }, 100);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [state, speed, totalDuration, onComplete]);

  // Process events when time changes
  useEffect(() => {
    processEvents();
  }, [currentTime, processEvents]);

  // Control functions
  const play = useCallback(() => {
    if (currentTime >= totalDuration) {
      // Reset if at end
      setCurrentTime(0);
      setEventIndex(0);
      clearEvents();
    }
    setState('playing');
  }, [currentTime, totalDuration, clearEvents]);

  const pause = useCallback(() => {
    setState('paused');
  }, []);

  const reset = useCallback(() => {
    setState('stopped');
    setCurrentTime(0);
    setEventIndex(0);
    clearEvents();
  }, [clearEvents]);

  const toggleSpeed = useCallback(() => {
    setSpeed((prev) => {
      if (prev === 1) return 2;
      if (prev === 2) return 4;
      return 1;
    });
  }, []);

  const progress = (currentTime / totalDuration) * 100;

  return (
    <div className={styles.simulator}>
      <div className={styles.controls}>
        {state === 'playing' ? (
          <button className={styles.controlButton} onClick={pause} title="Pause">
            <PauseIcon />
          </button>
        ) : (
          <button className={styles.controlButton} onClick={play} title="Play">
            <PlayIcon />
          </button>
        )}

        <button className={styles.controlButton} onClick={reset} title="Reset">
          <ResetIcon />
        </button>

        <button
          className={`${styles.speedButton} ${speed > 1 ? styles.active : ''}`}
          onClick={toggleSpeed}
          title="Change speed"
        >
          {speed}x
        </button>
      </div>

      <div className={styles.progressContainer}>
        <div className={styles.progressBar}>
          <div className={styles.progressFill} style={{ width: `${progress}%` }} />
        </div>
        <span className={styles.time}>
          {formatTime(currentTime)} / {formatTime(totalDuration)}
        </span>
      </div>

      <div className={styles.status}>
        {state === 'playing' && <span className={styles.statusDot} />}
        <span className={styles.statusText}>
          {state === 'playing' ? 'Simulating...' : state === 'paused' ? 'Paused' : 'Demo'}
        </span>
      </div>
    </div>
  );
}

function formatTime(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

function PlayIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
      <path d="M3 2.5v9l8-4.5-8-4.5z" />
    </svg>
  );
}

function PauseIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
      <rect x="3" y="2" width="3" height="10" rx="1" />
      <rect x="8" y="2" width="3" height="10" rx="1" />
    </svg>
  );
}

function ResetIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
      <path d="M7 2a5 5 0 1 0 5 5h-1.5A3.5 3.5 0 1 1 7 3.5V1L4 3.5 7 6V4a4 4 0 1 1-4 4H1.5A5.5 5.5 0 0 0 7 13.5 5.5 5.5 0 0 0 12.5 8 5.5 5.5 0 0 0 7 2z" />
    </svg>
  );
}
