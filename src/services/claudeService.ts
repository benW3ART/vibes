// Claude Service - Manages communication with Claude Code CLI

export interface ClaudeMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  isStreaming?: boolean;
}

export interface ClaudeEvent {
  type: 'output' | 'error' | 'status' | 'tool_use' | 'file_write' | 'thinking';
  content?: string;
  timestamp: Date;
  raw?: string;
  metadata?: Record<string, unknown>;
}

type MessageHandler = (message: ClaudeMessage) => void;
type EventHandler = (event: ClaudeEvent) => void;
type StatusHandler = (status: { running: boolean; paused?: boolean }) => void;

class ClaudeServiceClass {
  private isElectronMode = false;
  private projectPath: string | null = null;
  private unsubscribers: (() => void)[] = [];

  private messageHandlers: Set<MessageHandler> = new Set();
  private eventHandlers: Set<EventHandler> = new Set();
  private statusHandlers: Set<StatusHandler> = new Set();

  private currentStreamingMessage: ClaudeMessage | null = null;

  constructor() {
    this.isElectronMode = typeof window !== 'undefined' && !!window.electron;
  }

  // Initialize service for a project
  async init(projectPath: string): Promise<boolean> {
    this.projectPath = projectPath;

    if (!this.isElectronMode) {
      console.log('[ClaudeService] Demo mode - no Electron');
      return true;
    }

    // Set up event listeners
    this.unsubscribers.push(
      window.electron.claude.onOutput((data) => {
        this.handleClaudeOutput(data as ClaudeEvent);
      })
    );

    this.unsubscribers.push(
      window.electron.claude.onError((data) => {
        this.handleClaudeError(data as ClaudeEvent);
      })
    );

    this.unsubscribers.push(
      window.electron.claude.onStatus((status) => {
        this.notifyStatusHandlers(status as { running: boolean; paused?: boolean });
      })
    );

    this.unsubscribers.push(
      window.electron.claude.onExit((code) => {
        console.log('[ClaudeService] Claude exited with code:', code);
        this.notifyStatusHandlers({ running: false });
      })
    );

    return true;
  }

  // Start Claude process for the project
  async start(): Promise<boolean> {
    if (!this.projectPath) {
      console.error('[ClaudeService] No project path set');
      return false;
    }

    if (!this.isElectronMode) {
      console.log('[ClaudeService] Demo mode - simulating start');
      this.notifyStatusHandlers({ running: true });
      return true;
    }

    return await window.electron.claude.spawn(this.projectPath);
  }

  // Send a message to Claude
  async send(message: string): Promise<boolean> {
    const userMessage: ClaudeMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: message,
      timestamp: new Date(),
    };

    // Notify handlers of user message
    this.notifyMessageHandlers(userMessage);

    if (!this.isElectronMode) {
      // Demo mode - simulate response
      setTimeout(() => {
        this.simulateResponse(message);
      }, 1000);
      return true;
    }

    return await window.electron.claude.send(message);
  }

  // Pause Claude execution
  async pause(): Promise<boolean> {
    if (!this.isElectronMode) {
      this.notifyStatusHandlers({ running: false, paused: true });
      return true;
    }
    return await window.electron.claude.pause();
  }

  // Resume Claude execution
  async resume(): Promise<boolean> {
    if (!this.isElectronMode) {
      this.notifyStatusHandlers({ running: true, paused: false });
      return true;
    }
    return await window.electron.claude.resume();
  }

  // Stop Claude process
  async stop(): Promise<boolean> {
    if (!this.isElectronMode) {
      this.notifyStatusHandlers({ running: false });
      return true;
    }
    return await window.electron.claude.stop();
  }

  // Subscribe to messages
  onMessage(handler: MessageHandler): () => void {
    this.messageHandlers.add(handler);
    return () => this.messageHandlers.delete(handler);
  }

  // Subscribe to events
  onEvent(handler: EventHandler): () => void {
    this.eventHandlers.add(handler);
    return () => this.eventHandlers.delete(handler);
  }

  // Subscribe to status changes
  onStatus(handler: StatusHandler): () => void {
    this.statusHandlers.add(handler);
    return () => this.statusHandlers.delete(handler);
  }

  // Clean up
  destroy(): void {
    this.unsubscribers.forEach(unsub => unsub());
    this.unsubscribers = [];
    this.messageHandlers.clear();
    this.eventHandlers.clear();
    this.statusHandlers.clear();
  }

  // Internal handlers
  private handleClaudeOutput(event: ClaudeEvent): void {
    this.notifyEventHandlers(event);

    // Convert output to message if it's text content
    if (event.type === 'output' && event.content) {
      // Check if we're continuing a streaming message
      if (this.currentStreamingMessage && event.content.length < 100) {
        // Append to current message
        this.currentStreamingMessage.content += event.content;
        this.notifyMessageHandlers({
          ...this.currentStreamingMessage,
          isStreaming: true,
        });
      } else {
        // New message
        if (this.currentStreamingMessage) {
          // Finalize previous message
          this.currentStreamingMessage.isStreaming = false;
          this.notifyMessageHandlers(this.currentStreamingMessage);
        }

        this.currentStreamingMessage = {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          content: event.content,
          timestamp: event.timestamp,
          isStreaming: true,
        };
        this.notifyMessageHandlers(this.currentStreamingMessage);
      }
    }
  }

  private handleClaudeError(event: ClaudeEvent): void {
    this.notifyEventHandlers(event);

    const errorMessage: ClaudeMessage = {
      id: `error-${Date.now()}`,
      role: 'system',
      content: `Error: ${event.content || event.raw}`,
      timestamp: new Date(),
    };
    this.notifyMessageHandlers(errorMessage);
  }

  private notifyMessageHandlers(message: ClaudeMessage): void {
    this.messageHandlers.forEach(handler => handler(message));
  }

  private notifyEventHandlers(event: ClaudeEvent): void {
    this.eventHandlers.forEach(handler => handler(event));
  }

  private notifyStatusHandlers(status: { running: boolean; paused?: boolean }): void {
    this.statusHandlers.forEach(handler => handler(status));
  }

  // Demo mode response simulation
  private simulateResponse(userMessage: string): void {
    const lowerMessage = userMessage.toLowerCase();

    let response = '';

    // Simulate different responses based on context
    if (lowerMessage.includes('bonjour') || lowerMessage.includes('hello') || lowerMessage.includes('salut')) {
      response = "Bonjour ! Je suis Claude, votre assistant IA. Je vais vous guider dans la création de votre projet. Décrivez-moi votre idée en quelques phrases.";
    } else if (lowerMessage.includes('projet') || lowerMessage.includes('app') || lowerMessage.includes('application')) {
      response = "Excellent ! Je comprends mieux votre projet. Laissez-moi vous poser quelques questions pour affiner les spécifications :\n\n1. Qui sont vos utilisateurs cibles ?\n2. Quelles sont les 3 fonctionnalités principales ?\n3. Avez-vous des contraintes techniques particulières ?";
    } else if (lowerMessage.includes('utilisateur') || lowerMessage.includes('user')) {
      response = "Parfait, je note ces informations sur vos utilisateurs. Passons aux fonctionnalités principales. Quelles sont les 3-5 features essentielles de votre MVP ?";
    } else if (lowerMessage.includes('fonction') || lowerMessage.includes('feature')) {
      response = "Ces fonctionnalités sont claires. Je vais maintenant générer les spécifications détaillées basées sur nos échanges.\n\n📋 **Génération de SPECIFICATIONS.xml en cours...**\n\nUne fois les specs validées, nous passerons au design system.";
    } else {
      response = `J'ai bien compris. "${userMessage.substring(0, 50)}${userMessage.length > 50 ? '...' : ''}"\n\nContinuons à définir votre projet. Y a-t-il d'autres aspects que vous souhaitez aborder ?`;
    }

    const assistantMessage: ClaudeMessage = {
      id: `assistant-${Date.now()}`,
      role: 'assistant',
      content: response,
      timestamp: new Date(),
    };

    this.notifyMessageHandlers(assistantMessage);
  }

  // Check if in Electron mode
  isElectron(): boolean {
    return this.isElectronMode;
  }
}

// Export singleton instance
export const claudeService = new ClaudeServiceClass();
