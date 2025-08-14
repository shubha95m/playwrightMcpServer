import { spawn } from 'child_process';
import path from 'path';

export class CommandRunner {
  static async runCommand(command, args, cwd = process.cwd()) {
    return new Promise((resolve, reject) => {
      const cmd = process.platform === 'win32' ? `${command}.cmd` : command;
      const childProcess = spawn(cmd, args, {
        stdio: 'inherit',
        shell: true,
        cwd: cwd
      });

      childProcess.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          console.log(`\n⚠️ Command ${command} ${args.join(' ')} failed with exit code ${code}`);
          resolve();
        }
      });

      childProcess.on('error', (error) => {
        console.error(`\n❌ Error running ${command}:`, error.message);
        resolve();
      });
    });
  }

  static async runPlaywrightTest(scriptDir, headless = false) {
    return new Promise((resolve, reject) => {
      const npx = process.platform === 'win32' ? 'npx.cmd' : 'npx';
      const args = ['playwright', 'test'];
      
      if (headless) {
        args.push('--headed=false');
      }
      
      const playwrightProcess = spawn(npx, args, {
        stdio: 'inherit',
        shell: true,
        cwd: path.resolve(scriptDir)
      });

      playwrightProcess.on('close', (code) => {
        if (code === 0) {
          console.log('\n✅ Playwright test completed successfully!');
          resolve();
        } else {
          console.log(`\n❌ Playwright test failed with exit code ${code}`);
          resolve();
        }
      });

      playwrightProcess.on('error', (error) => {
        console.error('\n❌ Error running Playwright:', error.message);
        console.error('💡 Make sure dependencies are installed in script/ directory');
        resolve();
      });
    });
  }
}
