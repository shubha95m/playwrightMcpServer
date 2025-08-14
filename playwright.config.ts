import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './script',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  timeout: 60000, // 60 seconds timeout
  expect: {
    timeout: 30000, // 30 seconds for assertions
  },
  use: {
    baseURL: 'https://google.com',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    headless: false, // Run in headed mode (visible browser)
    actionTimeout: 30000, // 30 seconds for each action
    navigationTimeout: 60000, // 60 seconds for page navigation
  },

  projects: [
    {
      name: 'chromium',
      use: { 
        ...devices['Desktop Chrome'],
        launchOptions: {
          slowMo: 250, // 250ms delay between actions
        }
      },
    },
  ],
});
