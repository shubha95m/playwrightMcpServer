import { ClaudeAPI } from '../../claude-api-wrapper.js';

export class TestGeneratorService {
  constructor(apiKey) {
    this.claude = new ClaudeAPI(apiKey);
  }

  generatePrompt(steps) {
    return `
You are a staff SDET who understands user workflows and creates logical, clean test automation.

CRITICAL - RESPOND WITH ONLY VALID JSON:

You MUST return EXACTLY this JSON structure with NO other text:

{
  "script": {
    "pages": {
      "LoginPage.ts": "import { Page } from '@playwright/test';\\n\\nexport class LoginPage {\\n  constructor(public readonly page: Page) {}\\n\\n  async navigateToLogin() {\\n    // actual implementation based on test steps\\n  }\\n}",
      "SearchPage.ts": "import { Page } from '@playwright/test';\\n\\nexport class SearchPage {\\n  constructor(public readonly page: Page) {}\\n\\n  async performSearch() {\\n    // actual implementation based on test steps\\n  }\\n}"
    },
    "tests": {
      "test-flow.spec.ts": "import { test, expect } from '@playwright/test';\\nimport { LoginPage } from '../pages/LoginPage';\\nimport { SearchPage } from '../pages/SearchPage';\\n\\ntest.describe('Test Suite', () => {\\n  test('test case', async ({ page }) => {\\n    // actual test implementation using page objects\\n  });\\n});"
    }
  }
}

CRITICAL ANALYSIS RULES:
1. Analyze the recorded actions to understand the LOGICAL WORKFLOW, not just chronological steps
2. Group related actions into meaningful business operations (login, search, create alert, etc.)
3. Identify and fix obvious mistakes in recorded data (wrong values, duplicate actions, etc.)
4. Create clean, logical test flows that make business sense
5. Use meaningful test and method names that describe the business purpose

CRITICAL RULES:
1. Return ONLY the JSON object above - NO other text
2. NO markdown formatting, NO explanations
3. Each page class MUST be exported: export class PageName
4. Test MUST import from ../pages/
5. Use \\n for newlines in JSON strings
6. Generate REAL page classes based on actual test steps (not the example above)
7. Create SEPARATE page classes based on ACTUAL NAVIGATION and DIALOG changes:
   - Analyze the recorded steps to identify distinct pages/views
   - Create new page object when URL/navigation changes occur in the steps
   - Create new page object when modal/dialog opens in the steps
   - Generate page names based on the actual functionality being tested
   - Examples: LoginPage (for login actions), DashboardPage (for dashboard actions), etc.
   - DO NOT mix different pages/dialogs in the same page object
   - Base page object names on the actual recorded workflow, not predefined templates
8. MANDATORY ELEMENT VISIBILITY CHECKS: ALWAYS verify element visibility before actions:
   - EVERY action method MUST start with: await expect(this.element).toBeVisible();
   - Then perform the action: await this.element.click();
   - Pattern: async clickButton() { await expect(this.button).toBeVisible(); await this.button.click(); }
   - Pattern: async fillInput(text) { await expect(this.input).toBeVisible(); await this.input.fill(text); }
   - This applies to ALL actions: click, fill, press, selectOption, type, etc.
   - DO NOT use try-catch blocks in page object methods
   - DO NOT add timeout configurations to individual actions
   - Timeouts are handled globally in playwright.config.ts
9. Use specific, unique selectors instead of .first() - only use .first() when genuinely multiple elements exist and you need the first one
10. IMPORTANT: The example above is just structure - generate actual content from test steps
11. PAGE LOADING STRATEGY: Follow proven frontend patterns for reliable loading detection:
   - Add isLoaded() methods to page objects that wait for key elements: await expect(this.keyElement).toBeVisible()
   - Use expect().toBeVisible() instead of manual waits where possible
   - Add await page.waitForLoadState('networkidle') after navigation in test files (not page objects)
   - Only use page.waitForTimeout() for specific timing needs (like animations)
   - Page objects should have simple atomic methods, test files handle loading orchestration
   - Generate page object methods based on actual recorded actions, not predefined patterns
12. SIMPLE TYPING: Use basic fill() and type() methods:
   - Use element.fill(text) for most inputs
   - Use element.type(text) for character-by-character typing when needed
   - For form inputs, clear field first: await element.clear()
   - Keep page object methods simple without complex delays or timing
13. CRITICAL: When you see "fillPassword" action, generate a password entry method like "enterPassword(password: string)" and use it in the test flow with the actual captured password value. Never skip password steps.
14. WORKFLOW LOGIC: Ignore illogical recorded sequences - create proper login flows (navigate -> username -> continue -> password -> submit)
15. CLEAN FLOWS: Group actions into logical business operations, not chronological recording order
16. PAGE OBJECT PATTERN: Page objects should contain ONLY individual element interactions (single click, fill, etc.)
17. TEST STRUCTURE: Follow enterprise frontend testing patterns:
   - Use test.describe() with proper tagging: tag: ['@team:your-team', '@functionality:feature-name']  
   - Add meaningful test titles that describe the business scenario
   - Use beforeEach/afterEach for setup and cleanup when appropriate
18. TEST READABILITY: Test files should show FULL WORKFLOW with test.step() groupings for better reporting
19. TEST STEPS: MANDATORY - Wrap related steps in test.step() calls with descriptive names
20. FORMAT: Use await test.step('Descriptive workflow name', async () => { /* individual steps */ });
21. WORKFLOW EXAMPLES: Generate step names based on actual workflow - "Complete login workflow", "Navigate to dashboard", etc.
22. STRUCTURE: Each test.step() should contain multiple individual page object method calls
23. EXPLICIT STEPS: Show all individual steps within each test.step() for maximum readability - do not hide logic in page object compound methods

Convert these test steps to the JSON format above:
${JSON.stringify(steps, null, 2)}
`;
  }

  async generateTest(testName, steps) {
    console.log(`🎯 Generating "${testName}" with ${steps.length} steps`);
    
    const prompt = this.generatePrompt(steps);
    const response = await this.claude.sendPrompt(prompt);

    let generatedFiles;
    try {
      const parsedResponse = JSON.parse(response.content);
      generatedFiles = parsedResponse.script || parsedResponse;
    } catch (error) {
      console.error('❌ Parse error:', error.message);
      const fileName = `${testName.toLowerCase().replace(/\s+/g, '-')}.spec.ts`;
      generatedFiles = { tests: { [fileName]: response.content } };
    }

    return {
      files: generatedFiles,
      usage: response.usage
    };
  }
}
