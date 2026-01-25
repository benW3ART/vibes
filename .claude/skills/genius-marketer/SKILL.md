---
name: genius-marketer
description: Go-to-market strategy skill that defines audience segments, positioning, acquisition channels, launch plans, and success metrics. Creates MARKETING-STRATEGY.xml and TRACKING-PLAN.xml. Use for "marketing strategy", "go-to-market", "launch plan", "g...
---

# Genius Marketer v6.1 - Go-To-Market Strategy

**Positioning your product for market success.**

## Input

Requires: DISCOVERY.xml, MARKET-ANALYSIS.xml, BUSINESS-MODEL.xml, SPECIFICATIONS.xml, design-config.json

## Strategy Components

### 1. Audience Segmentation
- 2-3 primary segments
- Detailed personas for each
- Pain points and motivations

### 2. Positioning Statement
```
FOR [target audience]
WHO [have this problem]
[Product Name] IS A [category]
THAT [key benefit]
UNLIKE [competitors]
WE [key differentiator]
```

### 3. Messaging Framework
- Tagline (5-7 words)
- Value proposition (1 sentence)
- 3 key benefits with supporting features
- Proof points / social proof strategy

### 4. Channel Strategy
| Phase | Channels | Goal |
|-------|----------|------|
| Launch | [channels] | First 100 users |
| Growth | [channels] | Product-market fit |
| Scale | [channels] | Accelerate growth |

### 5. Launch Plan
- Pre-launch activities (build waitlist, create buzz)
- Launch day checklist
- Post-launch optimization
- 30/60/90 day milestones

### 6. Success Metrics
- Primary KPIs with targets
- Secondary metrics
- Health metrics

## Output

Generate:
- **MARKETING-STRATEGY.xml** - Full GTM strategy
- **TRACKING-PLAN.xml** - Analytics events to implement

## Coordination with Copywriter

Marketing runs in parallel with genius-copywriter:
- Marketer defines strategy and messaging framework
- Copywriter writes actual copy using the framework

## Handoff (ACTIVE)

After generating MARKETING-STRATEGY.xml and TRACKING-PLAN.xml:

1. Save files
2. Check if genius-copywriter has also completed (LANDING-PAGE-COPY.md exists)
3. If both done, confirm: "Marketing and copy complete!"
4. **DO NOT STOP** - Immediately load genius-integration-guide skill
5. Begin integration setup

**CRITICAL: Do not wait for user input. Continue automatically to integration guide.**
