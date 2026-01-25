# vibes - Architecture Decisions Record (ADR)

**Project:** vibes - Visual IDE for Claude Code  
**Date:** 2026-01-25  
**Architect:** genius-architect v4.0

---

## ADR-001: Technology Stack

### Decision: Electron + React + TypeScript

### Context
vibes est un IDE Mac natif qui doit :
- Spawner et communiquer avec Claude Code CLI
- Afficher des interfaces complexes avec animations
- Lire/écrire des fichiers locaux
- Être développé rapidement par Claude Code

### Options Considered

| Option | Claude Code Experience | Dev Speed | Performance | Ecosystem |
|--------|----------------------|-----------|-------------|-----------|
| **Electron + React** | ⭐⭐⭐⭐⭐ Excellent | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| Tauri + React | ⭐⭐⭐ Good | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ |
| Swift/SwiftUI | ⭐⭐ Limited | ⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐ |

### Decision
**Electron + React + TypeScript** because:
1. Claude Code has extensive experience with this stack (millions of examples)
2. Direct reuse of CSS from v8 mockup
3. Native Node.js integration for spawning Claude Code CLI
4. Massive ecosystem for UI components
5. Faster debugging and iteration

### Consequences
- App size ~150-200MB (acceptable for desktop IDE)
- Higher RAM usage than Tauri (mitigated by careful optimization)
- Excellent developer experience and tooling

---

## ADR-002: State Management

### Decision: Zustand + TanStack Query

### Rationale
- **Zustand**: Global app state (agents, tasks, execution mode, navigation)
- **TanStack Query**: Server state (file contents, .claude/ data with caching)
- **React useState**: Local UI state (panel open/close, form inputs)

### Store Structure
```typescript
// stores/executionStore.ts
interface ExecutionStore {
  mode: 'plan' | 'ask' | 'auto';
  neverStop: boolean;
  currentTask: Task | null;
  agents: Agent[];
  isRunning: boolean;
}

// stores/navigationStore.ts
interface NavigationStore {
  currentScreen: ScreenId;
  chatPanelOpen: boolean;
  xrayPanelOpen: boolean;
}

// stores/projectStore.ts
interface ProjectStore {
  name: string;
  path: string;
  status: 'running' | 'paused' | 'idle';
  tasks: Task[];
  prompts: Prompt[];
}
```

---

## ADR-003: Claude Code Integration

### Decision: Process Spawn + stdout Parsing + File Watching

### Architecture
```
┌─────────────────────────────────────────────────────────────┐
│  Electron Main Process                                      │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  ClaudeCodeBridge                                    │   │
│  │  ├── spawn(): Start claude process                   │   │
│  │  ├── send(command): Write to stdin                   │   │
│  │  ├── onOutput(callback): Parse stdout events         │   │
│  │  ├── pause(): Send pause signal                      │   │
│  │  ├── resume(): Send resume signal                    │   │
│  │  └── stop(): Kill process                            │   │
│  └─────────────────────────────────────────────────────┘   │
│                           │                                 │
│                           ▼                                 │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  ClaudeFileWatcher                                   │   │
│  │  ├── watch('.claude/'): Monitor config changes       │   │
│  │  ├── watch('src/'): Monitor code changes             │   │
│  │  └── emit events to renderer                         │   │
│  └─────────────────────────────────────────────────────┘   │
│                           │                                 │
│                    IPC Bridge                               │
│                           │                                 │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Renderer Process (React)                            │   │
│  │  ├── useClaudeCode() hook                            │   │
│  │  ├── useFileWatcher() hook                           │   │
│  │  └── Zustand stores                                  │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### Output Event Types (parsed from stdout)
```typescript
type ClaudeEvent = 
  | { type: 'thinking'; content: string }
  | { type: 'reading'; file: string }
  | { type: 'writing'; file: string; lines: number }
  | { type: 'executing'; command: string }
  | { type: 'success'; message: string }
  | { type: 'error'; message: string }
  | { type: 'task_start'; taskId: string }
  | { type: 'task_complete'; taskId: string }
  | { type: 'agent_switch'; agent: AgentType }
```

---

## ADR-004: Project Structure

### Decision: Feature-based organization

```
vibes/
├── electron/                    # Electron main process
│   ├── main.ts                  # Entry point
│   ├── preload.ts               # Preload script (IPC bridge)
│   ├── claude/                  # Claude Code integration
│   │   ├── bridge.ts            # Process management
│   │   ├── parser.ts            # Output parser
│   │   └── watcher.ts           # File watcher
│   └── ipc/                     # IPC handlers
│       └── handlers.ts
│
├── src/                         # React renderer
│   ├── App.tsx                  # Root component
│   ├── main.tsx                 # Entry point
│   │
│   ├── components/
│   │   ├── layout/              # App shell
│   │   │   ├── Sidebar.tsx
│   │   │   ├── MainContent.tsx
│   │   │   └── Header.tsx
│   │   │
│   │   ├── global/              # Always-visible components
│   │   │   ├── ExecutionBar.tsx
│   │   │   ├── AgentActivityBar.tsx
│   │   │   ├── ModeSelector.tsx
│   │   │   ├── ChatPanel.tsx
│   │   │   ├── XRayPanel.tsx
│   │   │   └── QuickActions.tsx
│   │   │
│   │   ├── screens/             # 17 screens
│   │   │   ├── command/
│   │   │   │   ├── Dashboard.tsx
│   │   │   │   ├── Execution.tsx
│   │   │   │   ├── Tasks.tsx
│   │   │   │   └── Prompts.tsx
│   │   │   ├── claude/
│   │   │   │   ├── Plan.tsx
│   │   │   │   ├── Skills.tsx
│   │   │   │   ├── MCP.tsx
│   │   │   │   ├── Settings.tsx
│   │   │   │   └── Memory.tsx
│   │   │   ├── build/
│   │   │   │   ├── Code.tsx
│   │   │   │   ├── Debug.tsx
│   │   │   │   └── Tests.tsx
│   │   │   ├── ship/
│   │   │   │   ├── Deploy.tsx
│   │   │   │   ├── Logs.tsx
│   │   │   │   └── Analytics.tsx
│   │   │   └── system/
│   │   │       ├── Connections.tsx
│   │   │       └── Environment.tsx
│   │   │
│   │   └── ui/                  # Design system components
│   │       ├── Button.tsx
│   │       ├── Card.tsx
│   │       ├── Badge.tsx
│   │       ├── Toggle.tsx
│   │       ├── ProgressBar.tsx
│   │       ├── TaskCard.tsx
│   │       ├── PromptCard.tsx
│   │       ├── ListItem.tsx
│   │       ├── NavItem.tsx
│   │       ├── LiveOutput.tsx
│   │       └── index.ts
│   │
│   ├── stores/                  # Zustand stores
│   │   ├── executionStore.ts
│   │   ├── navigationStore.ts
│   │   ├── projectStore.ts
│   │   └── demoStore.ts
│   │
│   ├── hooks/                   # Custom hooks
│   │   ├── useClaudeCode.ts
│   │   ├── useFileWatcher.ts
│   │   ├── useKeyboardShortcuts.ts
│   │   └── useDemo.ts
│   │
│   ├── services/                # Business logic
│   │   ├── taskParser.ts
│   │   ├── promptGenerator.ts
│   │   └── planParser.ts
│   │
│   ├── styles/                  # CSS
│   │   ├── globals.css          # From v8 mockup
│   │   ├── variables.css        # CSS custom properties
│   │   └── animations.css       # Keyframes
│   │
│   ├── types/                   # TypeScript types
│   │   ├── task.ts
│   │   ├── agent.ts
│   │   ├── prompt.ts
│   │   └── claude.ts
│   │
│   ├── demo/                    # Demo mode
│   │   ├── DemoOverlay.tsx
│   │   ├── OnboardingFlow.tsx
│   │   ├── mockData.ts
│   │   └── tutorialSteps.ts
│   │
│   └── utils/                   # Utilities
│       ├── cn.ts                # classnames helper
│       └── format.ts
│
├── package.json
├── tsconfig.json
├── vite.config.ts
├── electron-builder.json
└── README.md
```

---

## ADR-005: Demo Mode & Onboarding

### Decision: First-launch demo with interactive tutorial

### Behavior
1. **First Launch**: 
   - Detect no `.vibes-config` in user home
   - Show DemoOverlay with welcome message
   - Start interactive tutorial with mock data

2. **Tutorial Flow**:
   - Step 1: "Welcome to vibes" - Overview
   - Step 2: "Meet the Agents" - Explain Agent Activity Bar
   - Step 3: "Your Command Center" - Dashboard tour
   - Step 4: "Watch AI Work" - Execution screen with mock live output
   - Step 5: "Understand Tasks" - Tasks & Prompts explanation
   - Step 6: "Start Building" - Open project prompt

3. **Mock Data**:
   - Simulated project "Wallie" with tasks, prompts, agents
   - Fake live output that plays through
   - All screens functional with mock data

4. **Exit Demo**:
   - "Start Real Project" button
   - "Continue Demo" button
   - "Skip Tutorial" link
   - Accessible anytime via Help menu

### Storage
```typescript
// localStorage
{
  "vibes:demoCompleted": true,
  "vibes:tutorialStep": 6,
  "vibes:showDemoOnStartup": false
}
```

---

## ADR-006: Styling Approach

### Decision: CSS Modules + CSS Custom Properties

### Rationale
- Direct port of v8 mockup CSS
- CSS custom properties for design tokens
- CSS Modules for component scoping
- No CSS-in-JS overhead

### Implementation
```css
/* styles/variables.css */
:root {
  --primary: #f97316;
  --secondary: #ec4899;
  --bg: #050508;
  /* ... all tokens from DESIGN-SYSTEM.xml */
}

/* components/ui/Button.module.css */
.button { ... }
.primary { ... }
.ghost { ... }
```

---

## ADR-007: IPC Communication

### Decision: Typed IPC with electron-trpc pattern

### Channels
```typescript
// Renderer → Main
'claude:spawn' // Start Claude Code process
'claude:send'  // Send command to stdin
'claude:pause' // Pause execution
'claude:stop'  // Stop process

// Main → Renderer  
'claude:output'  // Stdout event
'claude:error'   // Stderr event
'claude:exit'    // Process exited
'file:changed'   // File watcher event
```

---

## Summary

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Framework | Electron + React + TS | Claude Code expertise, ecosystem |
| State | Zustand + TanStack Query | Simple, performant, typed |
| Styling | CSS Modules + Variables | Direct v8 port, no overhead |
| Claude Integration | Process spawn + parse | Full control, real-time |
| Demo Mode | First-launch tutorial | User onboarding, showcase features |
| Structure | Feature-based folders | Scalable, clear ownership |

---

**Ready for micro-prompt generation.**
