#!/usr/bin/env python3
"""
Genius Team State Manager v6.2
Real state tracking and enforcement
"""

import json
import os
import sys
from datetime import datetime
from pathlib import Path

STATE_FILE = ".genius/STATE.json"

def load_state():
    """Load current state from file"""
    if not os.path.exists(STATE_FILE):
        return None
    with open(STATE_FILE, 'r') as f:
        return json.load(f)

def save_state(state):
    """Save state to file"""
    state['project']['updated_at'] = datetime.now().isoformat()
    with open(STATE_FILE, 'w') as f:
        json.dump(state, f, indent=2)

def get_context_injection():
    """
    Generate context to inject into Claude's prompt.
    This is called by SessionStart hook and outputs to stdout.
    """
    state = load_state()
    if not state:
        print("# No project initialized. Say 'I want to build...' to start.")
        return
    
    output = []
    output.append("=" * 60)
    output.append("GENIUS TEAM - PROJECT CONTEXT")
    output.append("=" * 60)
    output.append("")
    
    # Current state
    output.append(f"## Current State")
    output.append(f"- Phase: {state['phase']}")
    output.append(f"- Current Skill: {state['current_skill'] or 'None'}")
    output.append("")
    
    # What's been done
    output.append("## Completed Checkpoints")
    checkpoints = state.get('checkpoints', {})
    checkpoint_labels = {
        'discovery_complete': 'Discovery',
        'market_analysis_complete': 'Market Analysis', 
        'specs_approved': 'Specifications APPROVED',
        'design_chosen': 'Design CHOSEN',
        'architecture_approved': 'Architecture APPROVED',
        'execution_started': 'Execution Started',
        'execution_complete': 'Execution Complete'
    }
    for key, label in checkpoint_labels.items():
        if checkpoints.get(key):
            output.append(f"  ✓ {label}")
    output.append("")
    
    # What's next
    output.append("## Next Required Action")
    if not checkpoints.get('discovery_complete'):
        output.append("  → Run genius-interviewer to discover requirements")
    elif not checkpoints.get('market_analysis_complete'):
        output.append("  → Run genius-product-market-analyst")
    elif not checkpoints.get('specs_approved'):
        if os.path.exists('SPECIFICATIONS.xml'):
            output.append("  → User must approve specs: 'genius approve specs'")
        else:
            output.append("  → Run genius-specs to write specifications")
    elif not checkpoints.get('design_chosen'):
        if os.path.exists('design-config.json'):
            output.append("  → User must approve design: 'genius approve design'")
        else:
            output.append("  → Run genius-designer to create design options")
    elif not checkpoints.get('architecture_approved'):
        if os.path.exists('.claude/plan.md'):
            output.append("  → User must approve architecture: 'genius approve architecture'")
        else:
            output.append("  → Run genius-architect to plan implementation")
    elif not checkpoints.get('execution_complete'):
        output.append("  → Run genius-orchestrator to build the project")
    else:
        output.append("  → Project complete! Run genius-qa for final audit.")
    output.append("")
    
    # Task progress (if in execution)
    if state['phase'] == 'EXECUTION':
        tasks = state.get('tasks', {})
        output.append("## Execution Progress")
        output.append(f"  Tasks: {tasks.get('completed', 0)}/{tasks.get('total', 0)} complete")
        if tasks.get('failed', 0) > 0:
            output.append(f"  Failed: {tasks['failed']}")
        if tasks.get('skipped', 0) > 0:
            output.append(f"  Skipped: {tasks['skipped']}")
        if tasks.get('current_task_id'):
            output.append(f"  Current: {tasks['current_task_id']}")
        output.append("")
    
    # Available artifacts
    output.append("## Available Artifacts")
    artifacts = [
        'DISCOVERY.xml', 'MARKET-ANALYSIS.xml', 'BUSINESS-MODEL.xml',
        'SPECIFICATIONS.xml', 'DESIGN-SYSTEM.html', 'design-config.json',
        'MARKETING-STRATEGY.xml', 'ARCHITECTURE.md', '.claude/plan.md',
        'PROGRESS.md', 'KNOWLEDGE-BASE.md', 'DECISIONS.md'
    ]
    for art in artifacts:
        if os.path.exists(art):
            output.append(f"  ✓ {art}")
    output.append("")
    
    # Errors/warnings
    if state.get('errors'):
        output.append("## ⚠️ Errors")
        for err in state['errors'][-5:]:  # Last 5
            output.append(f"  - {err}")
        output.append("")
    
    output.append("=" * 60)
    output.append("Use 'genius status' for full details")
    output.append("=" * 60)
    
    print("\n".join(output))

def check_skill_allowed(skill_name):
    """
    Check if a skill is allowed to run based on current state.
    Returns (allowed: bool, reason: str)
    """
    state = load_state()
    if not state:
        if skill_name == 'genius-interviewer':
            return True, "Starting fresh project"
        return False, "Project not initialized. Run 'genius init' first."
    
    checkpoints = state.get('checkpoints', {})
    
    preconditions = {
        'genius-interviewer': lambda: (True, ""),
        'genius-product-market-analyst': lambda: (
            checkpoints.get('discovery_complete', False),
            "DISCOVERY.xml required. Complete discovery first."
        ),
        'genius-specs': lambda: (
            checkpoints.get('market_analysis_complete', False),
            "Market analysis required first."
        ),
        'genius-designer': lambda: (
            checkpoints.get('specs_approved', False),
            "Specifications must be APPROVED first. Run 'genius approve specs'"
        ),
        'genius-marketer': lambda: (
            checkpoints.get('design_chosen', False),
            "Design must be CHOSEN first. Run 'genius approve design'"
        ),
        'genius-architect': lambda: (
            checkpoints.get('design_chosen', False),
            "Design must be chosen first."
        ),
        'genius-orchestrator': lambda: (
            checkpoints.get('architecture_approved', False),
            "Architecture must be APPROVED first. Run 'genius approve architecture'"
        ),
    }
    
    if skill_name in preconditions:
        return preconditions[skill_name]()
    
    return True, ""

def update_on_skill_start(skill_name):
    """Update state when a skill starts"""
    state = load_state()
    if not state:
        return
    
    state['current_skill'] = skill_name
    
    # Set phase based on skill
    ideation_skills = ['genius-interviewer', 'genius-product-market-analyst', 
                       'genius-specs', 'genius-designer', 'genius-marketer',
                       'genius-copywriter', 'genius-architect']
    execution_skills = ['genius-orchestrator', 'genius-dev', 'genius-qa',
                        'genius-security', 'genius-deployer']
    
    if skill_name in ideation_skills:
        state['phase'] = 'IDEATION'
    elif skill_name in execution_skills:
        state['phase'] = 'EXECUTION'
    
    # Add to history
    state['skill_history'].append({
        'skill': skill_name,
        'started_at': datetime.now().isoformat()
    })
    
    save_state(state)

def update_on_skill_complete(skill_name, artifacts_created=None):
    """Update state when a skill completes"""
    state = load_state()
    if not state:
        return
    
    state['current_skill'] = None
    
    # Update checkpoints based on skill
    checkpoint_map = {
        'genius-interviewer': 'discovery_complete',
        'genius-product-market-analyst': 'market_analysis_complete',
        'genius-orchestrator': 'execution_complete',
    }
    
    if skill_name in checkpoint_map:
        state['checkpoints'][checkpoint_map[skill_name]] = True
    
    # Update artifacts
    if artifacts_created:
        for art in artifacts_created:
            state['artifacts'][art] = True
    
    save_state(state)

def get_precompact_context():
    """
    Generate critical context to preserve before compaction.
    This ensures important state survives context reduction.
    """
    state = load_state()
    if not state:
        return
    
    output = []
    output.append("")
    output.append("⚠️ CRITICAL CONTEXT - PRESERVE ACROSS COMPACTION ⚠️")
    output.append("")
    output.append(f"PROJECT PHASE: {state['phase']}")
    output.append(f"CURRENT SKILL: {state['current_skill']}")
    output.append("")
    output.append("CHECKPOINT STATUS:")
    for key, val in state.get('checkpoints', {}).items():
        if val:
            output.append(f"  ✓ {key}")
    output.append("")
    
    if state['phase'] == 'EXECUTION':
        tasks = state.get('tasks', {})
        output.append(f"TASK PROGRESS: {tasks.get('completed', 0)}/{tasks.get('total', 0)}")
        output.append(f"CURRENT TASK: {tasks.get('current_task_id', 'None')}")
    
    output.append("")
    output.append("TO CONTINUE: Read .genius/STATE.json and resume from current state")
    output.append("")
    
    print("\n".join(output))

def main():
    if len(sys.argv) < 2:
        print("Usage: state-manager.py <command>")
        print("Commands: context, precompact, check <skill>, start <skill>, complete <skill>")
        sys.exit(1)
    
    cmd = sys.argv[1]
    
    if cmd == 'context':
        get_context_injection()
    elif cmd == 'precompact':
        get_precompact_context()
    elif cmd == 'check':
        skill = sys.argv[2] if len(sys.argv) > 2 else ''
        allowed, reason = check_skill_allowed(skill)
        if allowed:
            print(f"OK: {skill} can proceed")
            sys.exit(0)
        else:
            print(f"BLOCKED: {reason}")
            sys.exit(1)
    elif cmd == 'start':
        skill = sys.argv[2] if len(sys.argv) > 2 else ''
        update_on_skill_start(skill)
        print(f"Started: {skill}")
    elif cmd == 'complete':
        skill = sys.argv[2] if len(sys.argv) > 2 else ''
        artifacts = sys.argv[3:] if len(sys.argv) > 3 else []
        update_on_skill_complete(skill, artifacts)
        print(f"Completed: {skill}")
    else:
        print(f"Unknown command: {cmd}")
        sys.exit(1)

if __name__ == '__main__':
    main()
