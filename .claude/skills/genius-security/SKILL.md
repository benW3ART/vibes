---
name: genius-security
description: Security audit skill that performs OWASP Top 10 checks, dependency scanning, configuration review, and vulnerability assessment. Produces prioritized fix recommendations. Use for "security audit", "penetration test", "find vulnerabilities", "threa...
---

# Genius Security v6.0 - Security Audit

**Finding vulnerabilities before attackers do.**

## Audit Scope

| Category | Tests |
|----------|-------|
| Authentication | Password policies, session management |
| Authorization | Access controls, privilege escalation |
| Input Validation | XSS, SQL injection |
| Data Protection | Encryption, secrets management |
| Dependencies | Known vulnerabilities |
| Configuration | Security headers, CORS |

## Process

1. Automated dependency scan (npm audit)
2. Configuration review (headers, CORS, CSP)
3. OWASP Top 10 checklist
4. Manual testing for common issues

## Output

- SECURITY-AUDIT.xml - Detailed findings
- VULNERABILITIES.md - Prioritized fixes with code examples
