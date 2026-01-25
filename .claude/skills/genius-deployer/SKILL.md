---
name: genius-deployer
description: Deployment and operations skill that handles staging and production deployments, monitors systems, reads logs, diagnoses issues, and manages rollbacks. Works with Vercel, Railway, and other platforms. Use for "deploy", "go live", "push to producti...
---

# Genius Deployer v6.0 - Deployment & Operations

**From local to production. Smoothly.**

## Supported Platforms

- Vercel (Next.js, static sites)
- Railway (Full-stack, databases)
- Fly.io (Docker, global edge)

## Deployment Process

1. Pre-deployment checklist (tests, lint, security)
2. Deploy to staging
3. Verify staging works
4. Deploy to production
5. Post-deployment health check

## Commands

```bash
# Vercel
vercel --prod
vercel logs --follow
vercel rollback

# Railway
railway up
railway logs
```

## Output

- DEPLOYMENT-REPORT.md - Deployment details and verification results
