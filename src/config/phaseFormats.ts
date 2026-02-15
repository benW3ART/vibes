/**
 * Phase Format Registry
 *
 * Defines expected output formats for each phase and sub-phase.
 * Claude receives format instructions in the prompt and includes structured tags in responses.
 *
 * Execution/QA/Deployment phases are free-form (no structured output required).
 */

import type { WorkflowPhase } from '@/stores/workflowStore';

// Sub-phase identifiers for each workflow phase
export type DiscoverySubPhase = 'project-idea' | 'target-users' | 'main-features' | 'competitors' | 'differentiator';
export type MarketAnalysisSubPhase = 'market-size' | 'segments' | 'competitive' | 'opportunity';
export type SpecificationsSubPhase = 'user-stories' | 'requirements' | 'ui-brief' | 'data-model' | 'summary';
export type DesignSubPhase = 'design-options' | 'design-choice';
export type ArchitectureSubPhase = 'tech-stack' | 'structure' | 'decisions' | 'plan';

export type SubPhase =
  | DiscoverySubPhase
  | MarketAnalysisSubPhase
  | SpecificationsSubPhase
  | DesignSubPhase
  | ArchitectureSubPhase
  | null;

// Format specification for a phase/sub-phase combination
export interface PhaseFormat {
  /** Instructions appended to the AI prompt */
  promptSuffix: string;
  /** Function to extract structured data from AI response */
  extractData: (response: string) => Record<string, unknown>;
  /** Field name in ConversationContext that this format populates */
  targetField: string;
}

// Phases that don't require structured output (free-form coding/testing)
export const FREE_FORM_PHASES: WorkflowPhase[] = ['execution', 'qa', 'deployment'];

// Discovery sub-phase sequence
export const DISCOVERY_SUB_PHASES: DiscoverySubPhase[] = [
  'project-idea',
  'target-users',
  'main-features',
  'competitors',
  'differentiator'
];

// Market analysis sub-phase sequence
export const MARKET_ANALYSIS_SUB_PHASES: MarketAnalysisSubPhase[] = [
  'market-size',
  'segments',
  'competitive',
  'opportunity'
];

/**
 * Phase Format Registry
 *
 * Key format: "phase:subPhase" or just "phase" for phases without sub-phases
 */
export const PHASE_FORMATS: Record<string, PhaseFormat> = {
  // ============================================
  // DISCOVERY PHASE
  // ============================================

  'discovery:project-idea': {
    promptSuffix: `
IMPORTANT: After your conversational response, you MUST include the extracted project idea in this exact format:
<answer field="projectIdea">A single sentence describing what the project does and the problem it solves</answer>

Example:
<answer field="projectIdea">A mobile app that helps freelancers track their time and invoice clients automatically</answer>`,
    extractData: (response: string) => {
      const match = response.match(/<answer field="projectIdea">([\s\S]*?)<\/answer>/);
      return match ? { projectIdea: match[1].trim() } : {};
    },
    targetField: 'projectIdea'
  },

  'discovery:target-users': {
    promptSuffix: `
IMPORTANT: After your conversational response, you MUST include the target users in this exact format:
<answer field="targetUsers">Description of the primary target users/personas</answer>

Example:
<answer field="targetUsers">Freelance developers and designers who work with multiple clients and need to track billable hours</answer>`,
    extractData: (response: string) => {
      const match = response.match(/<answer field="targetUsers">([\s\S]*?)<\/answer>/);
      return match ? { targetUsers: match[1].trim() } : {};
    },
    targetField: 'targetUsers'
  },

  'discovery:main-features': {
    promptSuffix: `
IMPORTANT: After your conversational response, you MUST include the main features in this exact format:
<answer field="mainFeatures">Feature 1 | Feature 2 | Feature 3 | Feature 4 | Feature 5</answer>

Use pipe (|) to separate features. Include 3-5 core MVP features.

Example:
<answer field="mainFeatures">Time tracking with one-click timer | Automatic invoice generation | Client management | Project categorization | Weekly reports</answer>`,
    extractData: (response: string) => {
      const match = response.match(/<answer field="mainFeatures">([\s\S]*?)<\/answer>/);
      return match ? { mainFeatures: match[1].trim() } : {};
    },
    targetField: 'mainFeatures'
  },

  'discovery:competitors': {
    promptSuffix: `
IMPORTANT: After your conversational response, you MUST include the competitors in this exact format:
<answer field="competitors">Competitor 1 | Competitor 2 | Competitor 3</answer>

Use pipe (|) to separate competitors. Include 2-4 existing alternatives.

Example:
<answer field="competitors">Toggl - popular but expensive | Harvest - feature-rich but complex | Clockify - free but limited invoicing</answer>`,
    extractData: (response: string) => {
      const match = response.match(/<answer field="competitors">([\s\S]*?)<\/answer>/);
      return match ? { competitors: match[1].trim() } : {};
    },
    targetField: 'competitors'
  },

  'discovery:differentiator': {
    promptSuffix: `
IMPORTANT: After your conversational response, you MUST include the differentiator in this exact format:
<answer field="differentiator">What makes this solution unique and better than alternatives</answer>

Example:
<answer field="differentiator">AI-powered automatic categorization of work sessions and smart invoice suggestions based on project patterns</answer>`,
    extractData: (response: string) => {
      const match = response.match(/<answer field="differentiator">([\s\S]*?)<\/answer>/);
      return match ? { differentiator: match[1].trim() } : {};
    },
    targetField: 'differentiator'
  },

  // ============================================
  // MARKET ANALYSIS PHASE
  // ============================================

  'market-analysis:market-size': {
    promptSuffix: `
IMPORTANT: After your analysis, you MUST include the market size data in this exact format:
<data field="marketSize">TAM: $X billion | SAM: $Y billion | SOM: $Z million</data>

Include Total Addressable Market (TAM), Serviceable Addressable Market (SAM), and Serviceable Obtainable Market (SOM).

Example:
<data field="marketSize">TAM: $15 billion (global time tracking software) | SAM: $3.2 billion (freelancer market segment) | SOM: $50 million (first 3 years, targeting tech freelancers)</data>`,
    extractData: (response: string) => {
      const match = response.match(/<data field="marketSize">([\s\S]*?)<\/data>/);
      return match ? { marketSize: match[1].trim() } : {};
    },
    targetField: 'marketSize'
  },

  'market-analysis:segments': {
    promptSuffix: `
IMPORTANT: After your analysis, you MUST include the target segments in this exact format:
<data field="targetSegments">Segment 1: description | Segment 2: description | Segment 3: description</data>

Use pipe (|) to separate segments. Include 2-4 key market segments.

Example:
<data field="targetSegments">Solo freelancers: Individual contractors needing simple tracking | Small agencies: Teams of 2-10 needing collaboration | Consultants: Professionals billing by project milestones</data>`,
    extractData: (response: string) => {
      const match = response.match(/<data field="targetSegments">([\s\S]*?)<\/data>/);
      return match ? { targetSegments: match[1].trim() } : {};
    },
    targetField: 'targetSegments'
  },

  'market-analysis:competitive': {
    promptSuffix: `
IMPORTANT: After your analysis, you MUST include the competitive landscape in this exact format:
<data field="competitiveLandscape">Competitor 1: strengths/weaknesses | Competitor 2: strengths/weaknesses</data>

Use pipe (|) to separate competitors. Include key strengths and weaknesses for each.

Example:
<data field="competitiveLandscape">Toggl: Strong brand, good UX / Expensive, no invoicing | Harvest: Full-featured / Steep learning curve, dated UI | FreshBooks: Invoicing focus / Weak time tracking</data>`,
    extractData: (response: string) => {
      const match = response.match(/<data field="competitiveLandscape">([\s\S]*?)<\/data>/);
      return match ? { competitiveLandscape: match[1].trim() } : {};
    },
    targetField: 'competitiveLandscape'
  },

  'market-analysis:opportunity': {
    promptSuffix: `
IMPORTANT: After your analysis, you MUST include the market opportunity summary in this exact format:
<data field="marketOpportunity">Summary of the market opportunity and why now is the right time</data>

Example:
<data field="marketOpportunity">Growing gig economy (40% increase in freelancers since 2020) creates demand for simple, integrated time-to-invoice solutions. Existing tools are either too complex or lack invoicing. AI capabilities now enable smart automation that wasn't possible before.</data>`,
    extractData: (response: string) => {
      const match = response.match(/<data field="marketOpportunity">([\s\S]*?)<\/data>/);
      return match ? { marketOpportunity: match[1].trim() } : {};
    },
    targetField: 'marketOpportunity'
  },

  // ============================================
  // SPECIFICATIONS PHASE
  // (Generates full XML file, no sub-phase formats needed)
  // ============================================

  // ============================================
  // DESIGN PHASE
  // ============================================

  'design:design-options': {
    promptSuffix: `
IMPORTANT: Present 3 distinct design options (A, B, C) with clear structure.
After presenting the options, include this format:
<data field="designOptions">
Option A: [Name] - [Brief description of aesthetic/mood]
Option B: [Name] - [Brief description of aesthetic/mood]
Option C: [Name] - [Brief description of aesthetic/mood]
</data>

Each option should include: color palette (with hex codes), typography choices, and overall mood/feeling.`,
    extractData: (response: string) => {
      const match = response.match(/<data field="designOptions">([\s\S]*?)<\/data>/);
      return match ? { designOptions: match[1].trim() } : {};
    },
    targetField: 'designOptions'
  },

  'design:design-choice': {
    promptSuffix: `
IMPORTANT: After confirming the design choice, include this format:
<data field="designChoice">A|B|C</data>
<data field="colorPalette">Primary: #hex | Secondary: #hex | Background: #hex | Text: #hex | Accent: #hex</data>
<data field="typography">Headings: FontName | Body: FontName | Code: FontName</data>

Example:
<data field="designChoice">B</data>
<data field="colorPalette">Primary: #f97316 | Secondary: #ec4899 | Background: #050508 | Text: #ffffff | Accent: #22c55e</data>
<data field="typography">Headings: Space Grotesk | Body: Inter | Code: JetBrains Mono</data>`,
    extractData: (response: string) => {
      const result: Record<string, string> = {};

      const choiceMatch = response.match(/<data field="designChoice">([ABC])<\/data>/);
      if (choiceMatch) result.designChoice = choiceMatch[1];

      const paletteMatch = response.match(/<data field="colorPalette">([\s\S]*?)<\/data>/);
      if (paletteMatch) result.colorPalette = paletteMatch[1].trim();

      const typoMatch = response.match(/<data field="typography">([\s\S]*?)<\/data>/);
      if (typoMatch) result.typography = typoMatch[1].trim();

      return result;
    },
    targetField: 'designChoice'
  },

  // ============================================
  // ARCHITECTURE PHASE
  // ============================================

  'architecture:tech-stack': {
    promptSuffix: `
IMPORTANT: After recommending the tech stack, include this format:
<data field="techStack">Frontend: tech | Backend: tech | Database: tech | Hosting: tech</data>

Example:
<data field="techStack">Frontend: Next.js 14 + TypeScript | Backend: tRPC + Prisma | Database: PostgreSQL | Hosting: Vercel + Supabase</data>`,
    extractData: (response: string) => {
      const match = response.match(/<data field="techStack">([\s\S]*?)<\/data>/);
      return match ? { techStack: match[1].trim() } : {};
    },
    targetField: 'techStack'
  },

  'architecture:structure': {
    promptSuffix: `
IMPORTANT: After describing the project structure, include this format:
<data field="projectStructure">Brief description of folder organization and key directories</data>

Example:
<data field="projectStructure">Monorepo with apps/web (Next.js), packages/ui (shared components), packages/db (Prisma schema). Feature-based organization within web app.</data>`,
    extractData: (response: string) => {
      const match = response.match(/<data field="projectStructure">([\s\S]*?)<\/data>/);
      return match ? { projectStructure: match[1].trim() } : {};
    },
    targetField: 'projectStructure'
  }
};

/**
 * Get the format specification for a phase/sub-phase combination
 * Returns null for free-form phases (execution, qa, deployment)
 */
export function getPhaseFormat(phase: WorkflowPhase, subPhase?: SubPhase | string | null): PhaseFormat | null {
  // Free-form phases don't require structured output
  if (FREE_FORM_PHASES.includes(phase)) {
    return null;
  }

  // Try phase:subPhase first
  if (subPhase) {
    const key = `${phase}:${subPhase}`;
    if (PHASE_FORMATS[key]) {
      return PHASE_FORMATS[key];
    }
  }

  // Try just phase
  if (PHASE_FORMATS[phase]) {
    return PHASE_FORMATS[phase];
  }

  return null;
}

/**
 * Get the next sub-phase in the sequence
 */
export function getNextSubPhase(phase: WorkflowPhase, currentSubPhase: SubPhase | string | null): SubPhase | null {
  if (phase === 'discovery') {
    const index = DISCOVERY_SUB_PHASES.indexOf(currentSubPhase as DiscoverySubPhase);
    if (index >= 0 && index < DISCOVERY_SUB_PHASES.length - 1) {
      return DISCOVERY_SUB_PHASES[index + 1];
    }
    return null;
  }

  if (phase === 'market-analysis') {
    const index = MARKET_ANALYSIS_SUB_PHASES.indexOf(currentSubPhase as MarketAnalysisSubPhase);
    if (index >= 0 && index < MARKET_ANALYSIS_SUB_PHASES.length - 1) {
      return MARKET_ANALYSIS_SUB_PHASES[index + 1];
    }
    return null;
  }

  return null;
}

/**
 * Check if a sub-phase is the last one in its sequence
 */
export function isLastSubPhase(phase: WorkflowPhase, subPhase: SubPhase | string | null): boolean {
  if (phase === 'discovery') {
    return subPhase === 'differentiator';
  }
  if (phase === 'market-analysis') {
    return subPhase === 'opportunity';
  }
  return true;
}

/**
 * Get the first sub-phase for a given phase
 */
export function getFirstSubPhase(phase: WorkflowPhase): SubPhase | null {
  if (phase === 'discovery') {
    return 'project-idea';
  }
  if (phase === 'market-analysis') {
    return 'market-size';
  }
  if (phase === 'design') {
    return 'design-options';
  }
  if (phase === 'architecture') {
    return 'tech-stack';
  }
  return null;
}
