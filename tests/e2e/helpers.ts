import { Page } from '@playwright/test';

/**
 * Mock data to bypass OnboardingWizard by simulating Claude connection
 */
const MOCK_CONNECTIONS_STORE = {
  state: {
    connections: [
      {
        id: 'claude-mock',
        type: 'claude',
        name: 'Claude',
        status: 'connected',
        lastConnected: new Date().toISOString(),
      }
    ],
    isConnecting: null,
  },
  version: 0,
};

/**
 * Sets up localStorage mocks to bypass demo overlay and onboarding wizard.
 * Call this in page.addInitScript() before navigating to the page.
 */
export function getTestSetupScript(): string {
  return `
    // Skip demo overlay
    localStorage.setItem('vibes:hasSeenDemo', 'true');
    // Close chat panel by default
    localStorage.setItem('vibes:chatPanelOpen', 'false');
    // Mock Claude connection to bypass OnboardingWizard
    localStorage.setItem('vibes-connections', '${JSON.stringify(MOCK_CONNECTIONS_STORE)}');
  `;
}

/**
 * Setup function to be called in test.beforeEach
 */
export async function setupTestEnvironment(page: Page): Promise<void> {
  await page.addInitScript(() => {
    // Skip demo overlay
    localStorage.setItem('vibes:hasSeenDemo', 'true');
    // Close chat panel by default
    localStorage.setItem('vibes:chatPanelOpen', 'false');
    // Mock Claude connection to bypass OnboardingWizard
    const mockConnections = {
      state: {
        connections: [
          {
            id: 'claude-mock',
            type: 'claude',
            name: 'Claude',
            status: 'connected',
            lastConnected: new Date().toISOString(),
          }
        ],
        isConnecting: null,
      },
      version: 0,
    };
    localStorage.setItem('vibes-connections', JSON.stringify(mockConnections));
  });
}

/**
 * Helper to close any visible panel overlays by clicking on them
 */
export async function closeVisiblePanels(page: Page): Promise<void> {
  const overlay = page.locator('.panel-overlay.visible');
  if (await overlay.count() > 0) {
    await overlay.click({ force: true });
    await page.waitForTimeout(300);
  }
}

/**
 * Helper to dismiss any modal overlays (onboarding, etc)
 */
export async function dismissModals(page: Page): Promise<void> {
  // Try to close onboarding wizard if visible
  const onboardingSkip = page.locator('button:has-text("Skip"), button:has-text("Later")');
  if (await onboardingSkip.count() > 0) {
    await onboardingSkip.first().click({ force: true });
    await page.waitForTimeout(300);
  }
}
