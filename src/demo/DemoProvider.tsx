import { createContext, useContext, useEffect, useCallback, useState, type ReactNode } from 'react';
import { useDemoStore, useProjectStore, useExecutionStore } from '@/stores';
import { mockProject, mockTasks, mockPrompts, mockAgents } from './mockData';
import { getTotalSteps } from './tutorialSteps';
import { DemoOverlay } from './DemoOverlay';
import { TutorialHighlight } from './TutorialHighlight';
import { TutorialTooltip } from './TutorialTooltip';
import { DemoControls } from './DemoControls';

interface DemoContextValue {
  isDemoMode: boolean;
  isTutorialActive: boolean;
  tutorialStep: number;
  startDemo: () => void;
  startTutorial: () => void;
  nextStep: () => void;
  prevStep: () => void;
  endTutorial: () => void;
  exitDemo: () => void;
  resetDemo: () => void;
}

const DemoContext = createContext<DemoContextValue | null>(null);

export function useDemo(): DemoContextValue {
  const context = useContext(DemoContext);
  if (!context) {
    throw new Error('useDemo must be used within a DemoProvider');
  }
  return context;
}

interface DemoProviderProps {
  children: ReactNode;
}

export function DemoProvider({ children }: DemoProviderProps) {
  const [isTutorialActive, setIsTutorialActive] = useState(false);

  const {
    isDemoMode,
    tutorialStep,
    tutorialCompleted,
    setDemoMode,
    nextTutorialStep,
    prevTutorialStep,
    setTutorialStep,
    completeTutorial,
    resetTutorial,
  } = useDemoStore();

  const { setCurrentProject, setTasks, setPrompts } = useProjectStore();
  const { updateAgent, setRunning } = useExecutionStore();

  // Initialize demo data when demo mode is activated
  const initializeDemoData = useCallback(() => {
    // Set mock project
    setCurrentProject(mockProject);

    // Set mock tasks
    setTasks(mockTasks);

    // Set mock prompts
    setPrompts(mockPrompts);

    // Set mock agents
    mockAgents.forEach((agent) => {
      updateAgent(agent);
    });

    // Set execution as running
    setRunning(true);
  }, [setCurrentProject, setTasks, setPrompts, updateAgent, setRunning]);

  // Clear demo data when exiting demo mode
  const clearDemoData = useCallback(() => {
    setCurrentProject(null);
    setTasks([]);
    setPrompts([]);
    setRunning(false);
  }, [setCurrentProject, setTasks, setPrompts, setRunning]);

  // Start demo mode
  const startDemo = useCallback(() => {
    setDemoMode(true);
    initializeDemoData();
  }, [setDemoMode, initializeDemoData]);

  // Start tutorial
  const startTutorial = useCallback(() => {
    setDemoMode(true);
    setTutorialStep(1);
    setIsTutorialActive(true);
    initializeDemoData();
  }, [setDemoMode, setTutorialStep, initializeDemoData]);

  // Next tutorial step
  const nextStep = useCallback(() => {
    const totalSteps = getTotalSteps();
    if (tutorialStep >= totalSteps) {
      completeTutorial();
      setIsTutorialActive(false);
    } else {
      nextTutorialStep();
    }
  }, [tutorialStep, nextTutorialStep, completeTutorial]);

  // Previous tutorial step
  const prevStep = useCallback(() => {
    prevTutorialStep();
  }, [prevTutorialStep]);

  // End tutorial
  const endTutorial = useCallback(() => {
    completeTutorial();
    setIsTutorialActive(false);
  }, [completeTutorial]);

  // Exit demo mode completely
  const exitDemo = useCallback(() => {
    setDemoMode(false);
    setIsTutorialActive(false);
    clearDemoData();
  }, [setDemoMode, clearDemoData]);

  // Reset demo to beginning
  const resetDemo = useCallback(() => {
    resetTutorial();
    setIsTutorialActive(false);
    localStorage.removeItem('vibes:hasSeenDemo');
    // Re-initialize demo data
    initializeDemoData();
  }, [resetTutorial, initializeDemoData]);

  // Auto-initialize demo data when demo mode is active
  useEffect(() => {
    if (isDemoMode && !tutorialCompleted) {
      initializeDemoData();
    }
  }, [isDemoMode, tutorialCompleted, initializeDemoData]);

  const contextValue: DemoContextValue = {
    isDemoMode,
    isTutorialActive,
    tutorialStep,
    startDemo,
    startTutorial,
    nextStep,
    prevStep,
    endTutorial,
    exitDemo,
    resetDemo,
  };

  return (
    <DemoContext.Provider value={contextValue}>
      {children}

      {/* Demo overlay for first launch */}
      <DemoOverlay
        onStartTutorial={startTutorial}
        onSkipTutorial={exitDemo}
        onExploreDemo={startDemo}
      />

      {/* Tutorial components */}
      {isTutorialActive && tutorialStep > 0 && (
        <>
          <TutorialHighlight step={tutorialStep} />
          <TutorialTooltip
            step={tutorialStep}
            onNext={nextStep}
            onPrev={prevStep}
            onSkip={endTutorial}
          />
        </>
      )}

      {/* Demo controls when in demo mode - always visible */}
      {isDemoMode && <DemoControls />}
    </DemoContext.Provider>
  );
}
