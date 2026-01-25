import { useState } from 'react';
import { useDemo } from './DemoProvider';
import styles from './DemoControls.module.css';

export function DemoControls() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const { resetDemo, exitDemo, startTutorial } = useDemo();

  const toggleCollapse = () => {
    setIsCollapsed(!isCollapsed);
  };

  return (
    <div className={`${styles.container} ${isCollapsed ? styles.collapsed : ''}`}>
      <button className={styles.badge} onClick={toggleCollapse}>
        <span className={styles.badgeIcon}>
          {isCollapsed ? <ExpandIcon /> : <CollapseIcon />}
        </span>
        <span className={styles.badgeText}>Demo Mode</span>
      </button>

      {!isCollapsed && (
        <div className={styles.controls}>
          <button className={styles.controlButton} onClick={startTutorial}>
            <TutorialIcon />
            <span>Restart Tutorial</span>
          </button>

          <button className={styles.controlButton} onClick={resetDemo}>
            <ResetIcon />
            <span>Reset Demo</span>
          </button>

          <div className={styles.divider} />

          <button className={`${styles.controlButton} ${styles.exitButton}`} onClick={exitDemo}>
            <ExitIcon />
            <span>Exit Demo Mode</span>
          </button>
        </div>
      )}
    </div>
  );
}

function ExpandIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
      <path d="M3 5l3 3 3-3H3z" />
    </svg>
  );
}

function CollapseIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
      <path d="M3 7l3-3 3 3H3z" />
    </svg>
  );
}

function TutorialIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
      <circle cx="7" cy="7" r="6" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <path d="M7 4v4M7 9.5v.5" />
    </svg>
  );
}

function ResetIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
      <path d="M7 2C4.24 2 2 4.24 2 7s2.24 5 5 5c2.42 0 4.44-1.72 4.9-4h-1.32c-.43 1.45-1.77 2.5-3.58 2.5-2.21 0-4-1.79-4-4s1.79-4 4-4c1.1 0 2.1.45 2.82 1.18L8 5.5h4v-4l-1.46 1.46C9.63 2.12 8.39 1.5 7 1.5" />
    </svg>
  );
}

function ExitIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
      <path d="M9 3.5L4.5 8 9 12.5v-3h4v-3H9v-3zM2 2v12h1V2H2z" />
    </svg>
  );
}
