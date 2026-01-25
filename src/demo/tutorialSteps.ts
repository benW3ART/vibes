export interface TutorialStep {
  id: number;
  title: string;
  description: string;
  targetElement: string; // CSS selector
  position: 'top' | 'bottom' | 'left' | 'right';
  highlightPadding?: number;
}

export const tutorialSteps: TutorialStep[] = [
  {
    id: 1,
    title: 'Welcome to vibes',
    description: 'vibes is your visual command center for Claude Code. Instead of working in the terminal, you get a beautiful dashboard to orchestrate AI agents, monitor progress, and ship faster.',
    targetElement: '.logo',
    position: 'right',
    highlightPadding: 20,
  },
  {
    id: 2,
    title: 'Meet the Agents',
    description: 'Your AI team is always visible here. Watch as orchestrator delegates tasks to specialized agents like frontend developers, backend engineers, and QA testers. Each agent shows their current status and activity.',
    targetElement: '.agent-activity-bar',
    position: 'bottom',
    highlightPadding: 8,
  },
  {
    id: 3,
    title: 'Your Command Center',
    description: 'The Dashboard gives you a bird\'s eye view of your project. See task progress, token usage, active agents, and recent activity all in one place. Click any card to dive deeper.',
    targetElement: '.main-content',
    position: 'left',
    highlightPadding: 12,
  },
  {
    id: 4,
    title: 'Watch AI Work',
    description: 'The Execution screen shows Claude Code working in real-time. See what files are being read, what code is being written, and what commands are running. You can pause, resume, or intervene at any time.',
    targetElement: '[data-screen="execution"]',
    position: 'right',
    highlightPadding: 4,
  },
  {
    id: 5,
    title: 'Understand Tasks',
    description: 'Tasks and Prompts work together. Tasks are broken down from your plan, and each task generates prompts that Claude Code executes. Track progress, review prompts, and manage your queue.',
    targetElement: '[data-screen="tasks"]',
    position: 'right',
    highlightPadding: 4,
  },
  {
    id: 6,
    title: 'Start Building',
    description: 'You\'re ready to go! Open a project folder to get started, or continue exploring this demo. Click "Help & Tutorial" in the sidebar anytime to restart this tour.',
    targetElement: '.project-selector',
    position: 'right',
    highlightPadding: 8,
  },
];

export const getTutorialStep = (stepId: number): TutorialStep | undefined => {
  return tutorialSteps.find(step => step.id === stepId);
};

export const getTotalSteps = (): number => {
  return tutorialSteps.length;
};

export const isLastStep = (stepId: number): boolean => {
  return stepId === tutorialSteps.length;
};

export const isFirstStep = (stepId: number): boolean => {
  return stepId === 1;
};
