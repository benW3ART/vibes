---
name: genius-designer
description: Creates complete brand identity and design system with 2-3 visual options in an interactive HTML file. REQUIRES USER TO CHOOSE an option before continuing.
---

# Genius Designer v6.2 - Visual Identity Creator

**Crafting your brand's visual language.**

## STARTUP VERIFICATION

```bash
# Verify preconditions - specs must be APPROVED
python3 scripts/state-manager.py check genius-designer
if [ $? -ne 0 ]; then
    echo "Cannot proceed. Specifications must be approved first."
    echo "Run: genius approve specs"
    exit 1
fi

# Mark skill start
python3 scripts/state-manager.py start genius-designer
```

## Required Input

```bash
# Verify specs are approved
if [ ! -f SPECIFICATIONS.xml ]; then
    echo "ERROR: SPECIFICATIONS.xml not found"
    exit 1
fi

# Check approval in state
approval=$(python3 -c "import json; print(json.load(open('.genius/STATE.json'))['checkpoints']['specs_approved'])")
if [ "$approval" != "True" ]; then
    echo "ERROR: Specifications not approved. Run 'genius approve specs' first."
    exit 1
fi
```

## Process

1. Analyze project from DISCOVERY.xml and SPECIFICATIONS.xml
2. Generate 2-3 design directions based on project type
3. Create interactive HTML preview
4. **WAIT** for user to choose (MANDATORY CHECKPOINT)

## Design Options

| Option | Style | Best For |
|--------|-------|----------|
| **Modern Minimal** | Clean, white space, subtle | SaaS, Tech |
| **Bold & Vibrant** | Strong colors, energetic | Consumer, Startups |
| **Classic Professional** | Trustworthy, refined | Finance, Enterprise |

## Output

Generate DESIGN-SYSTEM.html with:
- Tab navigation for each option
- Color palettes with CSS variables
- Typography showcase with font pairings
- Component examples (buttons, inputs, cards)
- Dark mode variants
- Brand personality description

Also generate design-config.json (after user chooses):
```json
{
  "selectedOption": "A",
  "colors": {
    "primary": "#...",
    "secondary": "#...",
    "accent": "#...",
    "background": "#...",
    "text": "#..."
  },
  "typography": {
    "heading": "Font Name",
    "body": "Font Name"
  },
  "borderRadius": "8px",
  "shadow": "0 4px 6px rgba(0,0,0,0.1)"
}
```

## COMPLETION - REQUIRES USER CHOICE

### Step 1: Verify Output
```bash
if [ ! -f DESIGN-SYSTEM.html ]; then
    echo "ERROR: DESIGN-SYSTEM.html not created!"
    exit 1
fi
```

### Step 2: Display Options for Selection
```
═══════════════════════════════════════════════════════════════
                 DESIGN OPTIONS READY
═══════════════════════════════════════════════════════════════

🎨 Open DESIGN-SYSTEM.html in your browser to see your options.

📋 Options:
   • Option A: [Style name] - [Brief description]
   • Option B: [Style name] - [Brief description]
   • Option C: [Style name] - [Brief description]

═══════════════════════════════════════════════════════════════

🔒 SELECTION REQUIRED

Which design direction do you prefer?

👉 "Option A" - to choose that direction
👉 "Option B, but with darker colors" - to choose with modifications
👉 "Mix A and C" - to combine elements

Your choice will define the entire visual identity.

═══════════════════════════════════════════════════════════════
```

### Step 3: WAIT FOR USER CHOICE

**DO NOT CONTINUE until user makes a selection.**

This is a MANDATORY CHECKPOINT.

### Step 4: On Selection

When user chooses:

1. Create design-config.json with selected values
2. Update state:
```bash
bash scripts/genius-cli.sh approve design
```

3. Update KNOWLEDGE-BASE.md:
```markdown
## Design Decision
- Selected: Option [X]
- Reason: [User's stated preference or implicit reason]
- Date: [timestamp]
```

4. Announce:
```
✅ Design Locked: Option [X]

Design system saved to design-config.json.

Next: Creating marketing strategy and architecture...
```

5. Continue to next skills:
```bash
python3 scripts/state-manager.py start genius-marketer
```

Then run genius-marketer and genius-architect (can run in parallel conceptually, but execute sequentially).
