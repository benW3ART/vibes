import { useState, useRef, useEffect, useCallback, type KeyboardEvent } from 'react';
import { useNavigationStore, useProjectStore, useWorkflowStore, phaseDisplayInfo, useConnectionsStore } from '@/stores';
import { claudeService, fileGenerationService, aiWorkflowService, type ClaudeMessage, type DiscoveryContext } from '@/services';
import { Button, ThinkingIndicator } from '@/components/ui';

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
}

export function AssistantGuide() {
  const { chatPanelOpen, toggleChatPanel, setChatPanelOpen, toggleXrayPanel } = useNavigationStore();
  const { currentProject, openProject } = useProjectStore();
  const { currentPhase, setPhase, completePhase, setConversationContext, conversationContext } = useWorkflowStore();
  const { isClaudeConnected, isGitHubConnected, getGitHubToken } = useConnectionsStore();

  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [claudeRunning, setClaudeRunning] = useState(false);
  const [isAIMode, setIsAIMode] = useState(false);
  const [isQueryPending, setIsQueryPending] = useState(false); // Disable input during query
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const hasInitialized = useRef(false);
  const discoveryStep = useRef(0);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

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

  // Initialize with welcome message and check AI availability
  useEffect(() => {
    if (hasInitialized.current) return;
    hasInitialized.current = true;

    // Auto-open panel on start
    setChatPanelOpen(true);

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
        // Has project - resume workflow
        addSystemMessage(
          `👋 **Welcome back!**\n\nYou're working on **${currentProject.name}**\n\nCurrent phase: ${phaseDisplayInfo[currentPhase].icon} **${phaseDisplayInfo[currentPhase].label}**${aiStatus}`,
          [
            { label: 'Continue', action: () => resumeWorkflow(), variant: 'primary' },
            { label: 'Start Over', action: () => resetWorkflow(), variant: 'secondary' },
          ]
        );
      }
    };

    checkAIAvailability();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- Callbacks are stable, only re-run when project/phase changes
  }, [currentProject, currentPhase, setChatPanelOpen]);

  const addSystemMessage = useCallback((content: string, actions?: DisplayMessage['actions']) => {
    const msg: DisplayMessage = {
      id: `system-${Date.now()}`,
      role: 'system',
      content,
      timestamp: new Date(),
      actions,
    };
    setMessages(prev => [...prev, msg]);
  }, []);

  const addAssistantMessage = useCallback((content: string, actions?: DisplayMessage['actions'], _immediate = false) => {
    // Add message immediately - no fake delays
    const msg: DisplayMessage = {
      id: `assistant-${Date.now()}`,
      role: 'assistant',
      content,
      timestamp: new Date(),
      actions,
    };
    setMessages(prev => [...prev, msg]);
    setIsTyping(false);
  }, []);

  // Start a streaming message and return the ID
  const startStreamingMessage = useCallback(() => {
    const id = `assistant-${Date.now()}`;
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

    try {
      const response = await aiWorkflowService.sendMessage(message, {
        onStart: () => {
          setIsTyping(false);
        },
        onChunk: (chunk) => {
          fullResponse += chunk;
          updateStreamingMessage(msgId, fullResponse);
        },
        onComplete: (resp) => {
          setIsQueryPending(false);
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
          // Don't show cancellation as error
          if (error.includes('cancelled') || error.includes('canceled')) {
            setMessages(prev => prev.filter(m => m.id !== msgId));
          } else {
            updateStreamingMessage(msgId, `❌ Error: ${error}`);
            completeStreamingMessage(msgId);
          }
        },
      });
      return response;
    } catch (error) {
      setIsQueryPending(false);
      // Remove the streaming message on error
      setMessages(prev => prev.filter(m => m.id !== msgId));
      throw error;
    }
  }, [isQueryPending, startStreamingMessage, updateStreamingMessage, completeStreamingMessage]);

  const addUserMessage = useCallback((content: string) => {
    const msg: DisplayMessage = {
      id: `user-${Date.now()}`,
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
        id: Date.now().toString(),
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
      const project = {
        id: Date.now().toString(),
        name,
        path: `/demo/projects/${name}`,
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
                id: Date.now().toString(),
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
    discoveryStep.current = 1;

    aiWorkflowService.init(project.path);
    aiWorkflowService.startPhase('discovery', { projectName: project.name || 'Project' });

    if (isAIMode) {
      // AI mode - let Claude drive the conversation
      addAssistantMessage("💡 **Discovery Phase**\n\nLet me help you define your project...", undefined, true);
      sendToAI("Help me discover and define this project. Start by asking about the main project idea.");
    } else {
      // Guided mode - use templates
      addAssistantMessage(
        "💡 **Discovery Phase**\n\nI'll ask you 5 questions to better understand your project.\n\n**Question 1/5: Describe your project in one sentence.**\n\n*Example: \"A tech-focused freelance services marketplace\"*"
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
        addAssistantMessage(
          `📝 Noted: "${answer.substring(0, 100)}${answer.length > 100 ? '...' : ''}"\n\n**Question 2/5: Who are your target users?**\n\n*Describe your main persona (age, job, needs)*`
        );
        discoveryStep.current = 2;
        break;

      case 2:
        setConversationContext({ ...conversationContext, targetUsers: answer });
        addAssistantMessage(
          `👥 Users identified!\n\n**Question 3/5: What are the 3 main features?**\n\n*List the essential MVP features*`
        );
        discoveryStep.current = 3;
        break;

      case 3:
        setConversationContext({ ...conversationContext, mainFeatures: answer });
        addAssistantMessage(
          `✨ Features noted!\n\n**Question 4/5: Do you have direct competitors?**\n\n*Name 2-3 similar solutions if they exist*`
        );
        discoveryStep.current = 4;
        break;

      case 4:
        setConversationContext({ ...conversationContext, competitors: answer });
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
    setPhase('architecture');
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
    setPhase('execution');

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
        handleNewProject();
        break;
      case 'discovery':
        startDiscovery();
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
        addAssistantMessage("Je suis prêt à vous aider. Que voulez-vous faire ?");
    }
  };

  const resetWorkflow = () => {
    setPhase('welcome');
    discoveryStep.current = 0;
    setMessages([]);
    hasInitialized.current = false;
  };

  const handleSend = async () => {
    if (!input.trim() || isQueryPending) return;

    const userInput = input.trim();
    addUserMessage(userInput);
    setInput('');

    // Handle based on current phase
    if (currentPhase === 'discovery') {
      if (!currentProject && discoveryStep.current === 0) {
        // User is providing project name
        createProject(userInput);
      } else if (discoveryStep.current > 0) {
        if (isAIMode) {
          // AI mode - send to Claude for natural conversation
          await handleAIDiscovery(userInput);
        } else {
          // Guided mode - use template responses
          handleDiscoveryAnswer(userInput);
        }
      }
    } else if (isAIMode && ['specifications', 'design', 'architecture'].includes(currentPhase)) {
      // AI mode for other phases
      await sendToAI(userInput);
    } else {
      // For execution and other phases, send to Claude service
      setIsTyping(true);
      claudeService.send(userInput);
    }
  };

  // Handle AI-driven discovery conversation
  const handleAIDiscovery = async (userInput: string) => {
    // Track what information we've gathered
    const step = discoveryStep.current;

    // Update context based on step
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
    setPhase('specifications');
    // Convert conversation context to simple key-value pairs
    const contextForAI: Record<string, string> = {
      projectName: currentProject?.name || 'Project',
      projectIdea: conversationContext.projectIdea || '',
      targetUsers: conversationContext.targetUsers || '',
      mainFeatures: conversationContext.mainFeatures || '',
      competitors: conversationContext.competitors || '',
      differentiator: conversationContext.differentiator || '',
    };
    aiWorkflowService.startPhase('specifications', contextForAI);

    if (isAIMode) {
      addAssistantMessage("📋 **Specifications Phase**\n\nLet me analyze your discovery and create detailed specifications...", undefined, true);
      await sendToAI("Based on the discovery we just completed, help me create specifications. What user stories and requirements should we define?");
    } else {
      startSpecifications();
    }
  };

  const handleKeyPress = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

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
    <div className={`panel assistant-panel ${chatPanelOpen ? 'open' : ''}`}>
      <div className="panel-header">
        <div className="panel-header-left">
          <span className="assistant-avatar">✨</span>
          <span className="panel-title">Assistant</span>
          {claudeRunning && <span className="status-badge running">Claude active</span>}
        </div>
        <Button variant="ghost" size="sm" onClick={toggleChatPanel}>×</Button>
      </div>

      {/* Phase indicator */}
      <div className="phase-indicator">
        <span className="phase-icon">{phaseDisplayInfo[currentPhase].icon}</span>
        <span className="phase-label">{phaseDisplayInfo[currentPhase].label}</span>
        {currentProject && <span className="phase-project">• {currentProject.name}</span>}
      </div>

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
            </div>
          </div>
        ))}

        {(isTyping || isQueryPending) && (
          <div className="chat-message assistant thinking">
            <ThinkingIndicator />
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <div className="chat-input-container">
        <textarea
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
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={handleKeyPress}
          rows={2}
          disabled={isQueryPending}
        />
        <Button variant="primary" onClick={handleSend} disabled={isTyping || isQueryPending}>
          {isTyping || isQueryPending ? '...' : 'Send'}
        </Button>
      </div>
    </div>
  );
}
