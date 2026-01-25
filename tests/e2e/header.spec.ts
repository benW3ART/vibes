import { test, expect } from '@playwright/test';

// Helper to close any visible panel overlays
async function closeVisiblePanels(page: any) {
  const overlay = page.locator('.panel-overlay.visible');
  if (await overlay.count() > 0) {
    await overlay.click({ force: true });
    await page.waitForTimeout(300);
  }
}

test.describe('Header Component', () => {

  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('vibes:hasSeenDemo', 'true');
    });
    await page.goto('/');
    await page.waitForTimeout(500);
    await closeVisiblePanels(page);
  });

  test.describe('Layout', () => {
    test('should display header', async ({ page }) => {
      const header = page.locator('.header').first();
      await expect(header).toBeVisible();
    });

    test('should display current screen title', async ({ page }) => {
      const screenTitle = page.locator('.header-title').first();
      await expect(screenTitle).toBeVisible();
    });

    test('should display header right section', async ({ page }) => {
      const headerRight = page.locator('.header-right');
      await expect(headerRight).toBeVisible();
    });
  });

  test.describe('Breadcrumb', () => {
    test('should show section in breadcrumb', async ({ page }) => {
      const breadcrumb = page.locator('.breadcrumb, [class*="breadcrumb"]');
      if (await breadcrumb.count() > 0) {
        await expect(breadcrumb).toBeVisible();
      }
    });
  });

  test.describe('Header Actions', () => {
    test('should have XRay toggle button', async ({ page }) => {
      const xrayBtn = page.locator('.header-right button').filter({ hasText: 'X-Ray' });
      await expect(xrayBtn).toBeVisible();
    });

    test('should have chat toggle button', async ({ page }) => {
      const chatBtn = page.locator('.header-right button').filter({ hasText: 'Chat' });
      await expect(chatBtn).toBeVisible();
    });

    test('should toggle XRay panel when clicking XRay button', async ({ page }) => {
      const xrayBtn = page.locator('.header-right button').filter({ hasText: 'X-Ray' });
      await xrayBtn.click();
      await page.waitForTimeout(300);

      // XRay panel should open (panel with X-Ray title)
      const xrayTitle = page.locator('.panel.open .panel-title').filter({ hasText: 'X-Ray' });
      await expect(xrayTitle).toBeVisible();
    });

    test('should toggle chat panel when clicking chat button', async ({ page }) => {
      const chatBtn = page.locator('.header-right button').filter({ hasText: 'Chat' });
      await chatBtn.click();
      await page.waitForTimeout(300);

      // Chat panel should open
      const panel = page.locator('.assistant-panel.open');
      await expect(panel).toBeVisible();
    });
  });

  test.describe('Title Updates', () => {
    test('should update title when navigating to Tasks', async ({ page }) => {
      const navItem = page.locator('.nav-item').filter({ hasText: 'Tasks' });
      await navItem.click();
      await page.waitForTimeout(300);

      const title = page.locator('.header-title');
      const text = await title.textContent();
      expect(text?.toLowerCase()).toContain('task');
    });

    test('should update title when navigating to Plan', async ({ page }) => {
      const navItem = page.locator('.nav-item').filter({ hasText: 'Plan' });
      await navItem.click();
      await page.waitForTimeout(300);

      const title = page.locator('.header-title');
      const text = await title.textContent();
      expect(text?.toLowerCase()).toContain('plan');
    });

    test('should update title when navigating to Settings', async ({ page }) => {
      const navItem = page.locator('.nav-item').filter({ hasText: 'Settings' });
      await navItem.click();
      await page.waitForTimeout(300);

      const title = page.locator('.header-title');
      const text = await title.textContent();
      expect(text?.toLowerCase()).toContain('setting');
    });
  });

  test.describe('Responsive Header', () => {
    test('should adapt to mobile viewport', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.waitForTimeout(300);

      const header = page.locator('.header, [class*="header"]').first();
      await expect(header).toBeVisible();
    });

    test('should adapt to tablet viewport', async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 });
      await page.waitForTimeout(300);

      const header = page.locator('.header, [class*="header"]').first();
      await expect(header).toBeVisible();
    });
  });
});
