import { ClaudeAPI } from '../../claude-api-wrapper.js';

export class POMGeneratorService {
  constructor(apiKey) {
    this.claude = new ClaudeAPI(apiKey);
  }

  generatePrompt(testName, steps) {
    return `You are a Playwright test code generator that MUST use Page Object Model (POM) pattern. Generate both test file and page object files based on the provided JSON specification.

Test Specification:
${JSON.stringify({ testName, steps }, null, 2)}

Requirements:
1. MUST use Page Object Model pattern - separate page objects from tests
2. Generate TypeScript Playwright code following this EXACT pattern:

Page Object Structure (MANDATORY PATTERN):
- import {Locator, Page} from '@playwright/test';
- export class PageName { constructor(public readonly page: Page) {} }
- Define locators DIRECTLY as properties: elementName = this.page.getByTestId('testId');
- DO NOT declare Locator types separately - use direct assignment
- DO NOT initialize locators in constructor - use direct property assignment
- Example: loginButton = this.page.getByRole('button', {name: 'Login'});
- Page object methods should be ATOMIC actions only (single element interactions)
- DO NOT create complex workflow methods like createSavedSearch() or deleteSavedSearch()
- Each page object method should interact with ONE element only

3. Create SEPARATE page objects based on NAVIGATION and DIALOG changes:
   - Create new page object when URL/navigation changes
   - Create new page object when modal/dialog opens
   - LoginPage for login functionality
   - SearchPage for main search operations
   - SavedSearchPage for saved search dialogs/modals
   - WorkspacePage for workspace-specific operations
   - DO NOT mix different pages/dialogs in the same page object
4. CRITICAL: Test files should contain the FULL WORKFLOW with test.step() groupings:
   - Wrap related steps in test.step() calls with descriptive names
   - Use format: await test.step('Workflow description', async () => { ... });
   - Example structure:
     // LOGIN WORKFLOW
     await test.step('Complete login workflow', async () => {
       await loginPage.navigate();
       await loginPage.fillUsername('username');
       await loginPage.clickSubmit();
     });
   - Group logical workflows: "Complete login workflow", "Perform search workflow", "Create saved search workflow", etc.
   - Show all individual steps in the test file for better readability
5. Put ONLY locators and single-element interactions in page object classes
6. MANDATORY ELEMENT VISIBILITY CHECKS: ALWAYS verify element visibility before actions:
   - EVERY action method MUST start with: await expect(this.element).toBeVisible();
   - Then perform the action: await this.element.click();
   - Pattern: async clickButton() { await expect(this.button).toBeVisible(); await this.button.click(); }
   - Pattern: async fillInput(text) { await expect(this.input).toBeVisible(); await this.input.fill(text); }
   - This applies to ALL actions: click, fill, press, selectOption, type, etc.
   - DO NOT use try-catch blocks in page object methods
   - DO NOT add timeout configurations to individual actions
   - Timeouts are handled globally in playwright.config.ts
7. Use modern Playwright best practices with proper error handling
8. Use getByTestId(), getByRole(), getByText() with exact matches
9. Add meaningful assertions and extended timeouts for critical interactions

Generate a JSON response with this exact structure:
{
  "pageObjects": {
    "PageName.ts": "page object file content here"
  },
  "testFile": "test file content here using the page objects"
}

IMPORTANT: 
- Extract selectors to page objects
- Page objects should contain ONLY individual element interactions (click, fill, etc.)
- Test files should contain the complete workflow wrapped in test.step() calls
- MANDATORY: Use test.step() to group logical workflows for better reporting
- Format: await test.step('Descriptive workflow name', async () => { /* steps */ });
- Example workflows: "Complete login workflow", "Perform search operations", "Manage saved searches"
- Show all individual page object method calls within each test.step()
- DO NOT hide workflow logic in page object compound methods
- KEYBOARD ACTIONS: Handle all keyboard interactions properly:
  - For keyboardPress actions: await page.keyboard.press(key)
  - For keyboardDown/Up: await page.keyboard.down(key); await page.keyboard.up(key)
  - For element key presses: await element.press(key)
  - Support special keys: Enter, Escape, Tab, Delete, Backspace, ArrowUp, ArrowDown, etc.
  - Handle modifier combinations: Meta+KeyC, Control+KeyA, Shift+Tab
- Test files MUST import page objects using relative path: import { PageName } from '../pages/PageName'
- Return valid JSON only, no explanations or markdown.`;
  }

  async generatePOMFiles(testName, steps) {
    console.log(`🚀 Generating test case: "${testName}"`);
    console.log(`🤖 Using Claude API to generate Page Object Model files...`);
    
    const prompt = this.generatePrompt(testName, steps);

    try {
      const response = await this.claude.sendPrompt(prompt);
      let content = response.content;
      
      // Strip markdown code blocks if present
      if (content.startsWith('```json') || content.startsWith('```')) {
        content = content.replace(/^```(json)?\n/, '').replace(/\n```$/, '');
      }
      
      // Parse JSON response
      const parsedResponse = JSON.parse(content);
      
      // Return both parsed response and usage info
      return {
        result: parsedResponse,
        usage: response.usage
      };
    } catch (error) {
      console.error('❌ Claude API Error:', error.message);
      console.error('💡 This might be due to response length or JSON formatting issues');
      throw new Error(`Claude API error: ${error.message}`);
    }
  }
}
