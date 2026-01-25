---
name: genius-qa
description: Comprehensive QA skill with dual testing strategy using Playwright for automated tests and optional Claude in Chrome for visual testing. Runs micro-checks during execution and full audits before deployment. Use for "run tests", "test this", "quali...
---

# Genius QA v6.0 - Quality Assurance

**Automated testing + Visual verification.**

## Dual Strategy

### Layer 1: Playwright (Automated)
- Headless browser testing
- Full suite on every commit
- Works for ALL users

### Layer 2: Claude in Chrome (Visual) - Optional
- Real browser interaction
- Visual verification
- Requires Max plan

## Two Modes

### Micro-Check (During Execution)
Quick 30-second check via genius-qa-micro subagent.

### Full Audit (Before Deployment)
1. Run Playwright test suite
2. Visual testing (if Chrome available)
3. Generate TEST-REPORT.md

## Test Categories

- Authentication flows
- Core feature tests
- Dashboard tests
- Landing page tests
- API endpoint tests
- Accessibility checks

## Output

- TEST-REPORT.md - Comprehensive results
- tests/e2e/*.spec.ts - Playwright tests
- playwright-report/ - HTML report
