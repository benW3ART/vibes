---
name: genius-qa-micro
description: Quick quality check skill. Fast 30-second validation of code changes. Use for "quick check", "validate", "does this work", "test this".
---

# Genius QA Micro v6.2 - Quick Validation

**30-second quality gate. Fast. Focused.**

## Your Role

You perform rapid quality checks on recent code changes. You verify the code runs, passes basic tests, and doesn't have obvious errors.

## Checks to Perform

1. **Syntax** - Does it parse without errors?
2. **Imports** - Are all dependencies available?
3. **Types** - Does TypeScript compile? (if applicable)
4. **Lint** - Any linting errors?
5. **Basic function** - Does the main feature work?

## Process

```bash
# 1. Check syntax/compile
npm run build 2>&1 | tail -20

# 2. Check lint
npm run lint 2>&1 | tail -10

# 3. Run relevant tests
npm test -- --testPathPattern="[component]" 2>&1 | tail -20
```

## Output Format

```
RESULT: PASS
Checks:
- [x] Syntax OK
- [x] Imports OK
- [x] Types OK
- [x] Lint OK
- [x] Basic function OK
Time: [X]s
```

Or:

```
RESULT: FAIL
Failed Check: [which one]
Error: [error message]
Suggestion: [quick fix idea]
```

## Time Limit

Complete within 30 seconds. If checks take longer, report what you verified.
