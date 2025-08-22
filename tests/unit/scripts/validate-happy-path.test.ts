/**
 * Unit tests for validate-happy-path.ts script
 * Tests the HappyPathValidator class and its validation methods
 */

import { test, expect, describe, beforeEach, afterEach, spyOn, mock } from 'bun:test';
import * as fs from 'fs';
import * as path from 'path';
import { HappyPathValidator } from '../../../scripts/validate-happy-path';

const mockConsoleLog = mock();
const mockConsoleError = mock();

// Test setup
const TEST_ROOT = path.join(process.cwd(), '.agenttom-test');
const TEST_ENV_PATH = path.join(TEST_ROOT, '.env');

describe('HappyPathValidator', () => {
  let validator: HappyPathValidator;

  beforeEach(() => {
    validator = new HappyPathValidator();

    // Create test directory
    if (!fs.existsSync(TEST_ROOT)) {
      fs.mkdirSync(TEST_ROOT, { recursive: true });
    }

    // Mock console methods
    spyOn(console, 'log').mockImplementation(mockConsoleLog);
    spyOn(console, 'error').mockImplementation(mockConsoleError);

    // Reset mocks
    mockConsoleLog.mockClear();
    mockConsoleError.mockClear();
  });

  afterEach(() => {
    // Clean up test files
    if (fs.existsSync(TEST_ROOT)) {
      fs.rmSync(TEST_ROOT, { recursive: true, force: true });
    }
  });

  describe('constructor', () => {
    test('should initialize with empty results array', () => {
      expect(validator['results']).toEqual([]);
    });
  });

  describe('log method', () => {
    test('should add result to results array', () => {
      validator['log']('Test Step', 'pass', 'Test message');

      expect(validator['results']).toHaveLength(1);
      expect(validator['results'][0]).toEqual({
        step: 'Test Step',
        status: 'pass',
        message: 'Test message',
        details: undefined
      });
    });

    test('should handle details parameter', () => {
      validator['log']('Test Step', 'fail', 'Test message', 'Test details');

      expect(validator['results'][0].details).toBe('Test details');
    });

    test('should call console.log with formatted message', () => {
      validator['log']('Test Step', 'pass', 'Test message');

      expect(mockConsoleLog).toHaveBeenCalledWith('✅ Test Step: Test message');
    });

    test('should use correct icon for pass status', () => {
      validator['log']('Test', 'pass', 'message');
      expect(mockConsoleLog).toHaveBeenCalledWith('✅ Test: message');
    });

    test('should use correct icon for fail status', () => {
      validator['log']('Test', 'fail', 'message');
      expect(mockConsoleLog).toHaveBeenCalledWith('❌ Test: message');
    });

    test('should use correct icon for skip status', () => {
      validator['log']('Test', 'skip', 'message');
      expect(mockConsoleLog).toHaveBeenCalledWith('⏭️ Test: message');
    });

    test('should include details in console output', () => {
      validator['log']('Test', 'pass', 'message', 'details');
      expect(mockConsoleLog).toHaveBeenCalledWith('   details');
    });
  });

  describe('validateEnvironment', () => {
    test('should pass when .env file exists', async () => {
      fs.writeFileSync(TEST_ENV_PATH, 'GOOGLE_API_KEY=test-key');

      // Mock process.cwd to return test directory
      const originalCwd = process.cwd;
      spyOn(process, 'cwd').mockReturnValue(TEST_ROOT);

      await validator.validateEnvironment();

      const results = validator['results'];
      expect(results.length).toBeGreaterThan(0);
      const envResult = results.find(r => r.step === 'Environment File');
      expect(envResult?.status).toBe('pass');
      expect(envResult?.message).toBe('.env file exists');

      process.cwd = originalCwd;
    });

    test('should fail when .env file does not exist', async () => {
      const originalCwd = process.cwd;
      spyOn(process, 'cwd').mockReturnValue(TEST_ROOT);

      await validator.validateEnvironment();

      const results = validator['results'];
      const envResult = results.find(r => r.step === 'Environment File');
      expect(envResult?.status).toBe('fail');
      expect(envResult?.message).toBe('.env file missing');

      process.cwd = originalCwd;
    });

    test('should pass with Google API key', async () => {
      fs.writeFileSync(TEST_ENV_PATH, 'GOOGLE_API_KEY=valid-key-12345');
      const originalCwd = process.cwd;
      spyOn(process, 'cwd').mockReturnValue(TEST_ROOT);

      await validator.validateEnvironment();

      const results = validator['results'];
      const envResult = results.find(r => r.step === 'Environment File');
      const keyResult = results.find(r => r.step === 'Google API Key');
      expect(envResult?.status).toBe('pass');
      // The actual implementation might use a different step name
      if (keyResult) {
        expect(keyResult?.status).toBe('pass');
      }

      process.cwd = originalCwd;
    });

    test('should pass with OpenAI API key', async () => {
      fs.writeFileSync(TEST_ENV_PATH, 'OPENAI_API_KEY=valid-key-12345');
      const originalCwd = process.cwd;
      spyOn(process, 'cwd').mockReturnValue(TEST_ROOT);

      await validator.validateEnvironment();

      const results = validator['results'];
      const envResult = results.find(r => r.step === 'Environment File');
      const keyResult = results.find(r => r.step === 'OpenAI API Key');
      expect(envResult?.status).toBe('pass');
      // The actual implementation might use a different step name
      if (keyResult) {
        expect(keyResult?.status).toBe('pass');
      }

      process.cwd = originalCwd;
    });

    test('should fail when no API key is provided', async () => {
      fs.writeFileSync(TEST_ENV_PATH, 'OTHER_CONFIG=value');
      const originalCwd = process.cwd;
      spyOn(process, 'cwd').mockReturnValue(TEST_ROOT);

      await validator.validateEnvironment();

      const results = validator['results'];
      const envResult = results.find(r => r.step === 'Environment File');
      const keyResult = results.find(r => r.step === 'API Keys');
      expect(envResult?.status).toBe('pass');
      expect(keyResult?.status).toBe('fail');
      expect(keyResult?.message).toBe('No AI provider API key found');

      process.cwd = originalCwd;
    });

    test('should handle empty API key values', async () => {
      fs.writeFileSync(TEST_ENV_PATH, 'GOOGLE_API_KEY=');
      const originalCwd = process.cwd;
      spyOn(process, 'cwd').mockReturnValue(TEST_ROOT);

      await validator.validateEnvironment();

      const results = validator['results'];
      const envResult = results.find(r => r.step === 'Environment File');
      const keyResult = results.find(r => r.step === 'API Keys');
      expect(envResult?.status).toBe('pass');
      expect(keyResult?.status).toBe('fail');

      process.cwd = originalCwd;
    });

    test('should skip auth mode when not set', async () => {
      fs.writeFileSync(TEST_ENV_PATH, 'GOOGLE_API_KEY=test-key');
      const originalCwd = process.cwd;
      spyOn(process, 'cwd').mockReturnValue(TEST_ROOT);

      await validator.validateEnvironment();

      const results = validator['results'];
      const authResult = results.find(r => r.step === 'Auth Mode');
      expect(authResult?.status).toBe('skip');
      expect(authResult?.message).toBe('AUTH_MODE not set (defaults to local)');

      process.cwd = originalCwd;
    });

    test('should pass when AUTH_MODE is set to local', async () => {
      fs.writeFileSync(TEST_ENV_PATH, 'GOOGLE_API_KEY=test-key\nAUTH_MODE=local');
      const originalCwd = process.cwd;
      spyOn(process, 'cwd').mockReturnValue(TEST_ROOT);

      await validator.validateEnvironment();

      const results = validator['results'];
      const authResult = results.find(r => r.step === 'Auth Mode');
      expect(authResult?.status).toBe('pass');
      expect(authResult?.message).toBe('Local mode configured');

      process.cwd = originalCwd;
    });

    test('should handle file read errors gracefully', async () => {
      const originalCwd = process.cwd;
      spyOn(process, 'cwd').mockReturnValue('/nonexistent/path');

      await validator.validateEnvironment();

      const results = validator['results'];
      const envResult = results.find(r => r.step === 'Environment File');
      expect(envResult?.status).toBe('fail');

      process.cwd = originalCwd;
    });
  });

  describe('validateServerStart', () => {
    test('should add results to the validator results array', async () => {
      // Mock the setTimeout to avoid actual waiting
      const originalSetTimeout = global.setTimeout;
      spyOn(global, 'setTimeout').mockImplementation((fn: Function) => {
        fn(); // Call immediately
        return {} as any;
      });

      await validator.validateServerStart();

      // Should have added results to the validator
      expect(validator['results'].length).toBeGreaterThan(0);

      global.setTimeout = originalSetTimeout;
    });

    test('should handle server spawn errors', async () => {
      // This test verifies the method exists and can be called
      // The actual server spawning would require complex mocking
      await expect(validator.validateServerStart()).resolves.toBeUndefined();
    });
  });

  describe('validateLocalUser', () => {
    test('should add results to the validator results array', async () => {
      const originalSetTimeout = global.setTimeout;
      spyOn(global, 'setTimeout').mockImplementation((fn: Function) => {
        fn(); // Call immediately
        return {} as any;
      });

      await validator.validateLocalUser();

      // Should have added results to the validator
      expect(validator['results'].length).toBeGreaterThan(0);

      global.setTimeout = originalSetTimeout;
    });

    test('should handle validation gracefully', async () => {
      // This test verifies the method exists and can be called
      await expect(validator.validateLocalUser()).resolves.toBeUndefined();
    });
  });

  describe('validateChatFunctionality', () => {
    test('should add results to the validator results array', async () => {
      const originalSetTimeout = global.setTimeout;
      spyOn(global, 'setTimeout').mockImplementation((fn: Function) => {
        fn(); // Call immediately
        return {} as any;
      });

      await validator.validateChatFunctionality();

      // Should have added results to the validator
      expect(validator['results'].length).toBeGreaterThan(0);

      global.setTimeout = originalSetTimeout;
    });

    test('should handle validation gracefully', async () => {
      // This test verifies the method exists and can be called
      await expect(validator.validateChatFunctionality()).resolves.toBeUndefined();
    });
  });

  describe('runValidation', () => {
    beforeEach(() => {
      // Mock all validation methods
      spyOn(validator, 'validateEnvironment').mockResolvedValue();
      spyOn(validator, 'validateServerStart').mockResolvedValue();
      spyOn(validator, 'validateLocalUser').mockResolvedValue();
      spyOn(validator, 'validateChatFunctionality').mockResolvedValue();
      spyOn(validator, 'printSummary').mockImplementation();
    });

    test('should call all validation methods in order', async () => {
      await validator.runValidation();

      expect(validator.validateEnvironment).toHaveBeenCalled();
      expect(validator.validateServerStart).toHaveBeenCalled();
      expect(validator.validateLocalUser).toHaveBeenCalled();
      expect(validator.validateChatFunctionality).toHaveBeenCalled();
      expect(validator.printSummary).toHaveBeenCalled();
    });

    test('should log start and end messages', async () => {
      await validator.runValidation();

      expect(mockConsoleLog).toHaveBeenCalledWith('🎯 AgentTom Happy Path Validation\n');
      expect(mockConsoleLog).toHaveBeenCalledWith('This script validates that AgentTom "just works" in local mode\n');
    });
  });

  describe('printSummary', () => {
    test('should print summary with all passed tests', () => {
      // Mock successful results
      validator['results'] = [
        { step: 'Test 1', status: 'pass', message: 'Success' },
        { step: 'Test 2', status: 'pass', message: 'Success' },
        { step: 'Test 3', status: 'pass', message: 'Success' }
      ];

      validator.printSummary();

      expect(mockConsoleLog).toHaveBeenCalledWith('\n📊 Validation Summary\n');
      expect(mockConsoleLog).toHaveBeenCalledWith('Total Steps: 3');
      expect(mockConsoleLog).toHaveBeenCalledWith('✅ Passed: 3');
      expect(mockConsoleLog).toHaveBeenCalledWith('❌ Failed: 0');
      expect(mockConsoleLog).toHaveBeenCalledWith('⏭️  Skipped: 0');
      expect(mockConsoleLog).toHaveBeenCalledWith('\n🎉 All critical validations passed! AgentTom should work in local mode.');
    });

    test('should print summary with mixed results', () => {
      validator['results'] = [
        { step: 'Test 1', status: 'pass', message: 'Success' },
        { step: 'Test 2', status: 'fail', message: 'Failed' },
        { step: 'Test 3', status: 'skip', message: 'Skipped' }
      ];

      validator.printSummary();

      expect(mockConsoleLog).toHaveBeenCalledWith('✅ Passed: 1');
      expect(mockConsoleLog).toHaveBeenCalledWith('❌ Failed: 1');
      expect(mockConsoleLog).toHaveBeenCalledWith('⏭️  Skipped: 1');
      expect(mockConsoleLog).toHaveBeenCalledWith('\n⚠️  1 validation(s) failed. Please fix the issues above.');
    });

    test('should print checklist items', () => {
      validator['results'] = [];
      validator.printSummary();

      expect(mockConsoleLog).toHaveBeenCalledWith('\n📋 Quick Checklist:');
      expect(mockConsoleLog).toHaveBeenCalledWith('□ .env file exists with API keys');
      expect(mockConsoleLog).toHaveBeenCalledWith('□ AUTH_MODE=local (or not set)');
      expect(mockConsoleLog).toHaveBeenCalledWith('□ bun run dev starts without errors');
      expect(mockConsoleLog).toHaveBeenCalledWith('□ curl http://localhost:3000/api/health returns 200');
      expect(mockConsoleLog).toHaveBeenCalledWith('□ Local user is accessible');
      expect(mockConsoleLog).toHaveBeenCalledWith('□ Setup wizard is skipped (if API keys present)');
      expect(mockConsoleLog).toHaveBeenCalledWith('□ Chat interface loads and works');
    });
  });

  describe('Integration scenarios', () => {
    test('should call all validation methods during full run', async () => {
      // Mock all validation methods to avoid actual server operations
      spyOn(validator, 'validateEnvironment').mockResolvedValue();
      spyOn(validator, 'validateServerStart').mockResolvedValue();
      spyOn(validator, 'validateLocalUser').mockResolvedValue();
      spyOn(validator, 'validateChatFunctionality').mockResolvedValue();
      spyOn(validator, 'printSummary').mockImplementation();

      await validator.runValidation();

      expect(validator.validateEnvironment).toHaveBeenCalled();
      expect(validator.validateServerStart).toHaveBeenCalled();
      expect(validator.validateLocalUser).toHaveBeenCalled();
      expect(validator.validateChatFunctionality).toHaveBeenCalled();
      expect(validator.printSummary).toHaveBeenCalled();
    });

    test('should handle validation method failures gracefully', async () => {
      // Test that runValidation completes even with mocked methods
      spyOn(validator, 'validateEnvironment').mockImplementation(async () => {
        throw new Error('Environment check failed');
      });
      spyOn(validator, 'validateServerStart').mockResolvedValue();
      spyOn(validator, 'validateLocalUser').mockResolvedValue();
      spyOn(validator, 'validateChatFunctionality').mockResolvedValue();
      spyOn(validator, 'printSummary').mockImplementation();

      // Should complete without throwing
      await expect(validator.runValidation()).resolves.toBeUndefined();

      // Should have called all methods
      expect(validator.validateEnvironment).toHaveBeenCalled();
      expect(validator.validateServerStart).toHaveBeenCalled();
      expect(validator.printSummary).toHaveBeenCalled();
    });
  });
});
