# Reset Command

Start over from scratch.

## Usage

```
/reset
```

## Behavior

1. Confirm with user (destructive action)
2. Archive current state (optional)
3. Remove generated files
4. Return to initial state

## Implementation

```markdown
When user types /reset:

1. Display warning:

⚠️ **Reset Project**

This will remove all generated files and start fresh:
- DISCOVERY.xml
- MARKET-ANALYSIS.xml
- SPECIFICATIONS.xml
- DESIGN-SYSTEM.html
- .claude/plan.md
- PROGRESS.md
- All generated code

**Options:**
1. Reset and archive (save backup in .archive/)
2. Reset completely (delete everything)
3. Cancel

Type 1, 2, or 3:

2. On confirmation:

If option 1 (archive):
```bash
mkdir -p .archive/$(date +%Y%m%d_%H%M%S)
mv DISCOVERY.xml .archive/.../
mv MARKET-ANALYSIS.xml .archive/.../
# ... move all files
```

If option 2 (delete):
```bash
rm -f DISCOVERY.xml
rm -f MARKET-ANALYSIS.xml
rm -f SPECIFICATIONS.xml
rm -f DESIGN-SYSTEM.html
rm -rf .claude/plan.md
rm -f PROGRESS.md
rm -f COPY.md
rm -f INTEGRATIONS.md
rm -f ARCHITECTURE.md
# Keep settings, skills, and user profile
```

3. Confirm reset:

✅ **Project Reset**

All generated files have been [archived/removed].
Ready to start a new project.

What would you like to build?
```

## Safety

- Always requires confirmation
- Preserves .claude/settings.json
- Preserves .claude/skills/
- Preserves .claude/user-profile.json
- Archive option keeps history
