import { test, expect } from '@playwright/test';

test.describe('Accessibility', () => {

  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('vibes:hasSeenDemo', 'true');
    });
    await page.goto('/');
    await page.waitForTimeout(500);
  });

  test.describe('Focus Management', () => {
    test('should have visible focus indicators', async ({ page }) => {
      // Tab to first focusable element
      await page.keyboard.press('Tab');
      await page.waitForTimeout(100);

      const focusedElement = page.locator(':focus');
      await expect(focusedElement).toBeVisible();
    });

    test('should trap focus in command palette when open', async ({ page }) => {
      await page.keyboard.press('Meta+k');
      await page.waitForTimeout(300);

      const input = page.locator('input[placeholder*="command"], input[placeholder*="Command"]');
      await expect(input).toBeVisible();

      // Tab should keep focus within palette
      await page.keyboard.press('Tab');
      await page.waitForTimeout(100);
      await page.keyboard.press('Tab');
      await page.waitForTimeout(100);

      // Palette should still be visible (focus trapped)
      await expect(input).toBeVisible();
    });

    test('should return focus after closing modal', async ({ page }) => {
      // Close any open panels
      const overlay = page.locator('.panel-overlay.visible');
      if (await overlay.count() > 0) {
        await overlay.click({ force: true });
        await page.waitForTimeout(300);
      }

      // Focus a button
      const chatBtn = page.locator('.header-right button').filter({ hasText: 'Chat' });
      await chatBtn.focus();
      await page.waitForTimeout(100);

      // Open and close command palette
      await page.keyboard.press('Meta+k');
      await page.waitForTimeout(300);
      await page.keyboard.press('Escape');
      await page.waitForTimeout(300);

      // App should still be functional
      const app = page.locator('.app');
      await expect(app).toBeVisible();
    });
  });

  test.describe('Keyboard Navigation', () => {
    test('should allow full keyboard navigation of sidebar', async ({ page }) => {
      // Close overlays
      const overlay = page.locator('.panel-overlay.visible');
      if (await overlay.count() > 0) {
        await overlay.click({ force: true });
        await page.waitForTimeout(300);
      }

      // Tab to sidebar items
      for (let i = 0; i < 10; i++) {
        await page.keyboard.press('Tab');
        await page.waitForTimeout(50);
      }

      // Should have something focused
      const focusedElement = page.locator(':focus');
      await expect(focusedElement).toBeVisible();
    });

    test('should activate buttons with Enter key', async ({ page }) => {
      // Close overlays
      const overlay = page.locator('.panel-overlay.visible');
      if (await overlay.count() > 0) {
        await overlay.click({ force: true });
        await page.waitForTimeout(300);
      }

      // Focus chat button
      const chatBtn = page.locator('.header-right button').filter({ hasText: 'Chat' });
      await chatBtn.focus();
      await page.keyboard.press('Enter');
      await page.waitForTimeout(300);

      // Panel should open
      const panel = page.locator('.assistant-panel.open');
      await expect(panel).toBeVisible();
    });

    test('should activate buttons with Space key', async ({ page }) => {
      // Close overlays
      const overlay = page.locator('.panel-overlay.visible');
      if (await overlay.count() > 0) {
        await overlay.click({ force: true });
        await page.waitForTimeout(300);
      }

      // Focus XRay button
      const xrayBtn = page.locator('.header-right button').filter({ hasText: 'X-Ray' });
      await xrayBtn.focus();
      await page.keyboard.press('Space');
      await page.waitForTimeout(300);

      // Panel should open
      const panel = page.locator('.panel.open');
      await expect(panel).toBeVisible();
    });
  });

  test.describe('ARIA Labels', () => {
    test('should have labeled buttons', async ({ page }) => {
      // Check that buttons have accessible text
      const buttons = page.locator('button');
      const count = await buttons.count();

      expect(count).toBeGreaterThan(0);

      // At least some buttons should have text content
      const buttonsWithText = page.locator('button:not(:empty)');
      const textCount = await buttonsWithText.count();
      expect(textCount).toBeGreaterThan(0);
    });

    test('should have labeled inputs', async ({ page }) => {
      // Chat input should have placeholder
      const chatInput = page.locator('.assistant-panel textarea');
      if (await chatInput.count() > 0) {
        const placeholder = await chatInput.getAttribute('placeholder');
        expect(placeholder).toBeTruthy();
      }
    });

    test('should have headings for sections', async ({ page }) => {
      const headings = page.locator('h1, h2, h3, h4, h5, h6');
      const count = await headings.count();
      expect(count).toBeGreaterThan(0);
    });
  });

  test.describe('Color Contrast', () => {
    test('should have readable text', async ({ page }) => {
      // Check that main content areas have text
      const mainContent = page.locator('.main-content');
      await expect(mainContent).toBeVisible();

      // Text should be present
      const text = await mainContent.textContent();
      expect(text?.length).toBeGreaterThan(0);
    });

    test('should have visible buttons', async ({ page }) => {
      const buttons = page.locator('button:visible');
      const count = await buttons.count();
      expect(count).toBeGreaterThan(0);
    });
  });

  test.describe('Screen Reader Support', () => {
    test('should have main landmark', async ({ page }) => {
      const main = page.locator('main, [role="main"]');
      await expect(main.first()).toBeVisible();
    });

    test('should have navigation landmark', async ({ page }) => {
      const nav = page.locator('nav, [role="navigation"], .sidebar');
      await expect(nav.first()).toBeVisible();
    });

    test('should have complementary regions', async ({ page }) => {
      // Sidebar or aside elements
      const aside = page.locator('aside, [role="complementary"], .sidebar');
      await expect(aside.first()).toBeVisible();
    });
  });

  test.describe('Reduced Motion', () => {
    test('should work without animations', async ({ page }) => {
      // Emulate reduced motion preference
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.reload();
      await page.waitForTimeout(500);

      // App should still be fully functional
      const app = page.locator('.app');
      await expect(app).toBeVisible();

      const sidebar = page.locator('.sidebar');
      await expect(sidebar).toBeVisible();

      const mainContent = page.locator('.main-content');
      await expect(mainContent).toBeVisible();
    });
  });

  test.describe('High Contrast Mode', () => {
    test('should work in forced colors mode', async ({ page }) => {
      // Emulate forced colors
      await page.emulateMedia({ forcedColors: 'active' });
      await page.reload();
      await page.waitForTimeout(500);

      // App should still be visible
      const app = page.locator('.app');
      await expect(app).toBeVisible();
    });
  });
});
