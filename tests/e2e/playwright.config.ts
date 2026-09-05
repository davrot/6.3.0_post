/**
 * Playwright config for the e2e suite (forgejo-style: one spec per feature,
 * shared helpers, HTML+JUnit reports, traces on retry).
 *
 * The suite runs ONLY against the disposable test stack (docker-compose.test.yml,
 * project ol-e2e) — owner decision 2026-09-05. Bring it up first:
 *   npm run stack:up      (or: npm test = up + run)
 */
import { defineConfig } from '@playwright/test'

const BASE_URL = process.env.E2E_BASE_URL || 'http://127.0.0.1:7420'

export default defineConfig({
  // Enforce the fixture contract (documented users + seeded project) before
  // any spec runs; fails loud with the remedy if the stack state is off.
  globalSetup: './global-setup.ts',
  testDir: './specs',
  testMatch: /.*\.test\.e2e\.ts$/,
  // Single long-lived server under test + seeded shared state → no
  // cross-worker interference, deterministic log ordering.
  workers: 1,
  fullyParallel: false,
  retries: 1,
  timeout: 240_000, // first compile on a fresh stack is slow (clsi cold start)
  expect: { timeout: 20_000 },
  outputDir: 'test-results/artifacts',
  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
    ['junit', { outputFile: 'test-results/junit.xml' }],
  ],
  use: {
    baseURL: BASE_URL,
    headless: true,
    actionTimeout: 30_000,
    navigationTimeout: 60_000,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { browserName: 'chromium' },
    },
  ],
})
