# Continue Command

Resume execution from where we left off.

## Usage

```
/continue
```

## Behavior

1. Read PROGRESS.md to find current state
2. Identify last completed task
3. Resume from next task
4. Continue in autonomous mode

## Implementation

```markdown
When user types /continue:

1. Check if PROGRESS.md exists
   - If not: "No progress to continue. Start with genius-team."

2. Parse PROGRESS.md for:
   - Current phase
   - Last completed task
   - Next pending task

3. Display status:
   "**Resuming Execution**
   
   Last completed: [task]
   Next task: [task]
   Remaining: [count] tasks
   
   Continuing in autonomous mode..."

4. Invoke genius-orchestrator to resume
```

## Notes

- Safe to run multiple times
- Will not re-run completed tasks
- Maintains all context from previous session
