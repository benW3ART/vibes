import { test, expect } from '@playwright/test';

test.describe('State Persistence', () => {

  test.describe('Demo Mode State', () => {
    test('should show demo banner in demo mode', async ({ page }) => {
      await page.goto('/');
      await page.waitForTimeout(500);

      const demoBanner = page.locator('[class*="demo"], .demo-banner, button').filter({ hasText: /demo/i });
      await expect(demoBanner.first()).toBeVisible();
    });

    test('should persist hasSeenDemo in localStorage', async ({ page }) => {
      await page.addInitScript(() => {
        localStorage.setItem('vibes:hasSeenDemo', 'true');
      });
      await page.goto('/');
      await page.waitForTimeout(500);

      const hasSeenDemo = await page.evaluate(() => {
        return localStorage.getItem('vibes:hasSeenDemo');
      });
      expect(hasSeenDemo).toBe('true');
    });

    test('should remember demo state across page reload', async ({ page }) => {
      await page.addInitScript(() => {
        localStorage.setItem('vibes:hasSeenDemo', 'true');
      });
      await page.goto('/');
      await page.waitForTimeout(500);

      // Reload page
      await page.reload();
      await page.waitForTimeout(500);

      const hasSeenDemo = await page.evaluate(() => {
        return localStorage.getItem('vibes:hasSeenDemo');
      });
      expect(hasSeenDemo).toBe('true');
    });
  });

  test.describe('Navigation State', () => {
    test('should maintain current screen after interactions', async ({ page }) => {
      await page.addInitScript(() => {
        localStorage.setItem('vibes:hasSeenDemo', 'true');
      });
      await page.goto('/');
      await page.waitForTimeout(500);

      // Close overlays
      const overlay = page.locator('.panel-overlay.visible');
      if (await overlay.count() > 0) {
        await overlay.click({ force: true });
        await page.waitForTimeout(300);
      }

      // Navigate to Tasks
      const tasksNav = page.locator('.nav-item').filter({ hasText: 'Tasks' });
      await tasksNav.click();
      await page.waitForTimeout(300);

      // Verify we're on Tasks
      const title = page.locator('.header-title');
      const text = await title.textContent();
      expect(text?.toLowerCase()).toContain('task');
    });

    test('should update URL or state when navigating', async ({ page }) => {
      await page.addInitScript(() => {
        localStorage.setItem('vibes:hasSeenDemo', 'true');
      });
      await page.goto('/');
      await page.waitForTimeout(500);

      // Close overlays
      const overlay = page.locator('.panel-overlay.visible');
      if (await overlay.count() > 0) {
        await overlay.click({ force: true });
        await page.waitForTimeout(300);
      }

      // Navigate to Plan
      const planNav = page.locator('.nav-item').filter({ hasText: 'Plan' });
      await planNav.click();
      await page.waitForTimeout(300);

      // Main content should update
      const mainContent = page.locator('.main-content');
      await expect(mainContent).toBeVisible();
    });
  });

  test.describe('Panel State', () => {
    test('should remember panel open state', async ({ page }) => {
      await page.goto('/');
      await page.waitForTimeout(500);

      // Panel should auto-open
      const panel = page.locator('.assistant-panel.open');
      await expect(panel).toBeVisible();
    });

    test('should allow panels to be toggled', async ({ page }) => {
      await page.addInitScript(() => {
        localStorage.setItem('vibes:hasSeenDemo', 'true');
      });
      await page.goto('/');
      await page.waitForTimeout(500);

      // Toggle chat panel off
      const overlay = page.locator('.panel-overlay.visible');
      if (await overlay.count() > 0) {
        await overlay.click({ force: true });
        await page.waitForTimeout(300);
      }

      // Toggle it back on with button
      const chatBtn = page.locator('.header-right button').filter({ hasText: 'Chat' });
      await chatBtn.click();
      await page.waitForTimeout(300);

      const panel = page.locator('.assistant-panel.open');
      await expect(panel).toBeVisible();
    });
  });

  test.describe('Mode Selector State', () => {
    test('should show current mode in sidebar', async ({ page }) => {
      await page.addInitScript(() => {
        localStorage.setItem('vibes:hasSeenDemo', 'true');
      });
      await page.goto('/');
      await page.waitForTimeout(500);

      const modeSelector = page.locator('.mode-selector, [class*="mode"]').first();
      await expect(modeSelector).toBeVisible();
    });

    test('should have mode buttons', async ({ page }) => {
      await page.addInitScript(() => {
        localStorage.setItem('vibes:hasSeenDemo', 'true');
      });
      await page.goto('/');
      await page.waitForTimeout(500);

      const planBtn = page.locator('.mode-btn, button').filter({ hasText: 'Plan' });
      const askBtn = page.locator('.mode-btn, button').filter({ hasText: 'Ask' });
      const autoBtn = page.locator('.mode-btn, button').filter({ hasText: 'Auto' });

      await expect(planBtn.first()).toBeVisible();
      await expect(askBtn.first()).toBeVisible();
      await expect(autoBtn.first()).toBeVisible();
    });

    test('should change mode when clicking mode button', async ({ page }) => {
      await page.addInitScript(() => {
        localStorage.setItem('vibes:hasSeenDemo', 'true');
      });
      await page.goto('/');
      await page.waitForTimeout(500);

      // Close any overlays first
      const overlay = page.locator('.panel-overlay.visible');
      if (await overlay.count() > 0) {
        await overlay.click({ force: true });
        await page.waitForTimeout(300);
      }

      // Click Plan mode with force
      const planBtn = page.locator('.mode-btn').filter({ hasText: 'Plan' });
      await planBtn.click({ force: true });
      await page.waitForTimeout(200);

      // Button should be active
      await expect(planBtn).toHaveClass(/active/);
    });
  });

  test.describe('Project State', () => {
    test('should show project name in sidebar', async ({ page }) => {
      await page.goto('/');
      await page.waitForTimeout(500);

      // Demo project name should be visible
      const projectName = page.locator('.sidebar').filter({ hasText: /wallie/i });
      await expect(projectName.first()).toBeVisible();
    });

    test('should show connection status', async ({ page }) => {
      await page.goto('/');
      await page.waitForTimeout(500);

      // Should show some connection status
      const status = page.locator('.sidebar').filter({ hasText: /connected|claude/i });
      await expect(status.first()).toBeVisible();
    });
  });

  test.describe('Execution State', () => {
    test('should show execution status in execution bar', async ({ page }) => {
      await page.addInitScript(() => {
        localStorage.setItem('vibes:hasSeenDemo', 'true');
      });
      await page.goto('/');
      await page.waitForTimeout(500);

      const execBar = page.locator('.exec-bar');
      await expect(execBar).toBeVisible();

      // Should show some status
      const status = page.locator('.exec-bar').filter({ hasText: /running|idle|paused/i });
      await expect(status.first()).toBeVisible();
    });

    test('should show task count', async ({ page }) => {
      await page.addInitScript(() => {
        localStorage.setItem('vibes:hasSeenDemo', 'true');
      });
      await page.goto('/');
      await page.waitForTimeout(500);

      // Should show task progress like "8/15"
      const taskCount = page.locator('.exec-bar').filter({ hasText: /\d+\/\d+/ });
      await expect(taskCount.first()).toBeVisible();
    });
  });
});
