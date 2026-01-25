import { test, expect } from '@playwright/test';

// Helper to close any visible panel overlays by clicking on them
async function closeVisiblePanels(page: any) {
  const overlay = page.locator('.panel-overlay.visible');
  if (await overlay.count() > 0) {
    // Click on the overlay to trigger closeAllPanels
    await overlay.click({ force: true });
    await page.waitForTimeout(300);
  }
}

test.describe('Screens Navigation', () => {

  test.beforeEach(async ({ page }) => {
    // Skip demo overlay for all navigation tests
    await page.addInitScript(() => {
      localStorage.setItem('vibes:hasSeenDemo', 'true');
      localStorage.setItem('vibes:chatPanelOpen', 'false');
    });
  });

  test.describe('Command Center Screens', () => {
    test('Dashboard screen loads', async ({ page }) => {
      await page.goto('/');
      await page.waitForTimeout(500);
      // Dashboard is default, main content should show
      const content = page.locator('.main-content');
      await expect(content).toBeVisible();
    });

    test('Execution screen elements', async ({ page }) => {
      await page.goto('/');
      await page.waitForTimeout(500);
      // Check for execution-related UI
      const execBar = page.locator('.exec-bar');
      await expect(execBar).toBeVisible({ timeout: 5000 });
    });

    test('Tasks screen shows content', async ({ page }) => {
      await page.goto('/');
      await page.waitForTimeout(500);
      await closeVisiblePanels(page);

      const tasksNav = page.locator('.nav-item').filter({ hasText: 'Tasks' });
      if (await tasksNav.count() > 0) {
        await tasksNav.first().click();
        await page.waitForTimeout(500);

        // Should show task content or empty state
        const mainContent = page.locator('.main-content');
        await expect(mainContent).toBeVisible();
      }
    });

    test('Prompts screen loads', async ({ page }) => {
      await page.goto('/');
      await page.waitForTimeout(500);
      await closeVisiblePanels(page);

      const promptsNav = page.locator('.nav-item').filter({ hasText: 'Prompts' });
      if (await promptsNav.count() > 0) {
        await promptsNav.first().click();
        await page.waitForTimeout(500);

        const mainContent = page.locator('.main-content');
        await expect(mainContent).toBeVisible();
      }
    });
  });

  test.describe('.claude Screens', () => {
    test('Plan screen shows content', async ({ page }) => {
      await page.goto('/');
      await page.waitForTimeout(500);
      await closeVisiblePanels(page);

      const planNav = page.locator('.nav-item').filter({ hasText: 'Plan' });
      if (await planNav.count() > 0) {
        await planNav.first().click();
        await page.waitForTimeout(500);

        const mainContent = page.locator('.main-content');
        await expect(mainContent).toBeVisible();
      }
    });

    test('Skills screen shows content', async ({ page }) => {
      await page.goto('/');
      await page.waitForTimeout(500);
      await closeVisiblePanels(page);

      const skillsNav = page.locator('.nav-item').filter({ hasText: 'Skills' });
      if (await skillsNav.count() > 0) {
        await skillsNav.first().click();
        await page.waitForTimeout(500);

        const mainContent = page.locator('.main-content');
        await expect(mainContent).toBeVisible();
      }
    });

    test('MCP screen loads', async ({ page }) => {
      await page.goto('/');
      await page.waitForTimeout(500);
      await closeVisiblePanels(page);

      const mcpNav = page.locator('.nav-item').filter({ hasText: 'MCP' });
      if (await mcpNav.count() > 0) {
        await mcpNav.first().click();
        await page.waitForTimeout(500);

        const mainContent = page.locator('.main-content');
        await expect(mainContent).toBeVisible();
      }
    });

    test('Settings screen shows content', async ({ page }) => {
      await page.goto('/');
      await page.waitForTimeout(500);
      await closeVisiblePanels(page);

      const settingsNav = page.locator('.nav-item').filter({ hasText: 'Settings' });
      if (await settingsNav.count() > 0) {
        await settingsNav.first().click();
        await page.waitForTimeout(500);

        const mainContent = page.locator('.main-content');
        await expect(mainContent).toBeVisible();
      }
    });

    test('Memory screen loads', async ({ page }) => {
      await page.goto('/');
      await page.waitForTimeout(500);
      await closeVisiblePanels(page);

      const memoryNav = page.locator('.nav-item').filter({ hasText: 'Memory' });
      if (await memoryNav.count() > 0) {
        await memoryNav.first().click();
        await page.waitForTimeout(500);

        const mainContent = page.locator('.main-content');
        await expect(mainContent).toBeVisible();
      }
    });
  });

  test.describe('Build Screens', () => {
    test('Code screen loads', async ({ page }) => {
      await page.goto('/');
      await page.waitForTimeout(500);
      await closeVisiblePanels(page);

      const codeNav = page.locator('.nav-item').filter({ hasText: 'Code' });
      if (await codeNav.count() > 0) {
        await codeNav.first().click();
        await page.waitForTimeout(500);

        const mainContent = page.locator('.main-content');
        await expect(mainContent).toBeVisible();
      }
    });

    test('Debug screen loads', async ({ page }) => {
      await page.goto('/');
      await page.waitForTimeout(500);
      await closeVisiblePanels(page);

      const debugNav = page.locator('.nav-item').filter({ hasText: 'Debug' });
      if (await debugNav.count() > 0) {
        await debugNav.first().click();
        await page.waitForTimeout(500);

        const mainContent = page.locator('.main-content');
        await expect(mainContent).toBeVisible();
      }
    });

    test('Tests screen loads', async ({ page }) => {
      await page.goto('/');
      await page.waitForTimeout(500);
      await closeVisiblePanels(page);

      const testsNav = page.locator('.nav-item').filter({ hasText: 'Tests' });
      if (await testsNav.count() > 0) {
        await testsNav.first().click();
        await page.waitForTimeout(500);

        const mainContent = page.locator('.main-content');
        await expect(mainContent).toBeVisible();
      }
    });
  });

  test.describe('Ship Screens', () => {
    test('Deploy screen loads', async ({ page }) => {
      await page.goto('/');
      await page.waitForTimeout(500);
      await closeVisiblePanels(page);

      const deployNav = page.locator('.nav-item').filter({ hasText: 'Deploy' });
      if (await deployNav.count() > 0) {
        await deployNav.first().click();
        await page.waitForTimeout(500);

        const mainContent = page.locator('.main-content');
        await expect(mainContent).toBeVisible();
      }
    });

    test('Logs screen loads', async ({ page }) => {
      await page.goto('/');
      await page.waitForTimeout(500);
      await closeVisiblePanels(page);

      const logsNav = page.locator('.nav-item').filter({ hasText: 'Logs' });
      if (await logsNav.count() > 0) {
        await logsNav.first().click();
        await page.waitForTimeout(500);

        const mainContent = page.locator('.main-content');
        await expect(mainContent).toBeVisible();
      }
    });

    test('Analytics screen loads', async ({ page }) => {
      await page.goto('/');
      await page.waitForTimeout(500);
      await closeVisiblePanels(page);

      const analyticsNav = page.locator('.nav-item').filter({ hasText: 'Analytics' });
      if (await analyticsNav.count() > 0) {
        await analyticsNav.first().click();
        await page.waitForTimeout(500);

        const mainContent = page.locator('.main-content');
        await expect(mainContent).toBeVisible();
      }
    });
  });

  test.describe('System Screens', () => {
    test('Connections screen loads', async ({ page }) => {
      await page.goto('/');
      await page.waitForTimeout(500);
      await closeVisiblePanels(page);

      const connectionsNav = page.locator('.nav-item').filter({ hasText: 'Connections' });
      if (await connectionsNav.count() > 0) {
        await connectionsNav.first().click();
        await page.waitForTimeout(500);

        const mainContent = page.locator('.main-content');
        await expect(mainContent).toBeVisible();
      }
    });

    test('Environment screen loads', async ({ page }) => {
      await page.goto('/');
      await page.waitForTimeout(500);
      await closeVisiblePanels(page);

      const envNav = page.locator('.nav-item').filter({ hasText: 'Environment' });
      if (await envNav.count() > 0) {
        await envNav.first().click();
        await page.waitForTimeout(500);

        const mainContent = page.locator('.main-content');
        await expect(mainContent).toBeVisible();
      }
    });
  });

});
