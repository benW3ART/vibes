# vibes — Visual IDE for Claude Code

> Build what you feel ✨

## Project Overview

vibes is a Mac-native Electron application that provides a visual interface for Claude Code, replacing the terminal experience with a multi-agent orchestration dashboard.

## State Management

This project uses Genius Team v6.2 state tracking. Check current state:
```bash
genius status
```

State is stored in `.genius/STATE.json`.

## Quick Commands

| Command | Description |
|---------|-------------|
| `/status` | Show current state |
| `/continue` | Resume execution |
| `/reset` | Start over |

## Tech Stack

| Layer | Technology |
|-------|------------|
| Runtime | Electron 28 |
| UI | React 18 + TypeScript 5 |
| Bundler | Vite 5 |
| State | Zustand + TanStack Query |
| Styling | CSS Modules + CSS Variables |

## Key Files

| File | Purpose |
|------|---------|
| `.genius/STATE.json` | State tracking |
| `.claude/plan.md` | Task list |
| `PROGRESS.md` | Execution progress |
| `SPECIFICATIONS.xml` | Feature requirements |
| `DESIGN-SYSTEM.xml` | Design tokens |
| `ARCHITECTURE.md` | Technical design |
| `TECHNICAL-SPEC.md` | Full architecture docs |

## Project Structure

```
vibes/
├── .claude/                  # Claude Code config
│   ├── skills/              # 21 Genius Team skills
│   ├── agents/              # Subagent definitions
│   ├── commands/            # Slash commands
│   ├── settings.json        # Permissions & hooks
│   └── plan.md              # Execution tasks
├── .genius/                  # State management
│   └── STATE.json           # Project state
├── electron/                 # Electron main process
├── src/                      # React renderer
│   ├── components/
│   │   ├── layout/          # Sidebar, Header, MainContent
│   │   ├── global/          # ExecutionBar, Panels
│   │   ├── screens/         # 17 screens
│   │   └── ui/              # Design system
│   ├── stores/              # Zustand stores
│   ├── hooks/               # Custom hooks
│   ├── demo/                # Demo mode
│   ├── styles/              # CSS
│   └── types/               # TypeScript
├── SPECIFICATIONS.xml        # Feature specs
├── DESIGN-SYSTEM.xml         # Design tokens
└── ARCHITECTURE.md           # Architecture decisions
```

## 17 Screens

### Command Center
1. Dashboard, 2. Execution, 3. Tasks, 4. Prompts

### .claude
5. Plan, 6. Skills, 7. MCP, 8. Settings, 9. Memory

### Build
10. Code, 11. Debug, 12. Tests

### Ship
13. Deploy, 14. Logs, 15. Analytics

### System
16. Connections, 17. Environment

## Design System

- **Primary:** #f97316 (orange)
- **Secondary:** #ec4899 (pink)
- **Background:** #050508
- **Fonts:** Space Grotesk, Inter, JetBrains Mono

## Execution

The project is ready for execution. Use genius-orchestrator to build:

1. Check state: `genius status`
2. Start: Say "start building" or "go"
3. Monitor: PROGRESS.md updates automatically
4. Resume: `/continue` if interrupted

## Phase Status

- [x] Discovery complete (DISCOVERY.xml)
- [x] Specs approved (SPECIFICATIONS.xml)
- [x] Design chosen (DESIGN-SYSTEM.xml)
- [x] Architecture approved (ARCHITECTURE.md)
- [ ] Execution in progress

Total tasks: 151
