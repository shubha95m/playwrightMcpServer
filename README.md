# MCP Playwright Generator

Generate Playwright tests from JSON specifications or browser recordings using AI. This thin client connects to a backend service for test generation.

## 🚀 Installation

```bash
npm install -g mcp-playwright-generator
```

## 🔧 Usage

### Generate from JSON Specification

```bash
mcp-playwright-generator --json ./test-spec.json --api-key YOUR_API_KEY
```

### Generate from Browser Recording

```bash
mcp-playwright-generator --record https://example.com --api-key YOUR_API_KEY
```

## 📋 Options

- `--json <file>` - Path to JSON test specification
- `--record <url>` - URL to record browser interactions
- `--api-key <key>` - LLM API key (Anthropic, Perplexity, etc.)
- `--llm <provider>` - LLM provider: claude | perplexity | openai (default: perplexity)
- `--license <key>` - License key for paid features (optional)
- `--server <url>` - Backend server URL (default: http://localhost:3000)
- `--password <pwd>` - Access password
- `--run` - Automatically run generated tests
- `--headless` - Run in headless mode

## 🔑 Environment Variables

```bash
# Required: API Keys (at least one)
ANTHROPIC_API_KEY=your_anthropic_key
PERPLEXITY_API_KEY=your_perplexity_key

# Optional: Configuration
MCP_LICENSE_KEY=your_license_key
MCP_SERVER_BASE=https://your-backend-service.com
MCP_PASSWORD=access_password
```

## 🏗️ Architecture

This is a **thin client** that connects to a backend service containing all business logic:

```
┌─────────────────┐    HTTP/JSON    ┌──────────────────┐
│   Thin Client   │ ──────────────► │  Backend Service │
│  (npm package)  │                 │ (business logic) │
└─────────────────┘                 └──────────────────┘
```

### What's Included in This Package
- Input collection and validation
- API calls to backend service  
- Local file writing
- Test execution (optional)

### What's in the Backend Service
- Test generation algorithms
- LLM integrations and prompts
- License and quota management
- File templates and configuration
- All proprietary business logic

## 💰 Pricing & Quotas

### Free Tier
- 1 test generation per user
- Rate limited per IP
- No license key required

### Licensed Tiers
- Custom quotas based on license
- No IP restrictions
- Priority support

Contact the package owner for licensing options.

## 🔒 Access Control

This package requires authentication. Set your password via:
- `--password` flag
- `MCP_PASSWORD` environment variable
- Interactive prompt (if not provided)

## 📞 Support

For questions, support, or licensing:

- **Author**: Shubham
- **Email**: shubham.sharma75319@gmail.com  
- **Phone**: +91 701-474-0879

## 🎯 Example Usage

```bash
# Free tier usage
mcp-playwright-generator --json ./login-flow.json --api-key $PERPLEXITY_API_KEY

# Licensed usage with custom backend
export MCP_LICENSE_KEY="your-pro-license"
export MCP_SERVER_BASE="https://your-backend.com"
mcp-playwright-generator --record https://app.example.com --api-key $ANTHROPIC_API_KEY --run

# Using environment variables
export PERPLEXITY_API_KEY="your-key"
export MCP_PASSWORD="your-password"
mcp-playwright-generator --json ./test.json --headless
```

## 📁 Output Structure

Generated test projects include:

```
GeneratedScript-{timestamp}/
├── pages/           # Page Object Model classes
├── tests/           # Playwright test files  
├── json/            # Original test specification
├── playwright.config.ts
├── tsconfig.json
├── package.json
└── README.md
```

## 🚨 Error Codes

- `400` - Invalid request (missing required fields)
- `402` - Quota exceeded 
- `429` - Rate limit exceeded (free tier)
- `500` - Server error

## 🔧 Backend Service

The backend service is hosted separately and contains all business logic. For self-hosting or development, contact the package owner for access to the backend service repository.

## 🎉 Happy Testing!

Generate powerful Playwright tests in seconds with AI assistance!