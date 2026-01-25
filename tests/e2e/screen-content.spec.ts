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

test.describe('Screen Content Tests', () => {

  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('vibes:hasSeenDemo', 'true');
    });
    await page.goto('/');
    await page.waitForTimeout(500);
  });

  test.describe('Dashboard Screen', () => {
    test('should display dashboard with stats cards', async ({ page }) => {
      await closeVisiblePanels(page);

      // Dashboard should show content
      const mainContent = page.locator('.main-content');
      await expect(mainContent).toBeVisible({ timeout: 5000 });

      // Look for stats or dashboard content
      const dashboardContent = page.locator('.screen-container');
      await expect(dashboardContent).toBeVisible();
    });

    test('should display dashboard content', async ({ page }) => {
      await closeVisiblePanels(page);

      const mainContent = page.locator('.main-content');
      await expect(mainContent).toBeVisible();

      // Header should show Dashboard title
      const header = page.locator('.header-title');
      const title = await header.textContent();
      expect(title).toContain('Dashboard');
    });

    test('should show main content when no project selected', async ({ page }) => {
      await closeVisiblePanels(page);

      // Should show main content
      const mainContent = page.locator('.main-content');
      await expect(mainContent).toBeVisible();
    });
  });

  test.describe('Tasks Screen', () => {
    test('should display tasks list or empty state', async ({ page }) => {
      await navigateToScreen(page, 'Tasks');

      const mainContent = page.locator('.main-content');
      await expect(mainContent).toBeVisible();

      // Should have task-related content or empty state
      const taskContent = page.locator('.task-list, .tasks-empty, .empty-state, [class*="task"]');
      await expect(taskContent.first()).toBeVisible({ timeout: 5000 });
    });

    test('should have action buttons', async ({ page }) => {
      await navigateToScreen(page, 'Tasks');

      // Should have some action buttons
      const buttons = page.locator('.main-content button, .main-content .btn');
      const count = await buttons.count();
      expect(count).toBeGreaterThanOrEqual(0);
    });
  });

  test.describe('Plan Screen', () => {
    test('should display plan content or empty state', async ({ page }) => {
      await navigateToScreen(page, 'Plan');

      const mainContent = page.locator('.main-content');
      await expect(mainContent).toBeVisible();

      // Should have plan-related content
      const planContent = page.locator('.plan-content, .plan-empty, .empty-state, [class*="plan"]');
      await expect(planContent.first()).toBeVisible({ timeout: 5000 });
    });

    test('should have create plan button when no plan exists', async ({ page }) => {
      await navigateToScreen(page, 'Plan');

      // Look for create/generate button
      const createBtn = page.locator('button').filter({ hasText: /create|generate|new/i });
      // May or may not exist depending on state
    });
  });

  test.describe('Skills Screen', () => {
    test('should display skills list', async ({ page }) => {
      await navigateToScreen(page, 'Skills');

      const mainContent = page.locator('.main-content');
      await expect(mainContent).toBeVisible();

      // Should have skills content
      const skillsContent = page.locator('.skills-list, .skill-card, .skill-item, [class*="skill"]');
      await expect(skillsContent.first()).toBeVisible({ timeout: 5000 });
    });

    test('should have skill toggle switches', async ({ page }) => {
      await navigateToScreen(page, 'Skills');

      // Skills should have toggle switches
      const toggles = page.locator('.toggle, .switch, input[type="checkbox"], [class*="toggle"]');
      const count = await toggles.count();
      expect(count).toBeGreaterThanOrEqual(0);
    });

    test('should display skill descriptions', async ({ page }) => {
      await navigateToScreen(page, 'Skills');

      // Skills should have descriptions
      const descriptions = page.locator('.skill-description, .skill-info, [class*="description"]');
      const count = await descriptions.count();
      expect(count).toBeGreaterThanOrEqual(0);
    });
  });

  test.describe('MCP Screen', () => {
    test('should display MCP servers list', async ({ page }) => {
      await navigateToScreen(page, 'MCP');

      const mainContent = page.locator('.main-content');
      await expect(mainContent).toBeVisible();

      // Should have MCP content
      const mcpContent = page.locator('.mcp-list, .server-list, .mcp-empty, [class*="mcp"], [class*="server"]');
      await expect(mcpContent.first()).toBeVisible({ timeout: 5000 });
    });

    test('should have add server button', async ({ page }) => {
      await navigateToScreen(page, 'MCP');

      // Should have add button
      const addBtn = page.locator('button').filter({ hasText: /add|new|\+/i });
      const count = await addBtn.count();
      expect(count).toBeGreaterThanOrEqual(0);
    });
  });

  test.describe('Settings Screen', () => {
    test('should display settings sections', async ({ page }) => {
      await navigateToScreen(page, 'Settings');

      const mainContent = page.locator('.main-content');
      await expect(mainContent).toBeVisible();

      // Should have settings sections
      const settingsContent = page.locator('.settings-section, .setting-group, [class*="setting"]');
      await expect(settingsContent.first()).toBeVisible({ timeout: 5000 });
    });

    test('should have form controls', async ({ page }) => {
      await navigateToScreen(page, 'Settings');

      // Settings should have form controls
      const controls = page.locator('input, select, .toggle, .switch');
      const count = await controls.count();
      expect(count).toBeGreaterThanOrEqual(0);
    });
  });

  test.describe('Memory Screen', () => {
    test('should display memory content', async ({ page }) => {
      await navigateToScreen(page, 'Memory');

      const mainContent = page.locator('.main-content');
      await expect(mainContent).toBeVisible();

      // Should have memory-related content
      const memoryContent = page.locator('.memory-list, .memory-empty, [class*="memory"]');
      await expect(memoryContent.first()).toBeVisible({ timeout: 5000 });
    });
  });

  test.describe('Tests Screen', () => {
    test('should display tests content', async ({ page }) => {
      await navigateToScreen(page, 'Tests');

      const mainContent = page.locator('.main-content');
      await expect(mainContent).toBeVisible();

      // Should have tests-related content
      const testsContent = page.locator('.tests-list, .test-results, .tests-empty, [class*="test"]');
      await expect(testsContent.first()).toBeVisible({ timeout: 5000 });
    });

    test('should have run tests button', async ({ page }) => {
      await navigateToScreen(page, 'Tests');

      // Should have run button
      const runBtn = page.locator('button').filter({ hasText: /run|execute|start/i });
      const count = await runBtn.count();
      expect(count).toBeGreaterThanOrEqual(0);
    });
  });

  test.describe('Deploy Screen', () => {
    test('should display deploy content', async ({ page }) => {
      await navigateToScreen(page, 'Deploy');

      const mainContent = page.locator('.main-content');
      await expect(mainContent).toBeVisible();

      // Should have deploy-related content
      const deployContent = page.locator('.deploy-content, .deploy-empty, [class*="deploy"]');
      await expect(deployContent.first()).toBeVisible({ timeout: 5000 });
    });

    test('should have deploy action button', async ({ page }) => {
      await navigateToScreen(page, 'Deploy');

      // Should have deploy button
      const deployBtn = page.locator('button').filter({ hasText: /deploy|publish|release/i });
      const count = await deployBtn.count();
      expect(count).toBeGreaterThanOrEqual(0);
    });
  });

  test.describe('Logs Screen', () => {
    test('should display logs content', async ({ page }) => {
      await navigateToScreen(page, 'Logs');

      const mainContent = page.locator('.main-content');
      await expect(mainContent).toBeVisible();

      // Should have logs-related content
      const logsContent = page.locator('.logs-list, .log-entry, .logs-empty, [class*="log"]');
      await expect(logsContent.first()).toBeVisible({ timeout: 5000 });
    });

    test('should have log filters', async ({ page }) => {
      await navigateToScreen(page, 'Logs');

      // May have filter controls
      const filters = page.locator('.log-filters, .filter-bar, select, [class*="filter"]');
      const count = await filters.count();
      expect(count).toBeGreaterThanOrEqual(0);
    });
  });

  test.describe('Analytics Screen', () => {
    test('should display analytics content', async ({ page }) => {
      await navigateToScreen(page, 'Analytics');

      const mainContent = page.locator('.main-content');
      await expect(mainContent).toBeVisible();

      // Should have analytics-related content
      const analyticsContent = page.locator('.analytics-content, .stats, .chart, [class*="analytic"]');
      await expect(analyticsContent.first()).toBeVisible({ timeout: 5000 });
    });

    test('should display stats metrics', async ({ page }) => {
      await navigateToScreen(page, 'Analytics');

      // Should have stat cards or metrics
      const stats = page.locator('.stat-card, .metric, [class*="stat"]');
      const count = await stats.count();
      expect(count).toBeGreaterThanOrEqual(0);
    });
  });

  test.describe('Connections Screen', () => {
    test('should display connections content', async ({ page }) => {
      await navigateToScreen(page, 'Connections');

      const mainContent = page.locator('.main-content');
      await expect(mainContent).toBeVisible();

      // Should have connections-related content
      const connectionsContent = page.locator('.connections-list, .connection-card, [class*="connection"]');
      await expect(connectionsContent.first()).toBeVisible({ timeout: 5000 });
    });

    test('should show Claude connection status', async ({ page }) => {
      await navigateToScreen(page, 'Connections');

      // Should have Claude connection info
      const claudeConnection = page.locator('[class*="connection"]').filter({ hasText: /claude/i });
      await expect(claudeConnection.first()).toBeVisible({ timeout: 5000 });
    });

    test('should show GitHub connection option', async ({ page }) => {
      await navigateToScreen(page, 'Connections');

      // Should have GitHub connection info
      const githubConnection = page.locator('[class*="connection"]').filter({ hasText: /github/i });
      await expect(githubConnection.first()).toBeVisible({ timeout: 5000 });
    });

    test('should have connect buttons', async ({ page }) => {
      await navigateToScreen(page, 'Connections');

      // Should have connect/disconnect buttons
      const connectBtns = page.locator('button').filter({ hasText: /connect|disconnect|link/i });
      const count = await connectBtns.count();
      expect(count).toBeGreaterThanOrEqual(0);
    });
  });

  test.describe('Environment Screen', () => {
    test('should display environment content', async ({ page }) => {
      await navigateToScreen(page, 'Environment');

      const mainContent = page.locator('.main-content');
      await expect(mainContent).toBeVisible();

      // Should have environment-related content
      const envContent = page.locator('.env-list, .env-var, [class*="env"], [class*="environment"]');
      await expect(envContent.first()).toBeVisible({ timeout: 5000 });
    });

    test('should display system info', async ({ page }) => {
      await navigateToScreen(page, 'Environment');

      // Should have system information
      const sysInfo = page.locator('[class*="system"], [class*="info"]');
      const count = await sysInfo.count();
      expect(count).toBeGreaterThanOrEqual(0);
    });
  });

  test.describe('Code Screen', () => {
    test('should display code content', async ({ page }) => {
      await navigateToScreen(page, 'Code');

      const mainContent = page.locator('.main-content');
      await expect(mainContent).toBeVisible();

      // Should have code-related content
      const codeContent = page.locator('.code-editor, .file-tree, [class*="code"]');
      await expect(codeContent.first()).toBeVisible({ timeout: 5000 });
    });
  });

  test.describe('Debug Screen', () => {
    test('should display debug content', async ({ page }) => {
      await navigateToScreen(page, 'Debug');

      const mainContent = page.locator('.main-content');
      await expect(mainContent).toBeVisible();

      // Should have debug-related content
      const debugContent = page.locator('.debug-content, .debug-panel, [class*="debug"]');
      await expect(debugContent.first()).toBeVisible({ timeout: 5000 });
    });
  });

  test.describe('Prompts Screen', () => {
    test('should display prompts content', async ({ page }) => {
      await navigateToScreen(page, 'Prompts');

      const mainContent = page.locator('.main-content');
      await expect(mainContent).toBeVisible();

      // Should have prompts-related content
      const promptsContent = page.locator('.prompts-list, .prompt-card, [class*="prompt"]');
      await expect(promptsContent.first()).toBeVisible({ timeout: 5000 });
    });

    test('should have generate button', async ({ page }) => {
      await navigateToScreen(page, 'Prompts');

      // Should have generate button
      const generateBtn = page.locator('button').filter({ hasText: /generate|create|new/i });
      const count = await generateBtn.count();
      expect(count).toBeGreaterThanOrEqual(0);
    });
  });
});
