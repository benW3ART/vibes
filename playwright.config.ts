import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ['html', { outputFolder: 'playwright-report' }],
    ['json', { outputFile: 'test-results.json' }],
    ['list']
  ],
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    // Global storage state to bypass onboarding for all tests
    storageState: {
      cookies: [],
      origins: [{
        origin: 'http://localhost:5173',
        localStorage: [
          { name: 'vibes:hasSeenDemo', value: 'true' },
          { name: 'vibes:chatPanelOpen', value: 'false' },
          { name: 'vibes:onboardingComplete', value: 'true' },
          { name: 'vibes-connections', value: JSON.stringify({
            state: {
              connections: [{
                id: 'claude-mock',
                type: 'claude',
                name: 'Claude',
                status: 'connected',
                lastConnected: new Date().toISOString(),
              }],
              isConnecting: null,
            },
            version: 0,
          })},
        ],
      }],
    },
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
});
