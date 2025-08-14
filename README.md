# MCP Playwright Generator

Generate Playwright tests from JSON specs or real browser recordings, powered by your choice of LLM (Perplexity, Claude, OpenAI, Gemini, Grok, DeepSeek).

### 📋 Configure repo

```bash
# import repo
git clone https://<gitUserName>@github.com/<repoName>.git

# Install dependencies
pnpm install

# Start server
pnpm start
```

## 🚀 Quick Start

Use directly with npx (no installation required):

### 📋 JSON Mode - Generate from existing JSON file

```bash
# Using command line API key
npx mcp-playwright-generator@latest --json ./your-test.json --api-key "your-key"

# Using environment variable
export PERPLEXITY_API_KEY="your-key"   # or ANTHROPIC_API_KEY / OPENAI_API_KEY / GEMINI_API_KEY / GROK_API_KEY / DEEPSEEK_API_KEY
npx mcp-playwright-generator@latest --json ./your-test.json --llm perplexity

# Using .env file
echo 'PERPLEXITY_API_KEY=your-key' > .env
npx mcp-playwright-generator@latest --json ./your-test.json --llm perplexity
```

### 🎬 Recording Mode - Record browser interactions

```bash
# Record interactions on a website
npx mcp-playwright-generator@latest --record https://google.com --llm perplexity --api-key "$PERPLEXITY_API_KEY"

# With environment variable
export PERPLEXITY_API_KEY="your-key"
npx mcp-playwright-generator@latest --record https://google.com --llm perplexity
```

### 🚀 Generate and Run Tests Immediately (Visible Browser)

```bash
# JSON mode with immediate test execution
npx mcp-playwright-generator@latest --json ./test.json --llm claude --api-key "$ANTHROPIC_API_KEY" --run

# Recording mode with immediate test execution
npx mcp-playwright-generator@latest --record https://google.com --llm perplexity --api-key "$PERPLEXITY_API_KEY" --run
```

### ⚡ Generate and Run Tests (Headless Mode - Faster)

```bash
# JSON mode in headless mode
npx mcp-playwright-generator@latest --json ./test.json --llm openai --api-key "$OPENAI_API_KEY" --run --headless

# Recording mode in headless mode  
npx mcp-playwright-generator@latest --record https://google.com --llm gemini --api-key "$GEMINI_API_KEY" --run --headless
```

### 🧪 Manual Test Execution (After Generation)

```bash
# Run all generated tests
npx playwright test script/tests/

# Run specific test file
npx playwright test script/tests/your-test.spec.ts

# Run with different options
npx playwright test script/tests/ --headed          # Visible browser
npx playwright test script/tests/ --headed=false    # Headless mode
npx playwright test script/tests/ --project=chromium # Specific browser
```

## 📋 Prerequisites

- Node.js >= 18.0.0
- LLM API key (Perplexity/Claude/OpenAI/Gemini/Grok/DeepSeek)
- Running MCP server (for local development)

## 🛠️ Installation & Setup

### Option 1: Direct Usage (Recommended)
No installation needed - use with npx directly.

### Option 2: Local Development
```bash
git clone <repository>
cd claude-mcp-server
npm install
npm run dev  # Start the MCP server
```

## 🎬 Recording Mode Features
- **Real Playwright Codegen Integration** - Uses actual `npx playwright codegen` for perfect selectors
- **Zero-Failure Selectors** - Generates `getByRole()`, `getByTestId()`, `getByText()` with exact matching
- **Automatic JSON generation** - Saves recordings to `script/json/recorded-test-{timestamp}.json`
- **Smart selector detection** - Uses Playwright's proven selector generation logic
- **Password handling** - Captures actual password values for automation
- **Debug output** - Shows captured code and parsing details for troubleshooting
- **Auto-close detection** - Saves recording when browser is closed

## 📝 JSON Format

Your JSON file should contain test specifications with **Playwright selectors**:

```json
{
  "testName": "Login Workflow",
  "steps": [
    {
      "action": "navigate",
      "url": "https://example.com"
    },
    {
      "action": "fill",
      "selector": "getByTestId('username')",
      "value": "test@example.com"
    },
    {
      "action": "fillPassword",
      "selector": "getByRole('textbox', { name: 'password' })",
      "value": "password123"
    },
    {
      "action": "click",
      "selector": "getByRole('button', { name: 'Login', exact: true })"
    },
    {
      "action": "click",
      "selector": "getByText('Dashboard')"
    }
  ]
}
```

## 📤 Output

**Generated Files:**
- `pages/` - Page Object Model classes (.ts files)
- `tests/` - Playwright test files (.spec.ts files)
- `json/` - Recorded or source test specifications

**Features:**
- **Bulletproof Selectors** - Uses Playwright's codegen for guaranteed-unique selectors
- **Zero Strict Mode Violations** - No more "resolved to 2 elements" errors
- Proper TypeScript structure with Page Object Model pattern
- Smart waits and error handling
- Clean, maintainable test code

## 🔧 Local Development

```bash
# Start the MCP server (Terminal 1)
cd /path/to/claude-mcp-server
npm run dev

# Use the CLI (Terminal 2)
npx mcp-playwright-generator --json ./test.json
```

## 📁 Examples

Sample files included:
- `test.json` - Basic login test
- `sample-request.json` - Complex test scenarios  
- `test3.json` - Multi-step workflows

## ⚙️ Configuration

### LLM selection & API keys
- Choose provider with `--llm <perplexity|claude|openai|gemini|grok|deepseek>` (default: `perplexity`).
- API keys via `--api-key` or env:
  - Perplexity: `PERPLEXITY_API_KEY`
  - Claude: `ANTHROPIC_API_KEY`
  - OpenAI: `OPENAI_API_KEY`
  - Gemini: `GEMINI_API_KEY` or `GOOGLE_API_KEY`
  - Grok: `GROK_API_KEY` or `XAI_API_KEY`
  - DeepSeek: `DEEPSEEK_API_KEY`
  
Optional model envs:
  - `PERPLEXITY_MODEL`, `OPENAI_MODEL`, `GEMINI_MODEL`, `GROK_MODEL`, `DEEPSEEK_MODEL`

## 🔍 Troubleshooting

**Error: API key required**
```bash
❌ API key is required. Please provide ANTHROPIC_API_KEY via:
   1. Command line: --api-key <your-key>
   2. Environment variable: export ANTHROPIC_API_KEY="your-key"
   3. .env file: ANTHROPIC_API_KEY=your-key
```

**Password prompt not showing**
You likely already passed the password via `--password`, or have `MCP_PASSWORD' set. Unset them to force prompt.

**Cannot connect to MCP server**
```bash
❌ Cannot connect to MCP server. Is it running on http://localhost:3000?
💡 Start the server with: npm run dev
```

## 📄 License

MIT
