import { useState, useEffect } from 'react';
import { useDemoStore } from '@/stores';
import styles from './DemoOverlay.module.css';

interface DemoOverlayProps {
  onStartTutorial: () => void;
  onSkipTutorial: () => void;
  onExploreDemo: () => void;
}

export function DemoOverlay({
  onStartTutorial,
  onSkipTutorial,
  onExploreDemo,
}: DemoOverlayProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [shouldShow, setShouldShow] = useState(false);
  const { tutorialCompleted, showDemoOnStartup, setDemoMode } = useDemoStore();

  useEffect(() => {
    // Check if we should show the overlay on first launch
    const hasSeenDemo = localStorage.getItem('vibes:hasSeenDemo');

    if (!hasSeenDemo && showDemoOnStartup && !tutorialCompleted) {
      setShouldShow(true);
      setDemoMode(true);
      // Delay for entrance animation
      const timer = setTimeout(() => setIsVisible(true), 100);
      return () => clearTimeout(timer);
    }
  }, [showDemoOnStartup, tutorialCompleted, setDemoMode]);

  const handleStartTutorial = () => {
    setIsVisible(false);
    localStorage.setItem('vibes:hasSeenDemo', 'true');
    setShouldShow(false);
    setTimeout(onStartTutorial, 300);
  };

  const handleSkipTutorial = () => {
    setIsVisible(false);
    localStorage.setItem('vibes:hasSeenDemo', 'true');
    setShouldShow(false);
    setTimeout(onSkipTutorial, 300);
  };

  const handleExploreDemo = () => {
    setIsVisible(false);
    localStorage.setItem('vibes:hasSeenDemo', 'true');
    setShouldShow(false);
    setTimeout(onExploreDemo, 300);
  };

  // Don't render anything if we shouldn't show
  if (!shouldShow) {
    return null;
  }

  return (
    <div className={`${styles.overlay} ${isVisible ? styles.visible : ''}`}>
      <div className={styles.content}>
        <div className={styles.logo}>
          <span className={styles.logoText}>vibes</span>
          <span className={styles.logoSubtext}>Visual IDE for Claude Code</span>
        </div>

        <h1 className={styles.title}>
          Build what you <span className={styles.highlight}>feel</span>
        </h1>

        <p className={styles.description}>
          Your visual IDE powered by Claude. I guide you from idea to production:
          Discovery → Specs → Design → Architecture → Build.
        </p>

        <div className={styles.features}>
          <div className={styles.feature}>
            <span className={styles.featureIcon}>💡</span>
            <span className={styles.featureText}>Guided interview</span>
          </div>
          <div className={styles.feature}>
            <span className={styles.featureIcon}>🤖</span>
            <span className={styles.featureText}>Automatic building</span>
          </div>
          <div className={styles.feature}>
            <span className={styles.featureIcon}>⚡</span>
            <span className={styles.featureText}>Zero config</span>
          </div>
        </div>

        <div className={styles.actions}>
          <button
            className={styles.primaryButton}
            onClick={handleSkipTutorial}
          >
            Start my project
          </button>
          <button
            className={styles.secondaryButton}
            onClick={handleExploreDemo}
          >
            View the demo
          </button>
        </div>

        <button
          className={styles.skipLink}
          onClick={handleStartTutorial}
        >
          Suivre le tutoriel complet
        </button>
      </div>

      <div className={styles.orbs}>
        <div className={styles.orb1} />
        <div className={styles.orb2} />
      </div>
    </div>
  );
}
