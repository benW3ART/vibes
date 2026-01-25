---
name: genius-architect
description: Technical architecture and task planning. Creates project structure, technology decisions, and task list in .claude/plan.md. REQUIRES USER APPROVAL before execution begins.
---

# Genius Architect v6.2 - Technical Architecture

**Breaking down the vision into executable tasks.**

## STARTUP VERIFICATION

```bash
# Verify preconditions
python3 scripts/state-manager.py check genius-architect
if [ $? -ne 0 ]; then
    echo "Cannot proceed. Design must be chosen first."
    exit 1
fi

# Mark skill start
python3 scripts/state-manager.py start genius-architect
```

## Required Input

```bash
# Verify all required files
for f in SPECIFICATIONS.xml design-config.json; do
    if [ ! -f "$f" ]; then
        echo "ERROR: $f not found"
        exit 1
    fi
done

# Verify design was chosen
chosen=$(python3 -c "import json; print(json.load(open('.genius/STATE.json'))['checkpoints']['design_chosen'])")
if [ "$chosen" != "True" ]; then
    echo "ERROR: Design not chosen. Complete design phase first."
    exit 1
fi
echo "✓ All inputs available"
```

## Architecture Process

### Step 1: Technology Decisions

Based on project requirements, select stack:

| Layer | Default | Alternatives |
|-------|---------|--------------|
| Framework | Next.js 14 | Remix, Nuxt, SvelteKit |
| Language | TypeScript | JavaScript |
| Styling | Tailwind CSS | CSS Modules, Styled Components |
| Database | Supabase | PlanetScale, Neon, MongoDB |
| Auth | Supabase Auth | Clerk, Auth0, NextAuth |
| Hosting | Vercel | Railway, Netlify, Cloudflare |

### Step 2: Project Structure

Generate folder structure:

```
project-name/
├── src/
│   ├── app/              # Next.js App Router
│   │   ├── (auth)/       # Auth routes
│   │   ├── (dashboard)/  # Protected routes
│   │   ├── api/          # API routes
│   │   └── page.tsx      # Landing
│   ├── components/
│   │   ├── ui/           # Design system components
│   │   └── features/     # Feature components
│   ├── lib/              # Utilities
│   ├── hooks/            # Custom hooks
│   └── types/            # TypeScript types
├── tests/
├── public/
└── .claude/
    └── plan.md           # Task list
```

### Step 3: Create Task List

Create `.claude/plan.md` - **SINGLE SOURCE OF TRUTH**:

```markdown
# Implementation Plan

## Phase 1: Setup (Tasks 1-3)
- [ ] 1. Initialize project
  - Command: npx create-next-app@latest . --typescript --tailwind --eslint --app
  - Verify: npm run build succeeds
- [ ] 2. Configure development environment
  - ESLint, Prettier, path aliases
  - Verify: npm run lint passes
- [ ] 3. Create folder structure
  - All directories per architecture
  - Verify: Structure matches plan

## Phase 2: Design System (Tasks 4-8)
- [ ] 4. Setup design tokens
  - Colors, typography from design-config.json
  - Verify: Tailwind theme works
- [ ] 5. Build Button component
  - Variants: primary, secondary, outline, ghost
  - Verify: All variants render
- [ ] 6. Build Input component
  - Types: text, email, password, textarea
  - Verify: Form validation works
- [ ] 7. Build Card component
  - Verify: Layout correct
- [ ] 8. Build Layout components
  - Header, Footer, Sidebar
  - Verify: Responsive

## Phase 3: Core Features (Tasks 9-14)
- [ ] 9. Setup database
  - Supabase project, schema
  - Verify: Can connect
- [ ] 10. Implement authentication
  - Sign up, login, logout
  - Verify: Auth flow works
- [ ] 11. Create dashboard
  - Protected route, user data
  - Verify: Shows after login
- [ ] 12-14. [Feature-specific tasks]

## Phase 4: Polish (Tasks 15-17)
- [ ] 15. Error handling
  - Error boundaries, toast notifications
  - Verify: Errors display gracefully
- [ ] 16. Loading states
  - Skeletons, spinners
  - Verify: No layout shift
- [ ] 17. Final review
  - Console errors, accessibility
  - Verify: Lighthouse score > 90
```

### Step 4: Create Architecture Documentation

Generate ARCHITECTURE.md:

```markdown
# Technical Architecture

## Stack
| Layer | Technology | Rationale |
|-------|------------|-----------|
| Frontend | Next.js 14 | [reason] |
| Database | Supabase | [reason] |

## Project Structure
[diagram]

## Data Model
[ERD]

## API Design
[endpoints]

## Deployment
[pipeline]
```

## Output Files

1. **ARCHITECTURE.md** - Full technical documentation
2. **.claude/plan.md** - Task list (SINGLE SOURCE OF TRUTH)

## COMPLETION - REQUIRES APPROVAL

### Step 1: Verify Outputs
```bash
if [ ! -f ARCHITECTURE.md ] || [ ! -f .claude/plan.md ]; then
    echo "ERROR: Output files not created!"
    exit 1
fi

# Count tasks
task_count=$(grep -c '^\- \[ \]' .claude/plan.md)
echo "✓ Created $task_count tasks"
```

### Step 2: Update Task Count in State
```bash
python3 << EOF
import json
with open('.genius/STATE.json', 'r') as f:
    state = json.load(f)
state['tasks']['total'] = $task_count
with open('.genius/STATE.json', 'w') as f:
    json.dump(state, f, indent=2)
EOF
```

### Step 3: Display Summary for Approval
```
═══════════════════════════════════════════════════════════════
           ARCHITECTURE COMPLETE - READY FOR EXECUTION
═══════════════════════════════════════════════════════════════

📋 Task Plan: [X] tasks in .claude/plan.md
📄 Architecture: ARCHITECTURE.md

Phases:
  1. Setup: [X] tasks
  2. Design System: [X] tasks
  3. Core Features: [X] tasks
  4. Polish: [X] tasks

Stack:
  • Framework: [Next.js 14]
  • Database: [Supabase]
  • Auth: [Supabase Auth]
  • Hosting: [Vercel]

═══════════════════════════════════════════════════════════════

🔒 APPROVAL REQUIRED

This plan defines HOW the project will be built.
Execution will run AUTONOMOUSLY once approved.

To approve and start building:
  → Say "approved" or "start building"
  → Or run: genius approve architecture

To request changes:
  → Tell me what to modify

═══════════════════════════════════════════════════════════════
```

### Step 4: WAIT FOR USER APPROVAL

**DO NOT START EXECUTION** until user explicitly approves.

### Step 5: On Approval
```bash
# Update state
bash scripts/genius-cli.sh approve architecture
bash scripts/genius-cli.sh checkpoint "Architecture approved - starting execution"
```

Output:
```
✅ Architecture Approved!

🚀 Starting autonomous execution...

I will now build the entire project without stopping.
Progress will be saved to PROGRESS.md.
Say "STOP" at any time to pause.

Beginning Phase 1: Setup...
```

Then:
```bash
python3 scripts/state-manager.py start genius-orchestrator
```

**Immediately continue to genius-orchestrator skill.**
