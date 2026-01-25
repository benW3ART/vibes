import { useEffect, useCallback } from 'react';
import { useDemoStore } from '@/stores';

export function useDemo() {
  const {
    isDemoMode,
    tutorialStep,
    tutorialCompleted,
    showDemoOnStartup,
    setDemoMode,
    nextTutorialStep,
    prevTutorialStep,
    setTutorialStep,
    completeTutorial,
    resetTutorial,
    setShowOnStartup,
  } = useDemoStore();

  // Check if should show demo on first launch
  useEffect(() => {
    if (showDemoOnStartup && !tutorialCompleted) {
      setDemoMode(true);
    }
  }, [showDemoOnStartup, tutorialCompleted, setDemoMode]);

  const startDemo = useCallback(() => {
    resetTutorial();
    setDemoMode(true);
  }, [resetTutorial, setDemoMode]);

  const exitDemo = useCallback(() => {
    setDemoMode(false);
  }, [setDemoMode]);

  const finishTutorial = useCallback(() => {
    completeTutorial();
    setShowOnStartup(false);
  }, [completeTutorial, setShowOnStartup]);

  return {
    isDemoMode,
    tutorialStep,
    tutorialCompleted,
    startDemo,
    exitDemo,
    nextStep: nextTutorialStep,
    prevStep: prevTutorialStep,
    goToStep: setTutorialStep,
    finishTutorial,
  };
}
