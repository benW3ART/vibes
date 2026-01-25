import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type WorkflowPhase =
  | 'welcome'           // No project, needs onboarding
  | 'discovery'         // Interview phase - understanding the project
  | 'market-analysis'   // Analyzing market and competition
  | 'specifications'    // Writing specifications
  | 'design'            // Design system creation
  | 'architecture'      // Technical architecture
  | 'execution'         // Building the project
  | 'qa'                // Quality assurance
  | 'deployment';       // Deploying the project

export type PhaseStatus = 'pending' | 'in_progress' | 'awaiting_approval' | 'approved' | 'completed';

interface PhaseInfo {
  phase: WorkflowPhase;
  status: PhaseStatus;
  startedAt?: Date;
  completedAt?: Date;
  artifact?: string; // Path to generated artifact (e.g., DISCOVERY.xml)
}

interface WorkflowState {
  currentPhase: WorkflowPhase;
  phases: Record<WorkflowPhase, PhaseInfo>;

  // Conversation state
  conversationContext: {
    projectIdea?: string;
    targetUsers?: string;
    mainFeatures?: string;
    competitors?: string;
    differentiator?: string;
    discoveryAnswers?: Record<string, string>;
    specificationsSummary?: string;
    designChoice?: string;
    architectureDecisions?: string[];
  };

  // Actions
  setPhase: (phase: WorkflowPhase) => void;
  updatePhaseStatus: (phase: WorkflowPhase, status: PhaseStatus) => void;
  completePhase: (phase: WorkflowPhase, artifact?: string) => void;
  setConversationContext: (context: Partial<WorkflowState['conversationContext']>) => void;
  resetWorkflow: () => void;
}

const initialPhases: Record<WorkflowPhase, PhaseInfo> = {
  welcome: { phase: 'welcome', status: 'pending' },
  discovery: { phase: 'discovery', status: 'pending' },
  'market-analysis': { phase: 'market-analysis', status: 'pending' },
  specifications: { phase: 'specifications', status: 'pending' },
  design: { phase: 'design', status: 'pending' },
  architecture: { phase: 'architecture', status: 'pending' },
  execution: { phase: 'execution', status: 'pending' },
  qa: { phase: 'qa', status: 'pending' },
  deployment: { phase: 'deployment', status: 'pending' },
};

export const useWorkflowStore = create<WorkflowState>()(
  persist(
    (set) => ({
      currentPhase: 'welcome',
      phases: { ...initialPhases },
      conversationContext: {},

      setPhase: (phase) => set((state) => ({
        currentPhase: phase,
        phases: {
          ...state.phases,
          [phase]: {
            ...state.phases[phase],
            status: 'in_progress',
            startedAt: new Date(),
          },
        },
      })),

      updatePhaseStatus: (phase, status) => set((state) => ({
        phases: {
          ...state.phases,
          [phase]: {
            ...state.phases[phase],
            status,
          },
        },
      })),

      completePhase: (phase, artifact) => set((state) => {
        const phaseOrder: WorkflowPhase[] = [
          'welcome', 'discovery', 'market-analysis', 'specifications',
          'design', 'architecture', 'execution', 'qa', 'deployment'
        ];
        const currentIndex = phaseOrder.indexOf(phase);
        const nextPhase = phaseOrder[currentIndex + 1] || 'deployment';

        return {
          currentPhase: nextPhase,
          phases: {
            ...state.phases,
            [phase]: {
              ...state.phases[phase],
              status: 'completed',
              completedAt: new Date(),
              artifact,
            },
            [nextPhase]: {
              ...state.phases[nextPhase],
              status: 'in_progress',
              startedAt: new Date(),
            },
          },
        };
      }),

      setConversationContext: (context) => set((state) => ({
        conversationContext: {
          ...state.conversationContext,
          ...context,
        },
      })),

      resetWorkflow: () => set({
        currentPhase: 'welcome',
        phases: { ...initialPhases },
        conversationContext: {},
      }),
    }),
    {
      name: 'vibes-workflow',
    }
  )
);

// Helper to get phase display info
export const phaseDisplayInfo: Record<WorkflowPhase, { label: string; icon: string; description: string }> = {
  welcome: {
    label: 'Welcome',
    icon: '👋',
    description: 'Get started with your new project',
  },
  discovery: {
    label: 'Discovery',
    icon: '💡',
    description: 'Tell me about your project idea',
  },
  'market-analysis': {
    label: 'Market Analysis',
    icon: '📊',
    description: 'Understanding the market and competition',
  },
  specifications: {
    label: 'Specifications',
    icon: '📋',
    description: 'Defining features and requirements',
  },
  design: {
    label: 'Design',
    icon: '🎨',
    description: 'Creating the visual identity',
  },
  architecture: {
    label: 'Architecture',
    icon: '🏗️',
    description: 'Planning the technical foundation',
  },
  execution: {
    label: 'Execution',
    icon: '⚡',
    description: 'Building your project',
  },
  qa: {
    label: 'QA',
    icon: '🧪',
    description: 'Testing and quality assurance',
  },
  deployment: {
    label: 'Deployment',
    icon: '🚀',
    description: 'Shipping to production',
  },
};
