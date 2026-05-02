import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:4173/lulu/',
    trace: 'on-first-retry',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'VITE_BASE=/lulu/ npm run build && VITE_BASE=/lulu/ npm run preview -- --port 4173',
    url: 'http://localhost:4173/lulu/',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
})
