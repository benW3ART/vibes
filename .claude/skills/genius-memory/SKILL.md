---
name: genius-memory
description: Persistent context and knowledge management skill that maintains project memory across sessions. Tracks decisions, patterns, conventions, and lessons learned. AUTO-TRIGGERS on "remember this", "we decided", "don't forget", "this broke because", "l...
---

# Genius Memory v6.1 - Persistent Context

**Remembering everything so you don't have to.**

## Auto-Trigger Phrases

When user says ANY of these, automatically update the appropriate memory file:

| Trigger Phrase | Action | File |
|----------------|--------|------|
| "Remember that..." | Add fact | KNOWLEDGE-BASE.md |
| "Don't forget..." | Add fact | KNOWLEDGE-BASE.md |
| "Important:..." | Add fact | KNOWLEDGE-BASE.md |
| "Note:..." | Add fact | KNOWLEDGE-BASE.md |
| "We decided..." | Add decision | DECISIONS.md |
| "The decision is..." | Add decision | DECISIONS.md |
| "Let's go with..." | Add decision | DECISIONS.md |
| "This broke because..." | Add lesson | LESSONS-LEARNED.md |
| "Lesson learned..." | Add lesson | LESSONS-LEARNED.md |
| "Never do..." | Add guard | REGRESSION-GUARDS.md |
| "This causes..." | Add guard | REGRESSION-GUARDS.md |
| "For future reference..." | Add to appropriate file | Context-dependent |

**When triggered**: Silently append to the file, then confirm briefly: "Got it, saved to [file]."

## Memory Files

### KNOWLEDGE-BASE.md
```markdown
# Project Knowledge Base

## Project Overview
[Auto-populated from discovery]

## Tech Stack
- Frontend: [framework]
- Backend: [framework]
- Database: [type]

## Key Facts
- [fact 1]
- [fact 2]

## Conventions
- [convention 1]
- [convention 2]
```

### DECISIONS.md
```markdown
# Project Decisions

## [Date] - [Decision Title]
**Decision**: [What was decided]
**Rationale**: [Why]
**Alternatives considered**: [What else was considered]
**Consequences**: [Impact]
```

### LESSONS-LEARNED.md
```markdown
# Lessons Learned

## What Worked
- [success 1]

## What Didn't Work
- [failure 1]

## Patterns to Follow
- [pattern 1]

## Patterns to Avoid
- [anti-pattern 1]
```

### REGRESSION-GUARDS.md
```markdown
# Regression Guards

## [Component/Feature]
**What broke**: [description]
**Root cause**: [why it broke]
**Prevention**: [how to prevent]
**Test to add**: [specific test]
```

## Manual Commands

| Command | Action |
|---------|--------|
| "remember [fact]" | Store a fact to KNOWLEDGE-BASE.md |
| "why [decision]" | Recall rationale from DECISIONS.md |
| "lessons" | Show all lessons learned |
| "guards" | Show all regression guards |
| "context" | Show project overview from all files |

## Integration with Sessions

Memory files are:
1. **Auto-loaded** via @imports in CLAUDE.md at session start
2. **Preserved** during context compaction via PreCompact hook
3. **Available** to all skills and subagents

When starting a new session, Claude automatically has access to all stored knowledge without needing to re-read files manually.
