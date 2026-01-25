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
  const { chatPanelOpen, toggleChatPanel, setChatPanelOpen } = useNavigationStore();
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
        "👋 **Bienvenue sur vibes !**\n\nJe suis votre assistant IA et je vais vous guider à travers toutes les étapes de création de votre projet :\n\n1. 💡 **Discovery** - Comprendre votre idée\n2. 📋 **Specs** - Définir les fonctionnalités\n3. 🎨 **Design** - Créer l'identité visuelle\n4. 🏗️ **Architecture** - Planifier la technique\n5. ⚡ **Execution** - Construire le projet\n\nPour commencer, choisissez une option :",
        [
          { label: '+ Nouveau Projet', action: handleNewProject, variant: 'primary' },
          { label: '📂 Ouvrir Projet', action: handleOpenProject, variant: 'secondary' },
        ]
      );
    } else {
      // Has project - resume workflow
      addSystemMessage(
        `👋 **Bon retour !**\n\nVous travaillez sur **${currentProject.name}**\n\nPhase actuelle : ${phaseDisplayInfo[currentPhase].icon} **${phaseDisplayInfo[currentPhase].label}**`,
        [
          { label: 'Continuer', action: () => resumeWorkflow(), variant: 'primary' },
          { label: 'Recommencer', action: () => resetWorkflow(), variant: 'secondary' },
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
      "🚀 **Créons votre nouveau projet !**\n\nComment voulez-vous l'appeler ?\n\n*(Entrez un nom comme \"mon-super-projet\" ou \"SaaS-client\")*"
    );
  };

  const handleOpenProject = async () => {
    if (!window.electron) {
      addAssistantMessage(
        "⚠️ L'ouverture de projet nécessite l'app desktop.\n\nEn mode navigateur, vous pouvez créer un nouveau projet pour tester.",
        [{ label: '+ Nouveau Projet', action: handleNewProject, variant: 'primary' }]
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
        `📂 **Projet ouvert : ${projectName}**\n\nJe vais analyser la structure du projet...`,
        [
          { label: 'Commencer Discovery', action: () => startDiscovery(), variant: 'primary' },
          { label: 'Voir les fichiers', action: () => {}, variant: 'secondary' },
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
        `✅ **Projet "${name}" créé !** (mode démo)\n\nMaintenant, parlons de votre idée.\n\n**Question 1/5 : Décrivez votre projet en une phrase.**\n\n*Exemple : "Une app de gestion de tâches collaborative pour équipes distantes"*`
      );
      discoveryStep.current = 1;
      return;
    }

    // Electron mode - ask for directory
    addAssistantMessage(
      `📁 **Sélectionnez le dossier** où créer "${name}"\n\n*(Le projet sera créé dans un sous-dossier)*`,
      [{
        label: 'Choisir dossier',
        action: async () => {
          const basePath = await window.electron.dialog.openDirectory();
          if (basePath) {
            addAssistantMessage("⏳ Création du projet en cours...");

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
                `✅ **Projet "${name}" créé !**\n\n📁 ${result.path}\n\nStructure Genius Team initialisée :\n- .claude/ (config & skills)\n- .genius/ (état)\n- CLAUDE.md\n\nMaintenant, parlons de votre idée.\n\n**Question 1/5 : Décrivez votre projet en une phrase.**\n\n*Exemple : "Une app de gestion de tâches pour équipes distantes"*`
              );
              discoveryStep.current = 1;
            } else {
              addAssistantMessage(
                `❌ **Erreur** : ${result.error}\n\nVoulez-vous réessayer ?`,
                [{ label: 'Réessayer', action: () => createProject(name), variant: 'primary' }]
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
      "💡 **Phase Discovery**\n\nJe vais vous poser 5 questions pour bien comprendre votre projet.\n\n**Question 1/5 : Décrivez votre projet en une phrase.**\n\n*Exemple : \"Une marketplace de services freelance spécialisée tech\"*"
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
          `📝 Noté : "${answer.substring(0, 100)}${answer.length > 100 ? '...' : ''}"\n\n**Question 2/5 : Qui sont vos utilisateurs cibles ?**\n\n*Décrivez votre persona principal (âge, métier, besoins)*`
        );
        discoveryStep.current = 2;
        break;

      case 2:
        setConversationContext({ ...conversationContext, targetUsers: answer });
        addAssistantMessage(
          `👥 Utilisateurs identifiés !\n\n**Question 3/5 : Quelles sont les 3 fonctionnalités principales ?**\n\n*Listez les features MVP essentielles*`
        );
        discoveryStep.current = 3;
        break;

      case 3:
        setConversationContext({ ...conversationContext, mainFeatures: answer });
        addAssistantMessage(
          `✨ Fonctionnalités notées !\n\n**Question 4/5 : Avez-vous des concurrents directs ?**\n\n*Nommez 2-3 solutions similaires si elles existent*`
        );
        discoveryStep.current = 4;
        break;

      case 4:
        setConversationContext({ ...conversationContext, competitors: answer });
        addAssistantMessage(
          `🎯 Analyse concurrentielle notée !\n\n**Question 5/5 : Quel est votre différenciateur principal ?**\n\n*Qu'est-ce qui rend votre solution unique ?*`
        );
        discoveryStep.current = 5;
        break;

      case 5:
        setConversationContext({ ...conversationContext, differentiator: answer });

        // Discovery complete - generate DISCOVERY.xml
        addAssistantMessage(
          `🎉 **Discovery complète !**\n\nJe vais maintenant générer le fichier DISCOVERY.xml avec toutes ces informations.\n\n⏳ Génération en cours...`
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
            `✅ **DISCOVERY.xml généré !**\n\n📁 ${discoveryResult.path}\n\nRésumé :\n- 💡 Idée : ${conversationContext.projectIdea?.substring(0, 50)}...\n- 👥 Cible : Définie\n- ⚡ Features : Identifiées\n- 🎯 Différenciateur : Clair\n\n**Prochaine étape : Spécifications**`,
            [
              { label: 'Générer Specs', action: () => startSpecifications(), variant: 'primary' },
              { label: 'Modifier Discovery', action: () => { discoveryStep.current = 1; }, variant: 'secondary' },
            ]
          );
        } else {
          addAssistantMessage(
            `❌ Erreur lors de la génération de DISCOVERY.xml.\n\nVoulez-vous réessayer ?`,
            [{ label: 'Réessayer', action: () => handleDiscoveryAnswer(answer), variant: 'primary' }]
          );
        }
        break;
    }
  };

  const startSpecifications = async () => {
    setPhase('specifications');
    addAssistantMessage(
      `📋 **Phase Spécifications**\n\nJe génère les specs basées sur votre discovery...\n\n⏳ Création des user stories et critères d'acceptation...`
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
        `✅ **SPECIFICATIONS.xml généré !**\n\n📁 ${specsResult.path}\n\nContenu :\n- 📖 User Stories générées\n- ✓ Critères d'acceptation\n- 📊 Modèle de données\n\n**Voulez-vous valider ces specs ?**`,
        [
          { label: '✓ Approuver', action: () => approveSpecs(specsResult.path), variant: 'primary' },
          { label: 'Voir fichier', action: () => viewFile(specsResult.path), variant: 'secondary' },
        ]
      );
    } else {
      addAssistantMessage(
        `❌ Erreur lors de la génération des specs.\n\nVoulez-vous réessayer ?`,
        [{ label: 'Réessayer', action: () => startSpecifications(), variant: 'primary' }]
      );
    }
  };

  const viewFile = async (filePath: string) => {
    if (window.electron) {
      try {
        const content = await window.electron.file.read(filePath);
        addAssistantMessage(`📄 **Contenu de ${filePath.split('/').pop()}:**\n\n\`\`\`xml\n${content.substring(0, 1000)}${content.length > 1000 ? '\n...(tronqué)' : ''}\n\`\`\``);
      } catch {
        addAssistantMessage(`❌ Impossible de lire le fichier.`);
      }
    } else {
      addAssistantMessage(`📄 Fichier disponible à : ${filePath}`);
    }
  };

  const approveSpecs = (specsPath: string) => {
    completePhase('specifications', specsPath);
    addAssistantMessage(
      `✅ **Specs approuvées !**\n\n**Prochaine étape : Design System**\n\nJe vais créer 3 options de design avec :\n- Palette de couleurs\n- Typographie\n- Composants UI\n\nPrêt à voir les designs ?`,
      [
        { label: '🎨 Voir les options', action: () => startDesign(specsPath), variant: 'primary' },
      ]
    );
  };

  const startDesign = async (specsPath: string) => {
    setPhase('design');
    addAssistantMessage(
      `🎨 **Phase Design**\n\nVoici 3 options de design pour votre projet :\n\n**Option A - "Minimal"**\n🎨 Noir/Blanc, épuré, moderne\n- Primary: #000000\n- Background: #FFFFFF\n\n**Option B - "Vibrant"**\n🌈 Couleurs vives, énergique\n- Primary: #FF6B35\n- Background: #1A1A2E\n\n**Option C - "Professional"**\n💼 Bleu/Gris, corporate, fiable\n- Primary: #2563EB\n- Background: #F8FAFC\n\n**Quelle option préférez-vous ?**`,
      [
        { label: 'Option A', action: () => chooseDesign('A', specsPath), variant: 'secondary' },
        { label: 'Option B', action: () => chooseDesign('B', specsPath), variant: 'secondary' },
        { label: 'Option C', action: () => chooseDesign('C', specsPath), variant: 'primary' },
      ]
    );
  };

  const chooseDesign = async (option: 'A' | 'B' | 'C', specsPath: string) => {
    addAssistantMessage(`⏳ Génération du design system avec l'option ${option}...`);

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
        `✅ **Option ${option} sélectionnée !**\n\n📁 ${designResult.path}\n\n**Prochaine étape : Architecture Technique**\n\nJe vais analyser vos specs et générer :\n- ARCHITECTURE.md (décisions techniques)\n- .claude/plan.md (tâches d'exécution)`,
        [
          { label: '🏗️ Générer Architecture', action: () => startArchitecture(specsPath, designResult.path), variant: 'primary' },
        ]
      );
    } else {
      addAssistantMessage(
        `❌ Erreur lors de la génération du design.\n\nVoulez-vous réessayer ?`,
        [{ label: 'Réessayer', action: () => chooseDesign(option, specsPath), variant: 'primary' }]
      );
    }
  };

  const startArchitecture = async (specsPath: string, designPath: string) => {
    setPhase('architecture');
    addAssistantMessage(
      `🏗️ **Phase Architecture**\n\nAnalyse des requirements et génération du plan technique...\n\n⏳ Création de ARCHITECTURE.md et plan.md...`
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
        `✅ **Architecture générée !**\n\n📁 Fichiers créés :\n- ${archResult.paths[0]}\n- ${archResult.paths[1]}\n\n**Stack recommandée :**\n- ⚛️ Next.js 14 (App Router)\n- 🗄️ Supabase (Auth + DB)\n- 🎨 Tailwind CSS\n- 📦 TypeScript\n\n**Plan d'exécution :**\n- ${taskCount} tâches identifiées\n\n**Prêt à lancer la construction ?**`,
        [
          { label: '⚡ Lancer Build', action: () => startExecution(), variant: 'primary' },
          { label: 'Voir le plan', action: () => viewFile(archResult.paths[1]), variant: 'secondary' },
        ]
      );
    } else {
      addAssistantMessage(
        `❌ Erreur lors de la génération de l'architecture.\n\nVoulez-vous réessayer ?`,
        [{ label: 'Réessayer', action: () => startArchitecture(specsPath, designPath), variant: 'primary' }]
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
        `⚠️ **Claude non connecté**\n\nPour lancer la construction, vous devez d'abord connecter Claude.\n\nAllez dans **Connections** pour configurer Claude.`,
        [
          { label: 'Configurer Claude', action: navigateToConnections, variant: 'primary' },
        ]
      );
      return;
    }

    addAssistantMessage(
      `⚡ **Phase Execution**\n\n🚀 Lancement de Claude Code...\n\nJe vais maintenant construire votre projet automatiquement. Vous pouvez suivre la progression en temps réel.`
    );

    // Start Claude
    const started = await claudeService.start();
    if (started) {
      // Send the build command
      await claudeService.send('/continue');

      addAssistantMessage(
        `✅ **Claude lancé !**\n\nConstruction en cours...\n\n📊 Suivez la progression dans le panneau Execution.`
      );
    } else {
      addAssistantMessage(
        `❌ **Erreur de lancement**\n\nImpossible de démarrer Claude. Vérifiez que Claude Code CLI est installé.`,
        [
          { label: 'Réessayer', action: () => startExecution(), variant: 'primary' },
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

  const formatContent = (content: string) => {
    return content
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\n/g, '<br/>');
  };

  return (
    <div className={`panel assistant-panel ${chatPanelOpen ? 'open' : ''}`}>
      <div className="panel-header">
        <div className="panel-header-left">
          <span className="assistant-avatar">✨</span>
          <span className="panel-title">Assistant</span>
          {claudeRunning && <span className="status-badge running">Claude actif</span>}
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
            <div
              className="chat-message-content"
              dangerouslySetInnerHTML={{ __html: formatContent(msg.content) }}
            />
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
              ? "Entrez le nom du projet..."
              : currentPhase === 'discovery' && discoveryStep.current > 0
              ? "Votre réponse..."
              : "Écrivez votre message..."
          }
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={handleKeyPress}
          rows={2}
        />
        <Button variant="primary" onClick={handleSend} disabled={isTyping}>
          {isTyping ? '...' : 'Envoyer'}
        </Button>
      </div>
    </div>
  );
}
