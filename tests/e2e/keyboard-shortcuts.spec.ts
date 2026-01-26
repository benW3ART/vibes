import { test, expect } from '@playwright/test';

test.describe('Keyboard Shortcuts', () => {

  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('vibes:hasSeenDemo', 'true');
    });
    await page.goto('/');
    await page.waitForTimeout(500);
  });

  test.describe('Navigation Shortcuts', () => {
    test('should open command palette with Cmd+K', async ({ page }) => {
      await page.keyboard.press('Meta+k');
      await page.waitForTimeout(300);

      const input = page.locator('input[placeholder*="command"], input[placeholder*="Command"]');
      await expect(input).toBeVisible({ timeout: 3000 });
    });

    test('should close command palette with Escape', async ({ page }) => {
      await page.keyboard.press('Meta+k');
      await page.waitForTimeout(300);

      await page.keyboard.press('Escape');
      await page.waitForTimeout(300);

      const input = page.locator('input[placeholder*="command"], input[placeholder*="Command"]');
      await expect(input).not.toBeVisible();
    });

    test('should navigate to Dashboard with Cmd+Shift+1', async ({ page }) => {
      // Close any open panels first
      await page.keyboard.press('Escape');
      await page.waitForTimeout(200);

      await page.keyboard.press('Meta+Shift+1');
      await page.waitForTimeout(300);

      const title = page.locator('.header-title');
      const text = await title.textContent();
      expect(text?.toLowerCase()).toContain('dashboard');
    });

    test('should navigate to Execution with Cmd+Shift+2', async ({ page }) => {
      await page.keyboard.press('Escape');
      await page.waitForTimeout(200);

      await page.keyboard.press('Meta+Shift+2');
      await page.waitForTimeout(300);

      const title = page.locator('.header-title');
      const text = await title.textContent();
      expect(text?.toLowerCase()).toContain('execution');
    });

    test('should navigate to Tasks with Cmd+Shift+3', async ({ page }) => {
      await page.keyboard.press('Escape');
      await page.waitForTimeout(200);

      await page.keyboard.press('Meta+Shift+3');
      await page.waitForTimeout(300);

      const title = page.locator('.header-title');
      const text = await title.textContent();
      expect(text?.toLowerCase()).toContain('task');
    });

    test('should navigate to Prompts with Cmd+Shift+4', async ({ page }) => {
      await page.keyboard.press('Escape');
      await page.waitForTimeout(200);

      await page.keyboard.press('Meta+Shift+4');
      await page.waitForTimeout(300);

      const title = page.locator('.header-title');
      const text = await title.textContent();
      expect(text?.toLowerCase()).toContain('prompt');
    });
  });

  test.describe('Panel Shortcuts', () => {
    test('should toggle chat panel with Cmd+/', async ({ page }) => {
      // Close panels first
      const overlay = page.locator('.panel-overlay.visible');
      if (await overlay.count() > 0) {
        await overlay.click({ force: true });
        await page.waitForTimeout(300);
      }

      await page.keyboard.press('Meta+/');
      await page.waitForTimeout(300);

      const panel = page.locator('.panel.open, .assistant-panel.open');
      await expect(panel).toBeVisible();
    });

    test('should toggle XRay panel with Cmd+.', async ({ page }) => {
      // Close panels first
      const overlay = page.locator('.panel-overlay.visible');
      if (await overlay.count() > 0) {
        await overlay.click({ force: true });
        await page.waitForTimeout(300);
      }

      await page.keyboard.press('Meta+.');
      await page.waitForTimeout(300);

      const panel = page.locator('.panel.open');
      await expect(panel).toBeVisible();
    });
  });

  test.describe('Input Focus Shortcuts', () => {
    test('should focus chat input when panel is open', async ({ page }) => {
      // Ensure chat panel is open
      const panel = page.locator('.assistant-panel.open');
      if (await panel.count() === 0) {
        await page.keyboard.press('Meta+/');
        await page.waitForTimeout(300);
      }

      // Click on textarea to focus
      const textarea = page.locator('.assistant-panel textarea');
      await textarea.click();

      await expect(textarea).toBeFocused();
    });

    test('should allow typing in focused input', async ({ page }) => {
      const panel = page.locator('.assistant-panel.open');
      if (await panel.count() === 0) {
        await page.keyboard.press('Meta+/');
        await page.waitForTimeout(300);
      }

      const textarea = page.locator('.assistant-panel textarea');
      await textarea.click();
      await textarea.fill('Test message');

      const value = await textarea.inputValue();
      expect(value).toBe('Test message');
    });
  });

  test.describe('Command Palette Navigation', () => {
    test('should navigate items with arrow keys', async ({ page }) => {
      await page.keyboard.press('Meta+k');
      await page.waitForTimeout(300);

      const input = page.locator('input[placeholder*="command"], input[placeholder*="Command"]');
      await expect(input).toBeVisible({ timeout: 3000 });

      // Press down arrow to select item
      await page.keyboard.press('ArrowDown');
      await page.waitForTimeout(100);
      await page.keyboard.press('ArrowDown');
      await page.waitForTimeout(100);

      // Input should still be visible (app shouldn't crash)
      await expect(input).toBeVisible();
    });

    test('should execute selected command with Enter', async ({ page }) => {
      await page.keyboard.press('Meta+k');
      await page.waitForTimeout(300);

      // Type to filter
      const input = page.locator('input[placeholder*="command"], input[placeholder*="Command"]');
      await input.fill('dashboard');
      await page.waitForTimeout(200);

      // Press Enter to execute
      await page.keyboard.press('Enter');
      await page.waitForTimeout(500);

      // Command palette should close
      await expect(input).not.toBeVisible();
    });
  });

  test.describe('Global Escape Handling', () => {
    test('should close modals with Escape', async ({ page }) => {
      // Open command palette
      await page.keyboard.press('Meta+k');
      await page.waitForTimeout(300);

      const input = page.locator('input[placeholder*="command"], input[placeholder*="Command"]');
      await expect(input).toBeVisible();

      // Press Escape
      await page.keyboard.press('Escape');
      await page.waitForTimeout(300);

      await expect(input).not.toBeVisible();
    });

    test('should not affect main app when Escape pressed with nothing open', async ({ page }) => {
      // Close everything first
      await page.keyboard.press('Escape');
      await page.waitForTimeout(200);
      await page.keyboard.press('Escape');
      await page.waitForTimeout(200);

      // App should still be functional
      const app = page.locator('.app');
      await expect(app).toBeVisible();
    });
  });
});
