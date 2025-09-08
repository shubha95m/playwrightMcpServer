#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import fetch from 'node-fetch';
import os from 'os';

dotenv.config();

// Helper function to get user input
async function getUserInput(prompt, timeout = 60000) {
  process.stdout.write(prompt);
  const stdin = process.stdin;
  stdin.resume();
  stdin.setEncoding('utf8');

  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      stdin.pause();
      reject(new Error(`Input timeout - no input provided within ${timeout/1000} seconds`));
    }, timeout);

    const onData = (data) => {
      clearTimeout(timeoutId);
      stdin.removeListener('data', onData);
      stdin.pause();
      process.stdin.unref();
      resolve(data.toString().trim());
    };

    stdin.on('data', onData);
  });
}

// Email and password authentication for free users
async function authenticateEmailOrExit(serverBase) {
  console.log('\n🔐 Email and password authentication required for free users');
  
  // Get email address
  let email;
  try {
    email = await getUserInput('📧 Enter your email address: ');

    if (!email || !email.includes('@')) {
      console.error('❌ Valid email address is required');
      process.exit(1);
    }
  } catch (e) {
    console.error('❌ Failed to read email address:', e.message);
    process.exit(1);
  }

  // Get password
  let password;
  try {
    password = await getUserInput('🔑 Enter your password (min 8 characters): ');

    if (!password) {
      console.error('❌ Password is required');
      process.exit(1);
    }
    
    if (password.length < 8) {
      console.error('❌ Password must be at least 8 characters long');
      process.exit(1);
    }
  } catch (e) {
    console.error('❌ Failed to read password:', e.message);
    process.exit(1);
  }

  // Check if user already exists in users table
  try {
    console.log('🔍 Checking user status...');
    const checkResp = await fetch(`${serverBase}/check-user-exists`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });

    if (!checkResp.ok) {
      const err = await checkResp.json().catch(() => ({}));
      console.error(`❌ Failed to check user: ${err.error || 'Unknown error'}`);
      process.exit(1);
    }

    const checkData = await checkResp.json();
    
    if (checkData.exists) {
      // User exists - try to login
      console.log('✅ Existing user detected. Attempting login...');
      
      try {
        const loginResp = await fetch(`${serverBase}/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password })
        });

        if (loginResp.ok) {
          const loginData = await loginResp.json();
          if (loginData.success) {
            console.log('✅ Login successful! Welcome back.');
            return { email, isExistingUser: true };
          }
        }

        // Login failed - could be wrong password OR user doesn't have password set yet
        const err = await loginResp.json().catch(() => ({}));
        
        if (loginResp.status === 401 && err.message === 'Invalid credentials') {
          // This could mean password is not set - let's try to update it
          console.log('🔧 It seems you don\'t have a password set yet. Setting up your password...');
          
          try {
            const updateResp = await fetch(`${serverBase}/auth/update-password`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ email, password })
            });

            if (!updateResp.ok) {
              const updateErr = await updateResp.json().catch(() => ({}));
              console.error(`❌ Failed to set password: ${updateErr.error || 'Unknown error'}`);
              process.exit(1);
            }

            const updateData = await updateResp.json();
            if (updateData.success) {
              console.log('✅ Password set successfully! You can now use this password for future logins.');
              return { email, isExistingUser: true };
            }
          } catch (updateError) {
            console.error('❌ Failed to set password:', updateError.message);
            process.exit(1);
          }
        }
        
        console.error(`❌ Login failed: ${err.message || 'Invalid credentials'}`);
        process.exit(1);
      } catch (e) {
        console.error('❌ Failed to login:', e.message);
        process.exit(1);
      }
    }

    // New user - need OTP verification and registration
    console.log('🆕 New user detected. Email verification and registration required.');
    
  } catch (e) {
    console.error('❌ Failed to check user status:', e.message);
    process.exit(1);
  }

  // Send OTP via email (only for new users)
  try {
    console.log('📨 Sending OTP to your email...');
    const otpResp = await fetch(`${serverBase}/send-email-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });

    if (!otpResp.ok) {
      const err = await otpResp.json().catch(() => ({}));
      console.error(`❌ Failed to send OTP: ${err.error || 'Unknown error'}`);
      process.exit(1);
    }

    const otpData = await otpResp.json();
    console.log(`✅ ${otpData.message}`);
    
    // For local testing, show the OTP if email service failed
    if (otpData.otp) {
      console.log(`🔑 Your OTP: ${otpData.otp} (fallback for local testing)`);
    }
  } catch (e) {
    console.error('❌ Failed to send OTP:', e.message);
    process.exit(1);
  }

  // Get OTP from user
  let otp;
  try {
    otp = await getUserInput('🔑 Enter the OTP from your email: ');

    if (!otp) {
      console.error('❌ OTP is required');
      process.exit(1);
    }
  } catch (e) {
    console.error('❌ Failed to read OTP:', e.message);
    process.exit(1);
  }

  // Verify OTP
  try {
    const verifyResp = await fetch(`${serverBase}/verify-email-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, otp })
    });

    if (!verifyResp.ok) {
      const err = await verifyResp.json().catch(() => ({}));
      console.error(`❌ Failed to verify OTP: ${err.error || 'Unknown error'}`);
      process.exit(1);
    }

    const verifyData = await verifyResp.json();
    if (!verifyData.success) {
      console.error(`❌ ${verifyData.message}`);
      process.exit(1);
    }

    console.log(`✅ ${verifyData.message}`);
  } catch (e) {
    console.error('❌ Failed to verify OTP:', e.message);
    process.exit(1);
  }

  // Now register the user with password
  try {
    console.log('👤 Creating your account...');
    const registerResp = await fetch(`${serverBase}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        email, 
        password, 
        name: `User ${email.split('@')[0]}` // Default name based on email
      })
    });

    if (!registerResp.ok) {
      const err = await registerResp.json().catch(() => ({}));
      console.error(`❌ Failed to register: ${err.error || 'Unknown error'}`);
      process.exit(1);
    }

    const registerData = await registerResp.json();
    if (!registerData.success) {
      console.error(`❌ Registration failed: ${registerData.error || 'Unknown error'}`);
      process.exit(1);
    }

    console.log('🎉 Account created successfully! You now have 2 free script generations.');
    return { email, isExistingUser: false };
  } catch (e) {
    console.error('❌ Failed to register:', e.message);
    process.exit(1);
  }
}

// Show free user quota status
async function showFreeUserStatus(serverBase, clientId, email = null) {
  try {
    const url = email ? 
      `${serverBase}/free-status/${clientId}?email=${encodeURIComponent(email)}` : 
      `${serverBase}/free-status/${clientId}`;
    
    const statusResp = await fetch(url, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });

    if (statusResp.ok) {
      const status = await statusResp.json();
      
      if (status.isNewUser) {
        console.log('\n🎉 Welcome! You have 2 FREE E2E script generations.');
      } else {
        console.log(`\n📊 Your usage: ${status.used}/${status.quota} scripts used`);
        
        if (status.remaining > 0) {
          console.log(`🆓 You have ${status.remaining} free script generation(s) remaining.`);
        } else {
          console.log('\n⚠️ You have reached your free limit!');
          console.log('💎 Upgrade to PRO for unlimited generations and premium features:');
          console.log('📧 Contact: upgrade@playwright-generator.com');
          console.log('📞 Call: +1-800-PLAYWRIGHT');
          console.log('🌐 Visit: https://playwright-generator.com/pricing');
          process.exit(1);
        }
      }
    }
  } catch (e) {
    // Silently continue if status check fails
    console.log('\n🆓 Free tier access');
  }
}

// Get persistent client ID
async function getClientId() {
  const clientIdFile = path.join(os.homedir(), '.mcp_playwright_client_id');
  try {
    if (fs.existsSync(clientIdFile)) {
      return fs.readFileSync(clientIdFile, 'utf-8').trim();
    } else {
      const crypto = await import('crypto');
      const clientId = crypto.randomUUID();
      fs.writeFileSync(clientIdFile, clientId);
      return clientId;
    }
  } catch (_) {
    // Fallback to ephemeral ID
    const crypto = await import('crypto');
    return crypto.randomUUID();
  }
}

// Simple command runner for --run option
async function runPlaywrightTest(scriptDir, headless) {
  console.log(`\n🚀 Running Playwright tests in ${scriptDir}...`);
  
  const { spawn } = await import('child_process');
  const npmCmd = process.platform === 'win32' ? 'npm.cmd' : 'npm';
  
  return new Promise((resolve) => {
    const testProcess = spawn(npmCmd, ['run', headless ? 'test' : 'test:headed'], {
      cwd: scriptDir,
      stdio: 'inherit',
      shell: true
    });
    
    testProcess.on('close', (code) => {
      if (code === 0) {
        console.log('\n✅ Tests completed successfully');
      } else {
        console.log(`\n⚠️ Tests finished with exit code ${code}`);
      }
      resolve();
    });
  });
}

const args = process.argv.slice(2);

if (args.length === 0) {
  console.log('Usage: mcp-playwright-generator --json <file> --api-key <key> [options]');
  console.log('   or: mcp-playwright-generator --record <url> --api-key <key> [options]');
  console.log('');
  console.log('Options:');
  console.log('  --json <file>     Path to JSON test specification');
  console.log('  --record <url>    Launch browser and record interactions to generate test');
  console.log('  --api-key <key>   API key for the chosen LLM (Anthropic or Perplexity)');
  console.log('  --llm <name>      LLM provider: claude | perplexity (default: perplexity)');
  console.log('  --license <key>   License key (optional for free tier)');
  console.log('  --server <url>    Backend server base URL (default: http://localhost:3000)');
  console.log('  --run             Automatically run the generated test with Playwright');
  console.log('  --headless        Run Playwright in headless mode (default: headed/visible)');
  process.exit(1);
}

// Parse arguments
let jsonPath, recordUrl, apiKey, runTests = false, headless = false, llmName, licenseKey, serverBase;

const jsonIndex = args.indexOf('--json');
const recordIndex = args.indexOf('--record');
const apiKeyIndex = args.indexOf('--api-key');
const runIndex = args.indexOf('--run');
const headlessIndex = args.indexOf('--headless');
const llmIndex = args.indexOf('--llm');
const licenseIndex = args.indexOf('--license');
const serverIndex = args.indexOf('--server');

if (jsonIndex !== -1) {
  jsonPath = args[jsonIndex + 1];
} else if (recordIndex !== -1) {
  recordUrl = args[recordIndex + 1];
} else {
  console.error('❌ Either --json or --record parameter is required');
  process.exit(1);
}

if (apiKeyIndex !== -1) {
  apiKey = args[apiKeyIndex + 1];
} else {
  apiKey = process.env.ANTHROPIC_API_KEY || process.env.PERPLEXITY_API_KEY;
}

if (runIndex !== -1) runTests = true;
if (headlessIndex !== -1) headless = true;
if (llmIndex !== -1) llmName = args[llmIndex + 1];
if (licenseIndex !== -1) licenseKey = args[licenseIndex + 1];
else licenseKey = process.env.MCP_LICENSE_KEY;

if (serverIndex !== -1) serverBase = args[serverIndex + 1];
else serverBase = process.env.MCP_SERVER_BASE || 'http://localhost:3000';

const clientId = await getClientId();

// Email OTP verification for free users (no license key)
let emailAuth = null;
if (!licenseKey) {
  emailAuth = await authenticateEmailOrExit(serverBase);
  await showFreeUserStatus(serverBase, clientId, emailAuth.email);
}

console.log('\n==============================================');
console.log('✨ Welcome!');
console.log("🙌 Thanks for having me — let's build Playwright scripts together and save you 90% of your time.");
console.log('==============================================\n');

async function main() {
  try {
    let steps, testName;

    if (recordUrl) {
      // Call backend for browser recording
      console.log('🎬 Starting browser recording mode...');
      console.log('📦 Building record payload...');
      
      const recordPayload = { url: recordUrl, licenseKey, clientId, email: emailAuth?.email || null };
      console.log('📋 Record payload:', JSON.stringify(recordPayload, null, 2));
      
      const recordEndpoint = `${serverBase.replace(/\/$/, '')}/record-browser`;
      console.log('🔗 Record endpoint:', recordEndpoint);
      
      console.log('🚀 Sending request to backend...');
      const recordResp = await fetch(recordEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(recordPayload)
      });

      console.log('📈 Response status:', recordResp.status);
      console.log('📋 Response headers:', Object.fromEntries(recordResp.headers.entries()));

      if (!recordResp.ok) {
        console.error('❌ Response not OK, attempting to parse error...');
        const errorText = await recordResp.text();
        console.error('📄 Raw error response:', errorText);
        
        let err = {};
        try {
          err = JSON.parse(errorText);
          console.error('📋 Parsed error:', err);
        } catch (parseErr) {
          console.error('⚠️ Could not parse error as JSON');
          err = { error: errorText };
        }
        
        console.error(`❌ Recording failed (${recordResp.status}): ${err.error || 'Unknown error'}`);
        process.exit(1);
      }

      console.log('✅ Response OK, parsing data...');
      const recordData = await recordResp.json();
      console.log('📊 Record data keys:', Object.keys(recordData));
      console.log('📋 Full record data:', JSON.stringify(recordData, null, 2));
      
      steps = recordData.steps;
      testName = recordData.testName || 'Recorded Test';
      
      console.log('📊 Steps received:', steps?.length || 0);
      console.log('📝 Test name:', testName);
    } else {
      // Load JSON file
      console.log('📄 Loading JSON file mode...');
      const fullJsonPath = path.resolve(jsonPath);
      console.log('📁 Full JSON path:', fullJsonPath);
      
      if (!fs.existsSync(fullJsonPath)) {
        console.error(`❌ JSON file not found: ${fullJsonPath}`);
        process.exit(1);
      }
      
      console.log('📖 Reading JSON file...');
      const jsonData = JSON.parse(fs.readFileSync(fullJsonPath, 'utf-8'));
      console.log('📋 JSON data:', JSON.stringify(jsonData, null, 2));
      
      steps = jsonData.steps || jsonData;
      testName = jsonData.testName || 'Generated Test';
      
      console.log('📊 Steps from JSON:', steps?.length || 0);
      console.log('📝 Test name from JSON:', testName);
    }

    console.log('\n🏗️ Proceeding to test generation phase...');
    console.log('📊 Final steps count:', steps?.length || 0);
    console.log('📝 Final test name:', testName);

    // Generate script directory
    console.log('📁 Generating script directory...');
    const timestamp = new Date().toLocaleDateString('en-GB', {
      day: '2-digit', month: 'short', year: 'numeric'
    }).replace(/\s/g, '-') + '-' + 
    new Date().toLocaleTimeString('en-GB', {
      hour: '2-digit', minute: '2-digit', hour12: false
    }).replace(':', '-');

    const scriptDir = `./GeneratedScript-${timestamp}`;
    console.log('📂 Script directory:', scriptDir);

    // Ensure script directory exists
    console.log('📁 Creating script directory...');
    if (!fs.existsSync(scriptDir)) {
      fs.mkdirSync(scriptDir, { recursive: true });
      console.log('✅ Script directory created');
    } else {
      console.log('✅ Script directory already exists');
    }

    // Call backend to generate test
    console.log('\n🎯 Preparing test generation payload...');
    const payload = {
      testName,
      steps,
      llm: llmName,
      licenseKey,
      headless,
      clientId,
      email: emailAuth?.email || null
    };
    console.log('📋 Generate payload:', JSON.stringify(payload, null, 2));

    const endpoint = `${serverBase.replace(/\/$/, '')}/generate-test`;
    console.log('🔗 Generate endpoint:', endpoint);
    
    console.log('🚀 Sending generate-test request...');
    const resp = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    console.log('📈 Generate response status:', resp.status);
    console.log('📋 Generate response headers:', Object.fromEntries(resp.headers.entries()));

    if (!resp.ok) {
      console.error('❌ Generate response not OK, parsing error...');
      const errorText = await resp.text();
      console.error('📄 Raw generate error:', errorText);
      
      let err = {};
      try {
        err = JSON.parse(errorText);
        console.error('📋 Parsed generate error:', err);
      } catch (parseErr) {
        console.error('⚠️ Could not parse generate error as JSON');
        err = { error: errorText };
      }
      
      const status = resp.status;
      if (status === 402) {
        console.error(`❌ Quota exceeded. Plan: ${err.plan}, quota: ${err.quota}, used: ${err.used}`);
      } else if (status === 429) {
        console.error(`❌ Too many free requests from this IP today`);
      } else {
        console.error(`❌ Server error (${status}): ${err.error || 'Unknown error'}`);
      }
      process.exit(1);
    }

    console.log('✅ Generate response OK, parsing data...');
    const data = await resp.json();
    console.log('📊 Generate data keys:', Object.keys(data));
    console.log('📋 Generate data preview:', JSON.stringify({
      ...data,
      files: data.files ? `${Object.keys(data.files).length} files` : 'no files'
    }, null, 2));
    const files = data.files || {};
    console.log('📁 Files to write:', Object.keys(files));

    // Write files to local scriptDir
    console.log('\n📝 Writing files to script directory...');
    for (const [relativePath, content] of Object.entries(files)) {
      console.log(`📄 Writing file: ${relativePath}`);
      const fullPath = path.join(scriptDir, relativePath);
      const dir = path.dirname(fullPath);
      
      console.log(`📁 Ensuring directory exists: ${dir}`);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        console.log(`✅ Created directory: ${dir}`);
      }
      
      console.log(`💾 Writing content (${content.length} chars) to: ${fullPath}`);
      fs.writeFileSync(fullPath, content);
      console.log(`✅ Wrote: ${fullPath}`);
    }

    console.log(`\n🎉 File writing completed!`);
    console.log(`📝 Test case: "${testName}"`);
    console.log(`📁 All files generated in: ${scriptDir}`);
    
    if (data.usage) {
      console.log(`\n💰 API Usage:`);
      console.log(`   📊 Total Tokens: ${data.usage.totalTokens || 'N/A'}`);
      console.log(`   📥 Input Tokens: ${data.usage.inputTokens || 'N/A'}`);
      console.log(`   📤 Output Tokens: ${data.usage.outputTokens || 'N/A'}`);
      console.log(`   💵 Cost: $${data.usage.cost ? data.usage.cost.toFixed(4) : 'N/A'}`);
    } else {
      console.log('⚠️ No usage data received');
    }

    if (data.plan) {
      console.log(`\n📋 Plan: ${data.plan} (${data.used}/${data.quota} used)`);
      
      if (data.features) {
        const enabledFeatures = Object.entries(data.features)
          .filter(([_, enabled]) => enabled)
          .map(([feature, _]) => feature);
        
        if (enabledFeatures.length > 0) {
          console.log(`🚀 Available features: ${enabledFeatures.join(', ')}`);
        }
      } else {
        console.log('⚠️ No features data received');
      }
      
      if (data.metadata?.licenseValid) {
        console.log(`✅ License validated successfully`);
      } else if (data.plan === 'free') {
        console.log(`💡 Upgrade to unlock more features and higher quotas`);
      }
    } else {
      console.log('⚠️ No plan data received');
    }

    if (runTests) {
      console.log('\n🧪 Running tests...');
      await runPlaywrightTest(scriptDir, headless);
    } else {
      console.log('⏭️ Skipping test execution');
    }

    console.log('\n✅ Process completed successfully!');

  } catch (error) {
    console.error('\n💥 Unexpected error in main function:');
    console.error('❌ Error message:', error.message);
    console.error('📚 Stack trace:', error.stack);
    console.error('🔍 Error details:', {
      name: error.name,
      cause: error.cause,
      code: error.code
    });
    process.exit(1);
  }
}

main();
