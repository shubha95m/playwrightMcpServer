import fs from 'fs';
import path from 'path';
import { 
  PLAYWRIGHT_CONFIG_TEMPLATE, 
  TSCONFIG_TEMPLATE, 
  PACKAGE_JSON_TEMPLATE, 
  README_TEMPLATE 
} from '../config/templates.js';

export class FileGenerator {
  constructor(scriptDir, testName, options = {}) {
    this.scriptDir = scriptDir;
    this.testName = testName;
    this.options = options;
  }

  createDirectoryStructure() {
    const directories = [
      this.scriptDir,
      `${this.scriptDir}/tests`,
      `${this.scriptDir}/pages`,
      `${this.scriptDir}/json`
    ];

    directories.forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });
  }

  createConfigFiles(headless = false) {
    const configs = [
      {
        path: `${this.scriptDir}/playwright.config.ts`,
        content: PLAYWRIGHT_CONFIG_TEMPLATE(headless)
      },
      {
        path: `${this.scriptDir}/tsconfig.json`,
        content: TSCONFIG_TEMPLATE
      },
      {
        path: `${this.scriptDir}/package.json`,
        content: JSON.stringify(PACKAGE_JSON_TEMPLATE, null, 2)
      }
    ];

    return configs.map(config => {
      fs.writeFileSync(config.path, config.content);
      return config.path;
    });
  }

  createTestSpecification(steps, timestamp) {
    const safeTestName = this.testName
      .replace(/[^a-zA-Z0-9\s]/g, '')
      .replace(/\s+/g, '-')
      .toLowerCase();
    
    const jsonFileName = `${safeTestName}.json`;
    const jsonFilePath = path.join(this.scriptDir, 'json', jsonFileName);
    
    const testSpecification = {
      testName: this.testName,
      steps: steps,
      generatedAt: new Date().toISOString(),
      timestamp: timestamp
    };
    
    fs.writeFileSync(jsonFilePath, JSON.stringify(testSpecification, null, 2));
    return { jsonFilePath, jsonFileName };
  }

  createPageObjects(pageObjects) {
    const createdFiles = [];
    
    if (pageObjects) {
      for (const [fileName, content] of Object.entries(pageObjects)) {
        const filePath = path.join(this.scriptDir, 'pages', fileName);
        fs.writeFileSync(filePath, content);
        createdFiles.push(filePath);
      }
    }
    
    return createdFiles;
  }

  createTestFile(testContent) {
    const safeTestName = this.testName
      .replace(/[^a-zA-Z0-9\s]/g, '')
      .replace(/\s+/g, '-')
      .toLowerCase();
    
    const testFileName = `${safeTestName}.spec.ts`;
    const testFilePath = path.join(this.scriptDir, 'tests', testFileName);
    
    fs.writeFileSync(testFilePath, testContent);
    return { testFilePath, testFileName };
  }

  createReadme(testFileName, jsonFileName, pageObjects, timestamp) {
    const readmePath = `${this.scriptDir}/README.md`;
    const content = README_TEMPLATE(
      this.scriptDir, 
      this.testName, 
      testFileName, 
      jsonFileName, 
      pageObjects, 
      timestamp
    );
    
    fs.writeFileSync(readmePath, content);
    return readmePath;
  }

  generateTimestamp() {
    const now = new Date();
    return now.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short', 
      year: 'numeric'
    }).replace(/\s/g, '-') + '-' + 
    now.toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    }).replace(':', '-');
  }
}
