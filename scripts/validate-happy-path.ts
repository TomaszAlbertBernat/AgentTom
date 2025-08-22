#!/usr/bin/env bun

/**
 * Happy Path Validation Script
 * Validates that AgentTom "just works" in local mode
 * @module validate-happy-path
 */

import { $ } from 'bun';
import * as fs from 'fs';
import * as path from 'path';

interface ValidationResult {
  step: string;
  status: 'pass' | 'fail' | 'skip';
  message: string;
  details?: string;
}

class HappyPathValidator {
  private results: ValidationResult[] = [];

  private log(step: string, status: 'pass' | 'fail' | 'skip', message: string, details?: string) {
    this.results.push({ step, status, message, details });
    const icon = status === 'pass' ? '✅' : status === 'fail' ? '❌' : '⏭️';
    console.log(`${icon} ${step}: ${message}`);
    if (details) console.log(`   ${details}`);
  }

  async validateEnvironment(): Promise<void> {
    console.log('🔍 Validating Environment Setup...\n');

    // Check if .env file exists
    const envPath = path.join(process.cwd(), '.env');
    if (fs.existsSync(envPath)) {
      this.log('Environment File', 'pass', '.env file exists');
    } else {
      this.log('Environment File', 'fail', '.env file missing', 'Create .env file with API keys');
      return;
    }

    // Check for required API keys
    const envContent = fs.readFileSync(envPath, 'utf-8');
    const hasGoogleKey = envContent.includes('GOOGLE_API_KEY=') && !envContent.includes('GOOGLE_API_KEY=');
    const hasOpenAIKey = envContent.includes('OPENAI_API_KEY=') && !envContent.includes('OPENAI_API_KEY=');

    if (hasGoogleKey) {
      this.log('Google API Key', 'pass', 'GOOGLE_API_KEY configured');
    } else if (hasOpenAIKey) {
      this.log('OpenAI API Key', 'pass', 'OPENAI_API_KEY configured');
    } else {
      this.log('API Keys', 'fail', 'No AI provider API key found', 'Add GOOGLE_API_KEY or OPENAI_API_KEY to .env');
    }

    // Check AUTH_MODE
    if (envContent.includes('AUTH_MODE=local')) {
      this.log('Auth Mode', 'pass', 'Local mode configured');
    } else {
      this.log('Auth Mode', 'skip', 'AUTH_MODE not set (defaults to local)');
    }
  }

  async validateServerStart(): Promise<void> {
    console.log('\n🚀 Validating Server Startup...\n');

    try {
      // Start the server in the background
      const server = Bun.spawn(['bun', 'run', 'dev'], {
        cwd: process.cwd(),
        stdout: 'pipe',
        stderr: 'pipe',
      });

      // Wait a bit for server to start
      await new Promise(resolve => setTimeout(resolve, 5000));

      // Test health endpoint
      const healthResponse = await fetch('http://localhost:3000/api/health');
      if (healthResponse.ok) {
        const health = await healthResponse.json();
        this.log('Server Health', 'pass', 'Health endpoint responds', `Status: ${health.status}`);
      } else {
        this.log('Server Health', 'fail', 'Health endpoint failed', `Status: ${healthResponse.status}`);
      }

      // Kill the server
      server.kill();

    } catch (error) {
      this.log('Server Start', 'fail', 'Failed to start server', error instanceof Error ? error.message : 'Unknown error');
    }
  }

  async validateLocalUser(): Promise<void> {
    console.log('\n👤 Validating Local User Setup...\n');

    try {
      // Start server briefly to test local user endpoint
      const server = Bun.spawn(['bun', 'run', 'dev'], {
        cwd: process.cwd(),
        stdout: 'pipe',
        stderr: 'pipe',
      });

      await new Promise(resolve => setTimeout(resolve, 3000));

      // Test local user endpoint
      const userResponse = await fetch('http://localhost:3000/api/local-user/me');
      if (userResponse.ok) {
        const user = await userResponse.json();
        this.log('Local User', 'pass', 'Local user endpoint works', `User: ${user.name}, Local: ${user.isLocal}`);

        // Check if setup is complete
        const setupResponse = await fetch('http://localhost:3000/api/setup/status');
        if (setupResponse.ok) {
          const setup = await setupResponse.json();
          if (setup.status.isComplete) {
            this.log('Setup Status', 'pass', 'Setup marked as complete');
          } else {
            this.log('Setup Status', 'skip', 'Setup not complete', 'This may be expected if no API keys are configured');
          }
        }
      } else {
        this.log('Local User', 'fail', 'Local user endpoint failed', `Status: ${userResponse.status}`);
      }

      server.kill();

    } catch (error) {
      this.log('Local User Test', 'fail', 'Failed to test local user', error instanceof Error ? error.message : 'Unknown error');
    }
  }

  async validateChatFunctionality(): Promise<void> {
    console.log('\n💬 Validating Chat Functionality...\n');

    try {
      // This would require a more complex test with actual API keys
      // For now, we'll just check if the chat endpoint exists and is accessible
      const server = Bun.spawn(['bun', 'run', 'dev'], {
        cwd: process.cwd(),
        stdout: 'pipe',
        stderr: 'pipe',
      });

      await new Promise(resolve => setTimeout(resolve, 3000));

      // Test chat endpoint (will likely fail without proper auth, but we can check if it's reachable)
      const chatResponse = await fetch('http://localhost:3000/api/conversation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: 'Hello' })
      });

      // We expect this to fail due to auth, but at least check if endpoint exists
      if (chatResponse.status !== 404) {
        this.log('Chat Endpoint', 'pass', 'Chat endpoint is accessible', `Status: ${chatResponse.status} (expected: 401 or 200)`);
      } else {
        this.log('Chat Endpoint', 'fail', 'Chat endpoint not found');
      }

      server.kill();

    } catch (error) {
      this.log('Chat Test', 'fail', 'Failed to test chat functionality', error instanceof Error ? error.message : 'Unknown error');
    }
  }

  async runValidation(): Promise<void> {
    console.log('🎯 AgentTom Happy Path Validation\n');
    console.log('This script validates that AgentTom "just works" in local mode\n');

    await this.validateEnvironment();
    await this.validateServerStart();
    await this.validateLocalUser();
    await this.validateChatFunctionality();

    this.printSummary();
  }

  private printSummary(): void {
    console.log('\n📊 Validation Summary\n');

    const passed = this.results.filter(r => r.status === 'pass').length;
    const failed = this.results.filter(r => r.status === 'fail').length;
    const skipped = this.results.filter(r => r.status === 'skip').length;
    const total = this.results.length;

    console.log(`Total Steps: ${total}`);
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`⏭️  Skipped: ${skipped}`);

    if (failed === 0) {
      console.log('\n🎉 All critical validations passed! AgentTom should work in local mode.');
    } else {
      console.log(`\n⚠️  ${failed} validation(s) failed. Please fix the issues above.`);
    }

    console.log('\n📋 Quick Checklist:');
    console.log('□ .env file exists with API keys');
    console.log('□ AUTH_MODE=local (or not set)');
    console.log('□ bun run dev starts without errors');
    console.log('□ curl http://localhost:3000/api/health returns 200');
    console.log('□ Local user is accessible');
    console.log('□ Setup wizard is skipped (if API keys present)');
    console.log('□ Chat interface loads and works');
  }
}

// Run the validation if this script is executed directly
if (import.meta.main) {
  const validator = new HappyPathValidator();
  await validator.runValidation();
}

export { HappyPathValidator };
