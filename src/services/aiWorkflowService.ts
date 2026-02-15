// AI Workflow Service - Manages AI-driven workflow phases via Claude Code CLI
import { useSettingsStore } from '@/stores';

export type WorkflowPhase = 'discovery' | 'market-analysis' | 'specifications' | 'design' | 'architecture';

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
  discovery: `You are an expert product discovery consultant conducting a ONE-BY-ONE interview.

CRITICAL RULE: You MUST ask EXACTLY ONE question per message. Never ask multiple questions. Never list multiple questions. ONE question only.

Interview sequence (ask in this order, one at a time):
1. Project idea - "What problem does your project solve?"
2. Target users - "Who are the main users of this product?"
3. Main features - "What are the 3-5 core features for your MVP?"
4. Competitors - "What existing alternatives or competitors exist?"
5. Differentiator - "What makes your solution unique?"

Format EVERY response as:
1. Brief acknowledgment of their previous answer (1-2 sentences max)
2. Then ask the NEXT SINGLE question from the sequence

Example good response:
"Great! A task management app for remote teams sounds useful. Now, **who are the main users** you're targeting with this product?"

Example BAD response (never do this):
"Great idea! Who are your users? What features do you want? Who are your competitors?"

After gathering ALL 5 areas, provide a brief summary and offer to generate DISCOVERY.xml.
Always respond in the same language as the user.`,

  'market-analysis': `You are an expert market analyst helping to analyze the market opportunity for a project.

You have access to the discovery findings from the previous phase. Use this context to provide relevant market analysis.

Your role:
- Estimate market size (TAM, SAM, SOM)
- Identify target market segments
- Analyze the competitive landscape
- Summarize the market opportunity

When the user asks you to do the analysis yourself, USE the project context provided to give a comprehensive market analysis.
Always be specific with numbers and examples when possible.
Always respond in the same language as the user.`,

  specifications: `You are a senior product manager creating detailed specifications.

Your role:
- Transform discovery findings into structured specifications
- Create user stories with clear acceptance criteria
- Define functional requirements (auth, API, features)
- Define non-functional requirements (performance, security)
- Suggest a data model

IMPORTANT: Present specifications in organized sections, not as one long paragraph.
Use headers like "## User Stories", "## Functional Requirements", etc.

When ready, offer to generate SPECIFICATIONS.xml.
Always respond in the same language as the user.`,

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

  design: (context: Record<string, string>) => `Generate a complete DESIGN-SYSTEM.html file with interactive visual previews.

Project: ${context.projectName || 'New Project'}
Project Idea: ${context.projectIdea || 'Not specified'}
Target Users: ${context.targetUsers || 'Not specified'}

Create a single HTML file with embedded CSS that showcases 3 design options (A, B, C) with:

1. TAB NAVIGATION at the top to switch between Option A, Option B, Option C

2. For EACH option, include:
   - Brand personality description (2-3 sentences about the vibe)
   - Full color palette displayed as colored boxes with hex values
   - Typography showcase (heading font, body font, sizes - use Google Fonts)
   - Component examples: primary button, secondary button, input field, card
   - Dark mode toggle showing light/dark variants

3. INTERACTIVE SELECTION:
   - Add a "Choose This Design" button for each option
   - When clicked, show an alert with the selected option

4. RESPONSIVE DESIGN:
   - Works on desktop and mobile
   - Clean, modern layout

Use inline JavaScript for tab switching and selection. Use CSS variables for theme colors.
The HTML should be fully self-contained and openable in any browser.

Output ONLY the complete HTML content, nothing else. Start with <!DOCTYPE html>.`,

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
  private projectContext: Record<string, string> = {}; // Persistent project context
  private isElectronMode = false;
  private unsubscribeChunk: (() => void) | null = null;

  // Default timeout: 2 minutes for AI queries
  private readonly DEFAULT_TIMEOUT = 120000;

  constructor() {
    this.isElectronMode = typeof window !== 'undefined' && !!window.electron;
  }

  // Update project context (call this when context changes)
  setProjectContext(context: Record<string, string>): void {
    this.projectContext = { ...this.projectContext, ...context };
  }

  // Get current project context
  getProjectContext(): Record<string, string> {
    return { ...this.projectContext };
  }

  // Build a context summary string from project context
  private buildProjectContextSummary(): string {
    const ctx = this.projectContext;
    const parts: string[] = [];

    if (ctx.projectName) parts.push(`Project: ${ctx.projectName}`);
    if (ctx.projectIdea) parts.push(`Idea: ${ctx.projectIdea}`);
    if (ctx.targetUsers) parts.push(`Target Users: ${ctx.targetUsers}`);
    if (ctx.mainFeatures) parts.push(`Main Features: ${ctx.mainFeatures}`);
    if (ctx.competitors) parts.push(`Competitors: ${ctx.competitors}`);
    if (ctx.differentiator) parts.push(`Differentiator: ${ctx.differentiator}`);
    if (ctx.marketSize) parts.push(`Market Size: ${ctx.marketSize}`);
    if (ctx.targetSegments) parts.push(`Target Segments: ${ctx.targetSegments}`);
    if (ctx.competitiveLandscape) parts.push(`Competitive Landscape: ${ctx.competitiveLandscape}`);
    if (ctx.designChoice) parts.push(`Design Choice: ${ctx.designChoice}`);
    if (ctx.techStack) parts.push(`Tech Stack: ${ctx.techStack}`);

    if (parts.length === 0) return '';

    return `\n\n--- PROJECT CONTEXT ---\n${parts.join('\n')}\n--- END CONTEXT ---\n\n`;
  }

  // Timeout wrapper utility - wraps a promise with a timeout
  private async withTimeout<T>(
    promise: Promise<T>,
    ms: number,
    operation: string
  ): Promise<T> {
    const timeout = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new Error(`${operation} timed out after ${Math.round(ms / 1000)}s. Please try again.`));
      }, ms);
    });
    return Promise.race([promise, timeout]);
  }

  // Get selected model ID from global settings (or null for default)
  private getModelId(): string | undefined {
    // Use lastUsedModelId which is updated by the useClaudeModels hook
    const modelId = useSettingsStore.getState().lastUsedModelId;
    return modelId || undefined;
  }

  // Initialize for a project (only resets if different project)
  init(projectPath: string): void {
    // Only reset everything if switching to a different project
    if (this.projectPath !== projectPath) {
      this.projectPath = projectPath;
      this.conversationHistory = [];
      this.projectContext = {};
      this.currentPhase = null;
    }
  }

  // Start a workflow phase
  startPhase(phase: WorkflowPhase, context?: Record<string, string>): void {
    this.currentPhase = phase;
    this.conversationHistory = [];

    // Merge provided context into persistent project context
    if (context && Object.keys(context).length > 0) {
      this.setProjectContext(context);
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
    console.log('[AIWorkflowService] sendMessage called');
    console.log('[AIWorkflowService] Project path:', this.projectPath);
    console.log('[AIWorkflowService] Current phase:', this.currentPhase);
    console.log('[AIWorkflowService] Message:', message.substring(0, 100));

    if (!this.projectPath) {
      console.error('[AIWorkflowService] No project initialized');
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
      console.log('[AIWorkflowService] Not in Electron mode, using simulation');
      return this.simulateResponse(message, callbacks);
    }

    console.log('[AIWorkflowService] In Electron mode, calling Claude');

    // Build full prompt with conversation history AND project context
    const contextPrompt = this.buildContextPrompt();
    const projectContextSummary = this.buildProjectContextSummary();
    const systemPrompt = this.getSystemPrompt();

    // Always include project context so Claude knows what we're working on
    const fullPrompt = projectContextSummary + contextPrompt + `User: ${message}\n\nRespond as the assistant.`;

    console.log('[AIWorkflowService] System prompt length:', systemPrompt.length);
    console.log('[AIWorkflowService] Full prompt length:', fullPrompt.length);
    console.log('[AIWorkflowService] Model ID:', this.getModelId() || 'default');

    callbacks.onStart?.();
    console.log('[AIWorkflowService] onStart callback called');

    // Set up chunk listener for streaming (fullResponse accumulates for potential future use)
    // Chunks now include projectPath for multi-project support
    this.unsubscribeChunk = window.electron.claude.onQueryChunk((data: unknown) => {
      // Handle both old format (string) and new format ({ projectPath, chunk })
      let text: string;
      if (typeof data === 'object' && data !== null && 'chunk' in data) {
        const { projectPath: chunkProject, chunk } = data as { projectPath: string; chunk: string };
        // Only process chunks for this project
        if (chunkProject !== this.projectPath) {
          return;
        }
        text = chunk;
      } else {
        text = String(data);
      }
      console.log('[AIWorkflowService] Received chunk, length:', text.length);
      callbacks.onChunk?.(text);
    });

    try {
      console.log('[AIWorkflowService] Calling window.electron.claude.query with timeout...');

      // Wrap the query with a timeout
      const result = await this.withTimeout(
        window.electron.claude.query(
          this.projectPath,
          fullPrompt,
          systemPrompt,
          this.getModelId()
        ),
        this.DEFAULT_TIMEOUT,
        'AI query'
      );

      console.log('[AIWorkflowService] Query returned:', { success: result.success, hasResponse: !!result.response, error: result.error });

      this.unsubscribeChunk?.();
      this.unsubscribeChunk = null;

      if (result.success && result.response) {
        const response = result.response;
        console.log('[AIWorkflowService] Success! Response length:', response.length);

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
        console.log('[AIWorkflowService] Query result:', error);

        // Don't treat cancellation as an error - just silently complete with empty response
        if (error.includes('cancelled') || error.includes('canceled')) {
          console.log('[AIWorkflowService] Query was cancelled, completing silently');
          callbacks.onComplete?.('');
          return '';
        }

        console.error('[AIWorkflowService] Query failed:', error);
        callbacks.onError?.(error);
        throw new Error(error);
      }
    } catch (error) {
      console.error('[AIWorkflowService] Exception during query:', error);
      this.unsubscribeChunk?.();
      this.unsubscribeChunk = null;
      const errorMsg = error instanceof Error ? error.message : String(error);

      // Handle timeout specifically
      if (errorMsg.includes('timed out')) {
        callbacks.onError?.('Request timed out. The AI is taking too long to respond. Please try again.');
      } else {
        callbacks.onError?.(errorMsg);
      }
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

    // Chunks include projectPath for multi-project support
    this.unsubscribeChunk = window.electron.claude.onQueryChunk((data: unknown) => {
      let text: string;
      if (typeof data === 'object' && data !== null && 'chunk' in data) {
        const { projectPath: chunkProject, chunk } = data as { projectPath: string; chunk: string };
        if (chunkProject !== this.projectPath) return;
        text = chunk;
      } else {
        text = String(data);
      }
      callbacks.onChunk?.(text);
    });

    try {
      // Wrap the query with a timeout (slightly longer for file generation)
      const result = await this.withTimeout(
        window.electron.claude.query(
          this.projectPath,
          prompt,
          'You are a code generator. Output only the requested file content, no explanations.',
          this.getModelId()
        ),
        this.DEFAULT_TIMEOUT * 1.5, // 3 minutes for file generation
        'File generation'
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

      // Handle timeout specifically
      if (errorMsg.includes('timed out')) {
        callbacks.onError?.('File generation timed out. The operation is taking too long. Please try again.');
      } else {
        callbacks.onError?.(errorMsg);
      }
      throw error;
    }
  }

  // Cancel ongoing request for this project
  cancelRequest(): void {
    if (this.isElectronMode && this.projectPath) {
      window.electron.claude.queryCancel(this.projectPath);
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

  // Invoke genius-team skill as the single entry point for skill routing
  // genius-team reads .genius/STATE.json and routes to the appropriate skill
  async invokeGeniusTeam(userInput: string, callbacks?: StreamCallbacks): Promise<{
    success: boolean;
    output?: string;
    error?: string;
  }> {
    if (!this.projectPath) {
      const error = 'No project initialized';
      callbacks?.onError?.(error);
      return { success: false, error };
    }

    if (!this.isElectronMode) {
      // Demo mode - simulate skill invocation
      const simResponse = `[Demo Mode] genius-team would route this request based on .genius/STATE.json`;
      callbacks?.onChunk?.(simResponse);
      callbacks?.onComplete?.(simResponse);
      return { success: true, output: simResponse };
    }

    console.log('[AIWorkflowService] Invoking genius-team skill');
    console.log('[AIWorkflowService] Project path:', this.projectPath);
    console.log('[AIWorkflowService] User input:', userInput?.substring(0, 100));

    callbacks?.onStart?.();

    // Set up chunk listener for streaming (with multi-project support)
    this.unsubscribeChunk = window.electron.claude.onQueryChunk((data: unknown) => {
      let text: string;
      if (typeof data === 'object' && data !== null && 'chunk' in data) {
        const { projectPath: chunkProject, chunk } = data as { projectPath: string; chunk: string };
        if (chunkProject !== this.projectPath) return;
        text = chunk;
      } else {
        text = String(data);
      }
      callbacks?.onChunk?.(text);
    });

    try {
      const result = await window.electron.claude.invokeSkill(
        this.projectPath,
        'genius-team',
        userInput
      );

      this.unsubscribeChunk?.();
      this.unsubscribeChunk = null;

      if (result.success) {
        callbacks?.onComplete?.(result.output || '');
        return { success: true, output: result.output };
      } else {
        callbacks?.onError?.(result.error || 'Skill invocation failed');
        return { success: false, error: result.error };
      }
    } catch (error) {
      this.unsubscribeChunk?.();
      this.unsubscribeChunk = null;
      const errorMsg = error instanceof Error ? error.message : String(error);
      callbacks?.onError?.(errorMsg);
      return { success: false, error: errorMsg };
    }
  }

  // Invoke a specific skill directly (bypasses genius-team routing)
  async invokeSkill(skillName: string, userInput?: string, callbacks?: StreamCallbacks): Promise<{
    success: boolean;
    output?: string;
    error?: string;
  }> {
    if (!this.projectPath) {
      const error = 'No project initialized';
      callbacks?.onError?.(error);
      return { success: false, error };
    }

    if (!this.isElectronMode) {
      const simResponse = `[Demo Mode] Would invoke skill: ${skillName}`;
      callbacks?.onChunk?.(simResponse);
      callbacks?.onComplete?.(simResponse);
      return { success: true, output: simResponse };
    }

    console.log('[AIWorkflowService] Invoking skill:', skillName);

    callbacks?.onStart?.();

    // Multi-project support - filter chunks by project
    this.unsubscribeChunk = window.electron.claude.onQueryChunk((data: unknown) => {
      let text: string;
      if (typeof data === 'object' && data !== null && 'chunk' in data) {
        const { projectPath: chunkProject, chunk } = data as { projectPath: string; chunk: string };
        if (chunkProject !== this.projectPath) return;
        text = chunk;
      } else {
        text = String(data);
      }
      callbacks?.onChunk?.(text);
    });

    try {
      const result = await window.electron.claude.invokeSkill(
        this.projectPath,
        skillName,
        userInput
      );

      this.unsubscribeChunk?.();
      this.unsubscribeChunk = null;

      if (result.success) {
        callbacks?.onComplete?.(result.output || '');
        return { success: true, output: result.output };
      } else {
        callbacks?.onError?.(result.error || 'Skill invocation failed');
        return { success: false, error: result.error };
      }
    } catch (error) {
      this.unsubscribeChunk?.();
      this.unsubscribeChunk = null;
      const errorMsg = error instanceof Error ? error.message : String(error);
      callbacks?.onError?.(errorMsg);
      return { success: false, error: errorMsg };
    }
  }
}

export const aiWorkflowService = new AIWorkflowServiceClass();
