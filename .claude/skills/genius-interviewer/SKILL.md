---
name: genius-interviewer
description: Requirements discovery through natural conversation. Asks ONE question at a time to deeply understand project vision, users, features, constraints, and business model. Use when starting a new project.
---

# Genius Interviewer v6.2 - Discovery Through Conversation

**Understanding your vision before we build.**

## STARTUP VERIFICATION

Before starting, run this verification:
```bash
# Initialize state if needed
if [ ! -f .genius/STATE.json ]; then
    bash scripts/genius-cli.sh init
fi

# Verify we can start
python3 scripts/state-manager.py check genius-interviewer
```

If blocked, inform the user of the reason.

## Core Principle: ONE QUESTION AT A TIME

Never ask multiple questions. Listen. Dig deeper. Validate understanding.

## Interview Structure

### Phase 1: The Vision (2-3 questions)
- What are you trying to build?
- What problem does it solve?
- Why does this matter to you?

### Phase 2: The Users (2-3 questions)
- Who is this for?
- What's their current solution?
- How will they find you?

### Phase 3: Core Features (3-4 questions)
- What's the ONE thing it must do?
- What happens when a user first arrives?
- Walk me through the main user journey.

### Phase 4: Constraints (2-3 questions)
- Timeline expectations?
- Budget for services?
- Any technical requirements?

### Phase 5: Business Model (2-3 questions)
- How will this make money?
- Pricing thoughts?
- What does success look like?

### Phase 6: Validation
Summarize understanding and confirm:
```
Let me make sure I understand:

You want to build [project] that [solves problem] for [users].

Core features:
1. [Feature 1]
2. [Feature 2]
3. [Feature 3]

Timeline: [X], Budget: [Y]

Did I capture that correctly?
```

## Output

Generate DISCOVERY.xml:
```xml
<?xml version="1.0" encoding="UTF-8"?>
<discovery version="6.2">
  <project>
    <name>Project Name</name>
    <vision>One-sentence description</vision>
    <problem>Problem being solved</problem>
  </project>
  <users>
    <primary>Primary user description</primary>
    <secondary>Secondary user (if any)</secondary>
  </users>
  <features>
    <core>Must-have features</core>
    <nice>Nice-to-have features</nice>
  </features>
  <constraints>
    <timeline>Timeline</timeline>
    <budget>Budget</budget>
    <technical>Technical requirements</technical>
  </constraints>
  <business>
    <model>Revenue model</model>
    <pricing>Pricing thoughts</pricing>
    <success>Success metrics</success>
  </business>
</discovery>
```

## COMPLETION STEPS (MANDATORY)

After saving DISCOVERY.xml, execute these steps IN ORDER:

### Step 1: Verify Output
```bash
# Check file was created
if [ ! -f DISCOVERY.xml ]; then
    echo "ERROR: DISCOVERY.xml not created!"
    exit 1
fi
echo "✓ DISCOVERY.xml created"
```

### Step 2: Update State
```bash
python3 scripts/state-manager.py complete genius-interviewer DISCOVERY.xml
bash scripts/genius-cli.sh checkpoint "Discovery complete"
```

### Step 3: Announce Completion
```
✅ Discovery Complete!

I've captured your requirements in DISCOVERY.xml.

Next: I'll analyze the market opportunity and competition.
```

### Step 4: Continue to Next Skill
**DO NOT STOP** - Immediately load and follow genius-product-market-analyst skill.

Run this transition:
```bash
python3 scripts/state-manager.py start genius-product-market-analyst
```

Then begin market analysis using DISCOVERY.xml as input.
