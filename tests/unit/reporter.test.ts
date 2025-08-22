/**
 * Test the test reporting and metrics collection system
 */

import { describe, it, expect, beforeAll, afterAll } from 'bun:test';
import { testReporter } from '../helpers/test-setup.js';

describe('Test Reporter System', () => {
  beforeAll(() => {
    testReporter.startSuite();
  });

  afterAll(async () => {
    const metrics = testReporter.endSuite();

    // Verify metrics are collected
    expect(metrics.total).toBeGreaterThan(0);
    expect(metrics.passed + metrics.failed + metrics.skipped).toBe(metrics.total);
    expect(metrics.duration).toBeGreaterThan(0);
    expect(metrics.timestamp).toBeInstanceOf(Date);
    expect(metrics.environment).toBeDefined();

    // Generate reports
    await testReporter.saveJUnitReport('test-results.xml');
    await testReporter.saveMetricsReport('test-metrics.json');

    // Verify files were created
    const xmlExists = await Bun.file('test-results.xml').exists();
    const jsonExists = await Bun.file('test-metrics.json').exists();

    expect(xmlExists).toBe(true);
    expect(jsonExists).toBe(true);
  });

  it('should record passing tests', () => {
    const duration = 10; // Mock duration for testing

    testReporter.recordResult('Reporter Tests', 'should record passing tests', 'pass', duration);

    const results = testReporter.getResults();
    const lastResult = results[results.length - 1];

    expect(lastResult.suite).toBe('Reporter Tests');
    expect(lastResult.test).toBe('should record passing tests');
    expect(lastResult.status).toBe('pass');
    expect(lastResult.duration).toBe(10);
    expect(lastResult.error).toBeUndefined();
  });

  it('should record failing tests', () => {
    const duration = 5; // Mock duration for testing
    const errorMessage = 'Test intentionally failed for demonstration';

    testReporter.recordResult('Reporter Tests', 'should record failing tests', 'fail', duration, errorMessage);

    const results = testReporter.getResults();
    const lastResult = results[results.length - 1];

    expect(lastResult.suite).toBe('Reporter Tests');
    expect(lastResult.test).toBe('should record failing tests');
    expect(lastResult.status).toBe('fail');
    expect(lastResult.duration).toBe(5);
    expect(lastResult.error).toBe(errorMessage);
  });

  it('should record skipped tests', () => {
    const duration = 0; // Skipped tests have no duration

    testReporter.recordResult('Reporter Tests', 'should record skipped tests', 'skip', duration);

    const results = testReporter.getResults();
    const lastResult = results[results.length - 1];

    expect(lastResult.suite).toBe('Reporter Tests');
    expect(lastResult.test).toBe('should record skipped tests');
    expect(lastResult.status).toBe('skip');
    expect(lastResult.duration).toBe(0);
    expect(lastResult.error).toBeUndefined();
  });

  it('should generate valid JUnit XML', () => {
    const xml = testReporter.generateJUnitXML();

    // Basic XML structure checks
    expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
    expect(xml).toContain('<testsuites name="AgentTom Test Suite"');
    expect(xml).toContain('<testsuite name="Reporter Tests"');
    expect(xml).toContain('</testsuites>');

    // Check for test cases
    expect(xml).toContain('<testcase name="should record passing tests"');
    expect(xml).toContain('<testcase name="should record failing tests"');
    expect(xml).toContain('<testcase name="should record skipped tests"');
  });

  it('should generate valid metrics report', () => {
    const metrics = testReporter.generateMetricsReport();

    expect(metrics.total).toBeGreaterThan(0);
    expect(metrics.passed).toBeGreaterThan(0);
    expect(metrics.failed).toBeGreaterThan(0);
    expect(metrics.skipped).toBeGreaterThan(0);
    expect(metrics.duration).toBeGreaterThan(0);
    expect(metrics.timestamp).toBeInstanceOf(Date);
    expect(metrics.environment).toBeDefined();
  });

  it('should escape XML characters properly', () => {
    const duration = 3; // Mock duration for testing

    // Test with XML characters in test name and error message
    testReporter.recordResult(
      'XML Tests',
      'should handle <>&"\' characters',
      'fail',
      duration,
      'Error with <>&"\' characters'
    );

    const xml = testReporter.generateJUnitXML();

    // Verify XML characters are escaped
    expect(xml).toContain('&lt;');
    expect(xml).toContain('&gt;');
    expect(xml).toContain('&amp;');
    expect(xml).toContain('&quot;');
    expect(xml).toContain('&#39;');

    // Verify the actual characters are not present in the XML structure (outside CDATA)
    const xmlWithoutCDATA = xml.replace(/<!\[CDATA\[.*?\]\]>/gs, '');
    expect(xmlWithoutCDATA).not.toContain('<>&"\'');
  });
});
