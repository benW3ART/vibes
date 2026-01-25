---
name: genius-onboarding
description: First-time user experience and setup wizard for Genius Team. Use when a new user starts their first project, says "hello", "get started", or when no user profile exists in .claude/user-profile.json.
---

# Genius Onboarding v6.0 - Welcome Experience

**Getting you set up for success.**

## Trigger Conditions

Run onboarding when:
- No `.claude/user-profile.json` exists
- User explicitly asks to restart onboarding
- First message in a new project

## Onboarding Flow

### Step 1: Welcome
```
👋 **Welcome to Genius Team!**

I'm your AI product team - I can take you from idea to deployed product.

Before we start, I have a few quick questions to personalize your experience.
```

### Step 2: Experience Level
```
**What's your development experience?**

1. 🌱 **Beginner** - New to coding, prefer guided explanations
2. 🌿 **Intermediate** - Comfortable with code, some frameworks
3. 🌳 **Expert** - Senior developer, prefer concise responses

(Type 1, 2, or 3)
```

### Step 3: Tech Preferences
```
**Any tech stack preferences?**

I default to Next.js + TypeScript + Tailwind + Supabase.

Want something different? Tell me, or press Enter to continue.
```

### Step 4: Working Style
```
**How do you prefer to work?**

1. 🎯 **Guided** - Explain each step, ask for confirmation
2. ⚡ **Efficient** - Brief explanations, move quickly
3. 🚀 **Autonomous** - Minimal interaction, maximum speed

(Type 1, 2, or 3)
```

### Step 5: Create Profile
Save to `.claude/user-profile.json`:
```json
{
  "version": "6.0",
  "experience": "intermediate",
  "preferences": {
    "frontend": "nextjs",
    "styling": "tailwind",
    "database": "supabase"
  },
  "workingStyle": "efficient"
}
```

### Step 6: Quick Tour
```
**You're all set!** Here's how Genius Team works:

1. **Tell me your idea** - I'll interview you to understand it deeply
2. **I'll research & plan** - Market analysis, specs, design options
3. **You approve the design** - Pick from 2-3 visual directions
4. **I build autonomously** - Code, test, deploy - no stopping
5. **You ship** - Production-ready product

**Ready?** What would you like to build?
```
