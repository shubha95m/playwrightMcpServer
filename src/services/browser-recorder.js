import fs from 'fs';
import { spawn } from 'child_process';

export class BrowserRecorderService {
  constructor() {
    this.isFinishing = false;
  }

  async recordBrowserActions(url) {
    console.log(`🚀 Opening Playwright codegen for: ${url}`);
    console.log('📋 Interact with the page, codegen will capture perfect selectors');
    console.log('🔚 Close the browser when done to save the recording');
    
    return new Promise((resolve) => {
      const timestamp = Date.now();
      const tempCodegenFile = `temp-codegen-${timestamp}.js`;
      
      const npx = process.platform === 'win32' ? 'npx.cmd' : 'npx';
      const codegenProcess = spawn(npx, [
        'playwright', 'codegen',
        '--target=javascript', 
        '--output=' + tempCodegenFile,
        url
      ], {
        stdio: 'inherit',
        shell: true
      });
      
      codegenProcess.on('close', (code) => {
        if (this.isFinishing) return;
        this.isFinishing = true;
        
        console.log('\n📝 Codegen finished. Reading generated code...');
        
        try {
          const codegenOutput = this.readCodegenOutput(tempCodegenFile);
          if (!codegenOutput) {
            resolve(null);
            return;
          }
          
          const actions = this.parseCodegenOutput(codegenOutput, url);
          
          if (actions.length <= 1) {
            console.log('⚠️ No interactions recorded. Make sure you clicked/typed on the page.');
            console.log('💡 The codegen window should show generated code as you interact.');
            resolve(null);
            return;
          }
          
          const filename = this.saveRecording(actions, timestamp);
          resolve(filename);
          
        } catch (error) {
          console.log('⚠️ Error processing codegen output:', error.message);
          resolve(null);
        }
      });
      
      this.setupCleanupHandlers(codegenProcess);
    });
  }

  readCodegenOutput(tempCodegenFile) {
    let codegenOutput = '';
    if (fs.existsSync(tempCodegenFile)) {
      codegenOutput = fs.readFileSync(tempCodegenFile, 'utf-8');
      console.log(`📊 Generated file size: ${codegenOutput.length} characters`);
      fs.unlinkSync(tempCodegenFile);
    } else {
      console.log('⚠️ No codegen file found. Make sure you interacted with the page.');
      return null;
    }

    const lines = codegenOutput.split('\n').slice(0, 15);
    console.log('🔍 Generated code preview:');
    lines.forEach((line, i) => {
      if (line.trim() && !line.includes('const {') && !line.includes('(async')) {
        console.log(`  ${i + 1}: ${line.trim()}`);
      }
    });

    return codegenOutput;
  }

  parseCodegenOutput(codegenOutput, url) {
    const actions = [];
    actions.push({ action: 'navigate', url: url });
    
    console.log('🔍 Parsing codegen output...');
    
    const lines = codegenOutput.split('\n');
    
    for (let i = 0; i < lines.length; i++) {
      let line = lines[i].trim();
      
      if (!line || line.startsWith('//') || line.startsWith('const ') || 
          line.startsWith('import ') || line.startsWith('test(') || 
          line.startsWith('}') || line.includes('page.goto(')) {
        continue;
      }
      
      // Parse different action types
      this.parseClickAction(line, actions);
      this.parseFillAction(line, actions);
      this.parseTypeAction(line, actions);
      this.parseSelectAction(line, actions);
      this.parsePressAction(line, actions);
      this.parseKeyboardActions(line, actions);
    }
    
    console.log(`📊 Parsed ${actions.length - 1} interactions (plus navigation)`);
    return actions;
  }

  parseClickAction(line, actions) {
    if (line.includes('.click()') && line.includes('page.')) {
      let selector = line;
      selector = selector.replace(/^\s*await\s+/, '');
      selector = selector.replace(/\.click\(\);?\s*$/, '');
      selector = selector.replace(/^page\./, '');
      
      if (selector.trim()) {
        console.log(`  ✓ Found click: ${selector.trim()}`);
        actions.push({
          action: 'click',
          selector: selector.trim()
        });
      }
    }
  }

  parseFillAction(line, actions) {
    if (line.includes('.fill(') && line.includes('page.')) {
      const fillMatch = line.match(/page\.(.+?)\.fill\(['"]([^'"]*)['"]\)/);
      if (fillMatch) {
        const selector = fillMatch[1];
        const value = fillMatch[2];
        const isPassword = selector.toLowerCase().includes('password') || line.toLowerCase().includes('password');
        
        console.log(`  ✓ Found fill: ${selector} = "${value}"`);
        actions.push({
          action: isPassword ? 'fillPassword' : 'fill',
          selector: selector.trim(),
          value: value
        });
      }
    }
  }

  parseTypeAction(line, actions) {
    if (line.includes('.type(') && line.includes('page.')) {
      const typeMatch = line.match(/page\.(.+?)\.type\(['"]([^'"]*)['"]\)/);
      if (typeMatch) {
        const selector = typeMatch[1];
        const value = typeMatch[2];
        
        console.log(`  ✓ Found type: ${selector} = "${value}"`);
        actions.push({
          action: 'fill',
          selector: selector.trim(),
          value: value
        });
      }
    }
  }

  parseSelectAction(line, actions) {
    if (line.includes('.selectOption(') && line.includes('page.')) {
      const selectMatch = line.match(/page\.(.+?)\.selectOption\(['"]([^'"]*)['"]\)/);
      if (selectMatch) {
        const selector = selectMatch[1];
        const value = selectMatch[2];
        
        console.log(`  ✓ Found select: ${selector} = "${value}"`);
        actions.push({
          action: 'select',
          selector: selector.trim(),
          value: value
        });
      }
    }
  }

  parsePressAction(line, actions) {
    if (line.includes('.press(') && line.includes('page.')) {
      const pressMatch = line.match(/page\.(.+?)\.press\(['"]([^'"]*)['"]\)/);
      if (pressMatch) {
        const selector = pressMatch[1];
        const key = pressMatch[2];
        
        console.log(`  ✓ Found press: ${selector} key="${key}"`);
        actions.push({
          action: 'press',
          selector: selector.trim(),
          key: key
        });
      }
    }
  }

  parseKeyboardActions(line, actions) {
    // Enhanced keyboard button detection
    if (line.includes('.keyboard.press(') && line.includes('page.')) {
      const keyboardMatch = line.match(/page\.keyboard\.press\(['"]([^'"]*)['"]\)/);
      if (keyboardMatch) {
        const key = keyboardMatch[1];
        console.log(`  ✓ Found keyboard press: key="${key}"`);
        actions.push({
          action: 'keyboardPress',
          key: key
        });
      }
    }
    
    // Keyboard down
    if (line.includes('.keyboard.down(') && line.includes('page.')) {
      const keyDownMatch = line.match(/page\.keyboard\.down\(['"]([^'"]*)['"]\)/);
      if (keyDownMatch) {
        const key = keyDownMatch[1];
        console.log(`  ✓ Found keyboard down: key="${key}"`);
        actions.push({
          action: 'keyboardDown',
          key: key
        });
      }
    }
    
    // Keyboard up
    if (line.includes('.keyboard.up(') && line.includes('page.')) {
      const keyUpMatch = line.match(/page\.keyboard\.up\(['"]([^'"]*)['"]\)/);
      if (keyUpMatch) {
        const key = keyUpMatch[1];
        console.log(`  ✓ Found keyboard up: key="${key}"`);
        actions.push({
          action: 'keyboardUp',
          key: key
        });
      }
    }
  }

  saveRecording(actions, timestamp) {
    const testSpec = {
      testName: `Recorded Test - ${timestamp}`,
      steps: actions
    };
    
    const jsonDir = './script/json';
    if (!fs.existsSync(jsonDir)) {
      fs.mkdirSync(jsonDir, { recursive: true });
    }
    
    const filename = `script/json/recorded-test-${timestamp}.json`;
    fs.writeFileSync(filename, JSON.stringify(testSpec, null, 2));
    
    console.log(`✅ Saved ${actions.length} actions to: ${filename}`);
    return filename;
  }

  setupCleanupHandlers(codegenProcess) {
    const handleCtrlC = () => {
      if (this.isFinishing) return;
      this.isFinishing = true;
      
      console.log('\n🛑 Stopping codegen...');
      codegenProcess.kill('SIGTERM');
      
      setTimeout(() => {
        if (!codegenProcess.killed) {
          codegenProcess.kill('SIGKILL');
        }
      }, 2000);
    };
    
    process.on('SIGINT', handleCtrlC);
    
    codegenProcess.on('close', () => {
      process.removeListener('SIGINT', handleCtrlC);
    });
  }
}
