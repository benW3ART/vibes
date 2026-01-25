---
name: genius-product-market-analyst
description: Market research and business strategy skill that validates product-market fit, analyzes competition, identifies market gaps, and proposes business models.
---

# Genius Product Market Analyst v6.2 - Market Validation

**Validating your idea with real data.**

## STARTUP VERIFICATION

```bash
# Verify preconditions
python3 scripts/state-manager.py check genius-product-market-analyst
if [ $? -ne 0 ]; then
    echo "Cannot proceed. Check requirements above."
    exit 1
fi

# Mark skill start
python3 scripts/state-manager.py start genius-product-market-analyst
```

## Required Input

Verify DISCOVERY.xml exists and read it:
```bash
if [ ! -f DISCOVERY.xml ]; then
    echo "ERROR: DISCOVERY.xml not found. Run genius-interviewer first."
    exit 1
fi
cat DISCOVERY.xml
```

## Process

1. Read DISCOVERY.xml for project context
2. Use WebSearch to find market data, trends, competitors
3. Analyze competitor features, pricing, positioning
4. Identify gaps and opportunities
5. Recommend positioning and business model

## Research Areas

- **Market Size**: TAM/SAM/SOM estimates
- **Competitors**: 3-5 main competitors with strengths/weaknesses
- **Pricing**: Market benchmarks
- **Trends**: Industry direction
- **Pain Points**: What customers complain about

## Output

Generate TWO files:

### MARKET-ANALYSIS.xml
```xml
<marketAnalysis version="6.2">
  <market>
    <tam>Total Addressable Market</tam>
    <sam>Serviceable Addressable Market</sam>
    <som>Serviceable Obtainable Market</som>
    <growth>Growth rate</growth>
  </market>
  <competitors>
    <competitor>
      <n>Name</n>
      <url>Website</url>
      <strengths>What they do well</strengths>
      <weaknesses>Where they fall short</weaknesses>
      <pricing>Their pricing</pricing>
    </competitor>
    <!-- 2-4 more competitors -->
  </competitors>
  <positioning>
    <gap>Market gap to exploit</gap>
    <differentiation>How to stand out</differentiation>
    <targetSegment>Primary customer segment</targetSegment>
  </positioning>
</marketAnalysis>
```

### BUSINESS-MODEL.xml
```xml
<businessModel version="6.2">
  <revenue>Revenue model (SaaS, marketplace, etc)</revenue>
  <pricing>
    <tier name="free">Free tier details</tier>
    <tier name="pro">Pro tier: $X/mo - features</tier>
    <tier name="enterprise">Enterprise tier details</tier>
  </pricing>
  <metrics>
    <primary>MRR, ARR, or GMV</primary>
    <secondary>Retention, NPS, CAC/LTV</secondary>
  </metrics>
  <unitEconomics>
    <cac>Customer Acquisition Cost estimate</cac>
    <ltv>Lifetime Value estimate</ltv>
  </unitEconomics>
</businessModel>
```

## COMPLETION STEPS (MANDATORY)

### Step 1: Verify Outputs
```bash
if [ ! -f MARKET-ANALYSIS.xml ] || [ ! -f BUSINESS-MODEL.xml ]; then
    echo "ERROR: Output files not created!"
    exit 1
fi
echo "✓ Market analysis files created"
```

### Step 2: Update State
```bash
python3 scripts/state-manager.py complete genius-product-market-analyst MARKET-ANALYSIS.xml BUSINESS-MODEL.xml
bash scripts/genius-cli.sh checkpoint "Market analysis complete"
```

### Step 3: Display Summary
```
✅ Market Analysis Complete!

Key findings:
• Market size: [TAM figure]
• Main competitors: [2-3 names]
• Your opportunity: [key gap]
• Recommended pricing: [range]

Files created:
- MARKET-ANALYSIS.xml
- BUSINESS-MODEL.xml

Next: Writing formal specifications...
```

### Step 4: Continue to Next Skill
```bash
python3 scripts/state-manager.py start genius-specs
```

**DO NOT STOP** - Immediately load genius-specs and begin specifications.
