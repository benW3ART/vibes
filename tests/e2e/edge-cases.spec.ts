import { test, expect, Locator } from '@playwright/test';

// Helper to close overlays
async function closeOverlays(page: any) {
  const cmdPaletteOverlay = page.locator('[class*="_overlay_"][class*="_visible_"]');
  if (await cmdPaletteOverlay.count() > 0) {
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);
  }

  // Close X-Ray panel if visible
  const xrayCloseBtn = page.locator('.xray-panel button').filter({ hasText: 'X' });
  if (await xrayCloseBtn.count() > 0 && await xrayCloseBtn.isVisible()) {
    await xrayCloseBtn.click({ force: true });
    await page.waitForTimeout(300);
  }

  const panelOverlay = page.locator('.panel-overlay.visible');
  if (await panelOverlay.count() > 0) {
    await panelOverlay.click({ force: true });
    await page.waitForTimeout(300);
  }
}

// Helper to scroll element into view and click it using JavaScript
async function scrollAndClick(locator: Locator) {
  await locator.evaluate((el: HTMLElement) => {
    el.scrollIntoView({ behavior: 'instant', block: 'center' });
    el.click();
  });
}

// Helper to focus an input/textarea using JavaScript
async function focusInput(locator: Locator) {
  await locator.evaluate((el: HTMLElement) => {
    el.scrollIntoView({ behavior: 'instant', block: 'center' });
    (el as HTMLInputElement | HTMLTextAreaElement).focus();
  });
}

test.describe('Edge Cases', () => {

  test.describe('Empty States', () => {
    test('should handle empty task list gracefully', async ({ page }) => {
      await page.addInitScript(() => {
        localStorage.setItem('vibes:hasSeenDemo', 'true');
      });
      await page.goto('/');
      await page.waitForTimeout(500);
      await closeOverlays(page);

      const tasksNav = page.locator('.nav-item').filter({ hasText: 'Tasks' });
      await tasksNav.click();
      await page.waitForTimeout(300);

      // Should show content even if empty
      const mainContent = page.locator('.main-content');
      await expect(mainContent).toBeVisible();
    });

    test('should handle empty logs gracefully', async ({ page }) => {
      await page.addInitScript(() => {
        localStorage.setItem('vibes:hasSeenDemo', 'true');
      });
      await page.goto('/');
      await page.waitForTimeout(500);
      await closeOverlays(page);

      const logsNav = page.locator('.nav-item').filter({ hasText: 'Logs' });
      await logsNav.click();
      await page.waitForTimeout(300);

      const mainContent = page.locator('.main-content');
      await expect(mainContent).toBeVisible();
    });

    test('should handle empty analytics gracefully', async ({ page }) => {
      await page.addInitScript(() => {
        localStorage.setItem('vibes:hasSeenDemo', 'true');
      });
      await page.goto('/');
      await page.waitForTimeout(500);
      await closeOverlays(page);

      const analyticsNav = page.locator('.nav-item').filter({ hasText: 'Analytics' });
      await analyticsNav.click();
      await page.waitForTimeout(300);

      const mainContent = page.locator('.main-content');
      await expect(mainContent).toBeVisible();
    });
  });

  test.describe('Rapid Interactions', () => {
    test('should handle rapid navigation clicks', async ({ page }) => {
      await page.addInitScript(() => {
        localStorage.setItem('vibes:hasSeenDemo', 'true');
      });
      await page.goto('/');
      await page.waitForTimeout(500);
      await closeOverlays(page);

      const navItems = page.locator('.nav-item');
      const count = await navItems.count();

      // Rapid click through all nav items
      for (let i = 0; i < Math.min(count, 10); i++) {
        await navItems.nth(i % count).click();
        await page.waitForTimeout(50);
      }

      // App should still be functional
      const app = page.locator('.app');
      await expect(app).toBeVisible();
    });

    test('should handle rapid panel toggles', async ({ page }) => {
      await page.addInitScript(() => {
        localStorage.setItem('vibes:hasSeenDemo', 'true');
      });
      await page.goto('/');
      await page.waitForTimeout(500);

      // Rapid toggle panels
      for (let i = 0; i < 10; i++) {
        await page.keyboard.press('Meta+/');
        await page.waitForTimeout(50);
      }

      // App should still be functional
      const app = page.locator('.app');
      await expect(app).toBeVisible();
    });

    test('should handle rapid keyboard shortcuts', async ({ page }) => {
      await page.addInitScript(() => {
        localStorage.setItem('vibes:hasSeenDemo', 'true');
      });
      await page.goto('/');
      await page.waitForTimeout(500);

      // Rapid shortcuts
      const shortcuts = ['Meta+Shift+1', 'Meta+Shift+2', 'Meta+Shift+3', 'Meta+Shift+4', 'Meta+k', 'Escape'];
      for (const shortcut of shortcuts) {
        await page.keyboard.press(shortcut);
        await page.waitForTimeout(50);
      }

      // App should still be functional
      const app = page.locator('.app');
      await expect(app).toBeVisible();
    });
  });

  test.describe('Long Content', () => {
    test('should handle long chat messages', async ({ page }) => {
      await page.goto('/');
      await page.waitForTimeout(1500);
      await closeOverlays(page);

      // Start new project flow
      const newProjectBtn = page.locator('.chat-message-actions button').filter({ hasText: 'New Project' });
      await scrollAndClick(newProjectBtn);
      await page.waitForTimeout(2000);

      // Enter very long project name
      const chatInput = page.locator('.assistant-panel textarea');
      await focusInput(chatInput);
      await chatInput.fill('a'.repeat(100));
      await page.keyboard.press('Enter');
      await page.waitForTimeout(2000);

      // App should still be functional
      const app = page.locator('.app');
      await expect(app).toBeVisible();
    });

    test('should handle special characters in input', async ({ page }) => {
      await page.goto('/');
      await page.waitForTimeout(1500);
      await closeOverlays(page);

      const newProjectBtn = page.locator('.chat-message-actions button').filter({ hasText: 'New Project' });
      await scrollAndClick(newProjectBtn);
      await page.waitForTimeout(2000);

      const chatInput = page.locator('.assistant-panel textarea');
      await focusInput(chatInput);
      await chatInput.fill('test-project-<>!@#$%^&*()');
      await page.keyboard.press('Enter');
      await page.waitForTimeout(2000);

      // App should still be functional
      const app = page.locator('.app');
      await expect(app).toBeVisible();
    });
  });

  test.describe('Window Resize', () => {
    test('should handle resize to mobile', async ({ page }) => {
      await page.addInitScript(() => {
        localStorage.setItem('vibes:hasSeenDemo', 'true');
      });
      await page.goto('/');
      await page.waitForTimeout(500);

      await page.setViewportSize({ width: 375, height: 667 });
      await page.waitForTimeout(300);

      const app = page.locator('.app');
      await expect(app).toBeVisible();
    });

    test('should handle resize to tablet', async ({ page }) => {
      await page.addInitScript(() => {
        localStorage.setItem('vibes:hasSeenDemo', 'true');
      });
      await page.goto('/');
      await page.waitForTimeout(500);

      await page.setViewportSize({ width: 768, height: 1024 });
      await page.waitForTimeout(300);

      const app = page.locator('.app');
      await expect(app).toBeVisible();
    });

    test('should handle resize during interaction', async ({ page }) => {
      await page.addInitScript(() => {
        localStorage.setItem('vibes:hasSeenDemo', 'true');
      });
      await page.goto('/');
      await page.waitForTimeout(500);

      // Start an interaction
      await page.keyboard.press('Meta+k');
      await page.waitForTimeout(200);

      // Resize during interaction
      await page.setViewportSize({ width: 500, height: 800 });
      await page.waitForTimeout(200);

      // Close and verify
      await page.keyboard.press('Escape');
      await page.waitForTimeout(200);

      const app = page.locator('.app');
      await expect(app).toBeVisible();
    });
  });

  test.describe('Browser Navigation', () => {
    test('should handle page refresh', async ({ page }) => {
      await page.addInitScript(() => {
        localStorage.setItem('vibes:hasSeenDemo', 'true');
      });
      await page.goto('/');
      await page.waitForTimeout(500);

      await page.reload();
      await page.waitForTimeout(500);

      const app = page.locator('.app');
      await expect(app).toBeVisible();
    });

    test('should handle navigation after state changes', async ({ page }) => {
      await page.addInitScript(() => {
        localStorage.setItem('vibes:hasSeenDemo', 'true');
      });
      await page.goto('/');
      await page.waitForTimeout(500);
      await closeOverlays(page);

      // Make some state changes
      const tasksNav = page.locator('.nav-item').filter({ hasText: 'Tasks' });
      await tasksNav.click();
      await page.waitForTimeout(300);

      // Reload
      await page.reload();
      await page.waitForTimeout(500);

      const app = page.locator('.app');
      await expect(app).toBeVisible();
    });
  });

  test.describe('Concurrent Actions', () => {
    test('should handle opening multiple panels', async ({ page }) => {
      await page.addInitScript(() => {
        localStorage.setItem('vibes:hasSeenDemo', 'true');
      });
      await page.goto('/');
      await page.waitForTimeout(500);
      await closeOverlays(page);

      // Open chat
      await page.keyboard.press('Meta+/');
      await page.waitForTimeout(200);

      // Open XRay
      await page.keyboard.press('Meta+.');
      await page.waitForTimeout(200);

      // App should handle this gracefully
      const app = page.locator('.app');
      await expect(app).toBeVisible();
    });

    test('should handle command palette while panel is open', async ({ page }) => {
      await page.goto('/');
      await page.waitForTimeout(500);

      // Panel is auto-open
      const panel = page.locator('.assistant-panel.open');
      await expect(panel).toBeVisible();

      // Open command palette
      await page.keyboard.press('Meta+k');
      await page.waitForTimeout(300);

      const input = page.locator('input[placeholder*="command"], input[placeholder*="Command"]');
      await expect(input).toBeVisible();
    });
  });

  test.describe('Invalid Input Handling', () => {
    test('should handle empty form submission', async ({ page }) => {
      await page.goto('/');
      await page.waitForTimeout(1500);
      await closeOverlays(page);

      const newProjectBtn = page.locator('.chat-message-actions button').filter({ hasText: 'New Project' });
      await scrollAndClick(newProjectBtn);
      await page.waitForTimeout(2000);

      // Try to submit empty input
      const chatInput = page.locator('.assistant-panel textarea');
      await focusInput(chatInput);
      await page.keyboard.press('Enter');
      await page.waitForTimeout(500);

      // App should still be functional
      const app = page.locator('.app');
      await expect(app).toBeVisible();
    });

    test('should handle whitespace-only input', async ({ page }) => {
      await page.goto('/');
      await page.waitForTimeout(1500);
      await closeOverlays(page);

      const newProjectBtn = page.locator('.chat-message-actions button').filter({ hasText: 'New Project' });
      await scrollAndClick(newProjectBtn);
      await page.waitForTimeout(2000);

      const chatInput = page.locator('.assistant-panel textarea');
      await focusInput(chatInput);
      await chatInput.fill('   ');
      await page.keyboard.press('Enter');
      await page.waitForTimeout(500);

      // App should still be functional
      const app = page.locator('.app');
      await expect(app).toBeVisible();
    });
  });
});
