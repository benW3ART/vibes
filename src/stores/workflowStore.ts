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

// Conversation context for discovery and planning
interface ConversationContext {
  projectIdea?: string;
  targetUsers?: string;
  mainFeatures?: string;
  competitors?: string;
  differentiator?: string;
  discoveryAnswers?: Record<string, string>;
  specificationsSummary?: string;
  designChoice?: string;
  architectureDecisions?: string[];
}

// Per-project workflow state
export interface ProjectWorkflow {
  currentPhase: WorkflowPhase;
  phases: Record<WorkflowPhase, PhaseInfo>;
  conversationContext: ConversationContext;
}

interface WorkflowState {
  // Per-project workflows storage
  projectWorkflows: Record<string, ProjectWorkflow>;

  // Active project ID (synced with projectStore)
  activeProjectId: string | null;

  // Current project's workflow (synced from projectWorkflows for convenience)
  currentPhase: WorkflowPhase;
  phases: Record<WorkflowPhase, PhaseInfo>;
  conversationContext: ConversationContext;

  // Actions
  setPhase: (phase: WorkflowPhase) => void;
  updatePhaseStatus: (phase: WorkflowPhase, status: PhaseStatus) => void;
  completePhase: (phase: WorkflowPhase, artifact?: string) => void;
  setConversationContext: (context: Partial<ConversationContext>) => void;
  resetWorkflow: () => void;

  // Per-project actions
  switchToProject: (projectId: string | null) => void;
  initProjectWorkflow: (projectId: string) => void;
  deleteProjectWorkflow: (projectId: string) => void;
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

// Create a fresh workflow for a new project
function createInitialWorkflow(): ProjectWorkflow {
  return {
    currentPhase: 'welcome',
    phases: JSON.parse(JSON.stringify(initialPhases)), // Deep copy
    conversationContext: {},
  };
}

export const useWorkflowStore = create<WorkflowState>()(
  persist(
    (set, get) => ({
      // Per-project storage
      projectWorkflows: {},
      activeProjectId: null,

      // Current state (synced with active project)
      currentPhase: 'welcome',
      phases: { ...initialPhases },
      conversationContext: {},

      // Switch to a different project's workflow
      switchToProject: (projectId: string | null) => set((state) => {
        // Save current state to the previous project (if any)
        const updates: Partial<WorkflowState> = {
          activeProjectId: projectId,
        };

        if (state.activeProjectId && state.activeProjectId !== projectId) {
          updates.projectWorkflows = {
            ...state.projectWorkflows,
            [state.activeProjectId]: {
              currentPhase: state.currentPhase,
              phases: state.phases,
              conversationContext: state.conversationContext,
            },
          };
        }

        // Load new project's workflow (or reset to initial if not found)
        if (projectId) {
          const projectWorkflow = updates.projectWorkflows?.[projectId]
            ?? state.projectWorkflows[projectId]
            ?? createInitialWorkflow();

          return {
            ...updates,
            projectWorkflows: {
              ...updates.projectWorkflows,
              ...state.projectWorkflows,
              [projectId]: projectWorkflow,
            },
            currentPhase: projectWorkflow.currentPhase,
            phases: projectWorkflow.phases,
            conversationContext: projectWorkflow.conversationContext,
          };
        }

        // No project selected - reset to welcome state
        return {
          ...updates,
          currentPhase: 'welcome',
          phases: { ...initialPhases },
          conversationContext: {},
        };
      }),

      // Initialize workflow for a new project
      initProjectWorkflow: (projectId: string) => {
        const state = get();
        if (state.projectWorkflows[projectId]) {
          // Already exists, just switch to it
          get().switchToProject(projectId);
          return;
        }

        const newWorkflow = createInitialWorkflow();
        set({
          projectWorkflows: {
            ...state.projectWorkflows,
            [projectId]: newWorkflow,
          },
          activeProjectId: projectId,
          currentPhase: newWorkflow.currentPhase,
          phases: newWorkflow.phases,
          conversationContext: newWorkflow.conversationContext,
        });
      },

      // Delete a project's workflow
      deleteProjectWorkflow: (projectId: string) => set((state) => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { [projectId]: removed, ...remainingWorkflows } = state.projectWorkflows;
        return {
          projectWorkflows: remainingWorkflows,
        };
      }),

      // Update current phase (also updates project workflow)
      setPhase: (phase) => set((state) => {
        const newPhases = {
          ...state.phases,
          [phase]: {
            ...state.phases[phase],
            status: 'in_progress' as PhaseStatus,
            startedAt: new Date(),
          },
        };

        const updates: Partial<WorkflowState> = {
          currentPhase: phase,
          phases: newPhases,
        };

        // Also update in projectWorkflows if we have an active project
        if (state.activeProjectId) {
          updates.projectWorkflows = {
            ...state.projectWorkflows,
            [state.activeProjectId]: {
              ...state.projectWorkflows[state.activeProjectId],
              currentPhase: phase,
              phases: newPhases,
            },
          };
        }

        return updates;
      }),

      updatePhaseStatus: (phase, status) => set((state) => {
        const newPhases = {
          ...state.phases,
          [phase]: {
            ...state.phases[phase],
            status,
          },
        };

        const updates: Partial<WorkflowState> = {
          phases: newPhases,
        };

        if (state.activeProjectId) {
          updates.projectWorkflows = {
            ...state.projectWorkflows,
            [state.activeProjectId]: {
              ...state.projectWorkflows[state.activeProjectId],
              phases: newPhases,
            },
          };
        }

        return updates;
      }),

      completePhase: (phase, artifact) => set((state) => {
        const phaseOrder: WorkflowPhase[] = [
          'welcome', 'discovery', 'market-analysis', 'specifications',
          'design', 'architecture', 'execution', 'qa', 'deployment'
        ];
        const currentIndex = phaseOrder.indexOf(phase);
        const nextPhase = phaseOrder[currentIndex + 1] || 'deployment';

        const newPhases = {
          ...state.phases,
          [phase]: {
            ...state.phases[phase],
            status: 'completed' as PhaseStatus,
            completedAt: new Date(),
            artifact,
          },
          [nextPhase]: {
            ...state.phases[nextPhase],
            status: 'in_progress' as PhaseStatus,
            startedAt: new Date(),
          },
        };

        const updates: Partial<WorkflowState> = {
          currentPhase: nextPhase,
          phases: newPhases,
        };

        if (state.activeProjectId) {
          updates.projectWorkflows = {
            ...state.projectWorkflows,
            [state.activeProjectId]: {
              ...state.projectWorkflows[state.activeProjectId],
              currentPhase: nextPhase,
              phases: newPhases,
            },
          };
        }

        return updates;
      }),

      setConversationContext: (context) => set((state) => {
        const newContext = {
          ...state.conversationContext,
          ...context,
        };

        const updates: Partial<WorkflowState> = {
          conversationContext: newContext,
        };

        if (state.activeProjectId) {
          updates.projectWorkflows = {
            ...state.projectWorkflows,
            [state.activeProjectId]: {
              ...state.projectWorkflows[state.activeProjectId],
              conversationContext: newContext,
            },
          };
        }

        return updates;
      }),

      resetWorkflow: () => set((state) => {
        const newWorkflow = createInitialWorkflow();

        const updates: Partial<WorkflowState> = {
          currentPhase: newWorkflow.currentPhase,
          phases: newWorkflow.phases,
          conversationContext: newWorkflow.conversationContext,
        };

        if (state.activeProjectId) {
          updates.projectWorkflows = {
            ...state.projectWorkflows,
            [state.activeProjectId]: newWorkflow,
          };
        }

        return updates;
      }),
    }),
    {
      name: 'vibes-workflow',
      partialize: (state) => ({
        projectWorkflows: state.projectWorkflows,
        activeProjectId: state.activeProjectId,
        // Also persist current state for backwards compatibility
        currentPhase: state.currentPhase,
        phases: state.phases,
        conversationContext: state.conversationContext,
      }),
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
