// Claude Service - Manages communication with Claude Code CLI
import { logger } from '@/utils/logger';

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
      logger.debug('[ClaudeService] Demo mode - no Electron');
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
        logger.debug('[ClaudeService] Claude exited with code:', code);
        this.notifyStatusHandlers({ running: false });
      })
    );

    return true;
  }

  // Start Claude process for the project
  async start(): Promise<boolean> {
    if (!this.projectPath) {
      logger.error('[ClaudeService] No project path set');
      return false;
    }

    if (!this.isElectronMode) {
      logger.debug('[ClaudeService] Demo mode - simulating start');
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
    if (lowerMessage.includes('bonjour') || lowerMessage.includes('hello') || lowerMessage.includes('hi')) {
      response = "Hello! I'm Claude, your AI assistant. I'll guide you through creating your project. Describe your idea in a few sentences.";
    } else if (lowerMessage.includes('project') || lowerMessage.includes('app') || lowerMessage.includes('application')) {
      response = "Excellent! I understand your project better. Let me ask you a few questions to refine the specifications:\n\n1. Who are your target users?\n2. What are the 3 main features?\n3. Do you have any specific technical constraints?";
    } else if (lowerMessage.includes('user') || lowerMessage.includes('customer')) {
      response = "Great, I've noted this information about your users. Let's move on to the main features. What are the 3-5 essential features for your MVP?";
    } else if (lowerMessage.includes('feature') || lowerMessage.includes('function')) {
      response = "These features are clear. I'll now generate detailed specifications based on our discussion.\n\n📋 **Generating SPECIFICATIONS.xml...**\n\nOnce the specs are validated, we'll move on to the design system.";
    } else {
      response = `I understand. "${userMessage.substring(0, 50)}${userMessage.length > 50 ? '...' : ''}"\n\nLet's continue defining your project. Are there other aspects you'd like to discuss?`;
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
