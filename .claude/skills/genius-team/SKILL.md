---
name: genius-team
description: Intelligent router for Genius Team. Detects intent and routes to appropriate skill based on current state. Main entry point for all interactions.
---

# Genius Team v6.2 - Your AI Product Team

**From idea to production. State-tracked. Checkpoint-validated.**

## STARTUP: Check Current State

Always start by checking state:

```bash
# Initialize if needed
if [ ! -f .genius/STATE.json ]; then
    echo "No project found. Initializing..."
    bash scripts/genius-cli.sh init
fi

# Show current state
bash scripts/genius-cli.sh status
```

## Context-Aware Routing

Based on current state, determine next action:

```python
state = load_state()
phase = state['phase']
checkpoints = state['checkpoints']

if phase == 'NOT_STARTED':
    # New project
    route_to('genius-interviewer')

elif phase == 'IDEATION':
    if not checkpoints['discovery_complete']:
        route_to('genius-interviewer')
    elif not checkpoints['market_analysis_complete']:
        route_to('genius-product-market-analyst')
    elif not checkpoints['specs_approved']:
        if artifact_exists('SPECIFICATIONS.xml'):
            prompt_for_approval('specs')
        else:
            route_to('genius-specs')
    elif not checkpoints['design_chosen']:
        if artifact_exists('design-config.json'):
            prompt_for_approval('design')
        else:
            route_to('genius-designer')
    elif not checkpoints['architecture_approved']:
        if artifact_exists('.claude/plan.md'):
            prompt_for_approval('architecture')
        else:
            route_to('genius-architect')

elif phase == 'EXECUTION':
    if not checkpoints['execution_complete']:
        route_to('genius-orchestrator')
    else:
        suggest_next_steps()  # QA, security, deploy
```

## Intent Detection

| User Says | Route To | Condition |
|-----------|----------|-----------|
| "new project", "I want to build" | genius-interviewer | Always |
| "market analysis" | genius-product-market-analyst | After discovery |
| "write specs" | genius-specs | After market analysis |
| "approved", "yes", "continue" | Next skill | At checkpoint |
| "design", "branding" | genius-designer | After specs approved |
| "Option A/B/C" | Continue from designer | At design checkpoint |
| "architecture", "plan" | genius-architect | After design chosen |
| "start building", "go" | genius-orchestrator | After architecture approved |
| "STOP", "PAUSE" | Halt execution | During execution |
| "status" | Show status | Always |
| "rollback" | genius rollback | Always |

## Welcome Message (New Project)

```
🚀 Welcome to Genius Team!

I'll guide you through building your project:
1. 📋 Discovery - Understanding your vision
2. 📊 Market Analysis - Validating the opportunity  
3. 📝 Specifications - Defining requirements
4. 🎨 Design - Creating visual identity
5. 🏗️ Architecture - Planning implementation
6. 🔨 Build - Autonomous execution
7. ✅ QA & Deploy - Ship it!

State is tracked in .genius/STATE.json
Checkpoints require your approval before continuing.

What would you like to build?
```

## Resume Message (Existing Project)

```
Welcome back!

Current state:
- Phase: [IDEATION/EXECUTION]
- Last skill: [skill name]
- Progress: [X/Y checkpoints, or N/M tasks]

Next action: [what needs to happen]

Say "continue" to proceed or "status" for details.
```

## Checkpoint Prompts

### Specs Approval
```
📋 Specifications are ready for review.

Open SPECIFICATIONS.xml to see the full requirements.

Say "approved" to continue to design phase.
Say "change [aspect]" to modify.
```

### Design Selection
```
🎨 Design options are ready.

Open DESIGN-SYSTEM.html in your browser.

Which option do you prefer?
- "Option A"
- "Option B" 
- "Option C"
- "Mix of A and C"
```

### Architecture Approval
```
🏗️ Architecture is ready for review.

Open ARCHITECTURE.md for technical details.
See .claude/plan.md for the [N] implementation tasks.

Say "start building" to begin autonomous execution.
Say "change [aspect]" to modify the plan.
```

## Error States

If state is inconsistent:
```bash
genius verify
```

If recovery needed:
```bash
genius rollback <checkpoint-hash>
```

## Available Skills

### Ideation Phase
- genius-interviewer - Discovery
- genius-product-market-analyst - Market research
- genius-specs - Requirements (→ checkpoint)
- genius-designer - Visual design (→ checkpoint)
- genius-marketer - GTM strategy
- genius-copywriter - Marketing copy
- genius-architect - Technical plan (→ checkpoint)

### Execution Phase
- genius-orchestrator - Autonomous build
- genius-qa - Full quality audit
- genius-security - Security review
- genius-deployer - Production deployment

### Support
- genius-memory - Context persistence
- genius-test-assistant - Testing help
