#!/usr/bin/env bun

/**
 * Performance monitoring and analysis utility
 * Tracks performance metrics and detects regressions
 */

import { $ } from 'bun';
import { performance } from 'perf_hooks';

interface PerformanceMetric {
  timestamp: Date;
  endpoint: string;
  duration: number;
  memoryUsage: NodeJS.MemoryUsage;
  success: boolean;
  error?: string;
}

interface PerformanceBudget {
  endpoint: string;
  maxDuration: number;
  maxMemory: number;
  percentile: number; // e.g., 95 for P95
}

interface PerformanceReport {
  period: {
    start: Date;
    end: Date;
  };
  metrics: {
    total: number;
    passed: number;
    failed: number;
    averageDuration: number;
    p95Duration: number;
    maxDuration: number;
    averageMemory: number;
    maxMemory: number;
  };
  regressions: PerformanceRegression[];
  budgets: PerformanceBudget[];
}

interface PerformanceRegression {
  endpoint: string;
  metric: 'duration' | 'memory';
  previousValue: number;
  currentValue: number;
  degradation: number;
  threshold: number;
}

class PerformanceMonitor {
  private metrics: PerformanceMetric[] = [];
  private budgets: PerformanceBudget[] = [];

  constructor() {
    this.loadBudgets();
  }

  /**
   * Load performance budgets from configuration
   */
  private loadBudgets() {
    this.budgets = [
      { endpoint: '/api/web/health', maxDuration: 50, maxMemory: 10 * 1024 * 1024, percentile: 95 },
      { endpoint: '/api/chat/completions', maxDuration: 500, maxMemory: 100 * 1024 * 1024, percentile: 95 },
      { endpoint: '/api/files/upload', maxDuration: 2000, maxMemory: 200 * 1024 * 1024, percentile: 95 },
      { endpoint: '/api/conversations', maxDuration: 100, maxMemory: 50 * 1024 * 1024, percentile: 95 },
    ];
  }

  /**
   * Record a performance measurement
   */
  recordMetric(
    endpoint: string,
    duration: number,
    success: boolean = true,
    error?: string
  ): void {
    const metric: PerformanceMetric = {
      timestamp: new Date(),
      endpoint,
      duration,
      memoryUsage: process.memoryUsage(),
      success,
      error
    };

    this.metrics.push(metric);
  }

  /**
   * Generate performance report for a time period
   */
  generateReport(startDate?: Date, endDate?: Date): PerformanceReport {
    const period = {
      start: startDate || new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
      end: endDate || new Date()
    };

    const relevantMetrics = this.metrics.filter(m =>
      m.timestamp >= period.start && m.timestamp <= period.end
    );

    const total = relevantMetrics.length;
    const passed = relevantMetrics.filter(m => m.success).length;
    const failed = total - passed;

    const durations = relevantMetrics.map(m => m.duration);
    const averageDuration = durations.reduce((sum, d) => sum + d, 0) / total;
    const sortedDurations = [...durations].sort((a, b) => a - b);
    const p95Index = Math.floor(total * 0.95);
    const p95Duration = sortedDurations[p95Index] || 0;
    const maxDuration = Math.max(...durations);

    const memoryUsages = relevantMetrics.map(m => m.memoryUsage.heapUsed);
    const averageMemory = memoryUsages.reduce((sum, m) => sum + m, 0) / total;
    const maxMemory = Math.max(...memoryUsages);

    const regressions = this.detectRegressions(relevantMetrics);

    return {
      period,
      metrics: {
        total,
        passed,
        failed,
        averageDuration,
        p95Duration,
        maxDuration,
        averageMemory,
        maxMemory
      },
      regressions,
      budgets: this.budgets
    };
  }

  /**
   * Detect performance regressions
   */
  private detectRegressions(metrics: PerformanceMetric[]): PerformanceRegression[] {
    const regressions: PerformanceRegression[] = [];

    // Group metrics by endpoint
    const byEndpoint = new Map<string, PerformanceMetric[]>();
    metrics.forEach(metric => {
      if (!byEndpoint.has(metric.endpoint)) {
        byEndpoint.set(metric.endpoint, []);
      }
      byEndpoint.get(metric.endpoint)!.push(metric);
    });

    // Analyze each endpoint
    for (const [endpoint, endpointMetrics] of byEndpoint) {
      const budget = this.budgets.find(b => b.endpoint === endpoint);
      if (!budget) continue;

      // Split into recent and baseline periods
      const midpoint = new Date(Date.now() - 12 * 60 * 60 * 1000); // 12 hours ago
      const recent = endpointMetrics.filter(m => m.timestamp > midpoint);
      const baseline = endpointMetrics.filter(m => m.timestamp <= midpoint);

      if (recent.length === 0 || baseline.length === 0) continue;

      // Compare duration performance
      const recentAvgDuration = recent.reduce((sum, m) => sum + m.duration, 0) / recent.length;
      const baselineAvgDuration = baseline.reduce((sum, m) => sum + m.duration, 0) / baseline.length;

      if (recentAvgDuration > baselineAvgDuration * 1.1) { // 10% degradation
        regressions.push({
          endpoint,
          metric: 'duration',
          previousValue: baselineAvgDuration,
          currentValue: recentAvgDuration,
          degradation: ((recentAvgDuration - baselineAvgDuration) / baselineAvgDuration) * 100,
          threshold: 10
        });
      }

      // Compare memory performance
      const recentAvgMemory = recent.reduce((sum, m) => sum + m.memoryUsage.heapUsed, 0) / recent.length;
      const baselineAvgMemory = baseline.reduce((sum, m) => sum + m.memoryUsage.heapUsed, 0) / baseline.length;

      if (recentAvgMemory > baselineAvgMemory * 1.2) { // 20% memory increase
        regressions.push({
          endpoint,
          metric: 'memory',
          previousValue: baselineAvgMemory,
          currentValue: recentAvgMemory,
          degradation: ((recentAvgMemory - baselineAvgMemory) / baselineAvgMemory) * 100,
          threshold: 20
        });
      }
    }

    return regressions;
  }

  /**
   * Check if performance budgets are met
   */
  checkBudgets(): { passed: PerformanceBudget[], failed: PerformanceBudget[] } {
    const passed: PerformanceBudget[] = [];
    const failed: PerformanceBudget[] = [];

    for (const budget of this.budgets) {
      const endpointMetrics = this.metrics.filter(m => m.endpoint === budget.endpoint);

      if (endpointMetrics.length === 0) {
        failed.push(budget); // No data means we can't verify
        continue;
      }

      // Check duration budget
      const durations = endpointMetrics.map(m => m.duration).sort((a, b) => a - b);
      const percentileIndex = Math.floor(durations.length * (budget.percentile / 100));
      const actualDuration = durations[percentileIndex] || 0;

      const durationOk = actualDuration <= budget.maxDuration;

      // Check memory budget
      const avgMemory = endpointMetrics.reduce((sum, m) => sum + m.memoryUsage.heapUsed, 0) / endpointMetrics.length;
      const memoryOk = avgMemory <= budget.maxMemory;

      if (durationOk && memoryOk) {
        passed.push(budget);
      } else {
        failed.push(budget);
      }
    }

    return { passed, failed };
  }

  /**
   * Save metrics to file
   */
  async saveMetrics(filePath: string = 'performance-metrics.json'): Promise<void> {
    const data = {
      timestamp: new Date(),
      metrics: this.metrics,
      budgets: this.budgets
    };

    await Bun.write(filePath, JSON.stringify(data, null, 2));
  }

  /**
   * Load metrics from file
   */
  async loadMetrics(filePath: string = 'performance-metrics.json'): Promise<void> {
    try {
      const data = JSON.parse(await Bun.file(filePath).text());
      this.metrics = data.metrics.map((m: any) => ({
        ...m,
        timestamp: new Date(m.timestamp)
      }));
    } catch (error) {
      console.warn(`Could not load performance metrics from ${filePath}:`, error);
    }
  }

  /**
   * Clear all metrics
   */
  clearMetrics(): void {
    this.metrics = [];
  }
}

// Global performance monitor instance
export const performanceMonitor = new PerformanceMonitor();

// Helper functions for easy performance measurement
export function measurePerformance<T>(
  endpoint: string,
  fn: () => Promise<T> | T
): Promise<T> {
  return new Promise(async (resolve, reject) => {
    const start = performance.now();
    const startMemory = process.memoryUsage();

    try {
      const result = await fn();
      const end = performance.now();

      performanceMonitor.recordMetric(
        endpoint,
        end - start,
        true
      );

      resolve(result);
    } catch (error) {
      const end = performance.now();

      performanceMonitor.recordMetric(
        endpoint,
        end - start,
        false,
        error instanceof Error ? error.message : String(error)
      );

      reject(error);
    }
  });
}

// Export for use in tests and application code
export { PerformanceMonitor };
export type { PerformanceMetric, PerformanceBudget, PerformanceReport, PerformanceRegression };
