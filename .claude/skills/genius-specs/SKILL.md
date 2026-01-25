---
name: genius-specs
description: Transforms discovery findings into formal specifications with user stories, use cases, business rules, and acceptance criteria. REQUIRES USER APPROVAL before continuing.
---

# Genius Specs v6.2 - Formal Specifications

**Turning vision into actionable requirements.**

## STARTUP VERIFICATION

```bash
# Verify preconditions
python3 scripts/state-manager.py check genius-specs
if [ $? -ne 0 ]; then
    echo "Cannot proceed. Check requirements above."
    exit 1
fi

# Mark skill start
python3 scripts/state-manager.py start genius-specs
```

## Required Input

```bash
# Verify required files
for f in DISCOVERY.xml MARKET-ANALYSIS.xml; do
    if [ ! -f "$f" ]; then
        echo "ERROR: $f not found"
        exit 1
    fi
done
echo "✓ All inputs available"
```

## Specification Components

### 1. User Stories
```
US-001: As a [role], I want [feature], so that [benefit]
Acceptance Criteria:
- Given [context]
- When [action]
- Then [result]
```

### 2. Use Cases
- Actors and their goals
- Preconditions
- Main flow (happy path)
- Alternative flows
- Postconditions

### 3. Business Rules
```
BR-001: [Rule description]
Condition: [When this applies]
Action: [What must happen]
```

### 4. Technical Requirements
- Performance targets (response times, load capacity)
- Security requirements (auth, encryption, compliance)
- Compatibility (browsers, devices, APIs)

### 5. Data Model
- Entities and relationships
- Required fields and types
- Validation rules

### 6. API Endpoints
- Routes and methods
- Request/response schemas
- Authentication requirements

### 7. Screens
- Pages and their purposes
- Key components per page
- User flows

## Output

Generate SPECIFICATIONS.xml:

```xml
<specifications version="6.2">
  <userStories>
    <story id="US-001">
      <role>user</role>
      <want>sign up with email</want>
      <benefit>access the platform</benefit>
      <acceptanceCriteria>
        <given>I am on the signup page</given>
        <when>I enter valid email and password</when>
        <then>I receive a confirmation email</then>
      </acceptanceCriteria>
      <priority>high</priority>
    </story>
    <!-- More stories -->
  </userStories>
  
  <useCases>
    <useCase id="UC-001">
      <name>User Registration</name>
      <actor>New User</actor>
      <precondition>User is not logged in</precondition>
      <mainFlow>
        <step>1. User clicks "Sign Up"</step>
        <step>2. System displays form</step>
        <step>3. User enters details</step>
        <step>4. System validates and creates account</step>
      </mainFlow>
      <postcondition>User account exists</postcondition>
    </useCase>
  </useCases>
  
  <businessRules>
    <rule id="BR-001">
      <description>Email must be unique</description>
      <condition>During registration</condition>
      <action>Reject duplicate emails</action>
    </rule>
  </businessRules>
  
  <technicalRequirements>
    <performance>
      <responseTime>API responses under 200ms</responseTime>
      <concurrent>Support 100 concurrent users</concurrent>
    </performance>
    <security>
      <auth>JWT-based authentication</auth>
      <encryption>TLS 1.3 for all traffic</encryption>
    </security>
  </technicalRequirements>
  
  <dataModel>
    <entity name="User">
      <field name="id" type="uuid" required="true"/>
      <field name="email" type="string" required="true" unique="true"/>
      <field name="password_hash" type="string" required="true"/>
      <field name="created_at" type="timestamp" required="true"/>
    </entity>
  </dataModel>
  
  <screens>
    <screen name="Landing">
      <purpose>Convert visitors to signups</purpose>
      <components>Hero, Features, CTA, Footer</components>
    </screen>
    <screen name="Dashboard">
      <purpose>Main user workspace</purpose>
      <components>Nav, Sidebar, Content, Stats</components>
    </screen>
  </screens>
</specifications>
```

## COMPLETION - REQUIRES APPROVAL

After generating SPECIFICATIONS.xml:

### Step 1: Verify Output
```bash
if [ ! -f SPECIFICATIONS.xml ]; then
    echo "ERROR: SPECIFICATIONS.xml not created!"
    exit 1
fi
```

### Step 2: Display Summary for Approval
```
═══════════════════════════════════════════════════════════════
                 SPECIFICATIONS COMPLETE
═══════════════════════════════════════════════════════════════

📋 Summary:
   • User Stories: [X] stories defined
   • Use Cases: [X] use cases documented  
   • Business Rules: [X] rules specified
   • Data Entities: [X] entities modeled
   • API Endpoints: [X] endpoints defined
   • Screens: [X] screens planned

📄 Full specifications: SPECIFICATIONS.xml

═══════════════════════════════════════════════════════════════

🔒 APPROVAL REQUIRED

These specifications define what will be built. Please review.

To approve and continue to design phase:
  → Say "approved" or run: genius approve specs

To request changes:
  → Tell me what to modify

═══════════════════════════════════════════════════════════════
```

### Step 3: WAIT FOR USER APPROVAL

**DO NOT CONTINUE until user explicitly approves.**

This is a MANDATORY CHECKPOINT. The user must either:
1. Say "approved", "yes", "continue", "looks good" → Continue
2. Request changes → Make changes, show summary again

### Step 4: On Approval
```bash
# User has approved - update state
bash scripts/genius-cli.sh approve specs
python3 scripts/state-manager.py start genius-designer
```

Then output:
```
✅ Specifications Approved!

Creating design options...
```

And immediately continue to genius-designer skill.
