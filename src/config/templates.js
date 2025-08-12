export const PLAYWRIGHT_CONFIG_TEMPLATE = (headless = false) => `import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  expect: {
    timeout: 60000,
  },
  use: {
    baseURL: 'https://rc.alpha-sense.com',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    headless: ${headless},
    actionTimeout: 60000,
    navigationTimeout: 60000,
  },
  projects: [
    {
      name: 'chromium',
      use: { 
        ...devices['Desktop Chrome'],
        launchOptions: {
          slowMo: 200,
        }
      },
    },
  ],
});`;

export const TSCONFIG_TEMPLATE = `{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "node",
    "allowSyntheticDefaultImports": true,
    "esModuleInterop": true,
    "allowJs": true,
    "checkJs": false,
    "declaration": false,
    "outDir": "./dist",
    "rootDir": "./",
    "strict": false,
    "strictPropertyInitialization": false,
    "noEmit": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noUncheckedIndexedAccess": false,
    "useDefineForClassFields": false
  },
  "include": [
    "**/*.ts"
  ],
  "exclude": [
    "node_modules",
    "dist",
    "test-results",
    "playwright-report"
  ]
}`;

export const PACKAGE_JSON_TEMPLATE = {
  "name": "generated-playwright-tests",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "test": "playwright test",
    "test:headed": "playwright test --headed",
    "test:ui": "playwright test --ui",
    "install-browsers": "playwright install"
  },
  "devDependencies": {
    "@playwright/test": "^1.40.0"
  }
};

export const README_TEMPLATE = (scriptDir, testName, testFileName, jsonFileName, pageObjects, timestamp) => `# Generated Playwright Tests

This directory contains auto-generated Playwright tests created by MCP Playwright Generator using Page Object Model (POM) pattern.

## 🚀 Getting Started

### Step 1: Navigate to Generated Directory
\`\`\`bash
cd ${scriptDir.split('/').pop()}
\`\`\`

### Step 2: Install Dependencies & Run
\`\`\`bash
npm install && npx playwright install   # run test in one go
npm run test:headed                     # Run all tests with browser visible
npm run test:ui                         # Run tests in UI mode
\`\`\`

### Step 3: Run Specific Generated Test
To run your specific generated test file:
\`\`\`bash
cd ${scriptDir.split('/').pop()}
npx playwright test tests/${testFileName}
\`\`\`

## 🔄 Regenerating Tests

If you need to modify specific attribute then gupdate your json, resave and hit below command:

\`\`\`bash
npx @alphasense/mcp-playwright-generator@latest --json ./json/${jsonFileName} --api-key "your-key"
\`\`\`
> **Note**: Use your own API key when running this command

## 💡 Pro Tips

- **Easy Integration**: Generate this folder directly in your main Playwright repository for easy drag-and-drop workflow integration
- **Test Steps**: Tests are structured with \`test.step()\` for enhanced reporting and debugging
- **Page Objects**: Atomic, reusable page interactions for better maintainability
- **JSON Backup**: Original test specification is preserved in \`json/\` directory

## 📞 Need Help?

For any questions or support, reach out to **Shubham**

---

## 🎉 Happy Testing!

Hope this MCP Playwright Generator becomes a game-changer for your testing workflow. Good luck and enjoy automated test creation! ✨

## Structure

- \`pages/\` - Page Object Model classes with locators and page interactions
- \`tests/\` - Clean test files using page objects
- \`json/\` - Original test specification and recorded steps
- \`playwright.config.ts\` - Playwright configuration
- \`tsconfig.json\` - TypeScript configuration
- \`package.json\` - Project dependencies and scripts

## Generated Files

- **Test Name**: ${testName}
- **Test File**: tests/${testFileName}
- **JSON Specification**: json/${jsonFileName}
- **Page Objects**: ${pageObjects ? Object.keys(pageObjects).join(', ') : 'None'}
- **Generated**: ${timestamp}

## Page Object Model Benefits

- Clean separation of concerns
- Reusable page interactions
- Easy maintenance of selectors
- Better test readability
`;
