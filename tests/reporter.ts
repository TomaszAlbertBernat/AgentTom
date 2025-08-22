/**
 * Custom test reporter for Bun that integrates with CI/CD systems
 * Generates JUnit XML reports and collects test metrics
 */

import { testReporter } from './helpers/test-setup.js';

// Store original console methods
const originalConsoleLog = console.log;
const originalConsoleError = console.error;

// Override console methods to capture test output
console.log = (...args: any[]) => {
  // Still allow normal logging but we can capture it if needed
  originalConsoleLog(...args);
};

console.error = (...args: any[]) => {
  // Still allow error logging but we can capture it if needed
  originalConsoleError(...args);
};

// Test lifecycle hooks for Bun
export const testHooks = {
  beforeAll: () => {
    testReporter.startSuite();
    console.log('🚀 Starting test suite execution...');
  },

  afterAll: async () => {
    const metrics = testReporter.endSuite();

    // Generate and save reports
    await testReporter.saveJUnitReport('test-results.xml');
    await testReporter.saveMetricsReport('test-metrics.json');

    // Log summary to console
    console.log('\n📊 Test Execution Summary:');
    console.log('==========================');
    console.log(`Total Tests: ${metrics.total}`);
    console.log(`✅ Passed: ${metrics.passed}`);
    console.log(`❌ Failed: ${metrics.failed}`);
    console.log(`⏭️  Skipped: ${metrics.skipped}`);
    console.log(`⏱️  Duration: ${(metrics.duration / 1000).toFixed(2)}s`);
    console.log(`📅 Timestamp: ${metrics.timestamp.toISOString()}`);
    console.log(`🌍 Environment: ${metrics.environment}`);
    console.log('==========================');

    // Generate coverage report if available
    if (metrics.coverage) {
      console.log('\n📈 Coverage Summary:');
      console.log('====================');
      console.log(`Lines: ${metrics.coverage.lines.percentage.toFixed(1)}% (${metrics.coverage.lines.covered}/${metrics.coverage.lines.total})`);
      console.log(`Functions: ${metrics.coverage.functions.percentage.toFixed(1)}% (${metrics.coverage.functions.covered}/${metrics.coverage.functions.total})`);
      console.log(`Branches: ${metrics.coverage.branches.percentage.toFixed(1)}% (${metrics.coverage.branches.covered}/${metrics.coverage.branches.total})`);
      console.log(`Statements: ${metrics.coverage.statements.percentage.toFixed(1)}% (${metrics.coverage.statements.covered}/${metrics.coverage.statements.total})`);
      console.log('====================');
    }

    console.log('\n📄 Reports generated:');
    console.log('- test-results.xml (JUnit format for CI/CD)');
    console.log('- test-metrics.json (JSON format for analysis)');

    // Exit with appropriate code
    if (metrics.failed > 0) {
      console.log(`\n💥 Test suite failed with ${metrics.failed} failures`);
      process.exit(1);
    } else {
      console.log('\n🎉 All tests passed successfully!');
      process.exit(0);
    }
  }
};

// Export test reporter for use in test files
export { testReporter };
