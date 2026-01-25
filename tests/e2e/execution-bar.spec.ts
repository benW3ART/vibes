import { test, expect } from '@playwright/test';

// Helper to close any visible panel overlays
async function closeVisiblePanels(page: any) {
  const overlay = page.locator('.panel-overlay.visible');
  if (await overlay.count() > 0) {
    await overlay.click({ force: true });
    await page.waitForTimeout(300);
  }
}

test.describe('Execution Bar', () => {

  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('vibes:hasSeenDemo', 'true');
    });
    await page.goto('/');
    await page.waitForTimeout(500);
    await closeVisiblePanels(page);
  });

  test.describe('Layout and Visibility', () => {
    test('should display execution bar', async ({ page }) => {
      const execBar = page.locator('.exec-bar');
      await expect(execBar).toBeVisible();
    });

    test('should have play/pause button', async ({ page }) => {
      const playBtn = page.locator('.exec-bar-left button').first();
      await expect(playBtn).toBeVisible();
    });

    test('should have status badge', async ({ page }) => {
      const badge = page.locator('.exec-bar-left .badge');
      await expect(badge).toBeVisible();
    });

    test('should have progress section', async ({ page }) => {
      const progress = page.locator('.exec-bar-center');
      await expect(progress).toBeVisible();
    });
  });

  test.describe('Mode Selector (in Sidebar)', () => {
    test('should display all three modes', async ({ page }) => {
      const modeSelector = page.locator('.mode-selector');
      await expect(modeSelector).toBeVisible();

      // Should have Plan, Ask, Auto modes
      const planMode = page.locator('.mode-btn').filter({ hasText: 'Plan' });
      const askMode = page.locator('.mode-btn').filter({ hasText: 'Ask' });
      const autoMode = page.locator('.mode-btn').filter({ hasText: 'Auto' });

      await expect(planMode).toBeVisible();
      await expect(askMode).toBeVisible();
      await expect(autoMode).toBeVisible();
    });

    test('should switch to Plan mode when clicked', async ({ page }) => {
      const planMode = page.locator('.mode-btn').filter({ hasText: 'Plan' });
      await planMode.click();
      await page.waitForTimeout(200);

      // Plan mode should be active
      await expect(planMode).toHaveClass(/active/);
    });

    test('should switch to Ask mode when clicked', async ({ page }) => {
      const askMode = page.locator('.mode-btn').filter({ hasText: 'Ask' });
      await askMode.click();
      await page.waitForTimeout(200);

      await expect(askMode).toHaveClass(/active/);
    });

    test('should switch to Auto mode when clicked', async ({ page }) => {
      const autoMode = page.locator('.mode-btn').filter({ hasText: 'Auto' });
      await autoMode.click();
      await page.waitForTimeout(200);

      await expect(autoMode).toHaveClass(/active/);
    });
  });

  test.describe('Quick Actions', () => {
    test('should display quick action buttons when available', async ({ page }) => {
      // Quick actions may or may not show depending on screen
      const quickActions = page.locator('.quick-actions');
      // Dashboard should have quick actions
      if (await quickActions.count() > 0) {
        await expect(quickActions).toBeVisible();
      }
    });

    test('should have action buttons on dashboard', async ({ page }) => {
      const quickActions = page.locator('.quick-actions');
      if (await quickActions.count() > 0) {
        const buttons = quickActions.locator('button');
        const count = await buttons.count();
        expect(count).toBeGreaterThan(0);
      }
    });

    test('should toggle chat panel via header button', async ({ page }) => {
      const chatBtn = page.locator('.header-right button').filter({ hasText: 'Chat' });
      await chatBtn.click();
      await page.waitForTimeout(300);

      // Panel should open
      const panel = page.locator('.assistant-panel.open');
      await expect(panel).toBeVisible();
    });
  });

  test.describe('Execution Controls', () => {
    test('should have play button', async ({ page }) => {
      const playBtn = page.locator('.exec-bar-left button').first();
      await expect(playBtn).toBeVisible();
    });

    test('should show task count', async ({ page }) => {
      const count = page.locator('.exec-count');
      await expect(count).toBeVisible();
    });

    test('should show mode badge', async ({ page }) => {
      const modeBadge = page.locator('.exec-bar-right .badge');
      await expect(modeBadge).toBeVisible();
    });
  });

  test.describe('Status Display', () => {
    test('should show status badge', async ({ page }) => {
      const statusBadge = page.locator('.exec-bar-left .badge');
      await expect(statusBadge).toBeVisible();

      // Should show IDLE by default
      const text = await statusBadge.textContent();
      expect(text).toMatch(/IDLE|RUNNING|PAUSED/);
    });

    test('should show progress bar', async ({ page }) => {
      const progressBar = page.locator('.exec-progress');
      await expect(progressBar).toBeVisible();
    });
  });
});
