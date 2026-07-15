import { defineConfig, devices } from '@playwright/test';

/**
 * Envello E2E test suite.
 *
 * Run all tests:
 *   npx playwright test
 *
 * Run in headed mode (watch):
 *   npx playwright test --headed
 *
 * Run a single file:
 *   npx playwright test e2e/tests/login.spec.ts
 *
 * The suite expects the web dev server to be running on port 4200.
 * Start it first with:  npm exec nx serve web
 */
export default defineConfig({
  testDir:  './tests',
  timeout:  30_000,
  retries:  process.env['CI'] ? 2 : 0,
  workers:  process.env['CI'] ? 1 : undefined,

  reporter: [
    ['list'],
    ['html', { outputFolder: '../dist/e2e-report', open: 'never' }],
  ],

  use: {
    baseURL:      'http://localhost:4200',
    trace:        'on-first-retry',
    screenshot:   'only-on-failure',
    video:        'retain-on-failure',
    // Keep animations disabled so tests don't wait for CSS transitions
    reducedMotion: 'reduce',
  },

  projects: [
    {
      name: 'chromium',
      use:  { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use:  { ...devices['Desktop Firefox'] },
    },
  ],
});
