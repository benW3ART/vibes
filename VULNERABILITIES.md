# Security Vulnerabilities Report

**Project:** vibes  
**Version:** 0.1.0  
**Date:** 2026-01-26  
**Auditor:** Genius Security v6.0

---

## Risk Summary

| Severity | Count | Status |
|----------|-------|--------|
| Critical | 0 | - |
| High | 2 | Action Required |
| Medium | 3 | Recommended Fix |
| Low | 2 | Monitor |

**Overall Security Posture:** GOOD with improvements needed

---

## High Severity Issues

### SEC-001: GitHub Access Token Stored in localStorage

**Risk Level:** HIGH  
**OWASP Category:** A02:2021 - Cryptographic Failures

**Description:**  
GitHub OAuth access tokens are persisted to localStorage via zustand's persist middleware. This storage is accessible to any JavaScript on the page and persists indefinitely.

**Location:**
- `src/stores/connectionsStore.ts` (lines 72-74)
- `src/components/global/OnboardingWizard.tsx` (line 178)

**Impact:**
- If an XSS vulnerability is discovered, tokens could be stolen
- Tokens persist even after user logs out of GitHub
- No token rotation or expiration handling

**Fix:**

Option A - Use Electron's safeStorage (Recommended):
```typescript
// electron/ipc/handlers.ts
import { safeStorage } from 'electron';

ipcMain.handle('credentials:store', async (_event, key: string, value: string) => {
  if (!safeStorage.isEncryptionAvailable()) {
    return { success: false, error: 'Encryption not available' };
  }
  const encrypted = safeStorage.encryptString(value);
  // Store encrypted buffer in a secure location
  return { success: true };
});

ipcMain.handle('credentials:retrieve', async (_event, key: string) => {
  // Retrieve and decrypt
  return safeStorage.decryptString(encryptedBuffer);
});
```

Option B - Session-only storage:
```typescript
// connectionsStore.ts - Remove persist for sensitive data
export const useConnectionsStore = create<ConnectionsState>()(
  persist(
    (set, get) => ({ ... }),
    {
      name: 'vibes-connections',
      partialize: (state) => ({
        // Only persist non-sensitive data
        connections: state.connections.map(c => ({
          ...c,
          metadata: c.type === 'github' 
            ? { username: c.metadata?.username } // Exclude accessToken
            : c.metadata
        }))
      })
    }
  )
);
```

**Priority:** HIGH - Fix before public release

---

### SEC-002: Dependency Vulnerability (tar)

**Risk Level:** HIGH (npm audit) / LOW (actual risk)  
**OWASP Category:** A06:2021 - Vulnerable Components

**Description:**  
The tar package (≤7.5.3) has known vulnerabilities for arbitrary file overwrite. However, this is a **build-time dependency only** via electron-builder - it does NOT ship with the application.

**Vulnerabilities:**
- GHSA-8qq5-rm4j-mr97: Arbitrary File Overwrite
- GHSA-r6q2-hw4h-h46w: Race Condition

**Impact:**  
Build machine only. End users are NOT affected as tar is not bundled.

**Fix:**
```bash
# Monitor for updates
npm outdated electron-builder

# When available, update:
npm install electron-builder@latest
```

**Priority:** LOW - Monitor for upstream fix

---

## Medium Severity Issues

### SEC-003: Remote URL Not Validated

**Risk Level:** MEDIUM  
**Location:** `electron/ipc/handlers.ts:1172`

**Description:**  
Git remote URLs are not validated before being passed to git commands.

**Fix:**
```typescript
// Add URL validation
function isValidGitUrl(url: string): boolean {
  const patterns = [
    /^https:\/\/github\.com\/[\w.-]+\/[\w.-]+\.git$/,
    /^https:\/\/gitlab\.com\/[\w.-]+\/[\w.-]+\.git$/,
    /^git@github\.com:[\w.-]+\/[\w.-]+\.git$/,
    /^git@gitlab\.com:[\w.-]+\/[\w.-]+\.git$/,
  ];
  return patterns.some(p => p.test(url));
}

// In GIT_ADD_REMOTE handler:
if (!isValidGitUrl(remoteUrl)) {
  return { success: false, error: 'Invalid git URL format' };
}
```

**Priority:** MEDIUM - Recommended for next release

---

### SEC-004: Commit Message Validation Overly Restrictive

**Risk Level:** MEDIUM (UX issue)  
**Location:** `electron/ipc/handlers.ts:1212`

**Description:**  
The commit message regex blocks valid characters that pose no security risk when using execFile.

**Current validation:**
```typescript
/[&;|`$()[\]{}><\\]/.test(message)  // Blocks these characters
```

**Fix:**
```typescript
// Since execFile with shell:false is safe, relax validation:
if (!message || message.length > 500) {
  return { success: false, error: 'Commit message required (max 500 chars)' };
}
// Remove character restrictions - execFile handles safely
```

**Priority:** MEDIUM - Quality of life improvement

---

### SEC-005: CSP Contains unsafe-inline

**Risk Level:** MEDIUM  
**Location:** `index.html:6`

**Description:**  
The CSP allows `'unsafe-inline'` for scripts, weakening XSS protection.

**Current CSP:**
```html
script-src 'self' 'unsafe-inline'
```

**Fix:**  
Configure Vite to use nonces:

```typescript
// vite.config.ts
export default defineConfig({
  html: {
    cspNonce: true
  }
})
```

```html
<!-- index.html -->
<meta http-equiv="Content-Security-Policy" 
      content="script-src 'self' 'nonce-{NONCE}'">
```

**Priority:** MEDIUM - Improves defense in depth

---

## Low Severity Issues

### SEC-006: Polling Interval Memory Leak

**Location:** `src/components/global/OnboardingWizard.tsx:108-144`

**Fix:**
```typescript
const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

useEffect(() => {
  return () => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
    }
  };
}, []);

// In handleConnectClaude:
pollIntervalRef.current = setInterval(...);
```

---

### SEC-007: File Paths Exposed in Git Status

**Location:** `electron/ipc/handlers.ts:1126`

**Description:** Full file paths returned in changes array.

**Fix:** Return relative paths only:
```typescript
changes: statusOut.trim().split('\n').map(line => {
  const status = line.substring(0, 2);
  const relativePath = line.substring(3);
  return `${status} ${relativePath}`;
})
```

---

## Security Best Practices Implemented ✓

| Practice | Status |
|----------|--------|
| contextIsolation | ✓ Enabled |
| nodeIntegration | ✓ Disabled |
| execFile vs exec | ✓ Using execFile |
| shell: false | ✓ Default (safe) |
| Path validation | ✓ isPathAllowed() |
| Input validation | ✓ Repo/remote names |
| HTTPS for API | ✓ GitHub API |
| No eval/innerHTML | ✓ Safe rendering |
| CSP implemented | ✓ (with caveats) |
| Timeout limits | ✓ All git ops |

---

## Recommendations Summary

1. **Immediate:** Move GitHub tokens to Electron safeStorage
2. **Before Release:** Add git remote URL validation
3. **Quality:** Relax commit message validation
4. **Defense in Depth:** Remove CSP unsafe-inline
5. **Monitoring:** Watch for tar vulnerability fix

---

*Generated by Genius Security v6.0*
