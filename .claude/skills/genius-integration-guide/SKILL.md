---
name: genius-integration-guide
description: Guides user step-by-step through external service setup based on project phase (MVP/Beta/Production). Collects environment variables, validates configurations, creates .env files. Use for "setup integrations", "configure services", "env setup", "e...
---

# Genius Integration Guide v6.0 - Service Setup Wizard

**Setting up your external services, step by step.**

## Phase-Based Services

### MVP (Essential)
- Database: Supabase
- Auth: Supabase Auth
- Hosting: Vercel
- Email: Resend

### Beta (Add Monitoring)
- Analytics: PostHog
- Error Tracking: Sentry
- Storage: S3/Supabase Storage

### Production (Full Infrastructure)
- Payments: Stripe
- Cache: Upstash Redis
- CDN: Cloudflare

## Process

1. Read SPECIFICATIONS.xml for requirements
2. Ask user: "What phase are you targeting? MVP/Beta/Production"
3. Guide through each service setup with links
4. Collect and validate environment variables
5. Test connections where possible
6. Generate .env files

## Output

- INTEGRATIONS.md - Documentation of configured services
- .env.example - Template (safe to commit)
- .env.local - Actual values (gitignored)

## Handoff

After MVP services configured, continue to genius-architect.
