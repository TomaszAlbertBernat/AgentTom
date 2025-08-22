#!/usr/bin/env bun

/**
 * Enhanced test runner with CI/CD reporting capabilities
 * Usage: bun run tests/test-runner.ts [test-pattern] [options]
 */

import { $ } from 'bun';
import { testReporter } from './helpers/test-setup.js';
import { testHooks } from './reporter.js';

// Parse command line arguments
const args = process.argv.slice(2);
const testPattern = args.find(arg => !arg.startsWith('--')) || 'tests/**/*.test.ts';
const isWatchMode = args.includes('--watch');
const isCoverageMode = args.includes('--coverage');
const isVerbose = args.includes('--verbose');

// Set up environment
process.env.NODE_ENV = 'test';

// Initialize test reporter
testHooks.beforeAll();

async function runTests() {
  try {
    console.log('🚀 AgentTom Test Runner');
    console.log('======================');

    // Build test command
    let testCommand = ['bun', 'test'];

    // Add test pattern
    testCommand.push(testPattern);

    // Add options
    if (isCoverageMode) {
      testCommand.push('--coverage');
    }

    if (isVerbose) {
      testCommand.push('--verbose');
    }

    // For watch mode, we need to handle it differently
    if (isWatchMode) {
      testCommand.push('--watch');
      console.log('📺 Running in watch mode...');
      const testProcess = $`${testCommand}`;
      await testProcess;
      return;
    }

    console.log(`📋 Running tests: ${testPattern}`);
    if (isCoverageMode) console.log('📊 Coverage reporting enabled');
    console.log('');

    // Execute tests
    const startTime = Date.now();
    const testProcess = $`${testCommand}`;

    // Capture test output and parse results
    const output = await testProcess.text();
    const endTime = Date.now();

    console.log(output);

    // For now, we'll let the afterAll hook handle the reporting
    // In a future enhancement, we could parse the output to get more detailed results

  } catch (error) {
    console.error('❌ Test execution failed:', error);
    process.exit(1);
  }
}

// Handle process signals for graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Test execution interrupted');
  process.exit(130);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Test execution terminated');
  process.exit(143);
});

// Run tests if this script is executed directly
if (import.meta.main) {
  runTests().then(() => {
    // The afterAll hook will handle cleanup and exit
  }).catch((error) => {
    console.error('💥 Fatal error in test runner:', error);
    process.exit(1);
  });
}
