import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface DemoState {
  isDemoMode: boolean;
  tutorialStep: number;
  tutorialCompleted: boolean;
  showDemoOnStartup: boolean;

  setDemoMode: (enabled: boolean) => void;
  nextTutorialStep: () => void;
  prevTutorialStep: () => void;
  setTutorialStep: (step: number) => void;
  completeTutorial: () => void;
  resetTutorial: () => void;
  setShowOnStartup: (show: boolean) => void;
}

export const useDemoStore = create<DemoState>()(
  persist(
    (set) => ({
      isDemoMode: false,
      tutorialStep: 0,
      tutorialCompleted: false,
      showDemoOnStartup: true,

      setDemoMode: (isDemoMode) => set({ isDemoMode }),
      nextTutorialStep: () => set((state) => ({
        tutorialStep: state.tutorialStep + 1
      })),
      prevTutorialStep: () => set((state) => ({
        tutorialStep: Math.max(0, state.tutorialStep - 1)
      })),
      setTutorialStep: (tutorialStep) => set({ tutorialStep }),
      completeTutorial: () => set({
        tutorialCompleted: true,
        isDemoMode: false
      }),
      resetTutorial: () => set({
        tutorialStep: 0,
        tutorialCompleted: false
      }),
      setShowOnStartup: (showDemoOnStartup) => set({ showDemoOnStartup }),
    }),
    {
      name: 'vibes-demo',
    }
  )
);
