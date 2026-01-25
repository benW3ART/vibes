# vibes - Technical Specification

**Version:** 1.0.0  
**Date:** 2026-01-25  
**Architect:** genius-architect v4.0  
**Status:** Ready for Implementation

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [Technology Stack](#2-technology-stack)
3. [Repository Structure](#3-repository-structure)
4. [Architecture Diagrams](#4-architecture-diagrams)
5. [Component Breakdown](#5-component-breakdown)
6. [Data Flow](#6-data-flow)
7. [State Management](#7-state-management)
8. [IPC Communication](#8-ipc-communication)
9. [Claude Code Integration](#9-claude-code-integration)
10. [Screen Specifications](#10-screen-specifications)
11. [Design System Implementation](#11-design-system-implementation)
12. [Demo Mode Architecture](#12-demo-mode-architecture)
13. [Build & Deployment](#13-build--deployment)
14. [Dependencies](#14-dependencies)

---

## 1. System Overview

### 1.1 What is vibes?

vibes is a Mac-native visual IDE that replaces the Claude Code terminal experience with a multi-agent orchestration cockpit. It provides real-time visibility into:

- Agent activity (Architect, Developer, QA, Deployer)
- Task execution with generated XML prompts
- Dependencies between tasks
- Live output streaming
- `.claude/` directory contents (plan, skills, MCP, memory)

### 1.2 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              vibes Application                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                     ELECTRON MAIN PROCESS                            │   │
│  │                                                                       │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌────────────┐  │   │
│  │  │   Claude    │  │    File     │  │    IPC      │  │   Window   │  │   │
│  │  │   Bridge    │  │   Watcher   │  │  Handlers   │  │  Manager   │  │   │
│  │  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └────────────┘  │   │
│  │         │                │                │                          │   │
│  │         └────────────────┴────────────────┘                          │   │
│  │                          │                                           │   │
│  │                    IPC Bridge                                        │   │
│  │                          │                                           │   │
│  └──────────────────────────┼───────────────────────────────────────────┘   │
│                             │                                               │
│  ┌──────────────────────────┼───────────────────────────────────────────┐   │
│  │                     ELECTRON RENDERER (React)                         │   │
│  │                          │                                            │   │
│  │  ┌───────────────────────┴────────────────────────────────────────┐  │   │
│  │  │                      React Application                          │  │   │
│  │  │                                                                 │  │   │
│  │  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌──────────┐ │  │   │
│  │  │  │ Stores  │ │  Hooks  │ │   UI    │ │ Screens │ │  Demo    │ │  │   │
│  │  │  │(Zustand)│ │         │ │Components│ │  (17)   │ │  Mode    │ │  │   │
│  │  │  └─────────┘ └─────────┘ └─────────┘ └─────────┘ └──────────┘ │  │   │
│  │  │                                                                 │  │   │
│  │  └─────────────────────────────────────────────────────────────────┘  │   │
│  │                                                                        │   │
│  └────────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
                                     │
                                     │ spawns
                                     ▼
                    ┌─────────────────────────────────┐
                    │       Claude Code CLI           │
                    │                                 │
                    │  stdin  ◄── commands            │
                    │  stdout ──► events (parsed)     │
                    │  stderr ──► errors              │
                    │                                 │
                    │  .claude/                       │
                    │  ├── plan.md                    │
                    │  ├── settings.json              │
                    │  ├── mcp.json                   │
                    │  ├── skills/                    │
                    │  └── memory/                    │
                    │                                 │
                    └─────────────────────────────────┘
```

---

## 2. Technology Stack

### 2.1 Core Stack

| Layer | Technology | Version | Purpose |
|-------|------------|---------|---------|
| **Runtime** | Electron | 28.x | Desktop app container |
| **UI Framework** | React | 18.x | Component-based UI |
| **Language** | TypeScript | 5.x | Type safety |
| **Bundler** | Vite | 5.x | Fast builds, HMR |
| **State** | Zustand | 4.x | Global state management |
| **Server State** | TanStack Query | 5.x | Async state, caching |
| **Styling** | CSS Modules + Variables | - | Scoped styles, design tokens |

### 2.2 Electron-Specific

| Component | Technology | Purpose |
|-----------|------------|---------|
| **Process Spawn** | Node.js child_process | Claude Code CLI management |
| **File Watching** | chokidar | Monitor .claude/ and src/ |
| **IPC** | Electron IPC | Main ↔ Renderer communication |
| **Build** | electron-builder | macOS DMG packaging |

### 2.3 Development Tools

| Tool | Purpose |
|------|---------|
| ESLint | Code linting |
| Prettier | Code formatting |
| TypeScript | Static type checking |
| Vitest | Unit testing |

---

## 3. Repository Structure

```
vibes/
│
├── electron/                          # Electron Main Process
│   ├── main.ts                        # App entry point, window creation
│   ├── preload.ts                     # Context bridge, expose IPC to renderer
│   │
│   ├── claude/                        # Claude Code Integration
│   │   ├── bridge.ts                  # ClaudeCodeBridge class (spawn, send, stop)
│   │   ├── parser.ts                  # parseClaudeOutput() - stdout → events
│   │   ├── watcher.ts                 # ClaudeFileWatcher (chokidar)
│   │   └── fileReader.ts              # Read .claude/ files
│   │
│   └── ipc/                           # IPC Handlers
│       ├── channels.ts                # Channel name constants
│       └── handlers.ts                # ipcMain.handle() registrations
│
├── src/                               # React Renderer Process
│   ├── main.tsx                       # React entry point
│   ├── App.tsx                        # Root component, layout composition
│   │
│   ├── components/
│   │   ├── layout/                    # App Shell
│   │   │   ├── Sidebar.tsx            # Navigation sidebar (240px)
│   │   │   ├── ProjectSelector.tsx    # Project dropdown
│   │   │   ├── ModeSelector.tsx       # Plan/Ask/Auto modes
│   │   │   ├── UserCard.tsx           # User info at bottom
│   │   │   ├── Header.tsx             # Screen title, actions
│   │   │   ├── MainContent.tsx        # Screen router
│   │   │   ├── AmbientOrbs.tsx        # Background decoration
│   │   │   └── index.ts
│   │   │
│   │   ├── global/                    # Always-Visible Components
│   │   │   ├── ExecutionBar.tsx       # Current task progress
│   │   │   ├── AgentActivityBar.tsx   # 4 agent status cards
│   │   │   ├── ChatPanel.tsx          # Slide-in chat (⌘J)
│   │   │   ├── XRayPanel.tsx          # Slide-in inspector (⌘I)
│   │   │   ├── QuickActions.tsx       # Context actions bar
│   │   │   ├── PanelOverlay.tsx       # Dark overlay when panel open
│   │   │   └── index.ts
│   │   │
│   │   ├── screens/                   # 17 Screens
│   │   │   ├── command/               # Command Center
│   │   │   │   ├── Dashboard.tsx      # Overview, stats, phases
│   │   │   │   ├── Execution.tsx      # Live output, task queue
│   │   │   │   ├── Tasks.tsx          # Task list + details
│   │   │   │   ├── Prompts.tsx        # Generated prompts
│   │   │   │   └── index.ts
│   │   │   │
│   │   │   ├── claude/                # .claude Integration
│   │   │   │   ├── Plan.tsx           # plan.md viewer
│   │   │   │   ├── Skills.tsx         # Skills grid
│   │   │   │   ├── MCP.tsx            # MCP servers
│   │   │   │   ├── Settings.tsx       # settings.json editor
│   │   │   │   ├── Memory.tsx         # Project memories
│   │   │   │   └── index.ts
│   │   │   │
│   │   │   ├── build/                 # Development
│   │   │   │   ├── Code.tsx           # IDE with context panel
│   │   │   │   ├── Debug.tsx          # Error list
│   │   │   │   ├── Tests.tsx          # Test results
│   │   │   │   └── index.ts
│   │   │   │
│   │   │   ├── ship/                  # Deployment
│   │   │   │   ├── Deploy.tsx         # Staging/Production
│   │   │   │   ├── Logs.tsx           # Live logs
│   │   │   │   ├── Analytics.tsx      # Metrics (placeholder)
│   │   │   │   └── index.ts
│   │   │   │
│   │   │   ├── system/                # Configuration
│   │   │   │   ├── Connections.tsx    # API connections
│   │   │   │   ├── Environment.tsx    # Env variables
│   │   │   │   └── index.ts
│   │   │   │
│   │   │   └── index.ts               # Re-export all screens
│   │   │
│   │   └── ui/                        # Design System Components
│   │       ├── Button.tsx             # Primary/Secondary/Ghost variants
│   │       ├── Card.tsx               # Glassmorphism card
│   │       ├── Badge.tsx              # Status badges
│   │       ├── Toggle.tsx             # Switch component
│   │       ├── ProgressBar.tsx        # Progress indicator
│   │       ├── NavItem.tsx            # Sidebar nav item
│   │       ├── TaskCard.tsx           # Task display card
│   │       ├── PromptCard.tsx         # XML prompt card
│   │       ├── ListItem.tsx           # Generic list item
│   │       ├── LiveOutput.tsx         # Terminal-style output
│   │       ├── StatusDot.tsx          # Animated status indicator
│   │       ├── AgentCard.tsx          # Agent status card
│   │       ├── PhaseCard.tsx          # Phase progress card
│   │       ├── SkillCard.tsx          # Skill display card
│   │       ├── ConnectionCard.tsx     # API connection card
│   │       ├── StatCard.tsx           # KPI display
│   │       ├── SectionTitle.tsx       # Section header
│   │       ├── EmptyState.tsx         # Empty placeholder
│   │       ├── Skeleton.tsx           # Loading placeholder
│   │       ├── Toast.tsx              # Notification toast
│   │       └── index.ts               # Export all
│   │
│   ├── stores/                        # Zustand State Stores
│   │   ├── navigationStore.ts         # Current screen, panels
│   │   ├── executionStore.ts          # Mode, running state, current task
│   │   ├── projectStore.ts            # Project, tasks, prompts, agents
│   │   ├── claudeStore.ts             # Output lines, connection state
│   │   ├── demoStore.ts               # Demo mode, tutorial state
│   │   ├── settingsStore.ts           # App settings
│   │   └── index.ts
│   │
│   ├── hooks/                         # Custom React Hooks
│   │   ├── useClaudeCode.ts           # Claude Code IPC wrapper
│   │   ├── useFileWatcher.ts          # File change subscription
│   │   ├── useKeyboardShortcuts.ts    # Global shortcuts
│   │   ├── usePlan.ts                 # Fetch plan.md
│   │   ├── useSkills.ts               # Fetch skills
│   │   ├── useMCP.ts                  # Fetch MCP config
│   │   ├── useMemory.ts               # Fetch memories
│   │   ├── useDemo.ts                 # Demo mode helper
│   │   ├── useToast.ts                # Toast notifications
│   │   └── index.ts
│   │
│   ├── services/                      # Business Logic
│   │   ├── taskParser.ts              # Parse tasks from plan
│   │   ├── promptGenerator.ts         # Generate XML prompts
│   │   └── planParser.ts              # Parse markdown plan
│   │
│   ├── demo/                          # Demo Mode
│   │   ├── mockData.ts                # Mock project, tasks, agents
│   │   ├── mockLiveOutput.ts          # Simulated output lines
│   │   ├── tutorialSteps.ts           # 6 tutorial steps
│   │   ├── DemoOverlay.tsx            # Welcome screen
│   │   ├── TutorialTooltip.tsx        # Step tooltip
│   │   ├── TutorialHighlight.tsx      # Spotlight effect
│   │   ├── DemoProvider.tsx           # Context provider
│   │   ├── LiveOutputSimulator.tsx    # Animated output
│   │   ├── DemoControls.tsx           # Exit/restart buttons
│   │   └── index.ts
│   │
│   ├── styles/                        # CSS
│   │   ├── variables.css              # Design tokens (colors, fonts, spacing)
│   │   ├── animations.css             # Keyframe animations
│   │   ├── globals.css                # Base styles, app layout
│   │   ├── sidebar.css                # Sidebar styles
│   │   ├── exec-bar.css               # Execution bar styles
│   │   ├── panels.css                 # Chat/X-Ray panels
│   │   ├── cards.css                  # Card variants
│   │   ├── buttons.css                # Button variants
│   │   ├── live-output.css            # Terminal output
│   │   └── index.css                  # Import all
│   │
│   ├── types/                         # TypeScript Types
│   │   ├── agent.ts                   # Agent, AgentType
│   │   ├── task.ts                    # Task, TaskStatus
│   │   ├── prompt.ts                  # Prompt
│   │   ├── claude.ts                  # ClaudeEvent, ClaudeConfig
│   │   ├── project.ts                 # Project, ProjectStatus
│   │   ├── skill.ts                   # Skill, MCP
│   │   ├── memory.ts                  # Memory
│   │   ├── navigation.ts              # ScreenId, NavSection
│   │   ├── execution.ts               # ExecutionMode, ExecutionState
│   │   ├── electron.d.ts              # Window.claude API types
│   │   └── index.ts                   # Re-export all
│   │
│   └── utils/                         # Utilities
│       ├── cn.ts                      # classNames helper (clsx)
│       └── format.ts                  # Formatting helpers
│
├── assets/                            # Static Assets
│   └── icon.png                       # App icon (512x512)
│
├── docs/                              # Documentation
│   └── TECHNICAL-SPEC.md              # This file
│
├── .claude/                           # Genius Team Artifacts
│   ├── DISCOVERY.xml
│   ├── SPECIFICATIONS.xml
│   ├── DESIGN-SYSTEM.xml
│   ├── ARCHITECTURE-DECISIONS.md
│   └── MICRO-PROMPTS.xml
│
├── index.html                         # HTML entry point
├── package.json                       # Dependencies, scripts
├── tsconfig.json                      # TypeScript config
├── vite.config.ts                     # Vite config with aliases
├── electron-builder.json              # Build config for macOS
├── .gitignore
├── README.md
└── CHANGELOG.md
```

**File Count Summary:**
- Electron (Main): 8 files
- React Components: 65 files
- Stores: 7 files
- Hooks: 10 files
- Styles: 10 files
- Types: 11 files
- Demo: 10 files
- Config: 6 files
- **Total: ~127 files**

---

## 4. Architecture Diagrams

### 4.1 Component Dependency Graph

```
                                    ┌─────────┐
                                    │  SETUP  │
                                    └────┬────┘
                                         │
                         ┌───────────────┼───────────────┐
                         │               │               │
                         ▼               ▼               ▼
                    ┌─────────┐    ┌─────────┐    ┌──────────┐
                    │  TYPES  │    │ STYLES  │    │ ELECTRON │
                    └────┬────┘    └────┬────┘    └────┬─────┘
                         │               │               │
                         │               │               │
         ┌───────────────┼───────────────┤               │
         │               │               │               │
         ▼               ▼               │               ▼
    ┌─────────┐    ┌─────────┐          │    ┌───────────────────┐
    │ STORES  │    │   UI    │◄─────────┘    │ CLAUDE-INTEGRATION│
    └────┬────┘    └────┬────┘               └─────────┬─────────┘
         │               │                             │
         │               │                             │
         └───────┬───────┴─────────────┬───────────────┘
                 │                     │
                 ▼                     ▼
            ┌─────────┐          ┌─────────┐
            │ LAYOUT  │          │  HOOKS  │
            └────┬────┘          └────┬────┘
                 │                     │
                 └──────────┬──────────┘
                            │
                            ▼
                    ┌───────────────┐
                    │    GLOBAL     │
                    │  COMPONENTS   │
                    └───────┬───────┘
                            │
        ┌───────────────────┼───────────────────┐
        │                   │                   │
        ▼                   ▼                   ▼
┌───────────────┐   ┌───────────────┐   ┌───────────────┐
│SCREENS-COMMAND│   │SCREENS-CLAUDE │   │ SCREENS-BUILD │
│SCREENS-SHIP   │   │SCREENS-SYSTEM │   │               │
└───────┬───────┘   └───────┬───────┘   └───────┬───────┘
        │                   │                   │
        └───────────────────┼───────────────────┘
                            │
                            ▼
                      ┌───────────┐
                      │   DEMO    │
                      └─────┬─────┘
                            │
                            ▼
                      ┌───────────┐
                      │  POLISH   │
                      └───────────┘
```

### 4.2 Parallel Execution Groups

```
Group 1: setup
    │
    ├── Group 2: types, styles (parallel)
    │
    ├── Group 3: ui, stores (parallel)
    │
    ├── Group 4: layout, electron (parallel)
    │
    ├── Group 5: global, claude-integration, hooks (parallel)
    │
    ├── Group 6: screens-command, screens-claude, screens-build (parallel)
    │
    ├── Group 7: screens-ship, screens-system (parallel)
    │
    ├── Group 8: demo
    │
    └── Group 9: polish
```

### 4.3 Data Flow

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           USER INTERACTION                               │
└───────────────────────────────────┬─────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                              REACT UI                                    │
│                                                                          │
│   ┌─────────────┐     ┌─────────────┐     ┌─────────────┐              │
│   │   Screens   │────▶│    Hooks    │────▶│   Stores    │              │
│   └─────────────┘     └──────┬──────┘     └──────┬──────┘              │
│                              │                    │                      │
│                              │   useClaudeCode    │  state updates       │
│                              │   usePlan, etc.    │                      │
└──────────────────────────────┼────────────────────┼─────────────────────┘
                               │                    │
                               ▼                    │
┌──────────────────────────────────────────────────┐│
│                    IPC BRIDGE                     ││
│                                                   ││
│   window.claude.spawn()                           ││
│   window.claude.send()                            ││
│   window.claude.onOutput()                        ││
│   window.claude.onFileChanged()                   ││
└───────────────────────────┬──────────────────────┘│
                            │                       │
                            ▼                       │
┌──────────────────────────────────────────────────┐│
│               ELECTRON MAIN PROCESS              ││
│                                                   ││
│   ┌─────────────┐     ┌─────────────┐           ││
│   │ClaudeCode   │     │  File       │           ││
│   │  Bridge     │     │  Watcher    │           ││
│   └──────┬──────┘     └──────┬──────┘           ││
│          │                   │                   ││
└──────────┼───────────────────┼───────────────────┘│
           │                   │                    │
           ▼                   ▼                    │
┌──────────────────┐  ┌──────────────────┐         │
│  Claude Code CLI │  │    .claude/      │◀────────┘
│                  │  │   Directory      │   file reads
│  stdin ◀── cmds  │  │                  │
│  stdout ──▶ evts │  │  plan.md         │
│                  │  │  settings.json   │
└──────────────────┘  │  skills/         │
                      │  memory/         │
                      └──────────────────┘
```

---

## 5. Component Breakdown

### 5.1 Electron Main Process

#### ClaudeCodeBridge (`electron/claude/bridge.ts`)

```typescript
class ClaudeCodeBridge {
  private process: ChildProcess | null = null;
  private callbacks: Map<string, Function[]> = new Map();

  spawn(projectPath: string): void
  send(command: string): void
  pause(): void
  resume(): void
  stop(): void
  onOutput(callback: (event: ClaudeEvent) => void): void
  onError(callback: (error: Error) => void): void
  onExit(callback: (code: number) => void): void
}
```

#### ClaudeFileWatcher (`electron/claude/watcher.ts`)

```typescript
class ClaudeFileWatcher {
  private watcher: FSWatcher | null = null;

  watch(projectPath: string): void
  stop(): void
  onFileChanged(callback: (event: FileChangeEvent) => void): void
}

interface FileChangeEvent {
  path: string;
  type: 'add' | 'change' | 'unlink';
  timestamp: number;
}
```

### 5.2 React Stores

#### navigationStore

```typescript
interface NavigationState {
  currentScreen: ScreenId;
  chatPanelOpen: boolean;
  xrayPanelOpen: boolean;
  
  setScreen: (screen: ScreenId) => void;
  toggleChatPanel: () => void;
  toggleXrayPanel: () => void;
  closePanels: () => void;
}
```

#### executionStore

```typescript
interface ExecutionState {
  mode: 'plan' | 'ask' | 'auto';
  neverStop: boolean;
  isRunning: boolean;
  isPaused: boolean;
  currentTask: Task | null;
  
  setMode: (mode: ExecutionMode) => void;
  setNeverStop: (value: boolean) => void;
  start: () => void;
  pause: () => void;
  resume: () => void;
  stop: () => void;
  setCurrentTask: (task: Task | null) => void;
}
```

#### projectStore

```typescript
interface ProjectState {
  project: Project | null;
  tasks: Task[];
  prompts: Prompt[];
  agents: Agent[];
  
  setProject: (project: Project) => void;
  setTasks: (tasks: Task[]) => void;
  addTask: (task: Task) => void;
  updateTask: (id: string, updates: Partial<Task>) => void;
  setPrompts: (prompts: Prompt[]) => void;
  setAgents: (agents: Agent[]) => void;
}
```

### 5.3 Core Types

```typescript
// Agent
type AgentType = 'architect' | 'developer' | 'qa' | 'deployer';
type AgentStatus = 'running' | 'waiting' | 'blocked' | 'idle';

interface Agent {
  id: string;
  type: AgentType;
  status: AgentStatus;
  currentTask: string | null;
  progress: number;
  dependencies: string[];
}

// Task
type TaskStatus = 'done' | 'running' | 'queued' | 'blocked';

interface Task {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  agent: AgentType;
  progress: number;
  dependencies: string[];
  acceptanceCriteria: string[];
  prompt: string;
  phase: string;
}

// Prompt
interface Prompt {
  id: string;
  taskId: string;
  agent: AgentType;
  objective: string;
  context: string;
  requirements: string[];
  depends: string[];
  output: string;
  status: 'running' | 'queued' | 'done';
}

// Claude Event
type ClaudeEvent =
  | { type: 'thinking'; content: string }
  | { type: 'reading'; file: string }
  | { type: 'writing'; file: string; lines: number }
  | { type: 'executing'; command: string }
  | { type: 'success'; message: string }
  | { type: 'error'; message: string }
  | { type: 'task_start'; taskId: string }
  | { type: 'task_complete'; taskId: string }
  | { type: 'agent_switch'; agent: AgentType };
```

---

## 6. Data Flow

### 6.1 Claude Code Output Flow

```
Claude Code CLI stdout
         │
         ▼
┌─────────────────────────────┐
│  parseClaudeOutput(line)    │  electron/claude/parser.ts
│                             │
│  Detect patterns:           │
│  "Thinking..." → thinking   │
│  "Reading" → reading        │
│  "Writing" → writing        │
│  "✓" → success              │
│  "Error" → error            │
└─────────────┬───────────────┘
              │
              ▼
┌─────────────────────────────┐
│  IPC: 'claude:output'       │
│                             │
│  Send event to renderer     │
└─────────────┬───────────────┘
              │
              ▼
┌─────────────────────────────┐
│  useClaudeCode hook         │  src/hooks/useClaudeCode.ts
│                             │
│  window.claude.onOutput()   │
└─────────────┬───────────────┘
              │
              ▼
┌─────────────────────────────┐
│  claudeStore.addLine()      │  src/stores/claudeStore.ts
│                             │
│  Update outputLines array   │
└─────────────┬───────────────┘
              │
              ▼
┌─────────────────────────────┐
│  LiveOutput component       │  src/components/ui/LiveOutput.tsx
│                             │
│  Render styled lines        │
│  Auto-scroll to bottom      │
└─────────────────────────────┘
```

### 6.2 File Change Flow

```
File system change (.claude/)
         │
         ▼
┌─────────────────────────────┐
│  chokidar watcher           │  electron/claude/watcher.ts
│                             │
│  Detect add/change/unlink   │
└─────────────┬───────────────┘
              │
              ▼
┌─────────────────────────────┐
│  IPC: 'file:changed'        │
│                             │
│  Send to renderer           │
└─────────────┬───────────────┘
              │
              ▼
┌─────────────────────────────┐
│  TanStack Query invalidate  │
│                             │
│  Refetch affected queries   │
│  (usePlan, useSkills, etc.) │
└─────────────────────────────┘
```

---

## 7. State Management

### 7.1 Store Responsibilities

| Store | Responsibility | Persistence |
|-------|---------------|-------------|
| `navigationStore` | Current screen, panel states | None |
| `executionStore` | Execution mode, running state | None |
| `projectStore` | Project data, tasks, prompts, agents | None |
| `claudeStore` | Output lines, connection state | None |
| `demoStore` | Demo mode, tutorial progress | localStorage |
| `settingsStore` | App settings | localStorage |

### 7.2 TanStack Query Usage

| Hook | Query Key | Data Source |
|------|-----------|-------------|
| `usePlan` | `['plan', projectPath]` | `.claude/plan.md` |
| `useSkills` | `['skills', projectPath]` | `.claude/skills/` |
| `useMCP` | `['mcp', projectPath]` | `.claude/mcp.json` |
| `useMemory` | `['memory', projectPath]` | `.claude/memory/` |

---

## 8. IPC Communication

### 8.1 Channel Names

```typescript
// electron/ipc/channels.ts

// Renderer → Main (invoke)
export const CLAUDE_SPAWN = 'claude:spawn';
export const CLAUDE_SEND = 'claude:send';
export const CLAUDE_PAUSE = 'claude:pause';
export const CLAUDE_RESUME = 'claude:resume';
export const CLAUDE_STOP = 'claude:stop';
export const FILE_READ = 'file:read';
export const FILE_WRITE = 'file:write';

// Main → Renderer (send)
export const CLAUDE_OUTPUT = 'claude:output';
export const CLAUDE_ERROR = 'claude:error';
export const CLAUDE_EXIT = 'claude:exit';
export const FILE_CHANGED = 'file:changed';
```

### 8.2 Preload API

```typescript
// electron/preload.ts

contextBridge.exposeInMainWorld('claude', {
  spawn: (projectPath: string) => ipcRenderer.invoke(CLAUDE_SPAWN, projectPath),
  send: (command: string) => ipcRenderer.invoke(CLAUDE_SEND, command),
  pause: () => ipcRenderer.invoke(CLAUDE_PAUSE),
  resume: () => ipcRenderer.invoke(CLAUDE_RESUME),
  stop: () => ipcRenderer.invoke(CLAUDE_STOP),
  
  onOutput: (callback: (event: ClaudeEvent) => void) => {
    ipcRenderer.on(CLAUDE_OUTPUT, (_, event) => callback(event));
  },
  onError: (callback: (error: string) => void) => {
    ipcRenderer.on(CLAUDE_ERROR, (_, error) => callback(error));
  },
  onExit: (callback: (code: number) => void) => {
    ipcRenderer.on(CLAUDE_EXIT, (_, code) => callback(code));
  },
  onFileChanged: (callback: (event: FileChangeEvent) => void) => {
    ipcRenderer.on(FILE_CHANGED, (_, event) => callback(event));
  },
});
```

---

## 9. Claude Code Integration

### 9.1 Process Lifecycle

```
┌─────────────────────────────────────────────────────────────┐
│                    CLAUDE CODE LIFECYCLE                     │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  1. SPAWN                                                   │
│     User clicks "Start" or opens project                    │
│     → ClaudeCodeBridge.spawn(projectPath)                   │
│     → child_process.spawn('claude', args)                   │
│                                                             │
│  2. RUNNING                                                 │
│     Listen to stdout/stderr                                 │
│     Parse events with parser.ts                             │
│     Send to renderer via IPC                                │
│                                                             │
│  3. COMMANDS                                                │
│     User sends command (via chat or action)                 │
│     → ClaudeCodeBridge.send(command)                        │
│     → process.stdin.write(command + '\n')                   │
│                                                             │
│  4. PAUSE/RESUME                                            │
│     Send SIGSTOP/SIGCONT to process                         │
│     Update UI state                                         │
│                                                             │
│  5. STOP                                                    │
│     → process.kill('SIGTERM')                               │
│     → Clean up listeners                                    │
│     → Update UI state                                       │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 9.2 Output Parsing Patterns

```typescript
// electron/claude/parser.ts

const patterns = {
  thinking: /^(Thinking|Analyzing|Processing)/i,
  reading: /^(Reading|Loading|Fetching)\s+(.+)/i,
  writing: /^(Writing|Creating|Updating)\s+(.+)/i,
  success: /^[✓✔]/,
  error: /^(Error|Failed|Exception)/i,
  executing: /^(Running|Executing)\s+(.+)/i,
  taskStart: /^Starting task:\s+(.+)/i,
  taskComplete: /^Completed task:\s+(.+)/i,
  agentSwitch: /^Switching to (architect|developer|qa|deployer)/i,
};
```

---

## 10. Screen Specifications

### 10.1 Screen Inventory

| Section | Screen | Components Used | Data Source |
|---------|--------|-----------------|-------------|
| **Command** | Dashboard | StatCard, AgentCard, PhaseCard | projectStore |
| | Execution | LiveOutput, TaskCard | claudeStore, projectStore |
| | Tasks | TaskCard, PromptCard | projectStore.tasks |
| | Prompts | PromptCard | projectStore.prompts |
| **.claude** | Plan | ProgressBar, markdown render | usePlan() |
| | Skills | SkillCard | useSkills() |
| | MCP | ListItem | useMCP() |
| | Settings | Toggle, inputs | settingsStore |
| | Memory | ListItem, Badge | useMemory() |
| **Build** | Code | File tree, editor, ContextPanel | projectStore |
| | Debug | ListItem (errors) | - |
| | Tests | ListItem, StatCard | - |
| **Ship** | Deploy | Card, ProgressBar | - |
| | Logs | LiveOutput variant | - |
| | Analytics | StatCard (placeholder) | - |
| **System** | Connections | ConnectionCard | - |
| | Environment | ListItem | - |

### 10.2 Screen Layouts

```
┌─────────────────────────────────────────────────────────────────────────┐
│ DASHBOARD                                                                │
├─────────────────────────────────────────────────────────────────────────┤
│ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐        │
│ │   Progress  │ │    Tasks    │ │   Running   │ │   Blocked   │        │
│ │     67%     │ │     12      │ │      3      │ │      1      │        │
│ └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘        │
│                                                                         │
│ AGENTS                                                                  │
│ ┌─────────────────────────────────────────────────────────────────────┐ │
│ │ 🏗️ Architect │ 💻 Developer │ 🧪 QA        │ 🚀 Deployer           │ │
│ │ Idle        │ T-007 42%    │ Waiting      │ Idle                   │ │
│ └─────────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│ PHASES                                                                  │
│ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐   │
│ │ 1. Setup     │ │ 2. Wallet    │ │ 3. Portfolio │ │ 4. Deploy    │   │
│ │ ████████ 100%│ │ ████░░░░ 60% │ │ ░░░░░░░░ 0%  │ │ ░░░░░░░░ 0%  │   │
│ └──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│ EXECUTION                                                                │
├─────────────────────────────────────────────────────────────────────────┤
│ ┌────────────────────────────────────────┐ ┌──────────────────────────┐ │
│ │ LIVE OUTPUT                            │ │ CURRENT TASK             │ │
│ │                                        │ │ T-007: usePortfolio hook │ │
│ │ 🤔 Analyzing requirements...           │ │ ████████░░░░░░ 42%       │ │
│ │ 📂 Reading src/hooks/useWallet.ts      │ │                          │ │
│ │ 📂 Reading src/config/chains.ts        │ │ TASK QUEUE               │ │
│ │ ✓ Dependencies resolved                │ │ ○ T-008 Component        │ │
│ │ 📝 Writing src/hooks/usePortfolio.ts   │ │ ○ T-009 Page             │ │
│ │ █                                      │ │ 🔒 T-010 (blocked)       │ │
│ │                                        │ │                          │ │
│ │                                        │ │ DEPENDENCIES             │ │
│ │                                        │ │ ✓ T-004 chains.ts        │ │
│ │                                        │ │ ✓ T-005 useWallet        │ │
│ │                                        │ │                          │ │
│ │                                        │ │ FILE CHANGES             │ │
│ │                                        │ │ + usePortfolio.ts        │ │
│ └────────────────────────────────────────┘ └──────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│ CODE                                                                     │
├─────────────────────────────────────────────────────────────────────────┤
│ ┌─────────┐ ┌──────────────────────────────────┐ ┌──────────────────┐  │
│ │ FILES   │ │ usePortfolio.ts                  │ │ CONTEXT          │  │
│ │         │ │                                  │ │                  │  │
│ │ 📁 src  │ │  1│ import { useQuery }          │ │ Current Task     │  │
│ │  📁hooks│ │  2│ import { useAccount }        │ │ T-007            │  │
│ │   📄use │ │  3│                              │ │ ████░░░░ 42%     │  │
│ │   📄use │ │▸ 4│ export function usePortfol   │ │                  │  │
│ │   📄use │ │▸ 5│   const { address } = use    │ │ Requirements     │  │
│ │  📁comp │ │▸ 6│                              │ │ ✓ TanStack Query │  │
│ │  📁page │ │  7│   return useQuery({          │ │ ✓ Multi-chain    │  │
│ │         │ │  8│     queryKey: ['portfolio    │ │ ○ Auto-refresh   │  │
│ │         │ │  9│     queryFn: async () => {   │ │ ○ Return total   │  │
│ │         │ │ 10│                              │ │                  │  │
│ │         │ │                                  │ │ Related Files    │  │
│ │         │ │                                  │ │ • chains.ts      │  │
│ │         │ │                                  │ │ • useWallet.ts   │  │
│ └─────────┘ └──────────────────────────────────┘ └──────────────────┘  │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 11. Design System Implementation

### 11.1 CSS Variables

```css
/* src/styles/variables.css */

:root {
  /* Brand Colors */
  --primary: #f97316;
  --secondary: #ec4899;
  --gradient: linear-gradient(135deg, #f97316, #ec4899);
  
  /* Background */
  --bg: #050508;
  --surface: rgba(255,255,255,0.02);
  --surface-solid: #0a0a0f;
  --surface-hover: rgba(255,255,255,0.05);
  --surface-active: rgba(255,255,255,0.08);
  
  /* Border */
  --border: rgba(255,255,255,0.06);
  --border-light: rgba(255,255,255,0.12);
  
  /* Text */
  --text: #ffffff;
  --text-muted: #a0a0a0;
  --text-dim: #505050;
  
  /* Status */
  --success: #22c55e;
  --warning: #f59e0b;
  --error: #ef4444;
  --info: #3b82f6;
  --purple: #a78bfa;
  
  /* Typography */
  --font-display: 'Space Grotesk', sans-serif;
  --font-body: 'Inter', sans-serif;
  --font-code: 'JetBrains Mono', monospace;
  
  /* Spacing */
  --radius: 12px;
  --radius-lg: 16px;
}
```

### 11.2 Animation Keyframes

```css
/* src/styles/animations.css */

@keyframes pulse {
  0%, 100% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.1); opacity: 0.8; }
}

@keyframes blink {
  50% { border-color: transparent; }
}

@keyframes screenIn {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes orbFloat {
  0%, 100% { transform: translate(0, 0); }
  50% { transform: translate(30px, -30px); }
}
```

---

## 12. Demo Mode Architecture

### 12.1 First Launch Detection

```typescript
// src/demo/DemoProvider.tsx

const isFirstLaunch = () => {
  return localStorage.getItem('vibes:demoCompleted') !== 'true';
};

const DemoProvider = ({ children }) => {
  const [showDemo, setShowDemo] = useState(isFirstLaunch());
  
  useEffect(() => {
    if (showDemo) {
      // Load mock data into stores
      projectStore.setProject(mockProject);
      projectStore.setTasks(mockTasks);
      projectStore.setAgents(mockAgents);
      projectStore.setPrompts(mockPrompts);
    }
  }, [showDemo]);
  
  // ...
};
```

### 12.2 Tutorial Steps

```typescript
// src/demo/tutorialSteps.ts

export const tutorialSteps = [
  {
    id: 1,
    title: 'Welcome to vibes',
    description: 'Your visual cockpit for Claude Code development',
    highlightElement: null,
    action: 'next',
  },
  {
    id: 2,
    title: 'Meet the Agents',
    description: 'Four AI agents work together on your project',
    highlightElement: '.agent-activity-bar',
    action: 'next',
  },
  {
    id: 3,
    title: 'Command Center',
    description: 'Monitor progress, tasks, and prompts',
    highlightElement: '.nav-section[data-section="command"]',
    action: 'navigate:dashboard',
  },
  // ... more steps
];
```

---

## 13. Build & Deployment

### 13.1 Scripts

```json
// package.json scripts

{
  "scripts": {
    "dev": "concurrently \"vite\" \"electron .\"",
    "build": "vite build && electron-builder",
    "preview": "vite preview",
    "lint": "eslint src electron",
    "test": "vitest",
    "typecheck": "tsc --noEmit"
  }
}
```

### 13.2 Electron Builder Config

```json
// electron-builder.json

{
  "appId": "com.vibes.ide",
  "productName": "vibes",
  "directories": {
    "output": "release"
  },
  "mac": {
    "category": "public.app-category.developer-tools",
    "target": ["dmg"],
    "icon": "assets/icon.png"
  },
  "files": [
    "dist/**/*",
    "dist-electron/**/*"
  ]
}
```

---

## 14. Dependencies

### 14.1 Production Dependencies

```json
{
  "react": "^18.2.0",
  "react-dom": "^18.2.0",
  "zustand": "^4.5.0",
  "@tanstack/react-query": "^5.0.0",
  "clsx": "^2.1.0",
  "date-fns": "^3.0.0",
  "chokidar": "^3.5.3"
}
```

### 14.2 Dev Dependencies

```json
{
  "typescript": "^5.3.0",
  "vite": "^5.0.0",
  "electron": "^28.0.0",
  "electron-builder": "^24.9.0",
  "@types/react": "^18.2.0",
  "@types/react-dom": "^18.2.0",
  "@types/node": "^20.10.0",
  "concurrently": "^8.2.0",
  "eslint": "^8.55.0",
  "vitest": "^1.0.0"
}
```

---

## Summary

vibes is a well-architected Electron + React application with:

- **127 files** organized in a feature-based structure
- **17 screens** covering the full development lifecycle
- **18 UI components** implementing the glassmorphism design system
- **6 Zustand stores** for state management
- **9 custom hooks** for data fetching and features
- **Full Claude Code integration** via process spawn and IPC
- **Demo mode** with interactive tutorial for onboarding

**Ready for micro-prompt execution via genius-orchestrator.**
