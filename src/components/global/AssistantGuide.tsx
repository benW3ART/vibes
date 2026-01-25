import { useState, useRef, useEffect, useCallback, type KeyboardEvent } from 'react';
import { useNavigationStore, useProjectStore, useWorkflowStore, phaseDisplayInfo, useConnectionsStore } from '@/stores';
import { claudeService, fileGenerationService, type ClaudeMessage, type DiscoveryContext } from '@/services';
import { Button } from '@/components/ui';

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
  const { currentProject, setCurrentProject } = useProjectStore();
  const { currentPhase, setPhase, completePhase, setConversationContext, conversationContext } = useWorkflowStore();
  const { isClaudeConnected } = useConnectionsStore();

  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [claudeRunning, setClaudeRunning] = useState(false);
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

  // Initialize with welcome message
  useEffect(() => {
    if (hasInitialized.current) return;
    hasInitialized.current = true;

    // Auto-open panel on start
    setChatPanelOpen(true);

    if (!currentProject) {
      // No project - show welcome
      addSystemMessage(
        "👋 **Welcome to vibes!**\n\nI'm your AI assistant and I'll guide you through all the stages of creating your project:\n\n1. 💡 **Discovery** - Understand your idea\n2. 📋 **Specs** - Define the features\n3. 🎨 **Design** - Create the visual identity\n4. 🏗️ **Architecture** - Plan the technical stack\n5. ⚡ **Execution** - Build the project\n\nTo get started, choose an option:",
        [
          { label: '+ New Project', action: handleNewProject, variant: 'primary' },
          { label: '📂 Open Project', action: handleOpenProject, variant: 'secondary' },
        ]
      );
    } else {
      // Has project - resume workflow
      addSystemMessage(
        `👋 **Welcome back!**\n\nYou're working on **${currentProject.name}**\n\nCurrent phase: ${phaseDisplayInfo[currentPhase].icon} **${phaseDisplayInfo[currentPhase].label}**`,
        [
          { label: 'Continue', action: () => resumeWorkflow(), variant: 'primary' },
          { label: 'Start Over', action: () => resetWorkflow(), variant: 'secondary' },
        ]
      );
    }
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

  const addAssistantMessage = useCallback((content: string, actions?: DisplayMessage['actions']) => {
    setIsTyping(true);
    setTimeout(() => {
      const msg: DisplayMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content,
        timestamp: new Date(),
        actions,
      };
      setMessages(prev => [...prev, msg]);
      setIsTyping(false);
    }, 500);
  }, []);

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
      setCurrentProject(project);

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
      setCurrentProject(project);
      await claudeService.init(project.path);

      addAssistantMessage(
        `✅ **Project "${name}" created!** (demo mode)\n\nNow, let's talk about your idea.\n\n**Question 1/5: Describe your project in one sentence.**\n\n*Example: "A collaborative task management app for remote teams"*`
      );
      discoveryStep.current = 1;
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
              setCurrentProject(project);
              await claudeService.init(result.path);

              addAssistantMessage(
                `✅ **Project "${name}" created!**\n\n📁 ${result.path}\n\nGenius Team structure initialized:\n- .claude/ (config & skills)\n- .genius/ (state)\n- CLAUDE.md\n\nNow, let's talk about your idea.\n\n**Question 1/5: Describe your project in one sentence.**\n\n*Example: "A task management app for remote teams"*`
              );
              discoveryStep.current = 1;
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

  const startDiscovery = () => {
    setPhase('discovery');
    discoveryStep.current = 1;
    addAssistantMessage(
      "💡 **Discovery Phase**\n\nI'll ask you 5 questions to better understand your project.\n\n**Question 1/5: Describe your project in one sentence.**\n\n*Example: \"A tech-focused freelance services marketplace\"*"
    );
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

  const navigateToConnections = () => {
    const { setScreen } = useNavigationStore.getState();
    setScreen('connections');
    toggleChatPanel();
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

  const handleSend = () => {
    if (!input.trim()) return;

    const userInput = input.trim();
    addUserMessage(userInput);
    setInput('');

    // Handle based on current phase
    if (currentPhase === 'discovery') {
      if (!currentProject && discoveryStep.current === 0) {
        // User is providing project name
        createProject(userInput);
      } else if (discoveryStep.current > 0) {
        // User is answering discovery questions
        handleDiscoveryAnswer(userInput);
      }
    } else {
      // For other phases, send to Claude service
      setIsTyping(true);
      claudeService.send(userInput);
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

        {isTyping && (
          <div className="chat-message assistant typing">
            <div className="typing-indicator">
              <span></span>
              <span></span>
              <span></span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <div className="chat-input-container">
        <textarea
          className="chat-input"
          placeholder={
            currentPhase === 'discovery' && !currentProject
              ? "Enter project name..."
              : currentPhase === 'discovery' && discoveryStep.current > 0
              ? "Your answer..."
              : "Type your message..."
          }
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={handleKeyPress}
          rows={2}
        />
        <Button variant="primary" onClick={handleSend} disabled={isTyping}>
          {isTyping ? '...' : 'Send'}
        </Button>
      </div>
    </div>
  );
}
