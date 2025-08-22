/**
 * Tests for setup service
 */

import { test, expect, describe, beforeEach, afterEach } from 'bun:test';
import * as fs from 'fs';
import * as path from 'path';
import { setupService } from '../../../src/services/common/setup.service';

// Test configuration directory
const TEST_CONFIG_DIR = path.join(process.cwd(), '.agenttom-test');

describe('Setup Service', () => {
  beforeEach(() => {
    // Clean up test directory
    if (fs.existsSync(TEST_CONFIG_DIR)) {
      fs.rmSync(TEST_CONFIG_DIR, { recursive: true, force: true });
    }
    
    // Create test directory
    fs.mkdirSync(TEST_CONFIG_DIR, { recursive: true });
    
    // Mock the config path to use test directory
    process.env.NODE_ENV = 'test';
  });

  afterEach(() => {
    // Clean up test directory
    if (fs.existsSync(TEST_CONFIG_DIR)) {
      fs.rmSync(TEST_CONFIG_DIR, { recursive: true, force: true });
    }
    
    // Restore environment
    delete process.env.NODE_ENV;
  });

  describe('getSetupStatus', () => {
    test('should return incomplete status for new installation', () => {
      const status = setupService.getSetupStatus();
      
      expect(status.isComplete).toBe(false);
      expect(status.completedSteps).toEqual([]);
      expect(status.requiredSteps).toContain('user_info');
      expect(status.requiredSteps).toContain('api_keys');
      expect(status.recommendations.length).toBeGreaterThan(0);
    });

    test('should detect completed user info step', async () => {
      // Setup user info first
      await setupService.setupUserInfo({
        name: 'Test User',
        email: 'test@example.com',
      });

      const status = setupService.getSetupStatus();
      
      expect(status.completedSteps).toContain('user_info');
      expect(status.isComplete).toBe(false); // Still needs API keys
    });

    test('should provide recommendations for missing configuration', () => {
      const status = setupService.getSetupStatus();
      
      expect(status.recommendations).toContainEqual(
        expect.stringContaining('Add at least one AI provider API key')
      );
    });
  });

  describe('setupUserInfo', () => {
    test('should save user information successfully', async () => {
      const userInfo = {
        name: 'John Doe',
        email: 'john@example.com',
        timezone: 'America/New_York',
      };

      const result = await setupService.setupUserInfo(userInfo);
      
      expect(result.success).toBe(true);
      expect(result.user.name).toBe('John Doe');
      expect(result.user.email).toBe('john@example.com');
      expect(result.user.timezone).toBe('America/New_York');
    });

    test('should require name field', async () => {
      const userInfo = {
        name: '',
        email: 'test@example.com',
      };

      await expect(setupService.setupUserInfo(userInfo)).rejects.toThrow();
    });

    test('should validate email format', async () => {
      const userInfo = {
        name: 'Test User',
        email: 'invalid-email',
      };

      await expect(setupService.setupUserInfo(userInfo)).rejects.toThrow();
    });

    test('should handle optional email', async () => {
      const userInfo = {
        name: 'Test User',
      };

      const result = await setupService.setupUserInfo(userInfo);
      
      expect(result.success).toBe(true);
      expect(result.user.name).toBe('Test User');
      expect(result.user.email).toBeUndefined();
    });
  });

  describe('setupApiKey', () => {
    test('should save API key without testing', async () => {
      const apiKeyData = {
        service: 'google' as const,
        key: 'test-api-key-12345',
        testKey: false,
      };

      const result = await setupService.setupApiKey(apiKeyData);
      
      expect(result.success).toBe(true);
      expect(result.service).toBe('google');
      expect(result.tested).toBe(false);
    });

    test('should validate API key length', async () => {
      const apiKeyData = {
        service: 'google' as const,
        key: 'short',
        testKey: false,
      };

      await expect(setupService.setupApiKey(apiKeyData)).rejects.toThrow();
    });

    test('should validate service enum', async () => {
      const apiKeyData = {
        service: 'invalid' as any,
        key: 'test-api-key-12345',
        testKey: false,
      };

      await expect(setupService.setupApiKey(apiKeyData)).rejects.toThrow();
    });
  });

  describe('setupPreferences', () => {
    test('should save preferences successfully', async () => {
      const preferences = {
        theme: 'dark' as const,
        language: 'en',
        model: 'gpt-4o',
      };

      const result = await setupService.setupPreferences(preferences);
      
      expect(result.success).toBe(true);
      expect(result.preferences.theme).toBe('dark');
      expect(result.preferences.language).toBe('en');
      expect(result.preferences.model).toBe('gpt-4o');
    });

    test('should validate theme enum', async () => {
      const preferences = {
        theme: 'invalid' as any,
      };

      await expect(setupService.setupPreferences(preferences)).rejects.toThrow();
    });

    test('should handle partial preferences', async () => {
      const preferences = {
        theme: 'light' as const,
      };

      const result = await setupService.setupPreferences(preferences);
      
      expect(result.success).toBe(true);
      expect(result.preferences.theme).toBe('light');
      // Should keep other preferences as defaults
    });
  });

  describe('completeSetup', () => {
    test('should fail if required steps are not completed', async () => {
      const result = await setupService.completeSetup();
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Setup is not complete');
      expect(result.missingSteps).toBeDefined();
    });

    test('should succeed when all required steps are completed', async () => {
      // Complete user info step
      await setupService.setupUserInfo({
        name: 'Test User',
        email: 'test@example.com',
      });

      // Complete API key step
      await setupService.setupApiKey({
        service: 'google',
        key: 'test-api-key-12345',
        testKey: false,
      });

      const result = await setupService.completeSetup();
      
      expect(result.success).toBe(true);
      expect(result.message).toContain('Setup completed successfully');
      expect(result.config).toBeDefined();
    });
  });

  describe('getAvailableModels', () => {
    test('should return list of available models', () => {
      const models = setupService.getAvailableModels();
      
      expect(Array.isArray(models)).toBe(true);
      expect(models.length).toBeGreaterThan(0);
      
      // Check for recommended model
      const geminiFlash = models.find(m => m.id === 'gemini-2.5-flash');
      expect(geminiFlash).toBeDefined();
      expect(geminiFlash?.recommended).toBe(true);
      
      // Check structure
      models.forEach(model => {
        expect(model).toHaveProperty('id');
        expect(model).toHaveProperty('name');
        expect(model).toHaveProperty('provider');
      });
    });
  });

  describe('getSetupGuide', () => {
    test('should return setup guide with steps and tips', () => {
      const guide = setupService.getSetupGuide();
      
      expect(guide).toHaveProperty('steps');
      expect(guide).toHaveProperty('tips');
      
      expect(Array.isArray(guide.steps)).toBe(true);
      expect(Array.isArray(guide.tips)).toBe(true);
      
      // Check required steps exist
      const userInfoStep = guide.steps.find(s => s.id === 'user_info');
      const apiKeyStep = guide.steps.find(s => s.id === 'api_keys');
      
      expect(userInfoStep).toBeDefined();
      expect(userInfoStep?.required).toBe(true);
      expect(apiKeyStep).toBeDefined();
      expect(apiKeyStep?.required).toBe(true);
      
      // Check providers are included
      expect(apiKeyStep?.providers).toBeDefined();
      expect(apiKeyStep?.providers?.length).toBeGreaterThan(0);
    });
  });

  describe('resetSetup', () => {
    test('should reset setup to defaults', async () => {
      // First complete some setup
      await setupService.setupUserInfo({
        name: 'Test User',
        email: 'test@example.com',
      });

      await setupService.setupApiKey({
        service: 'google',
        key: 'test-api-key-12345',
        testKey: false,
      });

      // Reset setup
      const result = await setupService.resetSetup();
      
      expect(result.success).toBe(true);
      expect(result.message).toContain('Setup reset successfully');
      
      // Check that setup status shows incomplete again
      const status = setupService.getSetupStatus();
      expect(status.isComplete).toBe(false);
    });
  });
});

describe('Setup Service Input Validation', () => {
  test('should reject empty user name', async () => {
    await expect(setupService.setupUserInfo({
      name: '',
      email: 'test@example.com',
    })).rejects.toThrow('Name is required');
  });

  test('should reject invalid email format', async () => {
    await expect(setupService.setupUserInfo({
      name: 'Test User',
      email: 'not-an-email',
    })).rejects.toThrow('Valid email is required');
  });

  test('should reject short API keys', async () => {
    await expect(setupService.setupApiKey({
      service: 'google',
      key: 'short',
      testKey: false,
    })).rejects.toThrow('API key must be at least 10 characters');
  });

  test('should reject invalid service names', async () => {
    await expect(setupService.setupApiKey({
      service: 'invalid' as any,
      key: 'valid-api-key-12345',
      testKey: false,
    })).rejects.toThrow();
  });

  test('should reject invalid theme values', async () => {
    await expect(setupService.setupPreferences({
      theme: 'invalid' as any,
    })).rejects.toThrow();
  });
});

describe('Setup Service Edge Cases', () => {
  test('should handle missing configuration gracefully', () => {
    const status = setupService.getSetupStatus();
    
    expect(status).toBeDefined();
    expect(status.isComplete).toBe(false);
    expect(status.completedSteps).toEqual([]);
  });

  test('should handle partial configuration', async () => {
    // Only complete user info
    await setupService.setupUserInfo({
      name: 'Partial User',
    });

    const status = setupService.getSetupStatus();
    
    expect(status.completedSteps).toContain('user_info');
    expect(status.completedSteps).not.toContain('api_keys');
    expect(status.isComplete).toBe(false);
  });

  test('should preserve existing API keys during reset', async () => {
    // This test ensures that API keys are preserved during reset
    // since they're valuable user data
    await setupService.setupApiKey({
      service: 'google',
      key: 'valuable-api-key-12345',
      testKey: false,
    });

    await setupService.resetSetup();

    const status = setupService.getSetupStatus();
    // API keys should still be present
    expect(status.completedSteps).toContain('api_keys');
  });
});
