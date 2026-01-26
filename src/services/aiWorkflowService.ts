// AI Workflow Service - Manages AI-driven workflow phases via Claude Code CLI
import { useSettingsStore } from '@/stores';

export type WorkflowPhase = 'discovery' | 'specifications' | 'design' | 'architecture';

export interface AIMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
}

export interface StreamCallbacks {
  onStart?: () => void;
  onChunk?: (chunk: string) => void;
  onComplete?: (response: string) => void;
  onError?: (error: string) => void;
}

// System prompts for each workflow phase
const PHASE_SYSTEM_PROMPTS: Record<WorkflowPhase, string> = {
  discovery: `You are an expert product discovery consultant. Your role is to help users define their project through a natural conversation.

Guide them through these key areas:
1. Project idea (what problem does it solve?)
2. Target users (who is the primary audience?)
3. Main features (3-5 core features for MVP)
4. Competitors (existing alternatives?)
5. Differentiator (what makes this unique?)

Rules:
- Ask ONE question at a time
- Be conversational and encouraging
- Keep responses concise (2-4 sentences)
- Use markdown for formatting
- After gathering ALL 5 areas, summarize and offer to generate DISCOVERY.xml
- Always respond in the same language as the user`,

  specifications: `You are a senior product manager creating detailed specifications from discovery findings.

Your role:
- Transform discovery into user stories with acceptance criteria
- Define functional requirements (auth, API, features)
- Define non-functional requirements (performance, security)
- Suggest a data model based on features

Rules:
- Be structured and comprehensive
- Ask clarifying questions if needed
- When ready, offer to generate SPECIFICATIONS.xml
- Always respond in the same language as the user`,

  design: `You are a senior UX/UI designer creating a design system.

Your role:
- Propose 2-3 distinct design directions based on the project type
- Each option: color palette, typography, component styles
- Explain the rationale for each direction
- Help user choose and refine their preferred option

Rules:
- Use specific hex colors
- Describe the mood/feeling each design evokes
- When choice is made, offer to generate DESIGN-SYSTEM.xml
- Always respond in the same language as the user`,

  architecture: `You are a senior software architect designing the technical foundation.

Your role:
- Recommend a tech stack based on requirements
- Design project structure
- Identify key technical decisions
- Create a phased execution plan

Rules:
- Be specific about technologies and patterns
- Explain trade-offs
- When approved, offer to generate ARCHITECTURE.md and plan.md
- Always respond in the same language as the user`,
};

// Prompts for file generation
const FILE_GENERATION_PROMPTS = {
  discovery: (context: Record<string, string>) => `Based on our conversation, generate a DISCOVERY.xml file.

Context gathered:
- Project: ${context.projectName || 'New Project'}
- Idea: ${context.projectIdea || 'Not specified'}
- Users: ${context.targetUsers || 'Not specified'}
- Features: ${context.mainFeatures || 'Not specified'}
- Competitors: ${context.competitors || 'Not specified'}
- Differentiator: ${context.differentiator || 'Not specified'}

Generate a complete XML file with this structure:
<?xml version="1.0" encoding="UTF-8"?>
<discovery version="1.0" generated="TIMESTAMP">
  <project><name>...</name></project>
  <vision><one_liner>...</one_liner><problem_statement>...</problem_statement></vision>
  <target_audience><primary_persona><description>...</description></primary_persona></target_audience>
  <features><core_features><feature>...</feature></core_features></features>
  <market><competitors><competitor>...</competitor></competitors><differentiator>...</differentiator></market>
  <constraints><timeline>MVP in 2 weeks</timeline><budget>Bootstrap</budget><team_size>1 developer + AI</team_size></constraints>
</discovery>

Output ONLY the XML content, nothing else.`,

  specifications: (context: Record<string, string>) => `Based on the discovery, generate a SPECIFICATIONS.xml file.

Context:
- Project: ${context.projectName || 'New Project'}
- Features: ${context.mainFeatures || 'Not specified'}

Generate complete XML with:
- User stories (US-001, US-002...) with acceptance criteria
- Functional requirements (FR-001, FR-002...)
- Non-functional requirements (performance, security)
- Data model with entities

Output ONLY the XML content, nothing else.`,

  design: (context: Record<string, string>) => `Generate a DESIGN-SYSTEM.xml file for option ${context.designChoice || 'A'}.

Project: ${context.projectName || 'New Project'}

Include:
- Full color palette (primary, secondary, accent, background, surface, text, states)
- Typography (heading font, body font, sizes)
- Spacing scale
- Border radii
- Shadows
- Component variants

Output ONLY the XML content, nothing else.`,

  architecture: (context: Record<string, string>) => `Generate ARCHITECTURE.md for the project.

Project: ${context.projectName || 'New Project'}
Features: ${context.mainFeatures || 'Not specified'}

Include:
- Overview
- Tech stack table (Next.js 14, Tailwind, Supabase, TypeScript)
- Project structure tree
- Key decisions
- Security considerations
- Deployment recommendations

Output ONLY the markdown content, nothing else.`,

  plan: (context: Record<string, string>) => `Generate an execution plan (plan.md) for the project.

Project: ${context.projectName || 'New Project'}
Features: ${context.mainFeatures || 'Not specified'}

Create a task list with:
- Phase 1: Setup (5 tasks: init, tailwind, supabase, env, structure)
- Phase 2: Auth (5 tasks: layout, login, signup, oauth, middleware)
- Phase 3: UI (5 tasks: button, input, card, modal, nav)
- Phase 4: Features (one task per main feature)
- Phase 5: Polish (5 tasks: loading, errors, responsive, tests, deploy)

Use format:
- [ ] MP-001 Task description

Output ONLY the markdown content, nothing else.`,
};

class AIWorkflowServiceClass {
  private projectPath: string | null = null;
  private currentPhase: WorkflowPhase | null = null;
  private conversationHistory: AIMessage[] = [];
  private isElectronMode = false;
  private unsubscribeChunk: (() => void) | null = null;

  constructor() {
    this.isElectronMode = typeof window !== 'undefined' && !!window.electron;
  }

  // Get selected model ID from global settings (or null for default)
  private getModelId(): string | undefined {
    const modelId = useSettingsStore.getState().claudeModelId;
    return modelId || undefined;
  }

  // Initialize for a project
  init(projectPath: string): void {
    this.projectPath = projectPath;
    this.conversationHistory = [];
    this.currentPhase = null;
  }

  // Start a workflow phase
  startPhase(phase: WorkflowPhase, context?: Record<string, string>): void {
    this.currentPhase = phase;
    this.conversationHistory = [];

    // Add context summary if provided
    if (context && Object.keys(context).length > 0) {
      const summary = Object.entries(context)
        .filter(([, v]) => v)
        .map(([k, v]) => `**${k}**: ${v}`)
        .join('\n');

      if (summary) {
        this.conversationHistory.push({
          role: 'system',
          content: `Previous context:\n${summary}`,
          timestamp: new Date(),
        });
      }
    }
  }

  // Get system prompt for current phase
  getSystemPrompt(): string {
    if (!this.currentPhase) {
      return 'You are a helpful AI assistant for software development.';
    }
    return PHASE_SYSTEM_PROMPTS[this.currentPhase];
  }

  // Build conversation context for prompt
  private buildContextPrompt(): string {
    if (this.conversationHistory.length === 0) {
      return '';
    }

    const contextParts = this.conversationHistory.map(msg => {
      const prefix = msg.role === 'user' ? 'User' : msg.role === 'assistant' ? 'Assistant' : 'Context';
      return `${prefix}: ${msg.content}`;
    });

    return `Previous conversation:\n${contextParts.join('\n\n')}\n\n`;
  }

  // Send a message and get AI response
  async sendMessage(message: string, callbacks: StreamCallbacks): Promise<string> {
    if (!this.projectPath) {
      callbacks.onError?.('No project initialized');
      throw new Error('No project initialized');
    }

    // Add user message to history
    this.conversationHistory.push({
      role: 'user',
      content: message,
      timestamp: new Date(),
    });

    // Check if in Electron mode
    if (!this.isElectronMode) {
      return this.simulateResponse(message, callbacks);
    }

    // Build full prompt with context
    const contextPrompt = this.buildContextPrompt();
    const systemPrompt = this.getSystemPrompt();
    const fullPrompt = contextPrompt + `User: ${message}\n\nRespond as the assistant.`;

    callbacks.onStart?.();

    // Set up chunk listener for streaming (fullResponse accumulates for potential future use)
    this.unsubscribeChunk = window.electron.claude.onQueryChunk((chunk: unknown) => {
      const text = String(chunk);
      callbacks.onChunk?.(text);
    });

    try {
      const result = await window.electron.claude.query(
        this.projectPath,
        fullPrompt,
        systemPrompt,
        this.getModelId()
      );

      this.unsubscribeChunk?.();
      this.unsubscribeChunk = null;

      if (result.success && result.response) {
        const response = result.response;

        // Add assistant response to history
        this.conversationHistory.push({
          role: 'assistant',
          content: response,
          timestamp: new Date(),
        });

        callbacks.onComplete?.(response);
        return response;
      } else {
        const error = result.error || 'Unknown error';
        callbacks.onError?.(error);
        throw new Error(error);
      }
    } catch (error) {
      this.unsubscribeChunk?.();
      this.unsubscribeChunk = null;
      const errorMsg = error instanceof Error ? error.message : String(error);
      callbacks.onError?.(errorMsg);
      throw error;
    }
  }

  // Generate file content using AI
  async generateFile(
    fileType: 'discovery' | 'specifications' | 'design' | 'architecture' | 'plan',
    context: Record<string, string>,
    callbacks: StreamCallbacks
  ): Promise<string> {
    if (!this.projectPath) {
      callbacks.onError?.('No project initialized');
      throw new Error('No project initialized');
    }

    const promptGenerator = FILE_GENERATION_PROMPTS[fileType];
    if (!promptGenerator) {
      callbacks.onError?.(`Unknown file type: ${fileType}`);
      throw new Error(`Unknown file type: ${fileType}`);
    }

    const prompt = promptGenerator(context);

    if (!this.isElectronMode) {
      return this.simulateFileGeneration(fileType, context, callbacks);
    }

    callbacks.onStart?.();

    this.unsubscribeChunk = window.electron.claude.onQueryChunk((chunk: unknown) => {
      const text = String(chunk);
      callbacks.onChunk?.(text);
    });

    try {
      const result = await window.electron.claude.query(
        this.projectPath,
        prompt,
        'You are a code generator. Output only the requested file content, no explanations.',
        this.getModelId()
      );

      this.unsubscribeChunk?.();
      this.unsubscribeChunk = null;

      if (result.success && result.response) {
        callbacks.onComplete?.(result.response);
        return result.response;
      } else {
        const error = result.error || 'Failed to generate file';
        callbacks.onError?.(error);
        throw new Error(error);
      }
    } catch (error) {
      this.unsubscribeChunk?.();
      this.unsubscribeChunk = null;
      const errorMsg = error instanceof Error ? error.message : String(error);
      callbacks.onError?.(errorMsg);
      throw error;
    }
  }

  // Cancel ongoing request
  cancelRequest(): void {
    if (this.isElectronMode) {
      window.electron.claude.queryCancel();
    }
    this.unsubscribeChunk?.();
    this.unsubscribeChunk = null;
  }

  // Clear conversation
  clearHistory(): void {
    this.conversationHistory = [];
    this.currentPhase = null;
  }

  // Get conversation history
  getHistory(): AIMessage[] {
    return [...this.conversationHistory];
  }

  // Demo mode simulation
  private async simulateResponse(message: string, callbacks: StreamCallbacks): Promise<string> {
    callbacks.onStart?.();

    const lowerMessage = message.toLowerCase();
    let response = '';

    // Simulate based on phase and content
    if (this.currentPhase === 'discovery') {
      const step = this.conversationHistory.filter(m => m.role === 'user').length;

      if (step === 1) {
        response = `Interesting project idea! "${message.substring(0, 50)}${message.length > 50 ? '...' : ''}"\n\nNow, **who are your target users?**\n\nDescribe your main persona - their job, needs, and pain points.`;
      } else if (step === 2) {
        response = `Great target audience identified!\n\n**What are the 3-5 main features** you want for your MVP?\n\nList the essential functionality users need.`;
      } else if (step === 3) {
        response = `Excellent features!\n\n**Do you have any direct competitors?**\n\nName 2-3 similar solutions if they exist.`;
      } else if (step === 4) {
        response = `Good competitive analysis!\n\n**What's your main differentiator?**\n\nWhat makes your solution unique compared to alternatives?`;
      } else if (step === 5) {
        response = `Perfect! I now have a complete picture of your project.\n\n**Summary:**\n- Project idea captured\n- Target users defined\n- Features outlined\n- Competitive landscape understood\n- Unique value proposition clear\n\n**Ready to generate DISCOVERY.xml?**`;
      } else {
        response = `Got it! Let me know when you're ready to proceed.`;
      }
    } else if (this.currentPhase === 'specifications') {
      response = `Based on the discovery, I'll create detailed specifications.\n\n**Generating:**\n- User stories with acceptance criteria\n- Functional requirements\n- Non-functional requirements\n- Data model\n\n**Ready to generate SPECIFICATIONS.xml?**`;
    } else if (this.currentPhase === 'design') {
      if (lowerMessage.includes('a') || lowerMessage.includes('minimal')) {
        response = `**Option A - Minimal** selected!\n\n- Primary: #000000\n- Background: #FFFFFF\n- Clean, modern aesthetic\n\n**Ready to generate DESIGN-SYSTEM.xml?**`;
      } else if (lowerMessage.includes('b') || lowerMessage.includes('vibrant')) {
        response = `**Option B - Vibrant** selected!\n\n- Primary: #FF6B35\n- Background: #1A1A2E\n- Energetic, bold aesthetic\n\n**Ready to generate DESIGN-SYSTEM.xml?**`;
      } else {
        response = `Here are 3 design options:\n\n**A - Minimal**: Black/White, clean\n**B - Vibrant**: Orange/Dark, energetic\n**C - Professional**: Blue/Light, corporate\n\nWhich do you prefer?`;
      }
    } else if (this.currentPhase === 'architecture') {
      response = `Based on your specs, I recommend:\n\n**Tech Stack:**\n- Next.js 14 (App Router)\n- Tailwind CSS\n- Supabase (Auth + DB)\n- TypeScript\n\n**Ready to generate ARCHITECTURE.md and plan.md?**`;
    } else {
      response = `I understand: "${message.substring(0, 50)}${message.length > 50 ? '...' : ''}"\n\nHow can I help you further?`;
    }

    // Deliver full response immediately (no fake delays)
    callbacks.onChunk?.(response);

    this.conversationHistory.push({
      role: 'assistant',
      content: response,
      timestamp: new Date(),
    });

    callbacks.onComplete?.(response);
    return response;
  }

  // Demo mode file generation simulation
  private async simulateFileGeneration(
    fileType: string,
    context: Record<string, string>,
    callbacks: StreamCallbacks
  ): Promise<string> {
    callbacks.onStart?.();

    let content = '';

    // Use existing template generators as fallback
    const fakeContext = {
      projectName: context.projectName || 'MyProject',
      projectIdea: context.projectIdea || 'A modern web application',
      targetUsers: context.targetUsers || 'Developers and tech enthusiasts',
      mainFeatures: context.mainFeatures || 'User auth\nDashboard\nAPI integration',
      competitors: context.competitors || 'None specified',
      differentiator: context.differentiator || 'AI-powered workflow',
      discoveryPath: 'DISCOVERY.xml',
      specsPath: 'SPECIFICATIONS.xml',
      designPath: 'DESIGN-SYSTEM.xml',
      designChoice: (context.designChoice || 'C') as 'A' | 'B' | 'C',
    };

    switch (fileType) {
      case 'discovery': {
        const { generateDiscoveryXML } = await import('./fileGenerationService');
        content = generateDiscoveryXML(fakeContext);
        break;
      }
      case 'specifications': {
        const { generateSpecificationsXML } = await import('./fileGenerationService');
        content = generateSpecificationsXML(fakeContext);
        break;
      }
      case 'design': {
        const { generateDesignSystemXML } = await import('./fileGenerationService');
        content = generateDesignSystemXML(fakeContext);
        break;
      }
      case 'architecture': {
        const { generateArchitectureMD } = await import('./fileGenerationService');
        content = generateArchitectureMD(fakeContext);
        break;
      }
      case 'plan': {
        const { generatePlanMD } = await import('./fileGenerationService');
        content = generatePlanMD(fakeContext);
        break;
      }
    }

    // Deliver full content immediately (no fake delays)
    callbacks.onChunk?.(content);

    callbacks.onComplete?.(content);
    return content;
  }

  // Check if Claude is available
  async isClaudeAvailable(): Promise<boolean> {
    if (!this.isElectronMode) {
      return false; // Demo mode - no real Claude
    }

    try {
      const status = await window.electron.claude.authStatus();
      return status.installed && status.authenticated;
    } catch {
      return false;
    }
  }
}

export const aiWorkflowService = new AIWorkflowServiceClass();
