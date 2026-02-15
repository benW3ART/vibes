import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { SubPhase } from '@/config/phaseFormats';

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

// User story for specifications
export interface UserStory {
  id: string;
  title: string;
  description: string;
  acceptanceCriteria?: string[];
}

// Conversation context for discovery and planning
export interface ConversationContext {
  // Discovery phase
  projectIdea?: string;
  targetUsers?: string;
  mainFeatures?: string;
  competitors?: string;
  differentiator?: string;
  discoveryAnswers?: Record<string, string>;

  // Market analysis phase
  marketSize?: string;
  targetSegments?: string;
  competitiveLandscape?: string;
  marketOpportunity?: string;
  marketAnalysisFullText?: string; // Full AI response for reference

  // Specifications phase
  specificationsSummary?: string;
  userStories?: UserStory[];
  functionalRequirements?: string[];
  nonFunctionalRequirements?: string[];
  uiUxBrief?: string;
  dataModel?: string;

  // Design phase
  designChoice?: string;
  colorPalette?: string;
  typography?: string;

  // Architecture phase
  architectureDecisions?: string[];
  techStack?: string;
  projectStructure?: string;
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
  currentSubPhase: SubPhase;
  phases: Record<WorkflowPhase, PhaseInfo>;
  conversationContext: ConversationContext;

  // Active skills and MCPs (for display in chat)
  activeSkills: string[];
  activeMCPs: string[];

  // Actions
  setPhase: (phase: WorkflowPhase) => void;
  setCurrentSubPhase: (subPhase: SubPhase) => void;
  updatePhaseStatus: (phase: WorkflowPhase, status: PhaseStatus) => void;
  completePhase: (phase: WorkflowPhase, artifact?: string) => void;
  setConversationContext: (context: Partial<ConversationContext>) => void;
  resetWorkflow: () => void;

  // Active skills/MCPs actions
  setActiveSkills: (skills: string[]) => void;
  setActiveMCPs: (mcps: string[]) => void;

  // Sync with .genius/STATE.json
  syncFromGeniusState: (projectPath: string) => Promise<void>;
  syncToGeniusState: (projectPath: string) => Promise<void>;

  // Per-project actions
  switchToProject: (projectId: string | null) => void;
  initProjectWorkflow: (projectId: string) => void;
  deleteProjectWorkflow: (projectId: string) => void;

  // Recalculate and fix current phase based on completed phases
  recalculateCurrentPhase: () => void;
  recalculateCurrentPhaseFromArtifacts: (projectPath: string) => Promise<void>;
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
      currentSubPhase: null,
      phases: { ...initialPhases },
      conversationContext: {},

      // Active skills and MCPs
      activeSkills: [],
      activeMCPs: [],

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

          // Determine the correct current phase based on completed phases
          const phaseOrder: WorkflowPhase[] = [
            'welcome', 'discovery', 'market-analysis', 'specifications',
            'design', 'architecture', 'execution', 'qa', 'deployment'
          ];

          // Find the latest completed phase and set current to the next one
          let correctPhase = projectWorkflow.currentPhase;
          for (let i = phaseOrder.length - 1; i >= 0; i--) {
            const phase = phaseOrder[i];
            const status = projectWorkflow.phases[phase]?.status;
            if (status === 'completed' || status === 'approved') {
              // Found a completed phase, current should be the next one
              const nextIndex = Math.min(i + 1, phaseOrder.length - 1);
              correctPhase = phaseOrder[nextIndex];
              break;
            }
          }

          return {
            ...updates,
            projectWorkflows: {
              ...updates.projectWorkflows,
              ...state.projectWorkflows,
              [projectId]: {
                ...projectWorkflow,
                currentPhase: correctPhase,
              },
            },
            currentPhase: correctPhase,
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

      // Update current sub-phase
      setCurrentSubPhase: (subPhase: SubPhase) => set({ currentSubPhase: subPhase }),

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

      // Active skills and MCPs
      setActiveSkills: (skills: string[]) => set({ activeSkills: skills }),
      setActiveMCPs: (mcps: string[]) => set({ activeMCPs: mcps }),

      // Recalculate current phase based on completed phases
      // Call this on app load to fix any phase/status mismatches
      recalculateCurrentPhase: () => set((state) => {
        const phaseOrder: WorkflowPhase[] = [
          'welcome', 'discovery', 'market-analysis', 'specifications',
          'design', 'architecture', 'execution', 'qa', 'deployment'
        ];

        // Find the latest completed phase and set current to the next one
        let correctPhase: WorkflowPhase = 'welcome';
        for (let i = phaseOrder.length - 1; i >= 0; i--) {
          const phase = phaseOrder[i];
          const status = state.phases[phase]?.status;
          if (status === 'completed' || status === 'approved') {
            // Found a completed phase, current should be the next one
            const nextIndex = Math.min(i + 1, phaseOrder.length - 1);
            correctPhase = phaseOrder[nextIndex];
            break;
          }
        }

        // If no phases are completed but we have a project, start at discovery
        if (correctPhase === 'welcome' && state.activeProjectId) {
          correctPhase = 'discovery';
        }

        // Only update if different
        if (correctPhase === state.currentPhase) {
          return state;
        }

        console.log(`[WorkflowStore] Recalculating phase: ${state.currentPhase} → ${correctPhase}`);

        const updates: Partial<WorkflowState> = {
          currentPhase: correctPhase,
        };

        // Also update in projectWorkflows if we have an active project
        if (state.activeProjectId && state.projectWorkflows[state.activeProjectId]) {
          updates.projectWorkflows = {
            ...state.projectWorkflows,
            [state.activeProjectId]: {
              ...state.projectWorkflows[state.activeProjectId],
              currentPhase: correctPhase,
            },
          };
        }

        return updates;
      }),

      // Async recalculation that checks for artifact files AND context completion
      // This is more reliable than relying on persisted phase status
      recalculateCurrentPhaseFromArtifacts: async (projectPath: string) => {
        if (!window.electron) {
          // Fallback to sync version in browser mode
          get().recalculateCurrentPhase();
          return;
        }

        const phaseArtifacts: Array<{ phase: WorkflowPhase; files: string[] }> = [
          { phase: 'discovery', files: ['DISCOVERY.xml'] },
          { phase: 'market-analysis', files: ['MARKET-ANALYSIS.xml', 'MARKET_ANALYSIS.xml'] },
          { phase: 'specifications', files: ['SPECIFICATIONS.xml'] },
          { phase: 'design', files: ['DESIGN-SYSTEM.xml', 'DESIGN_SYSTEM.xml'] },
          { phase: 'architecture', files: ['ARCHITECTURE.md'] },
        ];

        const phaseOrder: WorkflowPhase[] = [
          'welcome', 'discovery', 'market-analysis', 'specifications',
          'design', 'architecture', 'execution', 'qa', 'deployment'
        ];

        // Check which phases have their artifacts
        let latestCompletedIndex = -1;
        const phaseUpdates: Record<string, PhaseInfo> = {};
        const ctx = get().conversationContext;

        console.warn('[WorkflowStore] Checking artifacts for project:', projectPath);

        for (let i = 0; i < phaseArtifacts.length; i++) {
          const { phase, files } = phaseArtifacts[i];
          let phaseComplete = false;

          // Check for file artifacts
          for (const file of files) {
            try {
              const exists = await window.electron.file.exists(`${projectPath}/${file}`);
              console.warn(`[WorkflowStore] Checking ${file}: ${exists ? 'EXISTS' : 'not found'}`);
              if (exists) {
                phaseComplete = true;
                break;
              }
            } catch (e) {
              console.warn(`[WorkflowStore] Error checking ${file}:`, e);
            }
          }

          // Also check context completion for phases that may not have files
          if (!phaseComplete && phase === 'market-analysis') {
            // Market analysis is complete if key fields are filled
            const hasMarketData = !!(
              ctx.marketSize ||
              ctx.marketAnalysisFullText ||
              (ctx.targetSegments && ctx.competitiveLandscape && ctx.marketOpportunity)
            );
            if (hasMarketData) {
              console.warn('[WorkflowStore] market-analysis complete via context fields');
              phaseComplete = true;
            }
          }

          if (phaseComplete) {
            const phaseIndex = phaseOrder.indexOf(phase);
            console.warn(`[WorkflowStore] Phase ${phase} complete, index: ${phaseIndex}`);
            if (phaseIndex > latestCompletedIndex) {
              latestCompletedIndex = phaseIndex;
            }
            // Mark phase as completed
            phaseUpdates[phase] = {
              phase,
              status: 'completed' as PhaseStatus,
              completedAt: new Date(),
            };
          }
        }

        console.warn(`[WorkflowStore] Latest completed phase index: ${latestCompletedIndex}`);

        // Determine correct current phase
        let correctPhase: WorkflowPhase = 'discovery'; // Default if project exists
        if (latestCompletedIndex >= 0) {
          const nextIndex = Math.min(latestCompletedIndex + 1, phaseOrder.length - 1);
          correctPhase = phaseOrder[nextIndex];
        }

        const state = get();
        console.log(`[WorkflowStore] Recalculating from artifacts: ${state.currentPhase} → ${correctPhase}`);

        // Update state
        set((state) => {
          const newPhases = { ...state.phases };
          for (const [phase, info] of Object.entries(phaseUpdates)) {
            newPhases[phase as WorkflowPhase] = info;
          }

          const updates: Partial<WorkflowState> = {
            currentPhase: correctPhase,
            phases: newPhases,
          };

          // Also update in projectWorkflows if we have an active project
          if (state.activeProjectId && state.projectWorkflows[state.activeProjectId]) {
            updates.projectWorkflows = {
              ...state.projectWorkflows,
              [state.activeProjectId]: {
                ...state.projectWorkflows[state.activeProjectId],
                currentPhase: correctPhase,
                phases: newPhases,
              },
            };
          }

          return updates;
        });
      },

      // Sync state from .genius/STATE.json
      syncFromGeniusState: async (projectPath: string) => {
        if (!window.electron) return;

        try {
          const statePath = `${projectPath}/.genius/STATE.json`;
          const content = await window.electron.file.read(statePath);
          const geniusState = JSON.parse(content);

          // Map Genius phase to workflow phase
          const phaseMap: Record<string, WorkflowPhase> = {
            'IDEATION': 'discovery',
            'DISCOVERY': 'discovery',
            'MARKET_ANALYSIS': 'market-analysis',
            'SPECIFICATIONS': 'specifications',
            'DESIGN': 'design',
            'ARCHITECTURE': 'architecture',
            'EXECUTION': 'execution',
            'QA': 'qa',
            'DEPLOYMENT': 'deployment',
          };

          const mappedPhase = phaseMap[geniusState.phase] || 'welcome';

          // Update active skills
          const skills: string[] = [];
          if (geniusState.current_skill) {
            skills.push(geniusState.current_skill);
          }
          if (geniusState.skill_history?.length > 0) {
            // Add last 2 skills from history
            const recentSkills = geniusState.skill_history.slice(-2);
            for (const skill of recentSkills) {
              if (!skills.includes(skill)) {
                skills.push(skill);
              }
            }
          }

          set({
            currentPhase: mappedPhase,
            activeSkills: skills,
          });
        } catch (error) {
          console.warn('[WorkflowStore] Could not sync from .genius/STATE.json:', error);
          // File might not exist yet - that's OK
        }
      },

      // Write state back to .genius/STATE.json when phases complete
      syncToGeniusState: async (projectPath: string) => {
        if (!window.electron) return;

        const state = get();

        try {
          const statePath = `${projectPath}/.genius/STATE.json`;
          let geniusState: Record<string, unknown>;

          // Try to read existing state first
          try {
            const content = await window.electron.file.read(statePath);
            geniusState = JSON.parse(content);
          } catch {
            // File doesn't exist, create new state
            geniusState = {
              version: '6.2.0',
              project: {
                name: projectPath.split('/').pop() || 'unknown',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              },
              phase: 'IDEATION',
              current_skill: null,
              skill_history: [],
              checkpoints: {},
              tasks: { total: 0, completed: 0, failed: 0, skipped: 0, current_task_id: null },
              artifacts: {},
              git: { enabled: false, last_checkpoint: null, checkpoints: [] },
              errors: [],
              warnings: [],
            };
          }

          // Map workflow phase to Genius phase
          const reversePhaseMap: Record<WorkflowPhase, string> = {
            'welcome': 'IDEATION',
            'discovery': 'DISCOVERY',
            'market-analysis': 'MARKET_ANALYSIS',
            'specifications': 'SPECIFICATIONS',
            'design': 'DESIGN',
            'architecture': 'ARCHITECTURE',
            'execution': 'EXECUTION',
            'qa': 'QA',
            'deployment': 'DEPLOYMENT',
          };

          // Update phase
          geniusState.phase = reversePhaseMap[state.currentPhase] || 'IDEATION';

          // Update checkpoints based on completed phases
          const checkpoints = geniusState.checkpoints as Record<string, boolean> || {};
          checkpoints.discovery_complete = state.phases.discovery?.status === 'completed';
          checkpoints.market_analysis_complete = state.phases['market-analysis']?.status === 'completed';
          checkpoints.specs_approved = state.phases.specifications?.status === 'completed' || state.phases.specifications?.status === 'approved';
          checkpoints.design_chosen = state.phases.design?.status === 'completed' || state.phases.design?.status === 'approved';
          checkpoints.architecture_approved = state.phases.architecture?.status === 'completed' || state.phases.architecture?.status === 'approved';
          checkpoints.execution_started = state.phases.execution?.status === 'in_progress' || state.phases.execution?.status === 'completed';
          checkpoints.execution_complete = state.phases.execution?.status === 'completed';
          checkpoints.qa_passed = state.phases.qa?.status === 'completed';
          checkpoints.deployed = state.phases.deployment?.status === 'completed';
          geniusState.checkpoints = checkpoints;

          // Update artifacts based on phase artifacts
          const artifacts = geniusState.artifacts as Record<string, string> || {};
          if (state.phases.discovery?.artifact) artifacts.discovery = state.phases.discovery.artifact;
          if (state.phases.specifications?.artifact) artifacts.specifications = state.phases.specifications.artifact;
          if (state.phases.design?.artifact) artifacts.design = state.phases.design.artifact;
          if (state.phases.architecture?.artifact) artifacts.architecture = state.phases.architecture.artifact;
          geniusState.artifacts = artifacts;

          // Update timestamp
          if (geniusState.project && typeof geniusState.project === 'object') {
            (geniusState.project as Record<string, unknown>).updated_at = new Date().toISOString();
          }

          // Write back to file
          await window.electron.file.write(statePath, JSON.stringify(geniusState, null, 2));
          console.log('[WorkflowStore] Synced state to .genius/STATE.json');
        } catch (error) {
          console.error('[WorkflowStore] Failed to sync to .genius/STATE.json:', error);
        }
      },
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
