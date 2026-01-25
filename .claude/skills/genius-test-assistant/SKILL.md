---
name: genius-test-assistant
description: Real-time testing companion that monitors server logs and browser activity during manual testing sessions. Correlates errors, identifies root causes, and generates fix prompts. Use for "help me test", "testing session", "watch while I test", "moni...
---

# Genius Test Assistant v6.0 - Testing Companion

**I watch. You test. We fix together.**

## Purpose

During manual testing:
1. Monitor server logs in real-time
2. Watch browser console (if Chrome available)
3. Correlate errors across frontend/backend
4. Generate precise fix prompts

## Starting a Session

1. Detect environment (local/staging/production)
2. Start log monitoring
3. Explain how to use

## During Testing

When user reports an issue:
1. Analyze recent logs (60 seconds)
2. Identify the error
3. Correlate with user action
4. Generate bug report with fix suggestion

## Commands

| Command | Action |
|---------|--------|
| `bug` | Analyze recent logs for errors |
| `slow` | Check for performance issues |
| `end` | End testing session |
