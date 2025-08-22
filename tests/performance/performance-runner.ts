#!/usr/bin/env bun

/**
 * Performance test runner with monitoring and regression detection
 * Usage: bun run tests/performance/performance-runner.ts [options]
 */

import { $ } from 'bun';
import { performanceMonitor } from './performance-monitor.js';

const command = process.argv[2] || 'run';

async function runPerformanceTests() {
  console.log('🏃 Performance Test Runner');
  console.log('===========================');

  try {
    // Load historical metrics for comparison
    await performanceMonitor.loadMetrics('performance-test-metrics.json');

    // Run performance tests
    console.log('📊 Running performance tests...');
    const startTime = Date.now();

    // Set environment variable to enable performance monitoring during tests
    process.env.PERFORMANCE_MONITORING = 'true';

    const testProcess = await $`bun test tests/performance/performance.test.ts --verbose`;

    const endTime = Date.now();
    const duration = endTime - startTime;

    console.log(`\n⏱️  Performance tests completed in ${(duration / 1000).toFixed(2)}s`);

    // Generate performance report
    const report = performanceMonitor.generateReport();

    console.log('\n📈 Performance Report:');
    console.log('=====================');
    console.log(`Period: ${report.period.start.toLocaleString()} - ${report.period.end.toLocaleString()}`);
    console.log(`Total Measurements: ${report.metrics.total}`);
    console.log(`Passed: ${report.metrics.passed} (${((report.metrics.passed / report.metrics.total) * 100).toFixed(1)}%)`);
    console.log(`Failed: ${report.metrics.failed} (${((report.metrics.failed / report.metrics.total) * 100).toFixed(1)}%)`);
    console.log(`Average Duration: ${report.metrics.averageDuration.toFixed(2)}ms`);
    console.log(`P95 Duration: ${report.metrics.p95Duration.toFixed(2)}ms`);
    console.log(`Max Duration: ${report.metrics.maxDuration.toFixed(2)}ms`);
    console.log(`Average Memory: ${(report.metrics.averageMemory / 1024 / 1024).toFixed(2)}MB`);
    console.log(`Max Memory: ${(report.metrics.maxMemory / 1024 / 1024).toFixed(2)}MB`);

    // Show regressions
    if (report.regressions.length > 0) {
      console.log('\n⚠️  Performance Regressions Detected:');
      console.log('=====================================');

      report.regressions.forEach((regression, index) => {
        console.log(`${index + 1}. ${regression.endpoint}`);
        console.log(`   Metric: ${regression.metric}`);
        console.log(`   Previous: ${regression.previousValue.toFixed(2)}`);
        console.log(`   Current: ${regression.currentValue.toFixed(2)}`);
        console.log(`   Degradation: ${regression.degradation.toFixed(1)}%`);
        console.log(`   Threshold: ${regression.threshold}%`);
        console.log('');
      });
    } else {
      console.log('\n✅ No performance regressions detected');
    }

    // Check budget compliance
    const { passed: passedBudgets, failed: failedBudgets } = performanceMonitor.checkBudgets();

    console.log('\n🎯 Budget Compliance:');
    console.log('====================');

    if (passedBudgets.length > 0) {
      console.log('✅ Passing budgets:');
      passedBudgets.forEach(budget => {
        console.log(`   ${budget.endpoint}: ${budget.maxDuration}ms, ${(budget.maxMemory / 1024 / 1024).toFixed(0)}MB`);
      });
    }

    if (failedBudgets.length > 0) {
      console.log('❌ Failing budgets:');
      failedBudgets.forEach(budget => {
        console.log(`   ${budget.endpoint}: ${budget.maxDuration}ms, ${(budget.maxMemory / 1024 / 1024).toFixed(0)}MB`);
      });
    }

    // Save updated metrics
    await performanceMonitor.saveMetrics();

    // Generate performance report file
    await generatePerformanceReportFile(report);

    // Exit with appropriate code
    const hasRegressions = report.regressions.length > 0;
    const hasBudgetFailures = failedBudgets.length > 0;

    if (hasRegressions || hasBudgetFailures) {
      console.log('\n💥 Performance issues detected!');
      process.exit(1);
    } else {
      console.log('\n🎉 All performance tests passed!');
      process.exit(0);
    }

  } catch (error) {
    console.error('❌ Performance test execution failed:', error);
    process.exit(1);
  }
}

async function generatePerformanceReportFile(report: any) {
  const reportFile = {
    timestamp: new Date(),
    report: report,
    summary: {
      totalTests: report.metrics.total,
      passedTests: report.metrics.passed,
      failedTests: report.metrics.failed,
      regressionsCount: report.regressions.length,
      budgetsPassed: report.budgets.filter((b: any) => {
        const { passed } = performanceMonitor.checkBudgets();
        return passed.some(p => p.endpoint === b.endpoint);
      }).length,
      budgetsFailed: report.budgets.filter((b: any) => {
        const { failed } = performanceMonitor.checkBudgets();
        return failed.some(f => f.endpoint === b.endpoint);
      }).length
    }
  };

  await Bun.write('performance-report.json', JSON.stringify(reportFile, null, 2));
  console.log('\n📄 Performance report saved to: performance-report.json');
}

async function showPerformanceHistory() {
  console.log('📚 Performance History');
  console.log('======================');

  try {
    await performanceMonitor.loadMetrics();

    const now = new Date();
    const periods = [
      { name: 'Last 24 hours', hours: 24 },
      { name: 'Last 7 days', hours: 168 },
      { name: 'Last 30 days', hours: 720 }
    ];

    periods.forEach(period => {
      const start = new Date(now.getTime() - period.hours * 60 * 60 * 1000);
      const report = performanceMonitor.generateReport(start, now);

      if (report.metrics.total > 0) {
        console.log(`\n${period.name}:`);
        console.log(`  Tests: ${report.metrics.total}`);
        console.log(`  Avg Duration: ${report.metrics.averageDuration.toFixed(2)}ms`);
        console.log(`  P95 Duration: ${report.metrics.p95Duration.toFixed(2)}ms`);
        console.log(`  Avg Memory: ${(report.metrics.averageMemory / 1024 / 1024).toFixed(2)}MB`);
        console.log(`  Regressions: ${report.regressions.length}`);
      } else {
        console.log(`\n${period.name}: No data available`);
      }
    });

  } catch (error) {
    console.error('Error loading performance history:', error);
  }
}

async function clearPerformanceData() {
  console.log('🧹 Clearing Performance Data');
  console.log('===========================');

  try {
    performanceMonitor.clearMetrics();
    await performanceMonitor.saveMetrics();

    console.log('✅ Performance data cleared successfully');
  } catch (error) {
    console.error('❌ Failed to clear performance data:', error);
  }
}

// Main command dispatcher
async function main() {
  switch (command) {
    case 'run':
      await runPerformanceTests();
      break;
    case 'history':
      await showPerformanceHistory();
      break;
    case 'clear':
      await clearPerformanceData();
      break;
    default:
      console.log('Usage: bun run tests/performance/performance-runner.ts [command]');
      console.log('');
      console.log('Commands:');
      console.log('  run     - Run performance tests with monitoring');
      console.log('  history - Show performance history');
      console.log('  clear   - Clear all performance data');
      break;
  }
}

if (import.meta.main) {
  main().catch(console.error);
}
