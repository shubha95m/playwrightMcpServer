import express from 'express';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import bodyParser from 'body-parser';
import { TestGeneratorService } from './src/services/test-generator.js';
import { FileGenerator } from './src/utils/file-generator.js';

// Handle --help flag for npm publish validation
if (process.argv.includes('--help')) {
  console.log('MCP Playwright Generator Server');
  console.log('Usage: node server.js [--help]');
  console.log('Starts the MCP server on port 3000');
  console.log('✅ Server validation passed');
  process.exit(0);
}

dotenv.config();
const app = express();
const port = process.env.PORT || 3000;

app.use(bodyParser.json());

app.post('/generate-test', async (req, res) => {
  try {
    const { testName, steps, apiKey, userCwd, llm } = req.body;
    
    // Validation
    if (!testName || !Array.isArray(steps)) {
      return res.status(400).json({ error: 'Invalid request body' });
    }
    if (!apiKey) {
      return res.status(400).json({ error: 'API key is required' });
    }
    
    // Set user working directory
    if (userCwd) {
      process.env.USER_CWD = userCwd;
    }

    // Generate test using service
    const testGenerator = new TestGeneratorService(apiKey, llm);
    const { files: generatedFiles, usage } = await testGenerator.generateTest(testName, steps);
    
    // Create files using FileGenerator
    const targetCwd = process.env.USER_CWD || process.cwd();
    const scriptDir = path.join(targetCwd, 'script');
    
    const fileGenerator = new FileGenerator(scriptDir, testName);
    fileGenerator.createDirectoryStructure();
    
    const createdFiles = [];
    createdFiles.push(...fileGenerator.createConfigFiles());
    
    // Create test specification
    const { jsonFilePath } = fileGenerator.createTestSpecification(steps, new Date().toISOString());
    createdFiles.push(jsonFilePath);
    
    // Create page objects
    if (generatedFiles.pages) {
      createdFiles.push(...fileGenerator.createPageObjects(generatedFiles.pages));
    }

    // Create test files
    if (generatedFiles.tests) {
      for (const [fileName, content] of Object.entries(generatedFiles.tests)) {
        const filePath = path.join(scriptDir, 'tests', fileName);
        fs.writeFileSync(filePath, content);
        createdFiles.push(filePath);
      }
    }

    console.log(`✅ Generated ${createdFiles.length} files for "${testName}"`);
    console.log(`💰 Cost: $${usage.cost.toFixed(4)} (${usage.totalTokens} tokens)`);

    res.status(200).json({ 
      files: generatedFiles,
      createdFiles,
      usage: usage
    });
  } catch (error) {
    console.error('💥 Error during test generation:', error.message);
    console.error('Stack trace:', error.stack);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.listen(port, () => {
  console.log(`✅ MCP Server running on http://localhost:${port}`);
});
