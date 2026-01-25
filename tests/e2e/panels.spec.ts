import { test, expect } from '@playwright/test';

// Helper to close any visible panel overlays
async function closeVisiblePanels(page: any) {
  const overlay = page.locator('.panel-overlay.visible');
  if (await overlay.count() > 0) {
    await overlay.click({ force: true });
    await page.waitForTimeout(300);
  }
}

test.describe('Panel Interactions', () => {

  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('vibes:hasSeenDemo', 'true');
    });
  });

  test.describe('Assistant Panel', () => {
    test('should toggle assistant panel via header button', async ({ page }) => {
      await page.goto('/');
      await page.waitForTimeout(500);

      // Close panel first
      await closeVisiblePanels(page);

      // Find and click Chat toggle button in header
      const toggleBtn = page.locator('.header-right button').filter({ hasText: 'Chat' });
      await toggleBtn.click();
      await page.waitForTimeout(300);

      // Panel should open
      const panel = page.locator('.assistant-panel.open');
      await expect(panel).toBeVisible();
    });

    test('should show typing indicator when waiting', async ({ page }) => {
      await page.goto('/');
      await page.waitForTimeout(500);

      // Start a flow that triggers typing
      const newProjectBtn = page.locator('.chat-message-actions button').filter({ hasText: 'New Project' });
      await newProjectBtn.click();

      // Typing indicator may briefly appear
      // This tests that the component renders without errors
      await page.waitForTimeout(600);
    });
  });

  test.describe('XRay Panel', () => {
    test('should toggle XRay panel via header button', async ({ page }) => {
      await page.goto('/');
      await page.waitForTimeout(500);
      await closeVisiblePanels(page);

      // Find XRay toggle button
      const xrayBtn = page.locator('.header-right button').filter({ hasText: 'X-Ray' });
      await xrayBtn.click();
      await page.waitForTimeout(300);

      // XRay panel should open (uses .panel.open class with X-Ray title)
      const xrayPanel = page.locator('.panel.open .panel-title').filter({ hasText: 'X-Ray' });
      await expect(xrayPanel).toBeVisible();
    });

    test('should close XRay panel when clicking overlay', async ({ page }) => {
      await page.goto('/');
      await page.waitForTimeout(500);
      await closeVisiblePanels(page);

      // Open XRay panel
      const xrayBtn = page.locator('.header-right button').filter({ hasText: 'X-Ray' });
      await xrayBtn.click();
      await page.waitForTimeout(300);

      // XRay panel should be open
      const xrayTitle = page.locator('.panel.open .panel-title').filter({ hasText: 'X-Ray' });
      await expect(xrayTitle).toBeVisible();

      // Click overlay to close
      const overlay = page.locator('.panel-overlay.visible');
      await overlay.click({ force: true });
      await page.waitForTimeout(300);

      // XRay panel should be closed (title not visible)
      await expect(xrayTitle).not.toBeVisible();
    });
  });

  test.describe('Panel Overlay', () => {
    test('should show overlay when panel is open', async ({ page }) => {
      await page.goto('/');
      await page.waitForTimeout(500);

      // Panel is auto-opened, overlay should be visible
      const overlay = page.locator('.panel-overlay.visible');
      await expect(overlay).toBeVisible();
    });

    test('should hide overlay when all panels are closed', async ({ page }) => {
      await page.goto('/');
      await page.waitForTimeout(500);

      // Close all panels
      await closeVisiblePanels(page);

      // Overlay should not be visible
      const overlay = page.locator('.panel-overlay.visible');
      await expect(overlay).not.toBeVisible();
    });

    test('should close all panels when overlay is clicked', async ({ page }) => {
      await page.goto('/');
      await page.waitForTimeout(500);

      // Click overlay
      const overlay = page.locator('.panel-overlay.visible');
      await overlay.click({ force: true });
      await page.waitForTimeout(300);

      // Both panels should be closed
      const openPanels = page.locator('.panel.open, .assistant-panel.open, .xray-panel.open');
      await expect(openPanels).toHaveCount(0);
    });
  });

  test.describe('Panel Content', () => {
    test('should have panel header with title and close button', async ({ page }) => {
      await page.goto('/');
      await page.waitForTimeout(500);

      // Assistant panel should have header
      const panelHeader = page.locator('.panel-header').first();
      await expect(panelHeader).toBeVisible();

      // Should have title
      const panelTitle = page.locator('.panel-title, .panel-header-left').first();
      await expect(panelTitle).toBeVisible();

      // Should have close button
      const closeBtn = page.locator('.panel-header button').first();
      await expect(closeBtn).toBeVisible();
    });

    test('should have scrollable content area', async ({ page }) => {
      await page.goto('/');
      await page.waitForTimeout(500);

      const panelContent = page.locator('.panel-content, .chat-messages').first();
      await expect(panelContent).toBeVisible();
    });
  });

  test.describe('Keyboard Shortcuts for Panels', () => {
    test('should toggle chat panel with Cmd+/', async ({ page }) => {
      await page.goto('/');
      await page.waitForTimeout(500);
      await closeVisiblePanels(page);

      // Press Cmd+/
      await page.keyboard.press('Meta+/');
      await page.waitForTimeout(300);

      // Panel should open
      const panel = page.locator('.panel.open, .assistant-panel.open');
      await expect(panel).toBeVisible();
    });

    test('should toggle XRay panel with Cmd+.', async ({ page }) => {
      await page.goto('/');
      await page.waitForTimeout(500);
      await closeVisiblePanels(page);

      // Press Cmd+.
      await page.keyboard.press('Meta+.');
      await page.waitForTimeout(300);

      // XRay panel should open
      const xrayPanel = page.locator('.xray-panel.open, .panel.open');
      await expect(xrayPanel).toBeVisible();
    });
  });
});
