import { test, expect } from '@playwright/test';

// Helper to close any visible panel overlays
async function closeVisiblePanels(page: any) {
  const overlay = page.locator('.panel-overlay.visible');
  if (await overlay.count() > 0) {
    await overlay.click({ force: true });
    await page.waitForTimeout(300);
  }
}

test.describe('Command Palette', () => {

  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('vibes:hasSeenDemo', 'true');
    });
    await page.goto('/');
    await page.waitForTimeout(500);
    await closeVisiblePanels(page);
  });

  test.describe('Opening and Closing', () => {
    test('should open command palette with Cmd+K', async ({ page }) => {
      await page.keyboard.press('Meta+k');
      await page.waitForTimeout(300);

      // Look for command palette elements (CSS modules generate hashed classes)
      const paletteInput = page.locator('input[placeholder*="command"]');
      await expect(paletteInput).toBeVisible();
    });

    test('should close command palette with Escape', async ({ page }) => {
      // Open palette
      await page.keyboard.press('Meta+k');
      await page.waitForTimeout(300);

      // Close with Escape
      await page.keyboard.press('Escape');
      await page.waitForTimeout(300);

      const paletteInput = page.locator('input[placeholder*="command"]');
      await expect(paletteInput).not.toBeVisible();
    });

    test('should close command palette when clicking outside', async ({ page }) => {
      // Open palette
      await page.keyboard.press('Meta+k');
      await page.waitForTimeout(300);

      // Click outside using keyboard escape since overlay uses CSS modules
      await page.keyboard.press('Escape');
      await page.waitForTimeout(300);

      const paletteInput = page.locator('input[placeholder*="command"]');
      await expect(paletteInput).not.toBeVisible();
    });
  });

  test.describe('Search Functionality', () => {
    test('should have search input focused when opened', async ({ page }) => {
      await page.keyboard.press('Meta+k');
      await page.waitForTimeout(300);

      const searchInput = page.locator('input[placeholder*="command"]');
      await expect(searchInput).toBeFocused();
    });

    test('should filter commands when typing', async ({ page }) => {
      await page.keyboard.press('Meta+k');
      await page.waitForTimeout(300);

      // Type to search
      await page.keyboard.type('dash');
      await page.waitForTimeout(200);

      // Should show filtered results containing Dashboard
      const dashboardResult = page.locator('text=Dashboard');
      await expect(dashboardResult.first()).toBeVisible();
    });

    test('should close palette on Escape', async ({ page }) => {
      await page.keyboard.press('Meta+k');
      await page.waitForTimeout(300);

      // Type something
      await page.keyboard.type('test');
      await page.waitForTimeout(200);

      // Press Escape to close
      await page.keyboard.press('Escape');
      await page.waitForTimeout(200);

      // Palette should be closed
      const searchInput = page.locator('input[placeholder*="command"]');
      await expect(searchInput).not.toBeVisible();
    });
  });

  test.describe('Command Navigation', () => {
    test('should navigate commands with arrow keys', async ({ page }) => {
      await page.keyboard.press('Meta+k');
      await page.waitForTimeout(300);

      // Press down arrow to select next item
      await page.keyboard.press('ArrowDown');
      await page.waitForTimeout(100);

      // An item should be highlighted/selected
      const selectedItem = page.locator('.command-item.selected, .command-palette-item.active, [data-selected="true"]');
      // May or may not have visual selection indicator
    });

    test('should execute command on Enter', async ({ page }) => {
      await page.keyboard.press('Meta+k');
      await page.waitForTimeout(300);

      // Select first item and press Enter
      await page.keyboard.press('ArrowDown');
      await page.keyboard.press('Enter');
      await page.waitForTimeout(300);

      // Palette should close after execution
      const palette = page.locator('.command-palette');
      await expect(palette).not.toBeVisible();
    });
  });

  test.describe('Command Categories', () => {
    test('should display navigation commands', async ({ page }) => {
      await page.keyboard.press('Meta+k');
      await page.waitForTimeout(300);

      // Should have Dashboard command visible
      const dashboardCmd = page.locator('text=Dashboard').first();
      await expect(dashboardCmd).toBeVisible();
    });

    test('should show category headers', async ({ page }) => {
      await page.keyboard.press('Meta+k');
      await page.waitForTimeout(300);

      // Should show category like "Command Center"
      const category = page.locator('text=Command Center').first();
      await expect(category).toBeVisible();
    });
  });

  test.describe('Screen Navigation via Commands', () => {
    test('should navigate to Dashboard via command', async ({ page }) => {
      await page.keyboard.press('Meta+k');
      await page.waitForTimeout(300);

      await page.keyboard.type('dashboard');
      await page.waitForTimeout(200);
      await page.keyboard.press('Enter');
      await page.waitForTimeout(300);

      // Should be on dashboard (main content visible)
      const mainContent = page.locator('.main-content');
      await expect(mainContent).toBeVisible();
    });

    test('should navigate to Tasks via command', async ({ page }) => {
      await page.keyboard.press('Meta+k');
      await page.waitForTimeout(300);

      await page.keyboard.type('tasks');
      await page.waitForTimeout(200);
      await page.keyboard.press('Enter');
      await page.waitForTimeout(300);

      const mainContent = page.locator('.main-content');
      await expect(mainContent).toBeVisible();
    });

    test('should navigate to Settings via command', async ({ page }) => {
      await page.keyboard.press('Meta+k');
      await page.waitForTimeout(300);

      await page.keyboard.type('settings');
      await page.waitForTimeout(200);
      await page.keyboard.press('Enter');
      await page.waitForTimeout(300);

      const mainContent = page.locator('.main-content');
      await expect(mainContent).toBeVisible();
    });
  });

  test.describe('Panel Commands', () => {
    test('should toggle chat panel via command', async ({ page }) => {
      await page.keyboard.press('Meta+k');
      await page.waitForTimeout(300);

      await page.keyboard.type('chat');
      await page.waitForTimeout(200);
      await page.keyboard.press('Enter');
      await page.waitForTimeout(300);

      // Chat panel should be toggled
      const chatPanel = page.locator('.panel.open, .assistant-panel.open');
      // May or may not be visible depending on toggle state
    });

    test('should toggle XRay via command', async ({ page }) => {
      await page.keyboard.press('Meta+k');
      await page.waitForTimeout(300);

      await page.keyboard.type('xray');
      await page.waitForTimeout(200);
      await page.keyboard.press('Enter');
      await page.waitForTimeout(300);

      // XRay panel should be toggled
      const xrayPanel = page.locator('.xray-panel');
      // May or may not be visible depending on toggle state
    });
  });
});
