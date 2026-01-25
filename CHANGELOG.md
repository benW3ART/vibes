# Changelog

All notable changes to the vibes project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2025-01-25

### Added

#### Core Application
- Electron 28 desktop application with macOS-native window controls
- React 18 with TypeScript 5 for the renderer process
- Vite 5 for fast development and optimized builds
- Zustand for state management with persistent stores
- TanStack Query ready for async data fetching

#### Navigation & Layout
- Sidebar with collapsible navigation sections (Command Center, .claude, Build, Ship, System)
- Project selector with support for multiple projects
- Mode selector (Autopilot/Copilot) with demo mode toggle
- Header with screen title and quick action buttons
- Ambient orb background effects for visual appeal

#### 17 Screens Implemented
- **Command Center**: Dashboard, Execution, Tasks, Prompts
- **.claude**: Plan, Skills, MCP Servers, Settings, Memory
- **Build**: Code, Debug, Tests
- **Ship**: Deploy, Logs, Analytics
- **System**: Connections, Environment

#### Global Components
- Execution Bar showing current task progress with play/pause/stop controls
- Agent Activity Bar displaying Architect, Developer, QA, and Deployer status
- Chat Panel (Cmd+/) for conversing with Claude in context
- X-Ray Panel (Cmd+.) for inspecting execution details
- Command Palette (Cmd+K) for quick navigation and actions
- Toast notification system with success/error/warning/info variants

#### UI Components Library
- Button with multiple variants (primary, secondary, ghost, success, warning, error)
- Card with hover effects and glow animations
- Badge for status indicators and counts
- Toggle switches for boolean settings
- Progress bars with gradient fills
- NavItem for sidebar navigation
- TaskCard for displaying task information
- PromptCard for prompt display
- ListItem for generic list displays
- LiveOutput for real-time terminal-style output
- StatusDot for connection/agent status
- AgentCard for agent status display
- PhaseCard for execution phases
- SkillCard for skill management
- ConnectionCard for external service connections
- StatCard for dashboard statistics
- SectionTitle for content organization
- EmptyState for zero-data scenarios
- Skeleton loading components with shimmer effect

#### Animations & Polish
- Comprehensive animation library (fade, slide, bounce, shake, scale, pulse)
- Skeleton loading animations with shimmer effect
- Hover lift effects for buttons
- Card hover glow effects
- NavItem hover transitions
- Link underline animations
- Focus ring styles for accessibility

#### Keyboard Shortcuts
- Cmd+K: Open Command Palette
- Cmd+/: Toggle Chat Panel
- Cmd+.: Toggle X-Ray Panel
- Cmd+1-4: Quick navigation to Command Center screens
- Cmd+Shift+P: Go to Plan
- Cmd+Shift+S: Go to Skills
- Cmd+Shift+D: Go to Debug

#### Responsive Design
- Sidebar collapses to icons on narrow screens
- Panels stack vertically on mobile
- Adaptive font sizes and spacing
- Media queries for 1200px, 900px, and 600px breakpoints

#### Demo Mode
- Interactive demo with simulated execution data
- Mock tasks, prompts, and agent activities
- Demo toggle in the Mode Selector

#### Accessibility
- Visible focus indicators using box-shadow
- High contrast focus states
- ARIA labels on interactive elements
- Keyboard navigation support throughout

### Technical Details

#### Architecture
- Main process in `electron/` with IPC handlers
- Renderer process in `src/` with React components
- Shared types in `src/types/`
- State management in `src/stores/`
- Hooks for keyboard shortcuts and other utilities
- CSS Modules for component-specific styles
- CSS Variables for theming consistency

#### Design System
- Primary color: #f97316 (orange)
- Secondary color: #ec4899 (pink)
- Background: #050508 (near black)
- Fonts: Space Grotesk (display), Inter (body), JetBrains Mono (code)
- Consistent spacing scale and border radii
- Dark theme optimized for developer experience

### Known Issues
- App icon placeholder (needs actual icon file)
- Demo mode data is static (future: connect to real Claude Code CLI)
- Some screens have placeholder content pending full integration

---

Built with Genius Team v6.2
