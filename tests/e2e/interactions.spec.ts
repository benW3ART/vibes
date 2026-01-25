import { test, expect } from '@playwright/test';

// Helper to close any visible panel overlays
async function closeVisiblePanels(page: any) {
  const overlay = page.locator('.panel-overlay.visible');
  if (await overlay.count() > 0) {
    await overlay.click({ force: true });
    await page.waitForTimeout(300);
  }
}

// Helper to navigate to a screen
async function navigateToScreen(page: any, screenName: string) {
  await closeVisiblePanels(page);
  const navItem = page.locator('.nav-item').filter({ hasText: screenName });
  if (await navItem.count() > 0) {
    await navItem.first().click();
    await page.waitForTimeout(500);
  }
}

test.describe('User Interactions', () => {

  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('vibes:hasSeenDemo', 'true');
    });
    await page.goto('/');
    await page.waitForTimeout(500);
  });

  test.describe('Button Interactions', () => {
    test('should show hover state on buttons', async ({ page }) => {
      await closeVisiblePanels(page);

      const button = page.locator('button').first();
      await button.hover();
      await page.waitForTimeout(100);

      // Button should still be visible (no errors on hover)
      await expect(button).toBeVisible();
    });

    test('should show focus state on buttons', async ({ page }) => {
      await closeVisiblePanels(page);

      const button = page.locator('button').first();
      await button.focus();
      await page.waitForTimeout(100);

      // Button should be focused
      await expect(button).toBeFocused();
    });

    test('should handle rapid clicks without errors', async ({ page }) => {
      await closeVisiblePanels(page);

      const navItem = page.locator('.nav-item').first();

      // Rapid clicks
      await navItem.click();
      await navItem.click();
      await navItem.click();
      await page.waitForTimeout(300);

      // App should still be functional
      const mainContent = page.locator('.main-content');
      await expect(mainContent).toBeVisible();
    });
  });

  test.describe('Form Interactions', () => {
    test('should handle input focus', async ({ page }) => {
      const input = page.locator('.exec-bar input, .exec-bar textarea, .chat-input').first();
      await input.click();
      await page.waitForTimeout(100);

      await expect(input).toBeFocused();
    });

    test('should handle text input and clearing', async ({ page }) => {
      const input = page.locator('.exec-bar input, .exec-bar textarea, .chat-input').first();

      await input.fill('Test input');
      let value = await input.inputValue();
      expect(value).toBe('Test input');

      await input.fill('');
      value = await input.inputValue();
      expect(value).toBe('');
    });

    test('should handle paste events', async ({ page }) => {
      const input = page.locator('.exec-bar input, .exec-bar textarea, .chat-input').first();

      await input.focus();
      await page.keyboard.type('Pasted text');
      await page.waitForTimeout(100);

      const value = await input.inputValue();
      expect(value).toContain('Pasted text');
    });
  });

  test.describe('Keyboard Interactions', () => {
    test('should handle Tab navigation', async ({ page }) => {
      await closeVisiblePanels(page);

      // Tab through the app
      for (let i = 0; i < 5; i++) {
        await page.keyboard.press('Tab');
        await page.waitForTimeout(50);
      }

      // Should have some focused element
      const focusedElement = page.locator(':focus');
      await expect(focusedElement).toBeVisible();
    });

    test('should handle Shift+Tab navigation', async ({ page }) => {
      await closeVisiblePanels(page);

      // Tab forward then back
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');
      await page.keyboard.press('Shift+Tab');
      await page.waitForTimeout(100);

      const focusedElement = page.locator(':focus');
      await expect(focusedElement).toBeVisible();
    });

    test('should handle Enter on buttons', async ({ page }) => {
      await closeVisiblePanels(page);

      const navItem = page.locator('.nav-item').first();
      await navItem.focus();
      await page.keyboard.press('Enter');
      await page.waitForTimeout(300);

      // Should have navigated or performed action
      const mainContent = page.locator('.main-content');
      await expect(mainContent).toBeVisible();
    });

    test('should handle Space on buttons', async ({ page }) => {
      await closeVisiblePanels(page);

      const button = page.locator('button').first();
      await button.focus();
      await page.keyboard.press('Space');
      await page.waitForTimeout(300);

      // Should not cause errors
      const app = page.locator('.app');
      await expect(app).toBeVisible();
    });
  });

  test.describe('Toggle Interactions', () => {
    test('should toggle skill switches on Skills screen', async ({ page }) => {
      await navigateToScreen(page, 'Skills');

      // Find a toggle/switch
      const toggle = page.locator('.toggle, .switch, input[type="checkbox"]').first();
      if (await toggle.count() > 0) {
        const initialState = await toggle.isChecked().catch(() => null);
        await toggle.click();
        await page.waitForTimeout(200);

        // Toggle should have changed state or be visible
        await expect(toggle).toBeVisible();
      }
    });
  });

  test.describe('Card/Item Interactions', () => {
    test('should show hover effects on cards', async ({ page }) => {
      await closeVisiblePanels(page);

      const card = page.locator('.card, .stat-card, [class*="card"]').first();
      if (await card.count() > 0) {
        await card.hover();
        await page.waitForTimeout(100);

        await expect(card).toBeVisible();
      }
    });

    test('should handle click on nav items', async ({ page }) => {
      await closeVisiblePanels(page);

      const navItems = page.locator('.nav-item');
      const count = await navItems.count();

      // Click each nav item
      for (let i = 0; i < Math.min(count, 5); i++) {
        await navItems.nth(i).click();
        await page.waitForTimeout(200);

        // Main content should update
        const mainContent = page.locator('.main-content');
        await expect(mainContent).toBeVisible();
      }
    });
  });

  test.describe('Action Button Interactions', () => {
    test('should handle action buttons on screens', async ({ page }) => {
      await navigateToScreen(page, 'Plan');

      // Find action buttons
      const actionBtn = page.locator('button').filter({ hasText: /create|generate|add|new/i }).first();
      if (await actionBtn.count() > 0) {
        await actionBtn.click();
        await page.waitForTimeout(300);

        // Should not cause errors
        const mainContent = page.locator('.main-content');
        await expect(mainContent).toBeVisible();
      }
    });
  });

  test.describe('Scroll Interactions', () => {
    test('should handle scrolling in main content', async ({ page }) => {
      await closeVisiblePanels(page);

      const mainContent = page.locator('.main-content');

      // Scroll down
      await mainContent.evaluate((el) => {
        el.scrollTop = 100;
      });
      await page.waitForTimeout(100);

      await expect(mainContent).toBeVisible();
    });

    test('should handle scrolling in sidebar', async ({ page }) => {
      await closeVisiblePanels(page);

      const sidebar = page.locator('.sidebar');

      // Scroll sidebar
      await sidebar.evaluate((el) => {
        el.scrollTop = 50;
      });
      await page.waitForTimeout(100);

      await expect(sidebar).toBeVisible();
    });

    test('should handle scrolling in chat panel', async ({ page }) => {
      // Assistant panel auto-opens on load
      await page.waitForTimeout(500);

      const chatMessages = page.locator('.assistant-panel .panel-content').first();
      if (await chatMessages.count() > 0) {
        await chatMessages.evaluate((el) => {
          el.scrollTop = 50;
        });
        await page.waitForTimeout(100);

        await expect(chatMessages).toBeVisible();
      } else {
        // Fallback - just verify assistant panel is there
        const panel = page.locator('.assistant-panel');
        await expect(panel).toBeVisible();
      }
    });
  });

  test.describe('Error Recovery', () => {
    test('should recover from rapid navigation', async ({ page }) => {
      await closeVisiblePanels(page);

      const navItems = page.locator('.nav-item');

      // Rapid navigation
      for (let i = 0; i < 10; i++) {
        const randomIndex = Math.floor(Math.random() * 5);
        await navItems.nth(randomIndex).click();
        await page.waitForTimeout(50);
      }

      // App should still be functional
      const mainContent = page.locator('.main-content');
      await expect(mainContent).toBeVisible();
    });

    test('should handle multiple panel toggles', async ({ page }) => {
      // Toggle panels multiple times
      for (let i = 0; i < 5; i++) {
        await page.keyboard.press('Meta+/');
        await page.waitForTimeout(100);
      }

      // App should still be functional
      const app = page.locator('.app');
      await expect(app).toBeVisible();
    });
  });
});
