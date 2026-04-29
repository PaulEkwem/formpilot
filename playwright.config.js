// @ts-check
import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright config for FormPilot E2E smoke tests.
 *
 * Local: `npm run test:e2e`           (runs against npx serve on port 5173)
 * CI:    same — see .github/workflows/ci.yml
 *
 * Add new tests in tests/e2e/*.spec.js
 */
export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30_000,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: {
    command: 'npx serve . -p 5173 --no-clipboard',
    url: 'http://localhost:5173',
    timeout: 30_000,
    reuseExistingServer: !process.env.CI,
  },
});
