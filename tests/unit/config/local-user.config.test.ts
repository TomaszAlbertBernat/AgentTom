/**
 * Tests for local user configuration and API key management
 */

import { test, expect, describe, beforeEach, afterEach } from 'bun:test';
import * as fs from 'fs';
import * as path from 'path';
import { 
  loadLocalUserConfig, 
  saveLocalUserConfig, 
  setApiKey, 
  getApiKey, 
  deleteApiKey, 
  listApiKeys,
  getApiKeyMetadata,
  testApiKey
} from '../../../src/config/local-user.config';
import { encryptSensitiveData, decryptSensitiveData, maskApiKey } from '../../../src/utils/encryption';

// Test configuration directory
const TEST_CONFIG_DIR = path.join(process.cwd(), '.agenttom-test');
const TEST_CONFIG_PATH = path.join(TEST_CONFIG_DIR, 'local-user.json');

// Mock process.cwd to use test directory
const originalCwd = process.cwd;
const originalGetConfigPath = path.join;

describe('Local User Configuration', () => {
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

  describe('configuration loading and saving', () => {
    test('should create default config when none exists', () => {
      const config = loadLocalUserConfig();
      
      expect(config.id).toBeDefined();
      expect(config.name).toBe('Local User');
      expect(config.preferences.theme).toBe('system');
      expect(config.preferences.model).toBe('gemini-2.5-flash');
      expect(config.apiKeys).toEqual({});
      expect(config.apiKeyMetadata).toEqual({});
    });

    test('should save and load configuration', () => {
      const updates = {
        name: 'Test User',
        email: 'test@example.com',
      };

      const savedConfig = saveLocalUserConfig(updates);
      expect(savedConfig.name).toBe('Test User');
      expect(savedConfig.email).toBe('test@example.com');

      const loadedConfig = loadLocalUserConfig();
      expect(loadedConfig.name).toBe('Test User');
      expect(loadedConfig.email).toBe('test@example.com');
    });
  });

  describe('API key management', () => {
    test('should set and get API key with encryption', () => {
      const testKey = 'sk-test-api-key-12345';
      
      setApiKey('google', testKey);
      const retrievedKey = getApiKey('google');
      
      expect(retrievedKey).toBe(testKey);
    });

    test('should store encrypted API keys', () => {
      const testKey = 'sk-test-api-key-12345';
      
      setApiKey('google', testKey);
      
      // Check that the stored key is encrypted (not plaintext)
      const config = loadLocalUserConfig();
      const storedKey = config.apiKeys.google;
      
      expect(storedKey).toBeDefined();
      expect(storedKey).not.toBe(testKey);
      expect(storedKey!.length).toBeGreaterThan(100); // Encrypted keys are longer
    });

    test('should maintain metadata for API keys', () => {
      const testKey = 'sk-test-api-key-12345';
      
      setApiKey('google', testKey);
      const metadata = getApiKeyMetadata('google');
      
      expect(metadata.hasKey).toBe(true);
      expect(metadata.createdAt).toBeDefined();
      expect(metadata.masked).toBe('sk-t...2345');
    });

    test('should delete API keys and metadata', () => {
      const testKey = 'sk-test-api-key-12345';
      
      setApiKey('google', testKey);
      expect(getApiKey('google')).toBe(testKey);
      
      deleteApiKey('google');
      expect(getApiKey('google')).toBeUndefined();
      
      const metadata = getApiKeyMetadata('google');
      expect(metadata.hasKey).toBe(false);
    });

    test('should list all configured API keys', () => {
      setApiKey('google', 'sk-google-key');
      setApiKey('openai', 'sk-openai-key');
      
      const keys = listApiKeys();
      
      expect(Object.keys(keys)).toContain('google');
      expect(Object.keys(keys)).toContain('openai');
      expect(keys.google.hasKey).toBe(true);
      expect(keys.openai.hasKey).toBe(true);
      expect(keys.google.masked).toBeDefined();
      expect(keys.openai.masked).toBeDefined();
    });

    test('should handle Spotify API keys with client ID and secret', () => {
      const config = loadLocalUserConfig();
      config.apiKeys.spotify = {
        clientId: 'spotify-client-id',
        clientSecret: 'spotify-client-secret',
      };
      saveLocalUserConfig(config);
      
      const loadedConfig = loadLocalUserConfig();
      expect(loadedConfig.apiKeys.spotify?.clientId).toBe('spotify-client-id');
      expect(loadedConfig.apiKeys.spotify?.clientSecret).toBe('spotify-client-secret');
    });
  });
});

describe('Encryption Utilities', () => {
  const testUserId = 'test-user-123';
  const testData = 'sensitive-api-key-data';

  test('should encrypt and decrypt data correctly', () => {
    const encrypted = encryptSensitiveData(testData, testUserId);
    expect(encrypted).toBeDefined();
    expect(encrypted).not.toBe(testData);
    
    const decrypted = decryptSensitiveData(encrypted, testUserId);
    expect(decrypted).toBe(testData);
  });

  test('should produce different encrypted output each time', () => {
    const encrypted1 = encryptSensitiveData(testData, testUserId);
    const encrypted2 = encryptSensitiveData(testData, testUserId);
    
    expect(encrypted1).not.toBe(encrypted2);
    
    // But both should decrypt to the same value
    expect(decryptSensitiveData(encrypted1, testUserId)).toBe(testData);
    expect(decryptSensitiveData(encrypted2, testUserId)).toBe(testData);
  });

  test('should fail to decrypt with wrong user ID', () => {
    const encrypted = encryptSensitiveData(testData, testUserId);
    const decrypted = decryptSensitiveData(encrypted, 'wrong-user-id');
    
    expect(decrypted).toBe(''); // Should return empty string on failure
  });

  test('should mask API keys correctly', () => {
    expect(maskApiKey('sk-short')).toBe('***');
    expect(maskApiKey('sk-1234567890abcdef')).toBe('sk-1...cdef');
    expect(maskApiKey('very-long-api-key-string')).toBe('very...ring');
  });

  test('should handle empty strings', () => {
    expect(encryptSensitiveData('', testUserId)).toBe('');
    expect(decryptSensitiveData('', testUserId)).toBe('');
    expect(maskApiKey('')).toBe('***');
  });
});

describe('API Key Testing', () => {
  test('should return error for missing API key', async () => {
    const result = await testApiKey('google');
    expect(result.valid).toBe(false);
    expect(result.error).toBe('No API key configured');
  });

  test('should handle test failures gracefully', async () => {
    setApiKey('google', 'invalid-key');
    
    const result = await testApiKey('google');
    expect(result.valid).toBe(false);
    expect(result.error).toBeDefined();
  });

  test('should return true for services without test endpoints', async () => {
    setApiKey('elevenlabs', 'some-key');
    
    const result = await testApiKey('elevenlabs');
    expect(result.valid).toBe(true);
  });
});
