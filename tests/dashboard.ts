#!/usr/bin/env bun

/**
 * Test dashboard for viewing test metrics and trends
 * Usage: bun run tests/dashboard.ts [command]
 *
 * Commands:
 *   summary - Show latest test summary
 *   trends - Show test trends over time
 *   coverage - Show coverage report
 *   compare - Compare test results between runs
 */

import { $ } from 'bun';

const command = process.argv[2] || 'summary';

async function showSummary() {
  console.log('📊 AgentTom Test Dashboard');
  console.log('==========================');

  try {
    if (await fileExists('test-metrics.json')) {
      const metrics = JSON.parse(await Bun.file('test-metrics.json').text());

      console.log('\n📈 Latest Test Results:');
      console.log('-----------------------');
      console.log(`Total Tests: ${metrics.total}`);
      console.log(`✅ Passed: ${metrics.passed} (${((metrics.passed / metrics.total) * 100).toFixed(1)}%)`);
      console.log(`❌ Failed: ${metrics.failed} (${((metrics.failed / metrics.total) * 100).toFixed(1)}%)`);
      console.log(`⏭️ Skipped: ${metrics.skipped} (${((metrics.skipped / metrics.total) * 100).toFixed(1)}%)`);
      console.log(`⏱️ Duration: ${(metrics.duration / 1000).toFixed(2)}s`);
      console.log(`📅 Last Run: ${new Date(metrics.timestamp).toLocaleString()}`);
      console.log(`🌍 Environment: ${metrics.environment}`);

      if (metrics.coverage) {
        console.log('\n📊 Coverage Summary:');
        console.log('-------------------');
        console.log(`Lines: ${metrics.coverage.lines.percentage.toFixed(1)}%`);
        console.log(`Functions: ${metrics.coverage.functions.percentage.toFixed(1)}%`);
        console.log(`Branches: ${metrics.coverage.branches.percentage.toFixed(1)}%`);
        console.log(`Statements: ${metrics.coverage.statements.percentage.toFixed(1)}%`);
      }

      // Show pass/fail trend
      const passRate = ((metrics.passed / metrics.total) * 100).toFixed(1);
      const trend = getTrend(passRate);
      console.log(`\n🎯 Pass Rate: ${passRate}% ${trend}`);

    } else {
      console.log('❌ No test metrics found. Run tests first with: bun run test:ci');
    }

  } catch (error) {
    console.error('Error reading test metrics:', error);
  }
}

async function showTrends() {
  console.log('📈 Test Trends Analysis');
  console.log('=======================');

  try {
    // Look for historical metrics files
    const files = await findHistoricalMetrics();

    if (files.length === 0) {
      console.log('❌ No historical test data found');
      console.log('💡 Run tests multiple times to build trend data');
      return;
    }

    console.log(`Found ${files.length} historical test runs\n`);

    // Parse and analyze trends
    const trends = await analyzeTrends(files);

    console.log('📊 Pass Rate Trend:');
    console.log('------------------');
    trends.passRates.forEach((rate, index) => {
      const date = new Date(trends.timestamps[index]).toLocaleDateString();
      console.log(`${date}: ${rate.toFixed(1)}%`);
    });

    console.log('\n⏱️ Duration Trend:');
    console.log('----------------');
    trends.durations.forEach((duration, index) => {
      const date = new Date(trends.timestamps[index]).toLocaleDateString();
      console.log(`${date}: ${(duration / 1000).toFixed(2)}s`);
    });

    // Show trend analysis
    const analysis = analyzeTrendData(trends);
    console.log('\n📈 Trend Analysis:');
    console.log('-----------------');
    console.log(analysis);

  } catch (error) {
    console.error('Error analyzing trends:', error);
  }
}

async function showCoverage() {
  console.log('📊 Coverage Analysis');
  console.log('===================');

  try {
    if (await fileExists('coverage/coverage.json')) {
      const coverage = JSON.parse(await Bun.file('coverage/coverage.json').text());

      console.log('\n📋 Coverage Breakdown:');
      console.log('---------------------');

      // Display coverage by file
      Object.entries(coverage).forEach(([file, data]: [string, any]) => {
        if (file !== 'total') {
          const linesPct = data.lines?.pct || 0;
          const functionsPct = data.functions?.pct || 0;
          const branchesPct = data.branches?.pct || 0;

          const status = linesPct >= 80 ? '✅' : linesPct >= 60 ? '⚠️' : '❌';
          console.log(`${status} ${file}: ${linesPct.toFixed(1)}% lines, ${functionsPct.toFixed(1)}% functions, ${branchesPct.toFixed(1)}% branches`);
        }
      });

      // Show total coverage
      const total = coverage.total;
      if (total) {
        console.log('\n📊 Overall Coverage:');
        console.log('-------------------');
        console.log(`Lines: ${total.lines.pct.toFixed(1)}% (${total.lines.covered}/${total.lines.total})`);
        console.log(`Functions: ${total.functions.pct.toFixed(1)}% (${total.functions.covered}/${total.functions.total})`);
        console.log(`Branches: ${total.branches.pct.toFixed(1)}% (${total.branches.covered}/${total.branches.total})`);
        console.log(`Statements: ${total.statements.pct.toFixed(1)}% (${total.statements.covered}/${total.statements.total})`);
      }

    } else {
      console.log('❌ No coverage data found. Run tests with coverage: bun run test:coverage');
    }

  } catch (error) {
    console.error('Error reading coverage data:', error);
  }
}

function getTrend(currentRate: string): string {
  // For now, return a neutral trend indicator
  // In a real implementation, this would compare with historical data
  const rate = parseFloat(currentRate);
  if (rate >= 90) return '🚀';
  if (rate >= 80) return '📈';
  if (rate >= 70) return '📊';
  if (rate >= 60) return '📉';
  return '💥';
}

async function fileExists(path: string): Promise<boolean> {
  try {
    await Bun.file(path).text();
    return true;
  } catch {
    return false;
  }
}

async function findHistoricalMetrics(): Promise<string[]> {
  // Look for historical metrics files in a .test-history directory
  const historyDir = '.test-history';
  try {
    const files = await $`find ${historyDir} -name "test-metrics-*.json" -type f 2>/dev/null`.text();
    return files.trim().split('\n').filter(f => f.length > 0);
  } catch {
    return [];
  }
}

async function analyzeTrends(files: string[]) {
  const trends = {
    passRates: [] as number[],
    durations: [] as number[],
    timestamps: [] as string[]
  };

  for (const file of files.slice(0, 10)) { // Analyze last 10 runs
    try {
      const metrics = JSON.parse(await Bun.file(file).text());
      const passRate = ((metrics.passed / metrics.total) * 100);
      trends.passRates.push(passRate);
      trends.durations.push(metrics.duration);
      trends.timestamps.push(metrics.timestamp);
    } catch (error) {
      console.warn(`Warning: Could not parse ${file}:`, error);
    }
  }

  return trends;
}

function analyzeTrendData(trends: any): string {
  if (trends.passRates.length < 2) {
    return '📊 Not enough data for trend analysis';
  }

  const recent = trends.passRates.slice(-3);
  const avg = recent.reduce((a: number, b: number) => a + b, 0) / recent.length;

  const last = trends.passRates[trends.passRates.length - 1];
  const prev = trends.passRates[trends.passRates.length - 2];

  if (last > prev) {
    return `📈 Improving trend (avg: ${avg.toFixed(1)}%, +${(last - prev).toFixed(1)}% from last run)`;
  } else if (last < prev) {
    return `📉 Declining trend (avg: ${avg.toFixed(1)}%, -${(prev - last).toFixed(1)}% from last run)`;
  } else {
    return `📊 Stable trend (avg: ${avg.toFixed(1)}%, no change from last run)`;
  }
}

// Main command dispatcher
async function main() {
  switch (command) {
    case 'summary':
      await showSummary();
      break;
    case 'trends':
      await showTrends();
      break;
    case 'coverage':
      await showCoverage();
      break;
    case 'compare':
      console.log('🔄 Compare functionality not yet implemented');
      break;
    default:
      console.log('Usage: bun run tests/dashboard.ts [command]');
      console.log('');
      console.log('Commands:');
      console.log('  summary - Show latest test summary');
      console.log('  trends  - Show test trends over time');
      console.log('  coverage- Show coverage report');
      console.log('  compare - Compare test results between runs');
      break;
  }
}

if (import.meta.main) {
  main().catch(console.error);
}
