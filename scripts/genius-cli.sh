#!/bin/bash
#
# Genius Team CLI v6.2
# Real orchestration with state enforcement
#

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Paths
GENIUS_DIR=".genius"
STATE_FILE="$GENIUS_DIR/STATE.json"
LOG_FILE="$GENIUS_DIR/genius.log"

# ============================================================================
# UTILITY FUNCTIONS
# ============================================================================

log() {
    local level=$1
    shift
    local message="$@"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo "[$timestamp] [$level] $message" >> "$LOG_FILE"
    
    case $level in
        INFO)  echo -e "${CYAN}ℹ${NC} $message" ;;
        OK)    echo -e "${GREEN}✓${NC} $message" ;;
        WARN)  echo -e "${YELLOW}⚠${NC} $message" ;;
        ERROR) echo -e "${RED}✗${NC} $message" ;;
        *)     echo "$message" ;;
    esac
}

ensure_state_file() {
    if [ ! -f "$STATE_FILE" ]; then
        log ERROR "STATE.json not found. Run 'genius init' first."
        exit 1
    fi
}

get_state() {
    local key=$1
    python3 -c "import json; print(json.load(open('$STATE_FILE'))$key)" 2>/dev/null
}

set_state() {
    local key=$1
    local value=$2
    python3 << EOF
import json
with open('$STATE_FILE', 'r') as f:
    state = json.load(f)
exec("state$key = $value")
state['project']['updated_at'] = '$(date -Iseconds)'
with open('$STATE_FILE', 'w') as f:
    json.dump(state, f, indent=2)
EOF
}

check_artifact() {
    local artifact=$1
    if [ -f "$artifact" ]; then
        set_state "['artifacts']['$artifact']" "True"
        return 0
    else
        return 1
    fi
}

git_checkpoint() {
    local name=$1
    if git rev-parse --git-dir > /dev/null 2>&1; then
        git add -A
        git commit -m "🔖 Checkpoint: $name" --allow-empty 2>/dev/null || true
        local hash=$(git rev-parse --short HEAD)
        set_state "['git']['last_checkpoint']" "'$hash'"
        log OK "Git checkpoint: $name ($hash)"
    fi
}

# ============================================================================
# SKILL VERIFICATION
# ============================================================================

verify_skill_preconditions() {
    local skill=$1
    
    case $skill in
        genius-interviewer)
            # No preconditions for starting
            return 0
            ;;
        genius-product-market-analyst)
            if ! check_artifact "DISCOVERY.xml"; then
                log ERROR "DISCOVERY.xml required. Run genius-interviewer first."
                return 1
            fi
            ;;
        genius-specs)
            if ! check_artifact "DISCOVERY.xml" || ! check_artifact "MARKET-ANALYSIS.xml"; then
                log ERROR "DISCOVERY.xml and MARKET-ANALYSIS.xml required."
                return 1
            fi
            ;;
        genius-designer)
            if ! check_artifact "SPECIFICATIONS.xml"; then
                log ERROR "SPECIFICATIONS.xml required. Specs must be approved first."
                return 1
            fi
            if [ "$(get_state "['checkpoints']['specs_approved']")" != "True" ]; then
                log ERROR "Specifications not approved yet."
                return 1
            fi
            ;;
        genius-marketer)
            if ! check_artifact "design-config.json"; then
                log ERROR "design-config.json required. Design must be chosen first."
                return 1
            fi
            ;;
        genius-architect)
            if [ "$(get_state "['checkpoints']['design_chosen']")" != "True" ]; then
                log ERROR "Design not chosen yet."
                return 1
            fi
            ;;
        genius-orchestrator)
            if ! check_artifact ".claude/plan.md"; then
                log ERROR ".claude/plan.md required. Architecture must be complete."
                return 1
            fi
            if [ "$(get_state "['checkpoints']['architecture_approved']")" != "True" ]; then
                log ERROR "Architecture not approved yet."
                return 1
            fi
            ;;
    esac
    return 0
}

# ============================================================================
# COMMANDS
# ============================================================================

cmd_init() {
    log INFO "Initializing Genius Team project..."
    
    mkdir -p "$GENIUS_DIR"
    
    # Copy fresh state
    if [ -f ".genius/STATE.json.template" ]; then
        cp ".genius/STATE.json.template" "$STATE_FILE"
    else
        # Create default state
        cat > "$STATE_FILE" << 'EOFSTATE'
{
  "version": "6.2.0",
  "project": {
    "name": null,
    "created_at": null,
    "updated_at": null
  },
  "phase": "NOT_STARTED",
  "current_skill": null,
  "skill_history": [],
  "checkpoints": {
    "discovery_complete": false,
    "market_analysis_complete": false,
    "specs_approved": false,
    "design_chosen": false,
    "architecture_approved": false,
    "execution_started": false,
    "execution_complete": false,
    "qa_passed": false,
    "deployed": false
  },
  "tasks": {
    "total": 0,
    "completed": 0,
    "failed": 0,
    "skipped": 0,
    "current_task_id": null
  },
  "artifacts": {},
  "git": {
    "enabled": false,
    "last_checkpoint": null,
    "checkpoints": []
  },
  "errors": [],
  "warnings": []
}
EOFSTATE
    fi
    
    set_state "['project']['created_at']" "'$(date -Iseconds)'"
    
    # Initialize git if not already
    if ! git rev-parse --git-dir > /dev/null 2>&1; then
        git init
        log OK "Git repository initialized"
    fi
    set_state "['git']['enabled']" "True"
    
    touch "$LOG_FILE"
    log OK "Genius Team initialized"
    
    echo ""
    echo -e "${GREEN}Ready!${NC} Say 'I want to build...' to start your project."
}

cmd_status() {
    ensure_state_file
    
    local phase=$(get_state "['phase']")
    local current=$(get_state "['current_skill']")
    local completed=$(get_state "['tasks']['completed']")
    local total=$(get_state "['tasks']['total']")
    
    echo ""
    echo -e "${CYAN}═══════════════════════════════════════════════════════════════${NC}"
    echo -e "${CYAN}                    GENIUS TEAM STATUS                         ${NC}"
    echo -e "${CYAN}═══════════════════════════════════════════════════════════════${NC}"
    echo ""
    echo -e "  Phase:         ${YELLOW}$phase${NC}"
    echo -e "  Current Skill: ${BLUE}$current${NC}"
    echo ""
    
    # Checkpoints
    echo -e "  ${CYAN}Checkpoints:${NC}"
    
    local checkpoints=("discovery_complete" "market_analysis_complete" "specs_approved" "design_chosen" "architecture_approved" "execution_started" "execution_complete")
    local labels=("Discovery" "Market Analysis" "Specs Approved" "Design Chosen" "Architecture Approved" "Execution Started" "Execution Complete")
    
    for i in "${!checkpoints[@]}"; do
        local val=$(get_state "['checkpoints']['${checkpoints[$i]}']")
        if [ "$val" == "True" ]; then
            echo -e "    ${GREEN}✓${NC} ${labels[$i]}"
        else
            echo -e "    ${RED}○${NC} ${labels[$i]}"
        fi
    done
    
    echo ""
    
    # Tasks (if in execution)
    if [ "$phase" == "EXECUTION" ]; then
        echo -e "  ${CYAN}Tasks:${NC} $completed / $total completed"
        
        if [ -f ".claude/plan.md" ]; then
            local done=$(grep -c '^\- \[x\]' .claude/plan.md 2>/dev/null || echo 0)
            local todo=$(grep -c '^\- \[ \]' .claude/plan.md 2>/dev/null || echo 0)
            echo -e "    Done: $done | Remaining: $todo"
        fi
    fi
    
    # Artifacts
    echo ""
    echo -e "  ${CYAN}Artifacts:${NC}"
    local artifacts=("DISCOVERY.xml" "MARKET-ANALYSIS.xml" "SPECIFICATIONS.xml" "DESIGN-SYSTEM.html" "design-config.json" "ARCHITECTURE.md" ".claude/plan.md")
    for art in "${artifacts[@]}"; do
        if [ -f "$art" ]; then
            echo -e "    ${GREEN}✓${NC} $art"
        else
            echo -e "    ${RED}○${NC} $art"
        fi
    done
    
    echo ""
    echo -e "${CYAN}═══════════════════════════════════════════════════════════════${NC}"
    echo ""
}

cmd_approve() {
    ensure_state_file
    local what=$1
    
    case $what in
        specs)
            if ! check_artifact "SPECIFICATIONS.xml"; then
                log ERROR "SPECIFICATIONS.xml doesn't exist yet"
                exit 1
            fi
            set_state "['checkpoints']['specs_approved']" "True"
            git_checkpoint "Specs approved"
            log OK "Specifications approved! Ready for design phase."
            ;;
        design)
            if ! check_artifact "design-config.json"; then
                log ERROR "design-config.json doesn't exist yet. Choose a design option first."
                exit 1
            fi
            set_state "['checkpoints']['design_chosen']" "True"
            git_checkpoint "Design chosen"
            log OK "Design approved! Ready for marketing & architecture."
            ;;
        architecture)
            if ! check_artifact ".claude/plan.md"; then
                log ERROR ".claude/plan.md doesn't exist yet"
                exit 1
            fi
            set_state "['checkpoints']['architecture_approved']" "True"
            git_checkpoint "Architecture approved"
            log OK "Architecture approved! Ready for execution."
            ;;
        *)
            log ERROR "Unknown approval: $what"
            echo "Usage: genius approve [specs|design|architecture]"
            exit 1
            ;;
    esac
}

cmd_checkpoint() {
    ensure_state_file
    local name=${1:-"Manual checkpoint"}
    git_checkpoint "$name"
}

cmd_rollback() {
    ensure_state_file
    local target=$1
    
    if [ -z "$target" ]; then
        log INFO "Available checkpoints:"
        git log --oneline | grep "🔖 Checkpoint" | head -10
        echo ""
        echo "Usage: genius rollback <commit-hash>"
        exit 0
    fi
    
    log WARN "Rolling back to $target..."
    git checkout "$target" -- .
    log OK "Rolled back. Review changes and run 'genius status'"
}

cmd_skill() {
    ensure_state_file
    local skill=$1
    
    if [ -z "$skill" ]; then
        log ERROR "Specify a skill name"
        echo "Usage: genius skill <skill-name>"
        exit 1
    fi
    
    # Verify preconditions
    if ! verify_skill_preconditions "$skill"; then
        exit 1
    fi
    
    # Update state
    set_state "['current_skill']" "'$skill'"
    
    # Determine phase
    case $skill in
        genius-interviewer|genius-product-market-analyst|genius-specs|genius-designer|genius-marketer|genius-architect)
            set_state "['phase']" "'IDEATION'"
            ;;
        genius-orchestrator|genius-qa|genius-security|genius-deployer)
            set_state "['phase']" "'EXECUTION'"
            ;;
    esac
    
    log OK "Starting $skill..."
    
    # Add to history
    python3 << EOF
import json
with open('$STATE_FILE', 'r') as f:
    state = json.load(f)
state['skill_history'].append({
    'skill': '$skill',
    'started_at': '$(date -Iseconds)'
})
with open('$STATE_FILE', 'w') as f:
    json.dump(state, f, indent=2)
EOF
}

cmd_complete() {
    ensure_state_file
    local skill=$1
    
    # Mark skill completion and update checkpoints
    case $skill in
        genius-interviewer)
            check_artifact "DISCOVERY.xml"
            set_state "['checkpoints']['discovery_complete']" "True"
            git_checkpoint "Discovery complete"
            ;;
        genius-product-market-analyst)
            check_artifact "MARKET-ANALYSIS.xml"
            check_artifact "BUSINESS-MODEL.xml"
            set_state "['checkpoints']['market_analysis_complete']" "True"
            git_checkpoint "Market analysis complete"
            ;;
        genius-specs)
            check_artifact "SPECIFICATIONS.xml"
            log INFO "Specs generated. Run 'genius approve specs' when ready."
            ;;
        genius-designer)
            check_artifact "DESIGN-SYSTEM.html"
            log INFO "Design options generated. Choose one and run 'genius approve design'"
            ;;
        genius-architect)
            check_artifact ".claude/plan.md"
            check_artifact "ARCHITECTURE.md"
            # Count tasks
            if [ -f ".claude/plan.md" ]; then
                local count=$(grep -c '^\- \[ \]' .claude/plan.md 2>/dev/null || echo 0)
                set_state "['tasks']['total']" "$count"
            fi
            log INFO "Architecture complete. Run 'genius approve architecture' when ready."
            ;;
        genius-orchestrator)
            set_state "['checkpoints']['execution_complete']" "True"
            git_checkpoint "Execution complete"
            log OK "Execution complete!"
            ;;
    esac
    
    set_state "['current_skill']" "null"
    log OK "$skill completed"
}

cmd_task() {
    ensure_state_file
    local action=$1
    local task_id=$2
    
    case $action in
        start)
            set_state "['tasks']['current_task_id']" "'$task_id'"
            log INFO "Starting task: $task_id"
            ;;
        done)
            set_state "['tasks']['current_task_id']" "null"
            python3 << EOF
import json
with open('$STATE_FILE', 'r') as f:
    state = json.load(f)
state['tasks']['completed'] += 1
with open('$STATE_FILE', 'w') as f:
    json.dump(state, f, indent=2)
EOF
            log OK "Task $task_id completed"
            ;;
        fail)
            set_state "['tasks']['current_task_id']" "null"
            python3 << EOF
import json
with open('$STATE_FILE', 'r') as f:
    state = json.load(f)
state['tasks']['failed'] += 1
with open('$STATE_FILE', 'w') as f:
    json.dump(state, f, indent=2)
EOF
            log WARN "Task $task_id failed"
            ;;
        skip)
            set_state "['tasks']['current_task_id']" "null"
            python3 << EOF
import json
with open('$STATE_FILE', 'r') as f:
    state = json.load(f)
state['tasks']['skipped'] += 1
with open('$STATE_FILE', 'w') as f:
    json.dump(state, f, indent=2)
EOF
            log WARN "Task $task_id skipped"
            ;;
    esac
}

cmd_verify() {
    ensure_state_file
    log INFO "Verifying project state..."
    
    local errors=0
    
    # Check state consistency
    local phase=$(get_state "['phase']")
    
    if [ "$phase" == "EXECUTION" ]; then
        if [ "$(get_state "['checkpoints']['architecture_approved']")" != "True" ]; then
            log ERROR "In EXECUTION phase but architecture not approved"
            ((errors++))
        fi
        
        if [ ! -f ".claude/plan.md" ]; then
            log ERROR "In EXECUTION phase but plan.md missing"
            ((errors++))
        fi
    fi
    
    # Check artifact consistency
    if [ "$(get_state "['checkpoints']['specs_approved']")" == "True" ]; then
        if [ ! -f "SPECIFICATIONS.xml" ]; then
            log ERROR "Specs marked approved but file missing"
            ((errors++))
        fi
    fi
    
    if [ $errors -eq 0 ]; then
        log OK "Project state is consistent"
    else
        log ERROR "$errors inconsistencies found"
    fi
    
    return $errors
}

cmd_help() {
    echo ""
    echo -e "${CYAN}Genius Team CLI v6.2${NC}"
    echo ""
    echo "Usage: genius <command> [options]"
    echo ""
    echo "Commands:"
    echo "  init                 Initialize a new project"
    echo "  status               Show current project status"
    echo "  approve <what>       Approve a checkpoint (specs|design|architecture)"
    echo "  checkpoint [name]    Create a git checkpoint"
    echo "  rollback [hash]      Rollback to a checkpoint"
    echo "  skill <name>         Start a skill (updates state)"
    echo "  complete <skill>     Mark a skill as complete"
    echo "  task <action> <id>   Track task (start|done|fail|skip)"
    echo "  verify               Verify project state consistency"
    echo "  help                 Show this help"
    echo ""
    echo "Examples:"
    echo "  genius init"
    echo "  genius approve specs"
    echo "  genius status"
    echo "  genius rollback abc123"
    echo ""
}

# ============================================================================
# MAIN
# ============================================================================

case "${1:-help}" in
    init)       cmd_init ;;
    status)     cmd_status ;;
    approve)    cmd_approve "$2" ;;
    checkpoint) cmd_checkpoint "$2" ;;
    rollback)   cmd_rollback "$2" ;;
    skill)      cmd_skill "$2" ;;
    complete)   cmd_complete "$2" ;;
    task)       cmd_task "$2" "$3" ;;
    verify)     cmd_verify ;;
    help|--help|-h) cmd_help ;;
    *)
        log ERROR "Unknown command: $1"
        cmd_help
        exit 1
        ;;
esac
