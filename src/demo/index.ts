// Demo mode components and utilities
export { DemoOverlay } from './DemoOverlay';
export { DemoProvider, useDemo } from './DemoProvider';
export { DemoControls } from './DemoControls';
export { TutorialTooltip } from './TutorialTooltip';
export { TutorialHighlight } from './TutorialHighlight';
export { LiveOutputSimulator } from './LiveOutputSimulator';

// Mock data
export {
  mockProject,
  mockTasks,
  mockAgents,
  mockPrompts,
  mockSkills,
  mockMCPConnections,
  mockPlanPhases,
  type MCPConnection,
  type PlanPhase,
} from './mockData';

// Mock live output
export {
  mockLiveOutput,
  getTotalDuration,
  getEventsUpTo,
  type MockOutputEvent,
} from './mockLiveOutput';

// Tutorial steps
export {
  tutorialSteps,
  getTutorialStep,
  getTotalSteps,
  isLastStep,
  isFirstStep,
  type TutorialStep,
} from './tutorialSteps';
