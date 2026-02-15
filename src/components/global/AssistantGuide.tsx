import { useState, useRef, useEffect, useCallback, type KeyboardEvent } from 'react';
import { useNavigationStore, useProjectStore, useWorkflowStore, phaseDisplayInfo, useConnectionsStore, generateProjectId } from '@/stores';
import { claudeService, fileGenerationService, aiWorkflowService, type ClaudeMessage, type DiscoveryContext } from '@/services';
import { Button, ThinkingIndicator } from '@/components/ui';
import { ActiveContext } from './ActiveContext';
import { getPhaseFormat, getNextSubPhase, FREE_FORM_PHASES } from '@/config/phaseFormats';

// Module-level counter for unique message IDs (avoids Date.now() collisions)
let messageIdCounter = 0;
const generateMessageId = (prefix: string) => {
  messageIdCounter += 1;
  return `${prefix}-${Date.now()}-${messageIdCounter}`;
};

interface DisplayMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  actions?: Array<{
    label: string;
    action: () => void;
    variant?: 'primary' | 'secondary';
  }>;
  isStreaming?: boolean;
  skill?: string; // Which skill generated this message
}

export function AssistantGuide() {
  const { chatPanelOpen, toggleChatPanel, setChatPanelOpen, toggleXrayPanel, chatContext, setChatContext } = useNavigationStore();
  const { currentProject, openProject } = useProjectStore();
  const { currentPhase, setCurrentSubPhase, setPhase: rawSetPhase, completePhase: rawCompletePhase, setConversationContext, conversationContext, activeSkills } = useWorkflowStore();
  const { isClaudeConnected, isGitHubConnected, getGitHubToken } = useConnectionsStore();

  // Wrapper for setPhase that also syncs to .genius/STATE.json (async!)
  const setPhase = useCallback(async (phase: Parameters<typeof rawSetPhase>[0]) => {
    rawSetPhase(phase);
    // Sync to STATE.json after phase change - AWAIT to ensure genius-team sees updated state
    if (currentProject?.path) {
      await useWorkflowStore.getState().syncToGeniusState(currentProject.path);
    }
  }, [rawSetPhase, currentProject?.path]);

  // Wrapper for completePhase that also syncs to .genius/STATE.json (async!)
  const completePhase = useCallback(async (phase: Parameters<typeof rawCompletePhase>[0], artifact?: string) => {
    rawCompletePhase(phase, artifact);
    // Sync to STATE.json after phase completion - AWAIT to ensure genius-team sees updated state
    if (currentProject?.path) {
      await useWorkflowStore.getState().syncToGeniusState(currentProject.path);
    }
  }, [rawCompletePhase, currentProject?.path]);

  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [claudeRunning, setClaudeRunning] = useState(false);
  const [isAIMode, setIsAIMode] = useState(false);
  const [isQueryPending, setIsQueryPending] = useState(false); // Disable input during query
  const [panelWidth, setPanelWidth] = useState(400); // Resizable panel width
  const [isResizing, setIsResizing] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const discoveryStep = useRef(0);

  // Panel resize constraints
  const MIN_PANEL_WIDTH = 320;
  const MAX_PANEL_WIDTH = 700;

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Panel resize handlers
  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  }, []);

  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      // Calculate new width based on mouse position from right edge
      const newWidth = window.innerWidth - e.clientX;
      // Clamp to min/max
      const clampedWidth = Math.max(MIN_PANEL_WIDTH, Math.min(MAX_PANEL_WIDTH, newWidth));
      setPanelWidth(clampedWidth);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing]);

  // Subscribe to Claude service messages
  useEffect(() => {
    const unsubMessage = claudeService.onMessage((msg: ClaudeMessage) => {
      if (msg.role === 'assistant') {
        setIsTyping(false);
        setMessages(prev => {
          // Update or add message
          const existingIndex = prev.findIndex(m => m.id === msg.id);
          if (existingIndex >= 0) {
            const updated = [...prev];
            updated[existingIndex] = { ...msg };
            return updated;
          }
          return [...prev, { ...msg }];
        });
      }
    });

    const unsubStatus = claudeService.onStatus((status) => {
      setClaudeRunning(status.running);
    });

    return () => {
      unsubMessage();
      unsubStatus();
    };
  }, []);

  // Track which project we've initialized for (prevents React Strict Mode double-init)
  const initializedForProject = useRef<string | null>(null);
  const initializationComplete = useRef<string | null>(null); // Set when loading/welcome is done
  const isFirstMount = useRef(true);

  // Sync conversation context to AI service whenever it changes
  // This ensures Claude always has the latest project context
  useEffect(() => {
    const ctx = conversationContext;
    const contextForAI: Record<string, string> = {};

    // Discovery
    if (ctx.projectIdea) contextForAI.projectIdea = ctx.projectIdea;
    if (ctx.targetUsers) contextForAI.targetUsers = ctx.targetUsers;
    if (ctx.mainFeatures) contextForAI.mainFeatures = ctx.mainFeatures;
    if (ctx.competitors) contextForAI.competitors = ctx.competitors;
    if (ctx.differentiator) contextForAI.differentiator = ctx.differentiator;

    // Market Analysis (summary fields, not full text to keep prompt manageable)
    if (ctx.marketSize) contextForAI.marketSize = ctx.marketSize;
    if (ctx.targetSegments) contextForAI.targetSegments = ctx.targetSegments;
    if (ctx.competitiveLandscape) contextForAI.competitiveLandscape = ctx.competitiveLandscape;
    if (ctx.marketOpportunity) contextForAI.marketOpportunity = ctx.marketOpportunity;

    // Design
    if (ctx.designChoice) contextForAI.designChoice = ctx.designChoice;
    if (ctx.colorPalette) contextForAI.colorPalette = ctx.colorPalette;

    // Architecture
    if (ctx.techStack) contextForAI.techStack = ctx.techStack;
    if (ctx.projectStructure) contextForAI.projectStructure = ctx.projectStructure;

    if (currentProject?.name) contextForAI.projectName = currentProject.name;

    aiWorkflowService.setProjectContext(contextForAI);
  }, [conversationContext, currentProject?.name]);

  // Initialize with welcome message and check AI availability
  useEffect(() => {
    const currentProjectId = currentProject?.id || null;

    console.warn('[AssistantGuide] Init effect triggered');
    console.warn('[AssistantGuide] currentProjectId:', currentProjectId);
    console.warn('[AssistantGuide] initializedForProject.current:', initializedForProject.current);

    // Skip if already initialized for this exact project
    if (initializedForProject.current === currentProjectId) {
      console.warn('[AssistantGuide] Already initialized, skipping');
      return;
    }

    console.warn('[AssistantGuide] Proceeding with initialization');

    // Mark as initialized for this project
    initializedForProject.current = currentProjectId;

    // Clear messages when switching projects (but not on first mount)
    if (!isFirstMount.current) {
      setMessages([]);
    }

    // Auto-open panel on first mount only
    if (isFirstMount.current) {
      setChatPanelOpen(true);
      isFirstMount.current = false;
    }

    // Check if Claude is available for AI mode
    const checkAIAvailability = async () => {
      const available = await aiWorkflowService.isClaudeAvailable();
      setIsAIMode(available);

      const aiStatus = available
        ? "\n\n🤖 **AI Mode Active** - Responses powered by Claude"
        : "\n\n💡 **Demo Mode** - Using guided wizard";

      if (!currentProject) {
        // No project - show welcome
        addSystemMessage(
          `👋 **Welcome to vibes!**\n\nI'm your AI assistant and I'll guide you through all the stages of creating your project:\n\n1. 💡 **Discovery** - Understand your idea\n2. 📋 **Specs** - Define the features\n3. 🎨 **Design** - Create the visual identity\n4. 🏗️ **Architecture** - Plan the technical stack\n5. ⚡ **Execution** - Build the project${aiStatus}\n\nTo get started, choose an option:`,
          [
            { label: '+ New Project', action: handleNewProject, variant: 'primary' },
            { label: '📂 Open Project', action: handleOpenProject, variant: 'secondary' },
          ]
        );
      } else {
        // Has project - INITIALIZE the AI service with project path
        console.warn('[AssistantGuide] Has project, initializing AI service');
        aiWorkflowService.init(currentProject.path);

        // Just initialize - the chat-open effect will handle showing welcome message
        // This prevents duplicate cards
        initializationComplete.current = currentProject.id;
      }
    };

    checkAIAvailability();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- Callbacks are stable, messages excluded to prevent loops
  }, [currentProject?.id, currentPhase, setChatPanelOpen]);

  // Handle chat context from "Continue in Chat" buttons - prefill input when chat opens
  useEffect(() => {
    if (chatPanelOpen && chatContext?.prefillMessage) {
      // Pre-fill the input with the context message
      setInput(chatContext.prefillMessage);
      // Clear the context after use
      setChatContext(null);
    }
  }, [chatPanelOpen, chatContext, setChatContext]);

  // Track if we've shown the welcome message for this chat session
  const welcomeShownForProject = useRef<string | null>(null);

  // Show welcome message when chat panel opens
  // This is the SINGLE source of welcome messages (initialization effect just sets up AI service)
  useEffect(() => {
    if (!chatPanelOpen || !currentProject) {
      // Reset tracking when chat closes
      if (!chatPanelOpen) {
        welcomeShownForProject.current = null;
      }
      return;
    }

    // Don't show welcome again if we've already done it for this project in this session
    if (welcomeShownForProject.current === currentProject.id) {
      return;
    }

    // Run recalculation and show welcome
    const showWelcome = async () => {
      // Show loading message
      const loadingId = generateMessageId('phase-loading');
      setMessages(prev => {
        // Remove any existing welcome/loading messages first
        const filtered = prev.filter(m =>
          !(m.role === 'system' && (
            m.content.includes('Welcome back') ||
            m.content.includes('Analyzing project')
          ))
        );
        return [...filtered, {
          id: loadingId,
          role: 'system' as const,
          content: '🔍 **Analyzing project to determine current phase...**',
          timestamp: new Date(),
        }];
      });

      // Recalculate the correct phase based on artifact files
      await useWorkflowStore.getState().recalculateCurrentPhaseFromArtifacts(currentProject.path);

      const correctedPhase = useWorkflowStore.getState().currentPhase;
      const phaseInfo = phaseDisplayInfo[correctedPhase];

      // Check AI availability
      const aiAvailable = await aiWorkflowService.isClaudeAvailable();
      setIsAIMode(aiAvailable);
      const aiStatus = aiAvailable
        ? "\n\n🤖 **AI Mode Active** - Responses powered by Claude"
        : "\n\n💡 **Demo Mode** - Using guided wizard";

      // Small delay to show loading, then show welcome
      setTimeout(() => {
        // Remove loading and add welcome
        setMessages(prev => {
          const filtered = prev.filter(m => m.id !== loadingId);
          return [...filtered, {
            id: generateMessageId('system-welcome'),
            role: 'system' as const,
            content: `👋 **Welcome back to ${currentProject.name}!**\n\nCurrent phase: ${phaseInfo.icon} **${phaseInfo.label}**\n${phaseInfo.description}${aiStatus}`,
            timestamp: new Date(),
            actions: [
              { label: `Continue ${phaseInfo.label}`, action: () => resumeWorkflow(), variant: 'primary' as const },
              { label: 'Start Over', action: () => resetWorkflow(), variant: 'secondary' as const },
            ],
          }];
        });

        // Mark as shown for this project
        welcomeShownForProject.current = currentProject.id;
      }, 200);
    };

    // Small delay to let component settle
    const timer = setTimeout(showWelcome, 50);

    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chatPanelOpen, currentProject?.id]);

  const addSystemMessage = useCallback((content: string, actions?: DisplayMessage['actions']) => {
    const msg: DisplayMessage = {
      id: generateMessageId('system'),
      role: 'system',
      content,
      timestamp: new Date(),
      actions,
    };
    setMessages(prev => [...prev, msg]);
  }, []);


  const addAssistantMessage = useCallback((content: string, actions?: DisplayMessage['actions'], _immediate = false) => {
    // Add message immediately - no fake delays
    const { activeSkills } = useWorkflowStore.getState();
    const msg: DisplayMessage = {
      id: generateMessageId('assistant'),
      role: 'assistant',
      content,
      timestamp: new Date(),
      actions,
      skill: activeSkills[0] || undefined, // Track which skill generated this
    };
    setMessages(prev => [...prev, msg]);
    setIsTyping(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Start a streaming message and return the ID
  const startStreamingMessage = useCallback(() => {
    const id = generateMessageId('assistant');
    const msg: DisplayMessage = {
      id,
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      isStreaming: true,
    };
    setMessages(prev => [...prev, msg]);
    return id;
  }, []);

  // Update streaming message content
  const updateStreamingMessage = useCallback((id: string, content: string) => {
    setMessages(prev => prev.map(msg =>
      msg.id === id ? { ...msg, content } : msg
    ));
  }, []);

  // Complete streaming message with optional actions
  const completeStreamingMessage = useCallback((id: string, actions?: DisplayMessage['actions']) => {
    setMessages(prev => prev.map(msg =>
      msg.id === id ? { ...msg, isStreaming: false, actions } : msg
    ));
  }, []);

  // Send message to AI and stream response
  const sendToAI = useCallback(async (message: string, onComplete?: (response: string) => void) => {
    // Prevent duplicate queries - use state to also disable UI
    if (isQueryPending) {
      console.log('[AssistantGuide] Query already in progress, skipping');
      return '';
    }

    setIsQueryPending(true);
    setIsTyping(true);
    const msgId = startStreamingMessage();
    let fullResponse = '';

    // Get current sub-phase from store (avoid stale closure)
    const subPhase = useWorkflowStore.getState().currentSubPhase;

    // Append format suffix if this phase requires structured output
    let messageWithFormat = message;
    if (!FREE_FORM_PHASES.includes(currentPhase)) {
      const format = getPhaseFormat(currentPhase, subPhase);
      if (format) {
        messageWithFormat = message + '\n\n' + format.promptSuffix;
        console.log('[sendToAI] Appending format suffix for', currentPhase, subPhase);
      }
    }

    // Store the message for potential retry
    const lastMessage = message;

    try {
      // Use direct sendMessage for conversation (not skill invocation)
      const result = await aiWorkflowService.sendMessage(messageWithFormat, {
        onStart: () => {
          setIsTyping(false);
        },
        onChunk: (chunk) => {
          fullResponse += chunk;
          updateStreamingMessage(msgId, fullResponse);
        },
        onComplete: (resp) => {
          setIsQueryPending(false);
          // Clear active skills when response completes
          useWorkflowStore.getState().setActiveSkills([]);
          // Sync skills state after response
          if (currentProject?.path) {
            useWorkflowStore.getState().syncFromGeniusState(currentProject.path);
          }
          // If response is empty (query was cancelled), remove the streaming message
          if (!resp || resp.trim() === '') {
            setMessages(prev => prev.filter(m => m.id !== msgId));
          } else {
            completeStreamingMessage(msgId);
            onComplete?.(resp);
          }
        },
        onError: (error) => {
          setIsQueryPending(false);
          // Clear active skills on error
          useWorkflowStore.getState().setActiveSkills([]);
          // Don't show cancellation as error
          if (error.includes('cancelled') || error.includes('canceled')) {
            setMessages(prev => prev.filter(m => m.id !== msgId));
          } else {
            // Remove the failed streaming message
            setMessages(prev => prev.filter(m => m.id !== msgId));
            // Show error with recovery options
            const isTimeout = error.includes('timed out') || error.includes('timeout');
            addSystemMessage(
              `⚠️ **${isTimeout ? 'Request Timed Out' : 'Something Went Wrong'}**\n\n${error}\n\n${isTimeout ? 'The AI is taking longer than expected. You can try again or simplify your request.' : 'Don\'t worry, this can happen sometimes. Try again or rephrase your message.'}`,
              [
                { label: 'Try Again', action: () => sendToAI(lastMessage, onComplete), variant: 'primary' },
                { label: 'Continue Manually', action: () => {}, variant: 'secondary' },
              ]
            );
          }
        },
      });
      return result;
    } catch (error) {
      setIsQueryPending(false);
      // Clear active skills on error
      useWorkflowStore.getState().setActiveSkills([]);
      // Remove the streaming message on error
      setMessages(prev => prev.filter(m => m.id !== msgId));
      // Show error with recovery options
      const errorMsg = error instanceof Error ? error.message : String(error);
      const isTimeout = errorMsg.includes('timed out') || errorMsg.includes('timeout');
      addSystemMessage(
        `⚠️ **${isTimeout ? 'Request Timed Out' : 'Error Occurred'}**\n\n${errorMsg}\n\n${isTimeout ? 'The AI is taking longer than expected.' : 'Something went wrong.'}`,
        [
          { label: 'Try Again', action: () => sendToAI(lastMessage, onComplete), variant: 'primary' },
          { label: 'Start Over', action: () => resetWorkflow(), variant: 'secondary' },
        ]
      );
      return '';
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps -- resetWorkflow is stable and defined below
  }, [isQueryPending, startStreamingMessage, updateStreamingMessage, completeStreamingMessage, currentProject?.path, addSystemMessage]);

  const addUserMessage = useCallback((content: string) => {
    const msg: DisplayMessage = {
      id: generateMessageId('user'),
      role: 'user',
      content,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, msg]);
  }, []);

  const handleNewProject = async () => {
    setPhase('discovery');
    addAssistantMessage(
      "🚀 **Let's create your new project!**\n\nWhat would you like to call it?\n\n*(Enter a name like \"my-awesome-project\" or \"SaaS-client\")*"
    );
  };

  const handleOpenProject = async () => {
    if (!window.electron) {
      addAssistantMessage(
        "⚠️ Opening a project requires the desktop app.\n\nIn browser mode, you can create a new project to test.",
        [{ label: '+ New Project', action: handleNewProject, variant: 'primary' }]
      );
      return;
    }

    const path = await window.electron.dialog.openDirectory();
    if (path) {
      const projectName = path.split('/').pop() || 'Project';
      const project = {
        id: generateProjectId(path), // Path-based ID for data persistence
        name: projectName,
        path,
        status: 'idle' as const,
        lastOpened: new Date(),
        createdAt: new Date(),
      };
      openProject(project);

      // Initialize Claude service for this project
      await claudeService.init(path);

      addAssistantMessage(
        `📂 **Project opened: ${projectName}**\n\nI'll analyze the project structure...`,
        [
          { label: 'Start Discovery', action: () => startDiscovery(), variant: 'primary' },
          { label: 'View Files', action: () => toggleXrayPanel(), variant: 'secondary' },
        ]
      );
    }
  };

  const createProject = async (name: string) => {
    if (!window.electron) {
      // Demo mode - create mock project
      const demoPath = `/demo/projects/${name}`;
      const project = {
        id: generateProjectId(demoPath), // Path-based ID for data persistence
        name,
        path: demoPath,
        status: 'idle' as const,
        lastOpened: new Date(),
        createdAt: new Date(),
      };
      openProject(project);
      await claudeService.init(project.path);
      aiWorkflowService.init(project.path);

      // Demo mode - show GitHub reminder and start discovery
      addAssistantMessage(
        `✅ **Project "${name}" created!** (demo mode)\n\n💡 *In the desktop app, you can connect GitHub to automatically create repositories for your projects.*`,
        [
          { label: 'Start Discovery', action: () => {
            discoveryStep.current = 1;
            aiWorkflowService.startPhase('discovery', { projectName: name });
            if (isAIMode) {
              addAssistantMessage(`Let me help you define your project...`, undefined, true);
              sendToAI(`I just created a new project called "${name}". Help me discover what this project should be about. Start by asking me to describe my project idea in one sentence.`);
            } else {
              addAssistantMessage(
                `Now, let's talk about your idea.\n\n**Question 1/5: Describe your project in one sentence.**\n\n*Example: "A collaborative task management app for remote teams"*`
              );
            }
          }, variant: 'primary' },
        ]
      );
      return;
    }

    // Electron mode - ask for directory
    addAssistantMessage(
      `📁 **Select the folder** where to create "${name}"\n\n*(The project will be created in a subfolder)*`,
      [{
        label: 'Choose folder',
        action: async () => {
          const basePath = await window.electron.dialog.openDirectory();
          if (basePath) {
            addAssistantMessage("⏳ Creating project...");

            const result = await window.electron.project.create(name, basePath);
            if (result.success && result.path) {
              const project = {
                id: generateProjectId(result.path), // Path-based ID for data persistence
                name,
                path: result.path,
                status: 'idle' as const,
                lastOpened: new Date(),
                createdAt: new Date(),
              };
              openProject(project);
              await claudeService.init(result.path);
              aiWorkflowService.init(result.path);

              // Start discovery phase with AI or guided mode
              discoveryStep.current = 1;
              aiWorkflowService.startPhase('discovery', { projectName: name });

              // Ask about GitHub repo creation
              addAssistantMessage(`✅ **Project "${name}" created!**\n\n📁 ${result.path}\n\nGenius Team structure initialized:\n- .claude/ (config & skills)\n- .genius/ (state)\n- CLAUDE.md`);

              // Slight delay before asking about GitHub
              const projectPath = result.path;
              setTimeout(() => {
                askGitHubRepo(projectPath, name);
              }, 500);
            } else {
              addAssistantMessage(
                `❌ **Error**: ${result.error}\n\nWould you like to try again?`,
                [{ label: 'Retry', action: () => createProject(name), variant: 'primary' }]
              );
            }
          }
        },
        variant: 'primary',
      }]
    );
  };

  // Navigate to connections screen
  const navigateToConnections = () => {
    const { setScreen } = useNavigationStore.getState();
    setScreen('connections');
    toggleChatPanel();
  };

  // Helper function to create GitHub repo for a project
  const createGitHubRepo = async (projectPath: string, projectName: string) => {
    if (!window.electron) return;

    // Get token from secure storage (via store)
    const accessToken = getGitHubToken();

    if (!accessToken) {
      addAssistantMessage("❌ GitHub access token not found. Please reconnect GitHub in Settings → Connections.");
      return;
    }

    addAssistantMessage("⏳ Creating GitHub repository...");

    // Create the GitHub repo
    const repoResult = await window.electron.github.createRepo(
      projectName,
      `Created with vibes`,
      false, // public
      accessToken
    );

    if (!repoResult.success) {
      addAssistantMessage(
        `❌ Failed to create GitHub repo: ${repoResult.error}`,
        [{ label: 'Continue without GitHub', action: () => startDiscovery(), variant: 'secondary' }]
      );
      return;
    }

    // Initialize git in the project
    const gitInitResult = await window.electron.git.init(projectPath);
    if (!gitInitResult.success) {
      addAssistantMessage(
        `⚠️ GitHub repo created but git init failed: ${gitInitResult.error}\n\n📎 Repo URL: ${repoResult.repoUrl}`,
        [{ label: 'Continue', action: () => startDiscovery(), variant: 'primary' }]
      );
      return;
    }

    // Add the remote
    const addRemoteResult = await window.electron.git.addRemote(
      projectPath,
      'origin',
      repoResult.cloneUrl || ''
    );

    if (!addRemoteResult.success) {
      addAssistantMessage(
        `⚠️ GitHub repo created but failed to add remote: ${addRemoteResult.error}\n\n📎 Repo URL: ${repoResult.repoUrl}`,
        [{ label: 'Continue', action: () => startDiscovery(), variant: 'primary' }]
      );
      return;
    }

    // Initial commit and push
    const commitResult = await window.electron.git.commitAndPush(projectPath, 'Initial commit - Created with vibes');

    if (commitResult.success) {
      addAssistantMessage(
        `✅ **GitHub repo created and initialized!**\n\n📎 ${repoResult.repoUrl}\n\nYour project is now synced with GitHub.`,
        [{ label: 'Start Discovery', action: () => startDiscovery(), variant: 'primary' }]
      );
    } else {
      addAssistantMessage(
        `✅ **GitHub repo created!**\n\n📎 ${repoResult.repoUrl}\n\n⚠️ Initial push: ${commitResult.note || commitResult.error || 'No files to commit yet'}`,
        [{ label: 'Start Discovery', action: () => startDiscovery(), variant: 'primary' }]
      );
    }
  };

  // Ask user if they want to create a GitHub repo
  const askGitHubRepo = (projectPath: string, projectName: string) => {
    const githubConnected = isGitHubConnected();

    if (githubConnected) {
      addAssistantMessage(
        `🐙 **Create GitHub Repository?**\n\nWould you like to create a GitHub repo for "${projectName}"?\n\nThis will:\n- Create a new public repository\n- Initialize git locally\n- Push the initial project files`,
        [
          { label: 'Create Repo', action: () => createGitHubRepo(projectPath, projectName), variant: 'primary' },
          { label: 'Skip', action: () => startDiscovery(), variant: 'secondary' },
        ]
      );
    } else {
      addAssistantMessage(
        `💡 **Connect GitHub**\n\nConnect GitHub to automatically create repositories for your projects.\n\nYou can configure this later in **Connections**.`,
        [
          { label: 'Start Discovery', action: () => startDiscovery(), variant: 'primary' },
          { label: 'Connect GitHub', action: () => navigateToConnections(), variant: 'secondary' },
        ]
      );
    }
  };

  const startDiscovery = () => {
    // Read directly from store to avoid stale closures
    const project = useProjectStore.getState().currentProject;

    // Check if a project exists
    if (!project?.path) {
      addAssistantMessage(
        "⚠️ **No project selected**\n\nPlease create a project first by telling me what you want to build, or click the **New Project** button in the sidebar."
      );
      return;
    }

    setPhase('discovery');
    setCurrentSubPhase('project-idea'); // Set initial sub-phase
    discoveryStep.current = 1;

    aiWorkflowService.init(project.path);
    aiWorkflowService.startPhase('discovery', { projectName: project.name || 'Project' });

    if (isAIMode) {
      // AI mode - let Claude drive the conversation (sendToAI handles streaming)
      sendToAI("Help me discover and define this project. Start by asking about the main project idea.");
    } else {
      // Guided mode - use templates
      addAssistantMessage(
        "💡 **Discovery Phase**\n\nI'll ask you 5 questions to better understand your project.\n\n**Question 1/5: Describe your project in one sentence.**\n\n*Example: \"A tech-focused freelance services marketplace\"*"
      );
    }
  };

  // Start market analysis phase
  const startMarketAnalysis = async () => {
    const project = useProjectStore.getState().currentProject;

    if (!project?.path) {
      addAssistantMessage(
        "⚠️ **No project selected**\n\nPlease select a project first."
      );
      return;
    }

    await setPhase('market-analysis'); // Await to ensure STATE.json is updated before AI call
    setCurrentSubPhase('market-size');

    // Start phase (context is already synced via useEffect)
    aiWorkflowService.startPhase('market-analysis');

    // Check AI mode directly (avoid stale state)
    const aiAvailable = await aiWorkflowService.isClaudeAvailable();

    if (aiAvailable) {
      // sendToAI handles streaming - no instant intro message
      sendToAI("Please provide a comprehensive market analysis for this project. Include market size (TAM/SAM/SOM), target segments, competitive landscape, and market opportunity.", (response) => {
        // Store full response AND parse structured data
        setConversationContext({ marketAnalysisFullText: response });
        parseAndUpdateContext(response, '');

        // Market analysis complete - offer to continue
        setTimeout(() => {
          completePhase('market-analysis');
          addSystemMessage(
            "✅ **Market Analysis Complete!**\n\nReady to move to specifications?",
            [
              { label: 'Generate Specs', action: () => startSpecificationsWithAI(), variant: 'primary' },
              { label: 'Continue Analysis', action: () => {}, variant: 'secondary' },
            ]
          );
        }, 500);
      });
    } else {
      // Guided mode
      addAssistantMessage(
        "📊 **Market Analysis Phase**\n\nI'll help you analyze your market.\n\n**Let's start with market size:**\n\nWhat's your estimated market size? Consider:\n- TAM (Total Addressable Market)\n- SAM (Serviceable Addressable Market)\n- SOM (Serviceable Obtainable Market)"
      );
    }
  };

  const handleDiscoveryAnswer = async (answer: string) => {
    const step = discoveryStep.current;

    // Save answer to context
    const contextUpdate: Record<string, string> = {};

    switch (step) {
      case 1:
        contextUpdate.projectIdea = answer;
        setConversationContext({ projectIdea: answer });
        setCurrentSubPhase('target-users'); // Advance sub-phase
        addAssistantMessage(
          `📝 Noted: "${answer.substring(0, 100)}${answer.length > 100 ? '...' : ''}"\n\n**Question 2/5: Who are your target users?**\n\n*Describe your main persona (age, job, needs)*`
        );
        discoveryStep.current = 2;
        break;

      case 2:
        setConversationContext({ ...conversationContext, targetUsers: answer });
        setCurrentSubPhase('main-features'); // Advance sub-phase
        addAssistantMessage(
          `👥 Users identified!\n\n**Question 3/5: What are the 3 main features?**\n\n*List the essential MVP features*`
        );
        discoveryStep.current = 3;
        break;

      case 3:
        setConversationContext({ ...conversationContext, mainFeatures: answer });
        setCurrentSubPhase('competitors'); // Advance sub-phase
        addAssistantMessage(
          `✨ Features noted!\n\n**Question 4/5: Do you have direct competitors?**\n\n*Name 2-3 similar solutions if they exist*`
        );
        discoveryStep.current = 4;
        break;

      case 4:
        setConversationContext({ ...conversationContext, competitors: answer });
        setCurrentSubPhase('differentiator'); // Advance sub-phase
        addAssistantMessage(
          `🎯 Competitive analysis noted!\n\n**Question 5/5: What is your main differentiator?**\n\n*What makes your solution unique?*`
        );
        discoveryStep.current = 5;
        break;

      case 5:
        setConversationContext({ ...conversationContext, differentiator: answer });

        // Discovery complete - generate DISCOVERY.xml
        addAssistantMessage(
          `🎉 **Discovery complete!**\n\nI'll now generate the DISCOVERY.xml file with all this information.\n\n⏳ Generating...`
        );

        // Generate real DISCOVERY.xml file
        const discoveryContext: DiscoveryContext = {
          projectName: currentProject?.name || 'Project',
          projectIdea: conversationContext.projectIdea || '',
          targetUsers: conversationContext.targetUsers || '',
          mainFeatures: conversationContext.mainFeatures || '',
          competitors: conversationContext.competitors || '',
          differentiator: answer,
        };

        const projectPath = currentProject?.path || '';
        const discoveryResult = await fileGenerationService.generateDiscovery(projectPath, discoveryContext);

        if (discoveryResult.success) {
          completePhase('discovery', discoveryResult.path);
          addAssistantMessage(
            `✅ **DISCOVERY.xml generated!**\n\n📁 ${discoveryResult.path}\n\nSummary:\n- 💡 Idea: ${conversationContext.projectIdea?.substring(0, 50)}...\n- 👥 Target: Defined\n- ⚡ Features: Identified\n- 🎯 Differentiator: Clear\n\n**Next step: Specifications**`,
            [
              { label: 'Generate Specs', action: () => startSpecifications(), variant: 'primary' },
              { label: 'Edit Discovery', action: () => { discoveryStep.current = 1; }, variant: 'secondary' },
            ]
          );
        } else {
          addAssistantMessage(
            `❌ Error generating DISCOVERY.xml.\n\nWould you like to try again?`,
            [{ label: 'Retry', action: () => handleDiscoveryAnswer(answer), variant: 'primary' }]
          );
        }
        break;
    }
  };

  const startSpecifications = async () => {
    setPhase('specifications');
    addAssistantMessage(
      `📋 **Specifications Phase**\n\nGenerating specs based on your discovery...\n\n⏳ Creating user stories and acceptance criteria...`
    );

    const projectPath = currentProject?.path || '';
    const specsContext = {
      projectName: currentProject?.name || 'Project',
      projectIdea: conversationContext.projectIdea || '',
      targetUsers: conversationContext.targetUsers || '',
      mainFeatures: conversationContext.mainFeatures || '',
      competitors: conversationContext.competitors || '',
      differentiator: conversationContext.differentiator || '',
      discoveryPath: `${projectPath}/DISCOVERY.xml`,
    };

    const specsResult = await fileGenerationService.generateSpecifications(projectPath, specsContext);

    if (specsResult.success) {
      addAssistantMessage(
        `✅ **SPECIFICATIONS.xml generated!**\n\n📁 ${specsResult.path}\n\nContents:\n- 📖 User Stories generated\n- ✓ Acceptance criteria\n- 📊 Data model\n\n**Would you like to validate these specs?**`,
        [
          { label: '✓ Approve', action: () => approveSpecs(specsResult.path), variant: 'primary' },
          { label: 'View file', action: () => viewFile(specsResult.path), variant: 'secondary' },
        ]
      );
    } else {
      addAssistantMessage(
        `❌ Error generating specs.\n\nWould you like to try again?`,
        [{ label: 'Retry', action: () => startSpecifications(), variant: 'primary' }]
      );
    }
  };

  const viewFile = async (filePath: string) => {
    if (window.electron) {
      try {
        const content = await window.electron.file.read(filePath);
        addAssistantMessage(`📄 **Contents of ${filePath.split('/').pop()}:**\n\n\`\`\`xml\n${content.substring(0, 1000)}${content.length > 1000 ? '\n...(truncated)' : ''}\n\`\`\``);
      } catch {
        addAssistantMessage(`❌ Unable to read the file.`);
      }
    } else {
      addAssistantMessage(`📄 File available at: ${filePath}`);
    }
  };

  const approveSpecs = (specsPath: string) => {
    completePhase('specifications', specsPath);
    addAssistantMessage(
      `✅ **Specs approved!**\n\n**Next step: Design System**\n\nI'll create 3 design options with:\n- Color palette\n- Typography\n- UI Components\n\nReady to see the designs?`,
      [
        { label: '🎨 View options', action: () => startDesign(specsPath), variant: 'primary' },
      ]
    );
  };

  const startDesign = async (specsPath: string) => {
    setPhase('design');
    addAssistantMessage(
      `🎨 **Design Phase**\n\nHere are 3 design options for your project:\n\n**Option A - "Minimal"**\n🎨 Black/White, clean, modern\n- Primary: #000000\n- Background: #FFFFFF\n\n**Option B - "Vibrant"**\n🌈 Bright colors, energetic\n- Primary: #FF6B35\n- Background: #1A1A2E\n\n**Option C - "Professional"**\n💼 Blue/Gray, corporate, reliable\n- Primary: #2563EB\n- Background: #F8FAFC\n\n**Which option do you prefer?**`,
      [
        { label: 'Option A', action: () => chooseDesign('A', specsPath), variant: 'secondary' },
        { label: 'Option B', action: () => chooseDesign('B', specsPath), variant: 'secondary' },
        { label: 'Option C', action: () => chooseDesign('C', specsPath), variant: 'primary' },
      ]
    );
  };

  const chooseDesign = async (option: 'A' | 'B' | 'C', specsPath: string) => {
    addAssistantMessage(`⏳ Generating design system with option ${option}...`);

    const projectPath = currentProject?.path || '';
    const designContext = {
      projectName: currentProject?.name || 'Project',
      projectIdea: conversationContext.projectIdea || '',
      targetUsers: conversationContext.targetUsers || '',
      mainFeatures: conversationContext.mainFeatures || '',
      competitors: conversationContext.competitors || '',
      differentiator: conversationContext.differentiator || '',
      discoveryPath: `${projectPath}/DISCOVERY.xml`,
      specsPath,
      designChoice: option,
    };

    const designResult = await fileGenerationService.generateDesignSystem(projectPath, designContext);

    if (designResult.success) {
      completePhase('design', designResult.path);
      setConversationContext({ ...conversationContext, designChoice: option });

      addAssistantMessage(
        `✅ **Option ${option} selected!**\n\n📁 ${designResult.path}\n\n**Next step: Technical Architecture**\n\nI'll analyze your specs and generate:\n- ARCHITECTURE.md (technical decisions)\n- .claude/plan.md (execution tasks)`,
        [
          { label: '🏗️ Generate Architecture', action: () => startArchitecture(specsPath, designResult.path), variant: 'primary' },
        ]
      );
    } else {
      addAssistantMessage(
        `❌ Error generating design.\n\nWould you like to try again?`,
        [{ label: 'Retry', action: () => chooseDesign(option, specsPath), variant: 'primary' }]
      );
    }
  };

  const startArchitecture = async (specsPath: string, designPath: string) => {
    await setPhase('architecture'); // Await to ensure STATE.json is updated before AI call
    setCurrentSubPhase('tech-stack'); // Set initial sub-phase
    addAssistantMessage(
      `🏗️ **Architecture Phase**\n\nAnalyzing requirements and generating technical plan...\n\n⏳ Creating ARCHITECTURE.md and plan.md...`
    );

    const projectPath = currentProject?.path || '';
    const archContext = {
      projectName: currentProject?.name || 'Project',
      projectIdea: conversationContext.projectIdea || '',
      targetUsers: conversationContext.targetUsers || '',
      mainFeatures: conversationContext.mainFeatures || '',
      competitors: conversationContext.competitors || '',
      differentiator: conversationContext.differentiator || '',
      discoveryPath: `${projectPath}/DISCOVERY.xml`,
      specsPath,
      designPath,
      designChoice: (conversationContext.designChoice || 'C') as 'A' | 'B' | 'C',
    };

    const archResult = await fileGenerationService.generateArchitecture(projectPath, archContext);

    if (archResult.success) {
      completePhase('architecture', archResult.paths[0]);

      const featureCount = (conversationContext.mainFeatures || '').split('\n').filter(f => f.trim()).length;
      const taskCount = 15 + featureCount + 10; // Setup + features + polish

      addAssistantMessage(
        `✅ **Architecture generated!**\n\n📁 Files created:\n- ${archResult.paths[0]}\n- ${archResult.paths[1]}\n\n**Recommended stack:**\n- ⚛️ Next.js 14 (App Router)\n- 🗄️ Supabase (Auth + DB)\n- 🎨 Tailwind CSS\n- 📦 TypeScript\n\n**Execution plan:**\n- ${taskCount} tasks identified\n\n**Ready to start building?**`,
        [
          { label: '⚡ Start Build', action: () => startExecution(), variant: 'primary' },
          { label: 'View plan', action: () => viewFile(archResult.paths[1]), variant: 'secondary' },
        ]
      );
    } else {
      addAssistantMessage(
        `❌ Error generating architecture.\n\nWould you like to try again?`,
        [{ label: 'Retry', action: () => startArchitecture(specsPath, designPath), variant: 'primary' }]
      );
    }
  };

  const startExecution = async () => {
    await setPhase('execution'); // Await to ensure STATE.json is updated
    setCurrentSubPhase(null); // Clear sub-phase for free-form coding

    // Check if Claude is connected
    if (!isClaudeConnected()) {
      addAssistantMessage(
        `⚠️ **Claude not connected**\n\nTo start building, you must first connect Claude.\n\nGo to **Connections** to configure Claude.`,
        [
          { label: 'Configure Claude', action: navigateToConnections, variant: 'primary' },
        ]
      );
      return;
    }

    addAssistantMessage(
      `⚡ **Execution Phase**\n\n🚀 Launching Claude Code...\n\nI'll now build your project automatically. You can follow the progress in real-time.`
    );

    // Start Claude
    const started = await claudeService.start();
    if (started) {
      // Send the build command
      await claudeService.send('/continue');

      addAssistantMessage(
        `✅ **Claude started!**\n\nBuilding in progress...\n\n📊 Follow the progress in the Execution panel.`
      );
    } else {
      addAssistantMessage(
        `❌ **Launch error**\n\nUnable to start Claude. Verify that Claude Code CLI is installed.`,
        [
          { label: 'Retry', action: () => startExecution(), variant: 'primary' },
        ]
      );
    }
  };

  const resumeWorkflow = () => {
    const projectPath = currentProject?.path || '';
    const specsPath = `${projectPath}/SPECIFICATIONS.xml`;
    const designPath = `${projectPath}/DESIGN-SYSTEM.xml`;

    switch (currentPhase) {
      case 'welcome':
        // If a project exists but we're in welcome phase, move to discovery
        if (currentProject) {
          setPhase('discovery');
          startDiscovery();
        } else {
          handleNewProject();
        }
        break;
      case 'discovery':
        startDiscovery();
        break;
      case 'market-analysis':
        startMarketAnalysis();
        break;
      case 'specifications':
        startSpecifications();
        break;
      case 'design':
        startDesign(specsPath);
        break;
      case 'architecture':
        startArchitecture(specsPath, designPath);
        break;
      case 'execution':
        startExecution();
        break;
      default:
        addAssistantMessage("I'm ready to help. What would you like to do?");
    }
  };

  const resetWorkflow = () => {
    setPhase('welcome');
    discoveryStep.current = 0;
    setMessages([]);
    initializedForProject.current = null; // Allow re-initialization
    initializationComplete.current = null; // Reset initialization tracking
    welcomeShownForProject.current = null; // Reset welcome tracking
  };

  const handleSend = async () => {
    if (!input.trim() || isQueryPending) return;

    const userInput = input.trim();
    addUserMessage(userInput);
    setInput('');

    // CRITICAL: Always be able to respond to user messages
    // The chat should NEVER be unresponsive

    // Special case: Creating a new project (no project yet, discovery phase, step 0)
    if (currentPhase === 'discovery' && !currentProject && discoveryStep.current === 0) {
      createProject(userInput);
      return;
    }

    // Special case: In-progress discovery with step tracking (guided mode only)
    if (currentPhase === 'discovery' && discoveryStep.current > 0 && !isAIMode) {
      handleDiscoveryAnswer(userInput);
      return;
    }

    // Special case: Discovery phase with AI mode - use step tracking
    if (currentPhase === 'discovery' && isAIMode && discoveryStep.current > 0) {
      await handleAIDiscovery(userInput);
      return;
    }

    // AI Mode: Send to Claude for ALL phases when AI is available
    if (isAIMode) {
      await sendToAI(userInput, (fullResponse) => {
        parseAndUpdateContext(fullResponse, userInput);

        // Check for phase completion signals
        const lowerResponse = fullResponse.toLowerCase();

        // Discovery phase completion
        if (currentPhase === 'discovery' && (lowerResponse.includes('discovery.xml') || lowerResponse.includes('generate') || lowerResponse.includes('ready to create'))) {
          setTimeout(() => {
            addSystemMessage(
              "Ready to generate the discovery document?",
              [
                { label: 'Generate DISCOVERY.xml', action: () => generateDiscoveryWithAI(), variant: 'primary' },
                { label: 'Continue Discussion', action: () => {}, variant: 'secondary' },
              ]
            );
          }, 500);
        }

        if (currentPhase === 'market-analysis' && (lowerResponse.includes('market analysis complete') || lowerResponse.includes('specifications'))) {
          setTimeout(() => {
            addSystemMessage(
              "Ready to move to specifications?",
              [
                { label: 'Generate Specs', action: () => startSpecificationsWithAI(), variant: 'primary' },
                { label: 'Continue Analysis', action: () => {}, variant: 'secondary' },
              ]
            );
          }, 500);
        }

        if (currentPhase === 'specifications' && (lowerResponse.includes('specifications.xml') || lowerResponse.includes('ready to generate'))) {
          setTimeout(() => {
            addSystemMessage(
              "Ready to generate the specifications document?",
              [
                { label: 'Generate SPECIFICATIONS.xml', action: () => generateSpecsWithAI(), variant: 'primary' },
                { label: 'Continue Discussion', action: () => {}, variant: 'secondary' },
              ]
            );
          }, 500);
        }
      });
      return;
    }

    // Fallback: Send to Claude service directly (execution mode, etc.)
    setIsTyping(true);
    claudeService.send(userInput);
  };

  // Parse AI response to extract context and update workflow store
  // Uses the phase format registry for reliable structured extraction
  const parseAndUpdateContext = (response: string, userInput: string) => {
    // Get current sub-phase from store
    const subPhase = useWorkflowStore.getState().currentSubPhase;
    const ctx = useWorkflowStore.getState().conversationContext;
    const updates: Record<string, unknown> = {};

    // Skip extraction for free-form phases (execution, qa, deployment)
    if (FREE_FORM_PHASES.includes(currentPhase)) {
      console.log('[parseAndUpdateContext] Free-form phase, skipping extraction');
      return;
    }

    // PRIMARY: Use format-based extraction if available
    const format = getPhaseFormat(currentPhase, subPhase);
    if (format) {
      const extracted = format.extractData(response);
      if (Object.keys(extracted).length > 0) {
        console.log('[parseAndUpdateContext] Format extracted:', extracted);
        Object.assign(updates, extracted);

        // Advance to next sub-phase after successful extraction
        const nextSubPhase = getNextSubPhase(currentPhase, subPhase);
        if (nextSubPhase) {
          setCurrentSubPhase(nextSubPhase);
          console.log('[parseAndUpdateContext] Advanced to sub-phase:', nextSubPhase);
        }
      }
    }

    // FALLBACK: Legacy extraction for backwards compatibility
    // This handles cases where Claude doesn't include the format tags
    if (Object.keys(updates).length === 0) {
      const lowerResponse = response.toLowerCase();

      // Discovery phase fallback
      if (currentPhase === 'discovery') {
        // Check for <answer> tags first (new format)
        const answerMatch = response.match(/<answer field="(\w+)">([\s\S]*?)<\/answer>/);
        if (answerMatch) {
          const [, field, value] = answerMatch;
          updates[field] = value.trim();
        } else {
          // Legacy keyword-based extraction
          if ((lowerResponse.includes('project idea') || lowerResponse.includes('great idea') ||
               lowerResponse.includes('interesting project')) && !ctx.projectIdea) {
            updates.projectIdea = userInput;
          }
          if ((lowerResponse.includes('target user') || lowerResponse.includes('audience') ||
               lowerResponse.includes('persona')) && !ctx.targetUsers) {
            updates.targetUsers = userInput;
          }
          if ((lowerResponse.includes('feature') || lowerResponse.includes('functionality') ||
               lowerResponse.includes('mvp')) && !ctx.mainFeatures) {
            updates.mainFeatures = userInput;
          }
          if ((lowerResponse.includes('competitor') || lowerResponse.includes('competition') ||
               lowerResponse.includes('alternative')) && !ctx.competitors) {
            updates.competitors = userInput;
          }
          if ((lowerResponse.includes('differentiator') || lowerResponse.includes('unique') ||
               lowerResponse.includes('stand out')) && !ctx.differentiator) {
            updates.differentiator = userInput;
          }
        }
      }

      // Market Analysis phase fallback
      if (currentPhase === 'market-analysis') {
        // Check for <data> tags first (new format)
        const dataMatches = response.matchAll(/<data field="(\w+)">([\s\S]*?)<\/data>/g);
        for (const match of dataMatches) {
          const [, field, value] = match;
          if (!ctx[field as keyof typeof ctx]) {
            updates[field] = value.trim();
          }
        }

        // Try JSON fallback
        if (Object.keys(updates).length === 0) {
          const jsonMatch = response.match(/```json\s*([\s\S]*?)```/);
          if (jsonMatch) {
            try {
              const data = JSON.parse(jsonMatch[1].trim());
              if (data.marketSize && !ctx.marketSize) updates.marketSize = data.marketSize;
              if (data.targetSegments && !ctx.targetSegments) updates.targetSegments = data.targetSegments;
              if (data.competitiveLandscape && !ctx.competitiveLandscape) updates.competitiveLandscape = data.competitiveLandscape;
              if (data.marketOpportunity && !ctx.marketOpportunity) updates.marketOpportunity = data.marketOpportunity;
            } catch {
              console.warn('[parseAndUpdateContext] JSON parse failed');
            }
          }
        }
      }

      // Design phase fallback
      if (currentPhase === 'design') {
        // Check for <data> tags
        const dataMatches = response.matchAll(/<data field="(\w+)">([\s\S]*?)<\/data>/g);
        for (const match of dataMatches) {
          const [, field, value] = match;
          updates[field] = value.trim();
        }
      }

      // Architecture phase fallback
      if (currentPhase === 'architecture') {
        // Check for <data> tags
        const dataMatches = response.matchAll(/<data field="(\w+)">([\s\S]*?)<\/data>/g);
        for (const match of dataMatches) {
          const [, field, value] = match;
          updates[field] = value.trim();
        }
      }

      // Specifications phase - keep existing logic for complex XML generation
      if (currentPhase === 'specifications') {
        const hasSubstantialContent = response.length > 200;

        if (lowerResponse.includes('user stor') || lowerResponse.includes('as a user') || lowerResponse.includes('us-')) {
          const stories = parseUserStoriesFromResponse(response);
          if (stories.length > 0) updates.userStories = stories;
        }

        if (lowerResponse.includes('functional requirement') || lowerResponse.includes('fr-')) {
          const reqs = parseListFromResponse(response, 'functional');
          if (reqs.length > 0) updates.functionalRequirements = reqs;
        }

        if (lowerResponse.includes('non-functional') || lowerResponse.includes('nfr')) {
          const nfReqs = parseListFromResponse(response, 'non-functional');
          if (nfReqs.length > 0) updates.nonFunctionalRequirements = nfReqs;
        }

        if (hasSubstantialContent && (lowerResponse.includes('spec') || lowerResponse.includes('requirement'))) {
          const summary = response.substring(0, 800);
          if (!ctx.specificationsSummary || summary.length > (ctx.specificationsSummary?.length || 0)) {
            updates.specificationsSummary = summary;
          }
        }
      }
    }

    // Apply updates if any
    if (Object.keys(updates).length > 0) {
      console.log('[AssistantGuide] Updating context:', Object.keys(updates));
      setConversationContext(updates);
    }
  };

  // Helper: Parse user stories from AI response
  const parseUserStoriesFromResponse = (response: string) => {
    const stories: Array<{ id: string; title: string; description: string; acceptanceCriteria?: string[] }> = [];
    const storyRegex = /(?:US-?\d+|User Story \d+|As a)[:\s]+([^\n]+)/gi;
    let match;
    let id = 1;

    while ((match = storyRegex.exec(response)) !== null) {
      stories.push({
        id: `US-${String(id).padStart(3, '0')}`,
        title: match[1].trim().substring(0, 100),
        description: match[1].trim(),
      });
      id++;
      if (id > 10) break; // Limit to 10 stories
    }

    return stories;
  };

  // Helper: Parse list items from response
  const parseListFromResponse = (response: string, _type: string): string[] => {
    const items: string[] = [];
    const lines = response.split('\n');

    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith('-') || trimmed.startsWith('•') || /^\d+\./.test(trimmed)) {
        const item = trimmed.replace(/^[-•\d.]+\s*/, '').trim();
        if (item.length > 5 && item.length < 200) {
          items.push(item);
        }
      }
      if (items.length >= 10) break;
    }

    return items;
  };

  // Handle AI-driven discovery conversation
  const handleAIDiscovery = async (userInput: string) => {
    // Track what information we've gathered
    const step = discoveryStep.current;

    // Update context based on step (fallback for guided mode compatibility)
    if (step === 1) {
      setConversationContext({ ...conversationContext, projectIdea: userInput });
    } else if (step === 2) {
      setConversationContext({ ...conversationContext, targetUsers: userInput });
    } else if (step === 3) {
      setConversationContext({ ...conversationContext, mainFeatures: userInput });
    } else if (step === 4) {
      setConversationContext({ ...conversationContext, competitors: userInput });
    } else if (step === 5) {
      setConversationContext({ ...conversationContext, differentiator: userInput });
    }

    // Send to AI and check if discovery is complete
    await sendToAI(userInput, async (fullResponse) => {
      // Parse AI response and update context
      parseAndUpdateContext(fullResponse, userInput);

      // Check if AI suggests generating DISCOVERY.xml
      const lowerResponse = fullResponse.toLowerCase();
      if (lowerResponse.includes('discovery.xml') || lowerResponse.includes('generate') || lowerResponse.includes('ready to create')) {
        // Discovery complete, offer to generate file
        setTimeout(() => {
          addSystemMessage(
            "Ready to generate the discovery document?",
            [
              { label: 'Generate DISCOVERY.xml', action: () => generateDiscoveryWithAI(), variant: 'primary' },
              { label: 'Continue Discussion', action: () => {}, variant: 'secondary' },
            ]
          );
        }, 500);
      }
    });

    // Increment step after each answer
    if (step < 5) {
      discoveryStep.current = step + 1;
    }
  };

  // Generate discovery file with AI
  const generateDiscoveryWithAI = async () => {
    addAssistantMessage("⏳ Generating DISCOVERY.xml with AI...", undefined, true);

    const projectPath = currentProject?.path || '';
    const context = {
      projectName: currentProject?.name || 'Project',
      projectIdea: conversationContext.projectIdea || '',
      targetUsers: conversationContext.targetUsers || '',
      mainFeatures: conversationContext.mainFeatures || '',
      competitors: conversationContext.competitors || '',
      differentiator: conversationContext.differentiator || '',
    };

    try {
      if (isAIMode) {
        // AI-generated content
        const msgId = startStreamingMessage();
        let content = '';

        await aiWorkflowService.generateFile('discovery', context, {
          onChunk: (chunk) => {
            content += chunk;
            updateStreamingMessage(msgId, `Generating...\n\n\`\`\`xml\n${content.substring(0, 500)}${content.length > 500 ? '...' : ''}\n\`\`\``);
          },
          onComplete: async (fullContent) => {
            // Write the file
            if (window.electron) {
              await window.electron.file.write(`${projectPath}/DISCOVERY.xml`, fullContent);
            }
            completeStreamingMessage(msgId);
            completePhase('discovery', `${projectPath}/DISCOVERY.xml`);
            addAssistantMessage(
              `✅ **DISCOVERY.xml generated!**\n\n📁 ${projectPath}/DISCOVERY.xml\n\n**Next step: Specifications**`,
              [
                { label: 'Generate Specs', action: () => startSpecificationsWithAI(), variant: 'primary' },
                { label: 'View File', action: () => viewFile(`${projectPath}/DISCOVERY.xml`), variant: 'secondary' },
              ],
              true
            );
          },
          onError: (error) => {
            updateStreamingMessage(msgId, `❌ Error: ${error}`);
            completeStreamingMessage(msgId);
          },
        });
      } else {
        // Template-based generation
        const result = await fileGenerationService.generateDiscovery(projectPath, context);
        if (result.success) {
          completePhase('discovery', result.path);
          addAssistantMessage(
            `✅ **DISCOVERY.xml generated!**\n\n📁 ${result.path}\n\n**Next step: Specifications**`,
            [
              { label: 'Generate Specs', action: () => startSpecifications(), variant: 'primary' },
              { label: 'View File', action: () => viewFile(result.path), variant: 'secondary' },
            ]
          );
        }
      }
    } catch (error) {
      addAssistantMessage(`❌ Error generating file: ${error}`, undefined, true);
    }
  };

  // Start specifications with AI
  const startSpecificationsWithAI = async () => {
    await setPhase('specifications'); // Await to ensure STATE.json is updated before AI call
    setCurrentSubPhase('user-stories'); // Set initial sub-phase

    // Start phase (context is already synced via useEffect)
    aiWorkflowService.startPhase('specifications');

    // Check AI mode directly (avoid stale state)
    const aiAvailable = await aiWorkflowService.isClaudeAvailable();

    if (aiAvailable) {
      // Actually generate the SPECIFICATIONS.xml file
      await generateSpecsWithAI();
    } else {
      startSpecifications();
    }
  };

  // Navigate to specifications section (phase-detail view)
  const navigateToSpecifications = () => {
    const { setScreen } = useNavigationStore.getState();
    setPhase('specifications'); // Ensure we're on specifications phase
    setScreen('phase-detail'); // Navigate to the phase detail view
    toggleChatPanel(); // Close chat to show the section
  };

  // Generate specifications file with AI
  const generateSpecsWithAI = async () => {
    addAssistantMessage("⏳ Generating SPECIFICATIONS.xml with AI...", undefined, true);

    const projectPath = currentProject?.path || '';
    const context = {
      projectName: currentProject?.name || 'Project',
      projectIdea: conversationContext.projectIdea || '',
      targetUsers: conversationContext.targetUsers || '',
      mainFeatures: conversationContext.mainFeatures || '',
      competitors: conversationContext.competitors || '',
      differentiator: conversationContext.differentiator || '',
      discoveryPath: `${projectPath}/DISCOVERY.xml`,
    };

    try {
      if (isAIMode) {
        // AI-generated content
        const msgId = startStreamingMessage();
        let content = '';

        await aiWorkflowService.generateFile('specifications', context, {
          onChunk: (chunk) => {
            content += chunk;
            updateStreamingMessage(msgId, `Generating...\n\n\`\`\`xml\n${content.substring(0, 500)}${content.length > 500 ? '...' : ''}\n\`\`\``);
          },
          onComplete: async (fullContent) => {
            // Write the file
            if (window.electron) {
              await window.electron.file.write(`${projectPath}/SPECIFICATIONS.xml`, fullContent);
            }

            // Parse the generated content for user stories and other specs
            const stories = parseUserStoriesFromResponse(fullContent);
            const funcReqs = parseListFromResponse(fullContent, 'functional');
            const nonFuncReqs = parseListFromResponse(fullContent, 'non-functional');

            // Update context with all parsed content
            setConversationContext({
              userStories: stories.length > 0 ? stories : undefined,
              functionalRequirements: funcReqs.length > 0 ? funcReqs : undefined,
              nonFunctionalRequirements: nonFuncReqs.length > 0 ? nonFuncReqs : undefined,
              specificationsSummary: `Generated specifications with ${stories.length} user stories`,
            });

            completeStreamingMessage(msgId);
            completePhase('specifications', `${projectPath}/SPECIFICATIONS.xml`);

            // Show short message and offer to view in section
            addAssistantMessage(
              `✅ **Specifications Generated!**\n\nI've created detailed specifications with:\n- ${stories.length} user stories\n- ${funcReqs.length} functional requirements\n- ${nonFuncReqs.length} non-functional requirements\n\nView the full details in the Specifications section.`,
              [
                { label: 'View Specifications', action: navigateToSpecifications, variant: 'primary' },
                { label: '🎨 Start Design', action: () => startDesignWithAI(), variant: 'secondary' },
              ],
              true
            );
          },
          onError: (error) => {
            // Remove streaming message and show error with retry
            setMessages(prev => prev.filter(m => m.id !== msgId));
            addSystemMessage(
              `⚠️ **Specification Generation Failed**\n\n${error}\n\nThe AI couldn't complete the specifications. This can happen with complex projects.`,
              [
                { label: 'Try Again', action: () => generateSpecsWithAI(), variant: 'primary' },
                { label: 'Continue Manually', action: () => {}, variant: 'secondary' },
              ]
            );
          },
        });
      } else {
        // Template-based generation
        const result = await fileGenerationService.generateSpecifications(projectPath, context);
        if (result.success) {
          completePhase('specifications', result.path);
          addAssistantMessage(
            `✅ **Specifications Generated!**\n\n📁 ${result.path}\n\nView the full details in the Specifications section.`,
            [
              { label: 'View Specifications', action: navigateToSpecifications, variant: 'primary' },
              { label: '🎨 Start Design', action: () => startDesign(result.path), variant: 'secondary' },
            ]
          );
        }
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      addSystemMessage(
        `⚠️ **Error Generating Specifications**\n\n${errorMsg}`,
        [
          { label: 'Try Again', action: () => generateSpecsWithAI(), variant: 'primary' },
          { label: 'Cancel', action: () => {}, variant: 'secondary' },
        ]
      );
    }
  };

  // Start design phase with AI - generates interactive HTML preview
  const startDesignWithAI = async () => {
    const projectPath = currentProject?.path || '';
    const specsPath = `${projectPath}/SPECIFICATIONS.xml`;
    await setPhase('design'); // Await to ensure STATE.json is updated before AI call
    setCurrentSubPhase('design-options'); // Set initial sub-phase

    // Start phase (context is already synced via useEffect)
    aiWorkflowService.startPhase('design');

    // Check AI mode directly (avoid stale state)
    const aiAvailable = await aiWorkflowService.isClaudeAvailable();

    if (aiAvailable) {
      // Generate visual HTML preview
      const msgId = startStreamingMessage();
      let content = '';

      const context = {
        projectName: currentProject?.name || 'Project',
        projectIdea: conversationContext.projectIdea || '',
        targetUsers: conversationContext.targetUsers || '',
        mainFeatures: conversationContext.mainFeatures || '',
        specsPath,
      };

      try {
        await aiWorkflowService.generateFile('design', context, {
          onStart: () => {
            updateStreamingMessage(msgId, "🎨 **Generating Design System...**\n\nCreating interactive HTML preview with 3 design options...");
          },
          onChunk: (chunk) => {
            content += chunk;
            // Show progress
            const lines = content.split('\n').length;
            updateStreamingMessage(msgId, `🎨 **Generating Design System...**\n\nCreating HTML preview... (${lines} lines)`);
          },
          onComplete: async (fullContent) => {
            // Write the HTML file
            const designPath = `${projectPath}/DESIGN-SYSTEM.html`;
            if (window.electron) {
              await window.electron.file.write(designPath, fullContent);
            }

            completeStreamingMessage(msgId);

            // Show completion message with action to view
            addAssistantMessage(
              `✅ **Design System Generated!**\n\n📁 DESIGN-SYSTEM.html\n\nI've created an interactive HTML file with 3 design options. Open it in your browser to:\n- Compare color palettes\n- Preview typography\n- See component examples\n- Choose your preferred design\n\n**Select an option after viewing:**`,
              [
                { label: 'Option A', action: () => finalizeDesign('A', designPath), variant: 'secondary' },
                { label: 'Option B', action: () => finalizeDesign('B', designPath), variant: 'secondary' },
                { label: 'Option C', action: () => finalizeDesign('C', designPath), variant: 'primary' },
              ]
            );
          },
          onError: (error) => {
            setMessages(prev => prev.filter(m => m.id !== msgId));
            console.error('[AssistantGuide] Design generation failed:', error);
            showFallbackDesignOptions(specsPath);
          },
        });
      } catch (error) {
        console.error('[AssistantGuide] Design AI query failed:', error);
        showFallbackDesignOptions(specsPath);
      }
    } else {
      startDesign(specsPath);
    }
  };

  // Finalize design choice and continue to architecture
  const finalizeDesign = async (option: 'A' | 'B' | 'C', designPath: string) => {
    setConversationContext({ ...conversationContext, designChoice: option });
    completePhase('design', designPath);

    addAssistantMessage(
      `✅ **Option ${option} Selected!**\n\n📁 ${designPath}\n\n**Next step: Technical Architecture**\n\nI'll create the architecture plan based on your specs and design.`,
      [
        { label: '🏗️ Generate Architecture', action: () => startArchitectureWithAI(), variant: 'primary' },
      ]
    );
  };

  // Start architecture phase with AI
  const startArchitectureWithAI = async () => {
    const projectPath = currentProject?.path || '';
    await setPhase('architecture');

    const aiAvailable = await aiWorkflowService.isClaudeAvailable();

    if (aiAvailable) {
      const msgId = startStreamingMessage();
      let content = '';

      const context = {
        projectName: currentProject?.name || 'Project',
        projectIdea: conversationContext.projectIdea || '',
        mainFeatures: conversationContext.mainFeatures || '',
        designChoice: conversationContext.designChoice || 'A',
      };

      try {
        await aiWorkflowService.generateFile('architecture', context, {
          onStart: () => {
            updateStreamingMessage(msgId, "🏗️ **Generating Architecture...**\n\nCreating technical plan...");
          },
          onChunk: (chunk) => {
            content += chunk;
            updateStreamingMessage(msgId, `🏗️ **Generating Architecture...**\n\n\`\`\`markdown\n${content.substring(0, 500)}${content.length > 500 ? '...' : ''}\n\`\`\``);
          },
          onComplete: async (fullContent) => {
            const archPath = `${projectPath}/ARCHITECTURE.md`;
            if (window.electron) {
              await window.electron.file.write(archPath, fullContent);
            }

            completeStreamingMessage(msgId);
            completePhase('architecture', archPath);

            addAssistantMessage(
              `✅ **Architecture Generated!**\n\n📁 ARCHITECTURE.md\n\nTechnical plan is ready. You can now start building!`,
              [
                { label: '⚡ Start Execution', action: () => startExecution(), variant: 'primary' },
                { label: 'View Architecture', action: () => viewFile(archPath), variant: 'secondary' },
              ]
            );
          },
          onError: (error) => {
            setMessages(prev => prev.filter(m => m.id !== msgId));
            addSystemMessage(`⚠️ Architecture generation failed: ${error}`);
          },
        });
      } catch (error) {
        console.error('[AssistantGuide] Architecture generation failed:', error);
        addSystemMessage(`⚠️ Error: ${error}`);
      }
    } else {
      // Fallback to template
      startArchitecture(`${projectPath}/SPECIFICATIONS.xml`, `${projectPath}/DESIGN-SYSTEM.html`);
    }
  };

  // Fallback design options if AI doesn't respond
  const showFallbackDesignOptions = (specsPath: string) => {
    addAssistantMessage(
      `🎨 **Design Options**\n\nHere are 3 design directions for your project:\n\n**Option A - "Minimal"**\n🎨 Clean, modern, focused\n- Primary: #000000 (Black)\n- Background: #FFFFFF\n- Typography: Inter, system fonts\n\n**Option B - "Vibrant"**\n🌈 Bold, energetic, dynamic\n- Primary: #FF6B35 (Orange)\n- Background: #1A1A2E (Dark)\n- Typography: Space Grotesk\n\n**Option C - "Professional"**\n💼 Corporate, trustworthy, reliable\n- Primary: #2563EB (Blue)\n- Background: #F8FAFC (Light)\n- Typography: Inter, system fonts\n\n**Which option fits your vision?**`,
      [
        { label: 'Option A', action: () => chooseDesign('A', specsPath), variant: 'secondary' },
        { label: 'Option B', action: () => chooseDesign('B', specsPath), variant: 'secondary' },
        { label: 'Option C', action: () => chooseDesign('C', specsPath), variant: 'primary' },
      ]
    );
  };

  const handleKeyPress = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Auto-grow textarea handler
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);

    // Auto-resize textarea
    const textarea = e.target;
    textarea.style.height = 'auto'; // Reset to get accurate scrollHeight
    const maxHeight = window.innerHeight / 3; // Max 1/3 of viewport
    const newHeight = Math.min(textarea.scrollHeight, maxHeight);
    textarea.style.height = `${newHeight}px`;
  };

  // Reset textarea height when input is cleared (after send)
  useEffect(() => {
    if (input === '' && textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  }, [input]);

  // Generate contextual guidance based on current phase and context
  const getNextActionGuidance = useCallback((): string => {
    const ctx = conversationContext;

    switch (currentPhase) {
      case 'discovery':
        if (!ctx.projectIdea) return "Tell me about your project idea.";
        if (!ctx.targetUsers) return "Who are your target users?";
        if (!ctx.mainFeatures) return "What are the main features?";
        if (!ctx.competitors) return "Who are your competitors?";
        if (!ctx.differentiator) return "What makes you different?";
        return "Ready to generate DISCOVERY.xml!";
      case 'market-analysis':
        if (!ctx.marketSize) return "Let's analyze the market size.";
        if (!ctx.targetSegments) return "Define your target segments.";
        if (!ctx.competitiveLandscape) return "Map the competitive landscape.";
        return "Ready to move to specifications.";
      case 'specifications':
        if (!ctx.specificationsSummary) return "Let's create detailed specifications.";
        return "Review specs and approve, or ask for changes.";
      case 'design':
        if (!ctx.designChoice) return "Choose a design direction (A, B, or C).";
        return "Design system ready!";
      case 'architecture':
        if (!ctx.techStack) return "Let's define the tech stack.";
        return "Architecture ready for execution!";
      case 'execution':
        return "Build in progress. Monitor the execution panel.";
      default:
        return "Start by creating a new project.";
    }
  }, [currentPhase, conversationContext]);

  // Show contextual help for current phase
  const showContextualHelp = useCallback(() => {
    const helpText: Record<string, string> = {
      welcome: "Welcome! Start by creating a new project or opening an existing one.",
      discovery: "In Discovery, I'll ask you 5 questions to understand your project: idea, users, features, competitors, and differentiator.",
      'market-analysis': "Market Analysis helps validate your idea by researching market size, segments, and competition.",
      specifications: "Specifications turn your discovery into detailed requirements: user stories, functional specs, and data models.",
      design: "Design phase creates your visual identity: colors, typography, and component styles.",
      architecture: "Architecture defines your tech stack, project structure, and execution plan.",
      execution: "Execution is where Claude builds your project automatically based on the plan.",
    };

    addSystemMessage(
      `ℹ️ **Help: ${phaseDisplayInfo[currentPhase].label}**\n\n${helpText[currentPhase] || helpText.welcome}\n\n**Next step:** ${getNextActionGuidance()}`
    );
  }, [currentPhase, addSystemMessage, getNextActionGuidance]);

  // Safe content formatter using React elements instead of innerHTML
  const formatContent = (content: string): React.ReactNode => {
    // Split by newlines first
    const lines = content.split('\n');

    return lines.map((line, lineIdx) => {
      // Parse bold text within each line
      const parts: React.ReactNode[] = [];
      let lastIndex = 0;
      const boldRegex = /\*\*(.*?)\*\*/g;
      let match;

      while ((match = boldRegex.exec(line)) !== null) {
        // Add text before the match
        if (match.index > lastIndex) {
          parts.push(line.slice(lastIndex, match.index));
        }
        // Add bold text
        parts.push(<strong key={`bold-${lineIdx}-${match.index}`}>{match[1]}</strong>);
        lastIndex = match.index + match[0].length;
      }

      // Add remaining text
      if (lastIndex < line.length) {
        parts.push(line.slice(lastIndex));
      }

      // Return line with line break (except for last line)
      return (
        <span key={`line-${lineIdx}`}>
          {parts.length > 0 ? parts : line}
          {lineIdx < lines.length - 1 && <br />}
        </span>
      );
    });
  };

  return (
    <div
      className={`panel assistant-panel ${chatPanelOpen ? 'open' : ''} ${isResizing ? 'resizing' : ''}`}
      style={{ width: chatPanelOpen ? panelWidth : undefined }}
    >
      {/* Resize handle on left edge */}
      <div
        className="panel-resize-handle"
        onMouseDown={handleResizeStart}
        title="Drag to resize"
      />

      <div className="panel-header">
        <div className="panel-header-left">
          <span className="assistant-avatar">✨</span>
          <span className="panel-title">Assistant</span>
          {claudeRunning && <span className="status-badge running">Claude active</span>}
        </div>
        <div className="panel-header-right">
          <Button
            variant="ghost"
            size="sm"
            onClick={showContextualHelp}
            title="Get help"
          >
            ?
          </Button>
          <Button variant="ghost" size="sm" onClick={toggleChatPanel}>×</Button>
        </div>
      </div>

      {/* Phase indicator */}
      <div className="phase-indicator">
        <span className="phase-icon">{phaseDisplayInfo[currentPhase].icon}</span>
        <span className="phase-label">{phaseDisplayInfo[currentPhase].label}</span>
        {currentProject && <span className="phase-project">• {currentProject.name}</span>}
      </div>

      {/* Active skills and MCPs */}
      <ActiveContext />

      <div className="panel-content chat-messages">
        {messages.map((msg) => (
          <div key={msg.id} className={`chat-message ${msg.role}`}>
            <div className="chat-message-content">
              {formatContent(msg.content)}
            </div>
            {msg.actions && (
              <div className="chat-message-actions">
                {msg.actions.map((action, idx) => (
                  <Button
                    key={idx}
                    variant={action.variant || 'secondary'}
                    size="sm"
                    onClick={action.action}
                  >
                    {action.label}
                  </Button>
                ))}
              </div>
            )}
            <div className="chat-message-time">
              {msg.timestamp.toLocaleTimeString()}
              {msg.role === 'assistant' && msg.skill && (
                <span className="message-skill-tag">{msg.skill}</span>
              )}
            </div>
          </div>
        ))}

        {(isTyping || isQueryPending) && (
          <div className="chat-message assistant thinking">
            <div className="skill-indicator">
              <span className="skill-badge active">{activeSkills[0] || 'assistant'}</span>
              <span className="skill-status">is responding...</span>
            </div>
            <ThinkingIndicator />
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <div className="chat-input-container">
        <textarea
          ref={textareaRef}
          className="chat-input"
          placeholder={
            isQueryPending
              ? "Waiting for response..."
              : currentPhase === 'discovery' && !currentProject
              ? "Enter project name..."
              : currentPhase === 'discovery' && discoveryStep.current > 0
              ? "Your answer..."
              : "Type your message..."
          }
          value={input}
          onChange={handleInputChange}
          onKeyPress={handleKeyPress}
          disabled={isQueryPending}
        />
        <Button variant="primary" onClick={handleSend} disabled={isTyping || isQueryPending}>
          {isTyping || isQueryPending ? '...' : 'Send'}
        </Button>
      </div>
    </div>
  );
}
