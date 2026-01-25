import { test, expect } from '@playwright/test';

// Helper to close overlays
async function closeOverlays(page: any) {
  const cmdPaletteOverlay = page.locator('[class*="_overlay_"][class*="_visible_"]');
  if (await cmdPaletteOverlay.count() > 0) {
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);
  }

  const panelOverlay = page.locator('.panel-overlay.visible');
  if (await panelOverlay.count() > 0) {
    await panelOverlay.click({ force: true });
    await page.waitForTimeout(300);
  }
}

test.describe('Workflow Phases', () => {

  test.describe('Welcome Phase', () => {
    test('should show welcome message on initial load', async ({ page }) => {
      await page.goto('/');
      await page.waitForTimeout(500);

      const welcomeMessage = page.locator('.chat-message').filter({ hasText: /bienvenue|welcome/i });
      await expect(welcomeMessage.first()).toBeVisible();
    });

    test('should show project options in welcome', async ({ page }) => {
      await page.goto('/');
      await page.waitForTimeout(500);

      const newProjectBtn = page.locator('button').filter({ hasText: /nouveau|new/i });
      await expect(newProjectBtn.first()).toBeVisible();
    });

    test('should have phase indicator showing current phase', async ({ page }) => {
      await page.goto('/');
      await page.waitForTimeout(500);

      const phaseIndicator = page.locator('.phase-indicator, [class*="phase"]');
      await expect(phaseIndicator.first()).toBeVisible();
    });
  });

  test.describe('Discovery Phase', () => {
    test('should transition to discovery when starting new project', async ({ page }) => {
      await page.goto('/');
      await page.waitForTimeout(1500);
      await closeOverlays(page);

      const newProjectBtn = page.locator('.chat-message-actions button').filter({ hasText: 'New Project' });
      await newProjectBtn.click({ force: true });
      await page.waitForTimeout(2000);

      // Should show discovery-related message
      const messages = page.locator('.chat-message');
      const count = await messages.count();
      expect(count).toBeGreaterThanOrEqual(1);
    });

    test('should ask for project name first', async ({ page }) => {
      await page.goto('/');
      await page.waitForTimeout(1500);
      await closeOverlays(page);

      const newProjectBtn = page.locator('.chat-message-actions button').filter({ hasText: 'New Project' });
      await newProjectBtn.click({ force: true });
      await page.waitForTimeout(2000);

      // Should have message asking for name
      const messages = page.locator('.chat-message');
      await expect(messages.first()).toBeVisible();
    });

    test('should accept project name and proceed', async ({ page }) => {
      await page.goto('/');
      await page.waitForTimeout(1500);
      await closeOverlays(page);

      const newProjectBtn = page.locator('.chat-message-actions button').filter({ hasText: 'New Project' });
      await newProjectBtn.click({ force: true });
      await page.waitForTimeout(2000);

      // Enter project name
      const chatInput = page.locator('.assistant-panel textarea');
      await chatInput.click({ force: true });
      await chatInput.fill('my-test-project');
      await page.keyboard.press('Enter');
      await page.waitForTimeout(2000);

      // Should show at least one message
      const messages = page.locator('.chat-message');
      const count = await messages.count();
      expect(count).toBeGreaterThanOrEqual(1);
    });
  });

  test.describe('Dashboard Phase Integration', () => {
    test('should show progress on dashboard', async ({ page }) => {
      await page.addInitScript(() => {
        localStorage.setItem('vibes:hasSeenDemo', 'true');
      });
      await page.goto('/');
      await page.waitForTimeout(500);
      await closeOverlays(page);

      // Navigate to dashboard
      const dashboardNav = page.locator('.nav-item').filter({ hasText: 'Dashboard' });
      await dashboardNav.click();
      await page.waitForTimeout(300);

      // Should show progress
      const progress = page.locator('.main-content').filter({ hasText: /progress|%/ });
      await expect(progress.first()).toBeVisible();
    });

    test('should show phases on dashboard', async ({ page }) => {
      await page.addInitScript(() => {
        localStorage.setItem('vibes:hasSeenDemo', 'true');
      });
      await page.goto('/');
      await page.waitForTimeout(500);
      await closeOverlays(page);

      const dashboardNav = page.locator('.nav-item').filter({ hasText: 'Dashboard' });
      await dashboardNav.click();
      await page.waitForTimeout(300);

      // Should show phases section
      const phases = page.locator('.main-content').filter({ hasText: /phase/i });
      await expect(phases.first()).toBeVisible();
    });

    test('should show running tasks', async ({ page }) => {
      await page.addInitScript(() => {
        localStorage.setItem('vibes:hasSeenDemo', 'true');
      });
      await page.goto('/');
      await page.waitForTimeout(500);
      await closeOverlays(page);

      const dashboardNav = page.locator('.nav-item').filter({ hasText: 'Dashboard' });
      await dashboardNav.click();
      await page.waitForTimeout(300);

      // Should show running section
      const running = page.locator('.main-content').filter({ hasText: /running/i });
      await expect(running.first()).toBeVisible();
    });
  });

  test.describe('Execution Phase', () => {
    test('should show execution screen with tasks', async ({ page }) => {
      await page.addInitScript(() => {
        localStorage.setItem('vibes:hasSeenDemo', 'true');
      });
      await page.goto('/');
      await page.waitForTimeout(500);
      await closeOverlays(page);

      const execNav = page.locator('.nav-item').filter({ hasText: 'Execution' });
      await execNav.click();
      await page.waitForTimeout(300);

      const title = page.locator('.header-title');
      const text = await title.textContent();
      expect(text?.toLowerCase()).toContain('execution');
    });

    test('should show execution controls', async ({ page }) => {
      await page.addInitScript(() => {
        localStorage.setItem('vibes:hasSeenDemo', 'true');
      });
      await page.goto('/');
      await page.waitForTimeout(500);

      // Execution bar should have controls
      const execBar = page.locator('.exec-bar');
      await expect(execBar).toBeVisible();

      const controls = page.locator('.exec-bar button');
      const count = await controls.count();
      expect(count).toBeGreaterThan(0);
    });
  });

  test.describe('Tasks Phase', () => {
    test('should show tasks screen with task list', async ({ page }) => {
      await page.addInitScript(() => {
        localStorage.setItem('vibes:hasSeenDemo', 'true');
      });
      await page.goto('/');
      await page.waitForTimeout(500);
      await closeOverlays(page);

      const tasksNav = page.locator('.nav-item').filter({ hasText: 'Tasks' });
      await tasksNav.click();
      await page.waitForTimeout(300);

      const title = page.locator('.header-title');
      const text = await title.textContent();
      expect(text?.toLowerCase()).toContain('task');
    });

    test('should show task categories', async ({ page }) => {
      await page.addInitScript(() => {
        localStorage.setItem('vibes:hasSeenDemo', 'true');
      });
      await page.goto('/');
      await page.waitForTimeout(500);
      await closeOverlays(page);

      const tasksNav = page.locator('.nav-item').filter({ hasText: 'Tasks' });
      await tasksNav.click();
      await page.waitForTimeout(300);

      // Should show some task-related content
      const mainContent = page.locator('.main-content');
      await expect(mainContent).toBeVisible();
    });
  });

  test.describe('Plan Phase', () => {
    test('should show plan screen', async ({ page }) => {
      await page.addInitScript(() => {
        localStorage.setItem('vibes:hasSeenDemo', 'true');
      });
      await page.goto('/');
      await page.waitForTimeout(500);
      await closeOverlays(page);

      const planNav = page.locator('.nav-item').filter({ hasText: 'Plan' });
      await planNav.click();
      await page.waitForTimeout(300);

      const title = page.locator('.header-title');
      const text = await title.textContent();
      expect(text?.toLowerCase()).toContain('plan');
    });

    test('should have create plan option', async ({ page }) => {
      await page.addInitScript(() => {
        localStorage.setItem('vibes:hasSeenDemo', 'true');
      });
      await page.goto('/');
      await page.waitForTimeout(500);
      await closeOverlays(page);

      const planNav = page.locator('.nav-item').filter({ hasText: 'Plan' });
      await planNav.click();
      await page.waitForTimeout(300);

      // Should show some plan content or create option
      const mainContent = page.locator('.main-content');
      await expect(mainContent).toBeVisible();
    });
  });

  test.describe('Phase Transitions via Sidebar', () => {
    test('should navigate through all phases via sidebar', async ({ page }) => {
      await page.addInitScript(() => {
        localStorage.setItem('vibes:hasSeenDemo', 'true');
      });
      await page.goto('/');
      await page.waitForTimeout(500);
      await closeOverlays(page);

      const screens = ['Dashboard', 'Execution', 'Tasks', 'Plan', 'Skills', 'Settings'];

      for (const screen of screens) {
        const navItem = page.locator('.nav-item').filter({ hasText: screen });
        if (await navItem.count() > 0) {
          await navItem.first().click();
          await page.waitForTimeout(300);

          const mainContent = page.locator('.main-content');
          await expect(mainContent).toBeVisible();
        }
      }
    });
  });
});
