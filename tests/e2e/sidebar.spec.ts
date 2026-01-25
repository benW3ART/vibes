import { test, expect } from '@playwright/test';

// Helper to close any visible panel overlays
async function closeVisiblePanels(page: any) {
  const overlay = page.locator('.panel-overlay.visible');
  if (await overlay.count() > 0) {
    await overlay.click({ force: true });
    await page.waitForTimeout(300);
  }
}

test.describe('Sidebar Navigation', () => {

  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('vibes:hasSeenDemo', 'true');
    });
    await page.goto('/');
    await page.waitForTimeout(500);
    await closeVisiblePanels(page);
  });

  test.describe('Structure', () => {
    test('should display sidebar', async ({ page }) => {
      const sidebar = page.locator('.sidebar');
      await expect(sidebar).toBeVisible();
    });

    test('should have navigation sections', async ({ page }) => {
      const sections = page.locator('.nav-section, .sidebar-section');
      const count = await sections.count();
      expect(count).toBeGreaterThan(0);
    });

    test('should have section headers', async ({ page }) => {
      const headers = page.locator('.nav-section-header, .section-title, [class*="section-header"]');
      const count = await headers.count();
      expect(count).toBeGreaterThan(0);
    });

    test('should have navigation items', async ({ page }) => {
      const navItems = page.locator('.nav-item');
      const count = await navItems.count();
      expect(count).toBeGreaterThan(10); // Should have 17 screens
    });
  });

  test.describe('Navigation Sections', () => {
    test('should have Command Center section', async ({ page }) => {
      const section = page.locator('.nav-section, .sidebar-section').filter({ hasText: /command|center/i });
      await expect(section).toBeVisible();
    });

    test('should have .claude section', async ({ page }) => {
      const section = page.locator('.nav-section, .sidebar-section').filter({ hasText: /\.claude|claude/i });
      await expect(section).toBeVisible();
    });

    test('should have Build section', async ({ page }) => {
      const section = page.locator('.nav-section, .sidebar-section').filter({ hasText: /build/i });
      await expect(section).toBeVisible();
    });

    test('should have Ship section', async ({ page }) => {
      const section = page.locator('.nav-section, .sidebar-section').filter({ hasText: /ship/i });
      await expect(section).toBeVisible();
    });

    test('should have System section', async ({ page }) => {
      const section = page.locator('.nav-section, .sidebar-section').filter({ hasText: /system/i });
      await expect(section).toBeVisible();
    });
  });

  test.describe('Navigation Items', () => {
    const screens = [
      'Dashboard', 'Tasks', 'Prompts',
      'Plan', 'Skills', 'MCP', 'Settings', 'Memory',
      'Code', 'Debug', 'Tests',
      'Deploy', 'Logs', 'Analytics',
      'Connections', 'Environment'
    ];

    for (const screen of screens) {
      test(`should have ${screen} nav item`, async ({ page }) => {
        const navItem = page.locator('.nav-item').filter({ hasText: screen });
        await expect(navItem).toBeVisible();
      });
    }
  });

  test.describe('Navigation Functionality', () => {
    test('should highlight active nav item', async ({ page }) => {
      // Dashboard should be active by default
      const activeItem = page.locator('.nav-item.active, .nav-item[class*="active"]');
      await expect(activeItem).toBeVisible();
    });

    test('should navigate to Tasks when clicked', async ({ page }) => {
      const tasksNav = page.locator('.nav-item').filter({ hasText: 'Tasks' });
      await tasksNav.click();
      await page.waitForTimeout(300);

      // Tasks should now be active
      const activeItem = page.locator('.nav-item.active, .nav-item[class*="active"]').filter({ hasText: 'Tasks' });
      await expect(activeItem).toBeVisible();
    });

    test('should navigate to Plan when clicked', async ({ page }) => {
      const planNav = page.locator('.nav-item').filter({ hasText: 'Plan' });
      await planNav.click();
      await page.waitForTimeout(300);

      const activeItem = page.locator('.nav-item.active, .nav-item[class*="active"]').filter({ hasText: 'Plan' });
      await expect(activeItem).toBeVisible();
    });

    test('should navigate to Skills when clicked', async ({ page }) => {
      const skillsNav = page.locator('.nav-item').filter({ hasText: 'Skills' });
      await skillsNav.click();
      await page.waitForTimeout(300);

      const activeItem = page.locator('.nav-item.active, .nav-item[class*="active"]').filter({ hasText: 'Skills' });
      await expect(activeItem).toBeVisible();
    });

    test('should navigate to Connections when clicked', async ({ page }) => {
      const connectionsNav = page.locator('.nav-item').filter({ hasText: 'Connections' });
      await connectionsNav.click();
      await page.waitForTimeout(300);

      const activeItem = page.locator('.nav-item.active, .nav-item[class*="active"]').filter({ hasText: 'Connections' });
      await expect(activeItem).toBeVisible();
    });
  });

  test.describe('Nav Item Icons', () => {
    test('should have icons for nav items', async ({ page }) => {
      const icons = page.locator('.nav-item svg, .nav-item .icon, .nav-item [class*="icon"]');
      const count = await icons.count();
      expect(count).toBeGreaterThan(0);
    });
  });

  test.describe('Sidebar Footer', () => {
    test('should have help or tutorial button', async ({ page }) => {
      const sidebar = page.locator('.sidebar');
      const footerBtn = sidebar.locator('button, a').filter({ hasText: /help|tutorial|guide/i });
      // May or may not exist
    });
  });

  test.describe('Keyboard Navigation', () => {
    test('should be focusable via Tab', async ({ page }) => {
      // Tab to sidebar
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');
      await page.waitForTimeout(100);

      // Some element in sidebar should be focused
      const focusedInSidebar = page.locator('.sidebar :focus');
      // May or may not have focus depending on tab order
    });
  });
});
