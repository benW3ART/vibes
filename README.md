# vibes

**Build what you feel**

A Mac-native visual IDE that replaces the Claude Code terminal with a multi-agent orchestration cockpit.

![vibes screenshot](assets/screenshot-placeholder.png)
<!-- TODO: Add actual screenshot -->

## Features

- **Agent Activity Bar** - See Architect, Developer, QA, Deployer status in real-time
- **Execution Bar** - Current task progress with play/pause/stop controls
- **17 Screens** - Dashboard, Execution, Tasks, Code, Deploy, and more
- **Chat Panel** (Cmd+/) - Talk to Claude in context
- **X-Ray Panel** (Cmd+.) - Inspect execution details and agent thinking
- **Command Palette** (Cmd+K) - Quick navigation and actions
- **Demo Mode** - Interactive tutorial to learn the interface

## Screenshots

<!-- TODO: Add actual screenshots -->
| Dashboard | Execution | Tasks |
|-----------|-----------|-------|
| ![Dashboard](assets/dashboard-placeholder.png) | ![Execution](assets/execution-placeholder.png) | ![Tasks](assets/tasks-placeholder.png) |

## Installation

### Prerequisites

- Node.js 18 or higher
- npm 9 or higher
- macOS 12 or higher (for best experience)

### Setup

1. Clone the repository:
```bash
git clone https://github.com/yourusername/vibes.git
cd vibes
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run electron:dev
```

### Building for Production

```bash
# Build the application
npm run build

# Package for macOS
npm run electron:build
```

## Usage

### Getting Started

1. Launch the app
2. Toggle **Demo Mode** in the sidebar to see simulated execution
3. Explore the 17 screens via sidebar navigation or Command Palette (Cmd+K)

### Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| Cmd+K | Open Command Palette |
| Cmd+/ | Toggle Chat Panel |
| Cmd+. | Toggle X-Ray Panel |
| Cmd+1 | Go to Dashboard |
| Cmd+2 | Go to Execution |
| Cmd+3 | Go to Tasks |
| Cmd+4 | Go to Prompts |
| Cmd+Shift+P | Go to Plan |
| Cmd+Shift+S | Go to Skills |
| Cmd+Shift+D | Go to Debug |

### Screen Overview

#### Command Center
- **Dashboard** - Project overview with stats and phase progress
- **Execution** - Live view of agent execution with terminal output
- **Tasks** - Browse and filter all project tasks
- **Prompts** - Manage prompts generated from your plan

#### .claude
- **Plan** - View and edit plan.md
- **Skills** - Manage Claude skills (enabled/disabled)
- **MCP** - Configure MCP servers
- **Settings** - Application preferences
- **Memory** - View and add to CLAUDE.md memory

#### Build
- **Code** - File browser with code context
- **Debug** - Debug issues and errors
- **Tests** - View and run tests

#### Ship
- **Deploy** - Deploy to environments
- **Logs** - View application logs
- **Analytics** - Usage statistics and metrics

#### System
- **Connections** - Configure external service connections
- **Environment** - View environment variables and system info

## Development

### Project Structure

```
vibes/
├── electron/           # Electron main process
│   ├── main.ts        # Main entry point
│   ├── preload.ts     # Preload scripts
│   └── ipc/           # IPC handlers
├── src/               # React renderer
│   ├── components/    # UI components
│   │   ├── layout/   # Sidebar, Header, MainContent
│   │   ├── global/   # ExecutionBar, Panels, CommandPalette
│   │   ├── screens/  # 17 screen components
│   │   └── ui/       # Design system components
│   ├── stores/       # Zustand stores
│   ├── hooks/        # Custom React hooks
│   ├── demo/         # Demo mode provider
│   ├── styles/       # Global CSS
│   ├── types/        # TypeScript types
│   └── utils/        # Utility functions
├── assets/           # Static assets
└── scripts/          # Build scripts
```

### Available Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start Vite dev server |
| `npm run build` | Build for production |
| `npm run electron:dev` | Start Electron in dev mode |
| `npm run electron:build` | Build Electron app |
| `npm run typecheck` | Run TypeScript type checking |
| `npm run lint` | Run ESLint |

### Tech Stack

| Layer | Technology |
|-------|------------|
| Runtime | Electron 28 |
| UI | React 18 + TypeScript 5 |
| Bundler | Vite 5 |
| State | Zustand + TanStack Query |
| Styling | CSS Modules + CSS Variables |

### Design System

- **Primary**: #f97316 (orange)
- **Secondary**: #ec4899 (pink)
- **Background**: #050508
- **Fonts**: Space Grotesk, Inter, JetBrains Mono

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

MIT License - see [LICENSE](LICENSE) for details.

## Acknowledgments

Built with Genius Team v6.2
