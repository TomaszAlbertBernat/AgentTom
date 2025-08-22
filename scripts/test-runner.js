#!/usr/bin/env node

/**
 * Comprehensive Test Runner for AgentTom
 * Runs all test suites and verifies acceptance criteria
 */

import { execSync } from 'child_process';
import { existsSync } from 'fs';
import { join } from 'path';

const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m'
};

function log(color, message) {
  console.log(`${color}${message}${colors.reset}`);
}

function runCommand(command, description) {
  try {
    log(colors.blue, `🚀 Running: ${description}`);
    const output = execSync(command, { encoding: 'utf8' });
    log(colors.green, `✅ Success: ${description}`);
    return { success: true, output };
  } catch (error) {
    log(colors.red, `❌ Failed: ${description}`);
    log(colors.red, `Error: ${error.message}`);
    return { success: false, output: error.message };
  }
}

async function main() {
  log(colors.cyan, '🧪 AgentTom Comprehensive Test Runner');
  log(colors.cyan, '=====================================');

  const results = {
    total: 0,
    passed: 0,
    failed: 0,
    acceptanceCriteria: []
  };

  // Check prerequisites
  log(colors.yellow, '\n📋 Checking Prerequisites...');

  const requiredFiles = [
    'package.json',
    'tsconfig.json',
    '.env-example'
  ];

  let prerequisitesMet = true;
  for (const file of requiredFiles) {
    if (existsSync(file)) {
      log(colors.green, `✅ Found ${file}`);
    } else {
      log(colors.red, `❌ Missing ${file}`);
      prerequisitesMet = false;
    }
  }

  if (!prerequisitesMet) {
    log(colors.red, '\n❌ Prerequisites not met. Exiting...');
    process.exit(1);
  }

  // Check if dependencies are installed
  const depCheck = runCommand('bun install --dry-run', 'Check dependencies');
  if (!depCheck.success) {
    log(colors.yellow, '⚠️  Installing dependencies...');
    runCommand('bun install', 'Install dependencies');
  }

  // Run basic health check
  log(colors.yellow, '\n🏥 Health Check...');
  const healthCheck = runCommand('curl -f http://localhost:3000/api/web/health', 'Health endpoint check');
  if (!healthCheck.success) {
    log(colors.yellow, '⚠️  Server not running, starting development server...');
    // Start server in background for integration tests
    const serverProcess = require('child_process').spawn('bun', ['run', 'dev'], {
      stdio: 'inherit',
      detached: true
    });

    // Wait for server to start
    log(colors.blue, '⏳ Waiting for server to start...');
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Check health again
    const healthCheck2 = runCommand('curl -f http://localhost:3000/api/web/health', 'Health endpoint check');
    if (!healthCheck2.success) {
      log(colors.red, '❌ Server failed to start');
      results.acceptanceCriteria.push({
        name: 'Server starts successfully',
        status: 'failed',
        details: 'Health endpoint not responding'
      });
    } else {
      results.acceptanceCriteria.push({
        name: 'Server starts successfully',
        status: 'passed',
        details: 'Health endpoint responding'
      });
    }

    // Kill server after tests
    serverProcess.kill('SIGTERM');
  }

  // Run unit tests
  log(colors.yellow, '\n🧪 Running Unit Tests...');
  const unitTests = runCommand('bun test tests/unit/ --timeout 30000', 'Unit tests');
  results.total += 1;
  if (unitTests.success) {
    results.passed += 1;
    results.acceptanceCriteria.push({
      name: 'Unit tests pass',
      status: 'passed',
      details: 'All unit tests completed successfully'
    });
  } else {
    results.failed += 1;
    results.acceptanceCriteria.push({
      name: 'Unit tests pass',
      status: 'failed',
      details: 'Some unit tests failed'
    });
  }

  // Run integration tests
  log(colors.yellow, '\n🔗 Running Integration Tests...');
  const integrationTests = runCommand('bun test tests/integration/ --timeout 30000', 'Integration tests');
  results.total += 1;
  if (integrationTests.success) {
    results.passed += 1;
    results.acceptanceCriteria.push({
      name: 'Integration tests pass',
      status: 'passed',
      details: 'API endpoints working correctly'
    });
  } else {
    results.failed += 1;
    results.acceptanceCriteria.push({
      name: 'Integration tests pass',
      status: 'failed',
      details: 'Some integration tests failed'
    });
  }

  // Run smoke tests
  log(colors.yellow, '\n💨 Running Smoke Tests...');
  const smokeTests = runCommand('bun test tests/smoke/ --timeout 30000', 'Smoke tests');
  results.total += 1;
  if (smokeTests.success) {
    results.passed += 1;
    results.acceptanceCriteria.push({
      name: 'Smoke tests pass',
      status: 'passed',
      details: 'Basic functionality verified'
    });
  } else {
    results.failed += 1;
    results.acceptanceCriteria.push({
      name: 'Smoke tests pass',
      status: 'failed',
      details: 'Some smoke tests failed'
    });
  }

  // Run system tests
  log(colors.yellow, '\n🔄 Running System Tests...');
  const systemTests = runCommand('bun test tests/system/ --timeout 30000', 'System tests');
  results.total += 1;
  if (systemTests.success) {
    results.passed += 1;
    results.acceptanceCriteria.push({
      name: 'System tests pass',
      status: 'passed',
      details: 'End-to-end workflows working'
    });
  } else {
    results.failed += 1;
    results.acceptanceCriteria.push({
      name: 'System tests pass',
      status: 'failed',
      details: 'Some system tests failed'
    });
  }

  // Run regression tests
  log(colors.yellow, '\n🔄 Running Regression Tests...');
  const regressionTests = runCommand('bun test tests/regression/ --timeout 30000', 'Regression tests');
  results.total += 1;
  if (regressionTests.success) {
    results.passed += 1;
    results.acceptanceCriteria.push({
      name: 'Regression tests pass',
      status: 'passed',
      details: 'No regressions detected'
    });
  } else {
    results.failed += 1;
    results.acceptanceCriteria.push({
      name: 'Regression tests pass',
      status: 'failed',
      details: 'Some regression tests failed'
    });
  }

  // Check test coverage
  log(colors.yellow, '\n📊 Checking Test Coverage...');
  const coverageCheck = runCommand('bun test --coverage | grep "All files"', 'Coverage check');
  if (coverageCheck.success) {
    const coverageLine = coverageCheck.output.trim();
    const functionMatch = coverageLine.match(/(\d+\.\d+)%\s+Functions/);
    const lineMatch = coverageLine.match(/(\d+\.\d+)%\s+Lines/);

    const functionCoverage = functionMatch ? parseFloat(functionMatch[1]) : 0;
    const lineCoverage = lineMatch ? parseFloat(lineMatch[1]) : 0;

    log(colors.blue, `📊 Function Coverage: ${functionCoverage}%`);
    log(colors.blue, `📊 Line Coverage: ${lineCoverage}%`);

    if (functionCoverage >= 80 && lineCoverage >= 80) {
      results.acceptanceCriteria.push({
        name: 'Test coverage >80%',
        status: 'passed',
        details: `Function: ${functionCoverage}%, Line: ${lineCoverage}%`
      });
    } else {
      results.acceptanceCriteria.push({
        name: 'Test coverage >80%',
        status: 'failed',
        details: `Function: ${functionCoverage}%, Line: ${lineCoverage}% - Below target`
      });
    }
  }

  // Check API key validation
  log(colors.yellow, '\n🔑 Checking API Key Configuration...');
  const apiKey = process.env.GOOGLE_API_KEY || process.env.OPENAI_API_KEY;
  if (apiKey) {
    results.acceptanceCriteria.push({
      name: 'API keys configured',
      status: 'passed',
      details: 'LLM provider API key found'
    });
  } else {
    log(colors.yellow, '⚠️  No API keys configured - some tests may be skipped');
    results.acceptanceCriteria.push({
      name: 'API keys configured',
      status: 'warning',
      details: 'No LLM provider API key found'
    });
  }

  // Final report
  log(colors.cyan, '\n📋 Test Results Summary');
  log(colors.cyan, '======================');

  log(colors.blue, `Total Test Suites: ${results.total}`);
  log(colors.green, `Passed: ${results.passed}`);
  log(colors.red, `Failed: ${results.failed}`);

  log(colors.cyan, '\n🎯 Acceptance Criteria');
  log(colors.cyan, '=====================');

  results.acceptanceCriteria.forEach(criteria => {
    const color = criteria.status === 'passed' ? colors.green :
                 criteria.status === 'failed' ? colors.red : colors.yellow;
    const icon = criteria.status === 'passed' ? '✅' :
                criteria.status === 'failed' ? '❌' : '⚠️';
    log(color, `${icon} ${criteria.name}: ${criteria.details}`);
  });

  // Overall status
  const allPassed = results.failed === 0;
  const criticalCriteria = results.acceptanceCriteria.filter(c =>
    c.name === 'Server starts successfully' ||
    c.name === 'Unit tests pass' ||
    c.name === 'Test coverage >80%'
  );

  const criticalPassed = criticalCriteria.every(c => c.status === 'passed');

  log(colors.cyan, '\n🏆 Overall Status');
  log(colors.cyan, '================');

  if (allPassed && criticalPassed) {
    log(colors.green, '🎉 ALL TESTS PASSED - Ready for deployment!');
    log(colors.green, '✅ All acceptance criteria met');
    process.exit(0);
  } else if (criticalPassed) {
    log(colors.yellow, '⚠️  MOST TESTS PASSED - Review failed tests before deployment');
    log(colors.yellow, '⚠️  Critical functionality is working');
    process.exit(0);
  } else {
    log(colors.red, '❌ CRITICAL TESTS FAILED - Fix before deployment');
    log(colors.red, '❌ Core functionality issues detected');
    process.exit(1);
  }
}

main().catch(error => {
  log(colors.red, `💥 Test runner failed: ${error.message}`);
  process.exit(1);
});
