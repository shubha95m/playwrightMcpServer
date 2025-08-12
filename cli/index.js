#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { BrowserRecorderService } from '../src/services/browser-recorder.js';
import { POMGeneratorService } from '../src/services/pom-generator.js';
import { FileGenerator } from '../src/utils/file-generator.js';
import { CommandRunner } from '../src/utils/command-runner.js';

dotenv.config();

const args = process.argv.slice(2);

if (args.length === 0) {
  console.log('Usage: mcp-playwright-generator --json <file> --api-key <key> [--run]');
  console.log('   or: mcp-playwright-generator --record <url> --api-key <key> [--run]');
  console.log('   or: mcp-playwright-generator --json <file> [--run] (uses ANTHROPIC_API_KEY env var)');
  console.log('');
  console.log('Options:');
  console.log('  --json <file>     Path to JSON test specification');
  console.log('  --record <url>    Launch browser and record interactions to generate test');
  console.log('  --api-key <key>   Anthropic API key (optional if using env var)');
  console.log('  --run             Automatically run the generated test with Playwright');
  console.log('  --headless        Run Playwright in headless mode (default: headed/visible)');
  process.exit(1);
}

let jsonPath, recordUrl, apiKey, runTests = false, headless = false;
const jsonIndex = args.indexOf('--json');
const recordIndex = args.indexOf('--record');
const apiKeyIndex = args.indexOf('--api-key');
const runIndex = args.indexOf('--run');
const headlessIndex = args.indexOf('--headless');

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
  apiKey = process.env.ANTHROPIC_API_KEY;
}

if (runIndex !== -1) {
  runTests = true;
}

if (headlessIndex !== -1) {
  headless = true;
}

if (!jsonPath && !recordUrl) {
  console.error('❌ Please provide either a JSON file path or recording URL');
  process.exit(1);
}

if (!apiKey) {
  console.error('❌ API key is required. Please provide ANTHROPIC_API_KEY via:');
  console.error('   1. Command line: --api-key <your-key>');
  console.error('   2. Environment variable: export ANTHROPIC_API_KEY="your-key"');
  console.error('   3. .env file: ANTHROPIC_API_KEY=your-key');
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
    const pomGenerator = new POMGeneratorService(apiKey);
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
      console.log('\n🚀 Running generated test...');
      console.log('💡 First installing Playwright dependencies...');
      
      await CommandRunner.runCommand('npm', ['install'], scriptDir);
      await CommandRunner.runCommand('npx', ['playwright', 'install'], scriptDir);
      
      await CommandRunner.runPlaywrightTest(scriptDir, headless);
    }
    
  } catch (error) {
    console.error('❌ Error generating test:', error.message);
    process.exit(1);
  }
}

main();
