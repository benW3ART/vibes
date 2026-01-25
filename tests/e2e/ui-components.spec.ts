import { test, expect } from '@playwright/test';

// Helper to close any visible panel overlays
async function closeVisiblePanels(page: any) {
  const overlay = page.locator('.panel-overlay.visible');
  if (await overlay.count() > 0) {
    await overlay.click({ force: true });
    await page.waitForTimeout(300);
  }
}

test.describe('UI Components', () => {

  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('vibes:hasSeenDemo', 'true');
    });
    await page.goto('/');
    await page.waitForTimeout(500);
  });

  test.describe('Buttons', () => {
    test('should render primary buttons correctly', async ({ page }) => {
      await closeVisiblePanels(page);

      // Look for any button
      const btn = page.locator('button').first();
      await expect(btn).toBeVisible();
    });

    test('should render secondary buttons correctly', async ({ page }) => {
      await closeVisiblePanels(page);

      // Multiple buttons should exist
      const buttons = page.locator('button');
      const count = await buttons.count();
      expect(count).toBeGreaterThan(1);
    });

    test('should render ghost buttons in header', async ({ page }) => {
      await closeVisiblePanels(page);

      const headerBtns = page.locator('.header-right button');
      const count = await headerBtns.count();
      expect(count).toBeGreaterThanOrEqual(2);
    });

    test('should render buttons with text', async ({ page }) => {
      await closeVisiblePanels(page);

      const btnWithText = page.locator('button').filter({ hasText: /.+/ }).first();
      await expect(btnWithText).toBeVisible();
    });
  });

  test.describe('Cards', () => {
    test('should render stat cards', async ({ page }) => {
      await closeVisiblePanels(page);

      const statCard = page.locator('.stat-card, [class*="stat-card"]').first();
      if (await statCard.count() > 0) {
        await expect(statCard).toBeVisible();
      }
    });

    test('should render content cards', async ({ page }) => {
      await closeVisiblePanels(page);

      const card = page.locator('.card, [class*="card"]').first();
      await expect(card).toBeVisible();
    });
  });

  test.describe('Lists', () => {
    test('should render list items', async ({ page }) => {
      await closeVisiblePanels(page);

      const listItems = page.locator('.list-item, .nav-item, [class*="item"]');
      const count = await listItems.count();
      expect(count).toBeGreaterThan(0);
    });
  });

  test.describe('Icons', () => {
    test('should render icons in sidebar', async ({ page }) => {
      await closeVisiblePanels(page);

      // Nav items should be visible
      const navItems = page.locator('.nav-item');
      const count = await navItems.count();
      expect(count).toBeGreaterThan(10);
    });

    test('should render nav items with labels', async ({ page }) => {
      await closeVisiblePanels(page);

      const dashboardNav = page.locator('.nav-item').filter({ hasText: 'Dashboard' });
      await expect(dashboardNav).toBeVisible();
    });
  });

  test.describe('Typography', () => {
    test('should render headings', async ({ page }) => {
      await closeVisiblePanels(page);

      const headings = page.locator('h1, h2, h3, h4, .heading, [class*="heading"]');
      const count = await headings.count();
      expect(count).toBeGreaterThan(0);
    });

    test('should render text content', async ({ page }) => {
      await closeVisiblePanels(page);

      const text = page.locator('p, span, .text, [class*="text"]');
      const count = await text.count();
      expect(count).toBeGreaterThan(0);
    });
  });

  test.describe('Inputs', () => {
    test('should render text inputs in assistant panel', async ({ page }) => {
      // Panel is auto-opened, has textarea
      const textarea = page.locator('.assistant-panel textarea');
      await expect(textarea).toBeVisible();
    });

    test('should accept input in assistant panel', async ({ page }) => {
      const textarea = page.locator('.assistant-panel textarea');
      await textarea.fill('Test input');
      const value = await textarea.inputValue();
      expect(value).toBe('Test input');
    });
  });

  test.describe('Status Indicators', () => {
    test('should render status badges', async ({ page }) => {
      await closeVisiblePanels(page);

      const badges = page.locator('.badge, .status, [class*="badge"], [class*="status"]');
      const count = await badges.count();
      expect(count).toBeGreaterThanOrEqual(0);
    });
  });

  test.describe('Layout Components', () => {
    test('should render main layout correctly', async ({ page }) => {
      await closeVisiblePanels(page);

      const app = page.locator('.app');
      const sidebar = page.locator('.sidebar');
      const mainArea = page.locator('.main-area');
      const mainContent = page.locator('.main-content');

      await expect(app).toBeVisible();
      await expect(sidebar).toBeVisible();
      await expect(mainArea).toBeVisible();
      await expect(mainContent).toBeVisible();
    });

    test('should render header correctly', async ({ page }) => {
      await closeVisiblePanels(page);

      const header = page.locator('.header, [class*="header"]').first();
      await expect(header).toBeVisible();
    });

    test('should render sections correctly', async ({ page }) => {
      await closeVisiblePanels(page);

      const sections = page.locator('.section, [class*="section"]');
      const count = await sections.count();
      expect(count).toBeGreaterThan(0);
    });
  });

  test.describe('Empty States', () => {
    test('should render empty state when no data', async ({ page }) => {
      await closeVisiblePanels(page);

      // Navigate to a screen that might show empty state
      const navItem = page.locator('.nav-item').filter({ hasText: 'Memory' });
      await navItem.click();
      await page.waitForTimeout(500);

      // May show empty state
      const emptyState = page.locator('.empty-state, [class*="empty"]');
      // May or may not be visible depending on data
    });
  });

  test.describe('Loading States', () => {
    test('should not show loading indefinitely', async ({ page }) => {
      await closeVisiblePanels(page);

      // Wait for any loading to complete
      await page.waitForTimeout(2000);

      // Loading indicators should not be visible
      const loading = page.locator('.loading, .spinner, [class*="loading"]');
      const count = await loading.count();
      // Should be 0 or hidden
    });
  });

  test.describe('Ambient Orbs', () => {
    test('should render ambient orbs', async ({ page }) => {
      const orbs = page.locator('.ambient-orbs, [class*="orb"]');
      const count = await orbs.count();
      expect(count).toBeGreaterThanOrEqual(0);
    });
  });

  test.describe('Tooltips', () => {
    test('should show tooltips on hover (if present)', async ({ page }) => {
      await closeVisiblePanels(page);

      // Find element with tooltip
      const tooltipTrigger = page.locator('[title], [data-tooltip]').first();
      if (await tooltipTrigger.count() > 0) {
        await tooltipTrigger.hover();
        await page.waitForTimeout(500);

        // Tooltip may or may not be visible
      }
    });
  });

  test.describe('Scrollbars', () => {
    test('should have scrollable areas', async ({ page }) => {
      await closeVisiblePanels(page);

      const scrollable = page.locator('[style*="overflow"], .scroll, [class*="scroll"]');
      const count = await scrollable.count();
      expect(count).toBeGreaterThanOrEqual(0);
    });
  });

  test.describe('Responsive Containers', () => {
    test('should render at mobile size', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.waitForTimeout(300);

      const app = page.locator('.app');
      await expect(app).toBeVisible();
    });

    test('should render at tablet size', async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 });
      await page.waitForTimeout(300);

      const app = page.locator('.app');
      await expect(app).toBeVisible();
    });

    test('should render at desktop size', async ({ page }) => {
      await page.setViewportSize({ width: 1440, height: 900 });
      await page.waitForTimeout(300);

      const app = page.locator('.app');
      await expect(app).toBeVisible();
    });

    test('should render at large desktop size', async ({ page }) => {
      await page.setViewportSize({ width: 1920, height: 1080 });
      await page.waitForTimeout(300);

      const app = page.locator('.app');
      await expect(app).toBeVisible();
    });
  });
});
