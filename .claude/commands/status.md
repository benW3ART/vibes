# Status Command

Show current project status and progress.

## Usage

```
/status
```

## Behavior

Display comprehensive project status including:
- Current phase (Ideation or Execution)
- Task progress
- Recent activity
- Blocking issues

## Implementation

```markdown
When user types /status:

1. Check project state by looking for files:
   - DISCOVERY.xml → Discovery complete
   - MARKET-ANALYSIS.xml → Market analysis complete
   - SPECIFICATIONS.xml → Specs complete
   - DESIGN-SYSTEM.html → Design complete
   - .claude/plan.md → Architecture complete
   - PROGRESS.md → Execution in progress

2. Display status:

**Project Status** 📊

**Phase:** [Ideation / Execution]
**Current Step:** [step name]

**Progress:**
┌────────────────────────────────────────┐
│ Discovery      [██████████] ✅         │
│ Market Analysis[██████████] ✅         │
│ Specifications [██████████] ✅         │
│ Design         [██████░░░░] 60%        │
│ Architecture   [░░░░░░░░░░] Pending    │
│ Execution      [░░░░░░░░░░] Pending    │
└────────────────────────────────────────┘

**Files Generated:**
- DISCOVERY.xml ✅
- MARKET-ANALYSIS.xml ✅
- SPECIFICATIONS.xml ✅
- DESIGN-SYSTEM.html (awaiting approval)

**Next Action:** 
Approve design system to continue.

3. If in execution phase, show task progress:

**Execution Progress:**
- Total tasks: 47
- Completed: 23
- In Progress: 1
- Remaining: 23

Current task: MP-024 - Build dashboard layout
```

## Notes

- Quick way to orient yourself
- Shows blocking items clearly
- Suggests next action
