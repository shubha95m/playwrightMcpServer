#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { BrowserRecorderService } from '../src/services/browser-recorder.js';
import { POMGeneratorService } from '../src/services/pom-generator.js';
import { providerEnvHint } from '../src/services/llm-selector.js';
import { FileGenerator } from '../src/utils/file-generator.js';
import { CommandRunner } from '../src/utils/command-runner.js';

dotenv.config();

async function verifyAccessOrExit(providedPassword) {
  const ownerInfo = {
    name: process.env.PKG_OWNER_NAME || 'Shubham',
    email: process.env.PKG_OWNER_EMAIL || 'shubham.sharma75319@gmail.com',
    phone: process.env.PKG_OWNER_PHONE || '+91 701-474-0879'
  };

  // Store only a salted hash of the owner password; never store the plaintext in code
  const OWNER_PASSWORD_HASH_SHA256 = 'e59c2dd3325ab04707824061e650650becafd7d99e7798c0c1bf2557322faf7b';
  const SALT = 'v1-fixed-salt';

  const fail = (msg) => {
    console.error(`\n❌ ${msg}`);
    console.error(`🔒 Access restricted. Reach out to the owner for access:`);
    console.error(`   👤 ${ownerInfo.name}`);
    console.error(`   📧 ${ownerInfo.email}`);
    console.error(`   📞 ${ownerInfo.phone}`);
    process.exit(1);
  };

  // Always enforce password check (no skip path)

  const candidate = (providedPassword || process.env.MCP_PASSWORD || process.env.MCP_CLI_PASSWORD || '').trim();
  if (candidate) {
    const crypto = await import('crypto');
    const candHash = crypto.createHash('sha256').update(`${candidate}|${SALT}`).digest('hex');
    if (candHash === OWNER_PASSWORD_HASH_SHA256) return;
    fail('Invalid password provided.');
  }

  try {
    const prompt = 'Enter access password: ';
    process.stdout.write(prompt);
    const stdin = process.stdin;
    stdin.setRawMode?.(true);
    stdin.resume();
    stdin.setEncoding('utf8');

    let input = '';
    await new Promise((resolve) => {
      stdin.on('data', (ch) => {
        const char = ch.toString('utf8');
        if (char === '\n' || char === '\r' || char === '\u0004') {
          stdin.setRawMode?.(false);
          stdin.pause();
          process.stdout.write('\n');
          resolve();
        } else if (char === '\u0003') {
          process.stdout.write('\n');
          process.exit(130);
        } else if (char === '\u007f') {
          if (input.length > 0) {
            input = input.slice(0, -1);
          }
        } else {
          input += char;
        }
      });
    });

    const entered = input.trim();
    const crypto = await import('crypto');
    const enteredHash = crypto.createHash('sha256').update(`${entered}|${SALT}`).digest('hex');
    if (enteredHash !== OWNER_PASSWORD_HASH_SHA256) {
      fail('Invalid password.');
    }
  } catch (e) {
    fail('Password prompt failed.');
  }
}

const args = process.argv.slice(2);

if (args.length === 0) {
  console.log('Usage: mcp-playwright-generator --json <file> --api-key <key> [--llm <claude|perplexity>] [--run]');
  console.log('   or: mcp-playwright-generator --record <url> --api-key <key> [--llm <claude|perplexity>] [--run]');
  console.log('   or: mcp-playwright-generator --json <file> [--llm <claude|perplexity>] [--run] (uses ANTHROPIC_API_KEY or PERPLEXITY_API_KEY env var)');
  console.log('');
  console.log('Options:');
  console.log('  --json <file>     Path to JSON test specification');
  console.log('  --record <url>    Launch browser and record interactions to generate test');
  console.log('  --api-key <key>   API key for the chosen LLM (Anthropic or Perplexity)');
  console.log('  --llm <name>      LLM provider: claude | perplexity (default: perplexity)');
  console.log('  --password <pwd>  Access password (otherwise you will be prompted)');
  console.log('  --run             Automatically run the generated test with Playwright');
  console.log('  --headless        Run Playwright in headless mode (default: headed/visible)');
  process.exit(1);
}

let jsonPath, recordUrl, apiKey, runTests = false, headless = false, llmName, providedPassword;
const jsonIndex = args.indexOf('--json');
const recordIndex = args.indexOf('--record');
const apiKeyIndex = args.indexOf('--api-key');
const runIndex = args.indexOf('--run');
const headlessIndex = args.indexOf('--headless');
const llmIndex = args.indexOf('--llm');
const passwordIndex = args.indexOf('--password');

if (jsonIndex !== -1) {
  jsonPath = args[jsonIndex + 1];
} else if (recordIndex !== -1) {
  recordUrl = args[recordIndex + 1];
} else {
  console.error('❌ Either --json or --record parameter is required');
  console.error('Usage: mcp-playwright-generator --json <file> --api-key <key> [--run]');
  console.error('   or: mcp-playwright-generator --record <url> --api-key <key> [--run]');
  process.exit(1);
}

if (apiKeyIndex !== -1) {
  apiKey = args[apiKeyIndex + 1];
} else {
  apiKey = process.env.ANTHROPIC_API_KEY || process.env.PERPLEXITY_API_KEY;
}

if (runIndex !== -1) {
  runTests = true;
}

if (headlessIndex !== -1) {
  headless = true;
}

if (llmIndex !== -1) {
  llmName = args[llmIndex + 1];
}

if (passwordIndex !== -1) {
  providedPassword = args[passwordIndex + 1];
}

if (!jsonPath && !recordUrl) {
  console.error('❌ Please provide either a JSON file path or recording URL');
  process.exit(1);
}

// Enforce password check BEFORE any network/recording work starts
await verifyAccessOrExit(providedPassword);

console.log('\n==============================================');
console.log('✨ Welcome!');
console.log("🙌 Thanks for having me — let's build Playwright scripts together and save you 90% of your time.");
console.log('==============================================\n');

if (!apiKey) {
  const envHint = providerEnvHint(llmName || process.env.LLM || 'perplexity');
  console.error(`❌ API key is required. Provide via --api-key or set ${envHint} in your environment/.env`);
  process.exit(1);
}

let fullJsonPath;
if (jsonPath) {
  fullJsonPath = path.resolve(jsonPath);
  if (!fs.existsSync(fullJsonPath)) {
    console.error(`❌ JSON file not found: ${fullJsonPath}`);
    process.exit(1);
  }
}

let steps, testName;

if (recordUrl) {
  console.log('🎬 Starting browser recording mode...');
  const recorder = new BrowserRecorderService();
  const recordedFile = await recorder.recordBrowserActions(recordUrl);
  
  if (!recordedFile) {
    console.error('❌ Recording failed or was cancelled');
    process.exit(1);
  }
  
  steps = JSON.parse(fs.readFileSync(recordedFile, 'utf-8'));
  testName = steps.testName || 'Recorded Test';
} else {
  steps = JSON.parse(fs.readFileSync(fullJsonPath, 'utf-8'));
  testName = steps.testName || 'Generated Test';
}






async function main() {
  try {
    const pomGenerator = new POMGeneratorService(apiKey, llmName);
    const pomResponse = await pomGenerator.generatePOMFiles(testName, steps.steps || steps);
    const pomFiles = pomResponse.result;
    const usage = pomResponse.usage;
    
    // Generate timestamp for unique folder names
    const fileGenerator = new FileGenerator('', testName);
    const timestamp = fileGenerator.generateTimestamp();
    
    const scriptDir = `./GeneratedScript-${timestamp}`;
    const generator = new FileGenerator(scriptDir, testName);
    
    // Create directory structure
    generator.createDirectoryStructure();
    
    // Generate page object files
    if (pomFiles.pageObjects) {
      generator.createPageObjects(pomFiles.pageObjects);
      for (const fileName of Object.keys(pomFiles.pageObjects)) {
        console.log(`✅ Generated page object: ${scriptDir}/pages/${fileName}`);
      }
    }
    
    // Generate test file
    const { testFileName } = generator.createTestFile(pomFiles.testFile);
    console.log(`✅ Generated test file: ${scriptDir}/tests/${testFileName}`);
    console.log(`📝 Test case: "${testName}"`);
    
    // Generate JSON specification
    const { jsonFileName } = generator.createTestSpecification(steps.steps || steps, timestamp);
    console.log(`✅ Generated JSON specification: ${scriptDir}/json/${jsonFileName}`);
    
    // Create configuration files
    generator.createConfigFiles(headless);
    console.log(`✅ Created Playwright config: ${scriptDir}/playwright.config.ts`);
    console.log(`✅ Created TypeScript config: ${scriptDir}/tsconfig.json`);
    console.log(`✅ Created package.json: ${scriptDir}/package.json`);
    
    // Create README
    generator.createReadme(testFileName, jsonFileName, pomFiles.pageObjects, new Date().toISOString());
    console.log(`✅ Created README: ${scriptDir}/README.md`);
    console.log(`\n📁 All files generated in: ${scriptDir}`);
    
    // Display token usage and cost
    if (usage) {
      console.log(`\n💰 API Usage:`);
      console.log(`   📊 Total Tokens: ${usage.totalTokens || 'N/A'}`);
      console.log(`   📥 Input Tokens: ${usage.inputTokens || 'N/A'}`);
      console.log(`   📤 Output Tokens: ${usage.outputTokens || 'N/A'}`);
      console.log(`   💵 Cost: $${usage.cost ? usage.cost.toFixed(4) : 'N/A'}`);
    }
    
    if (runTests) {
      await CommandRunner.runPlaywrightTest(scriptDir, headless);
    }
    
  } catch (error) {
    console.error('❌ Error generating test:', error.message);
    process.exit(1);
  }
}

main();
