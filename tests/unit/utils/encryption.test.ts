/**
 * Tests for encryption utilities
 */

import { test, expect, describe } from 'bun:test';
import { 
  encryptSensitiveData, 
  decryptSensitiveData, 
  validateEncryptedData,
  hashApiKey,
  maskApiKey 
} from '../../../src/utils/encryption';

describe('Encryption Utilities', () => {
  const testUserId = 'test-user-12345';
  const testData = 'sk-very-secret-api-key-abcdef123456';

  describe('encryption and decryption', () => {
    test('should encrypt and decrypt data correctly', () => {
      const encrypted = encryptSensitiveData(testData, testUserId);
      const decrypted = decryptSensitiveData(encrypted, testUserId);
      
      expect(decrypted).toBe(testData);
    });

    test('should produce different encrypted output each time', () => {
      const encrypted1 = encryptSensitiveData(testData, testUserId);
      const encrypted2 = encryptSensitiveData(testData, testUserId);
      
      expect(encrypted1).not.toBe(encrypted2);
      
      // Both should decrypt to same value
      expect(decryptSensitiveData(encrypted1, testUserId)).toBe(testData);
      expect(decryptSensitiveData(encrypted2, testUserId)).toBe(testData);
    });

    test('should fail with wrong user ID', () => {
      const encrypted = encryptSensitiveData(testData, testUserId);
      const decrypted = decryptSensitiveData(encrypted, 'wrong-user-id');
      
      expect(decrypted).toBe('');
    });

    test('should handle empty strings', () => {
      expect(encryptSensitiveData('', testUserId)).toBe('');
      expect(decryptSensitiveData('', testUserId)).toBe('');
    });

    test('should handle invalid encrypted data gracefully', () => {
      const invalidData = 'not-encrypted-data';
      const decrypted = decryptSensitiveData(invalidData, testUserId);
      
      expect(decrypted).toBe('');
    });
  });

  describe('validation', () => {
    test('should validate correct encrypted data', () => {
      const encrypted = encryptSensitiveData(testData, testUserId);
      const isValid = validateEncryptedData(encrypted, testUserId);
      
      expect(isValid).toBe(true);
    });

    test('should reject invalid encrypted data', () => {
      const isValid = validateEncryptedData('invalid-data', testUserId);
      
      expect(isValid).toBe(false);
    });

    test('should reject data encrypted with different user ID', () => {
      const encrypted = encryptSensitiveData(testData, testUserId);
      const isValid = validateEncryptedData(encrypted, 'different-user');
      
      expect(isValid).toBe(false);
    });
  });

  describe('hashing', () => {
    test('should produce consistent hashes', () => {
      const hash1 = hashApiKey(testData);
      const hash2 = hashApiKey(testData);
      
      expect(hash1).toBe(hash2);
      expect(hash1).toHaveLength(64); // SHA256 hex length
    });

    test('should produce different hashes for different inputs', () => {
      const hash1 = hashApiKey('key1');
      const hash2 = hashApiKey('key2');
      
      expect(hash1).not.toBe(hash2);
    });
  });

  describe('masking', () => {
    test('should mask long API keys correctly', () => {
      const longKey = 'sk-1234567890abcdefghij';
      const masked = maskApiKey(longKey);
      
      expect(masked).toBe('sk-1...ghij');
    });

    test('should mask short keys as ***', () => {
      const shortKey = 'short';
      const masked = maskApiKey(shortKey);
      
      expect(masked).toBe('***');
    });

    test('should handle medium length keys', () => {
      const mediumKey = 'sk-12345678'; // Length 11, should be masked
      const masked = maskApiKey(mediumKey);
      
      expect(masked).toBe('sk-1...5678');
    });

    test('should handle exactly 8 character keys', () => {
      const key = 'sk-12345'; // Length 8, should be ***
      const masked = maskApiKey(key);
      
      expect(masked).toBe('***');
    });

    test('should handle short keys', () => {
      const key = 'short'; // Length 5, should be ***
      const masked = maskApiKey(key);
      
      expect(masked).toBe('***');
    });

    test('should handle keys longer than 8 characters', () => {
      const key = 'sk-123456789';
      const masked = maskApiKey(key);
      
      expect(masked).toBe('sk-1...6789');
    });

    test('should handle empty string', () => {
      const masked = maskApiKey('');
      
      expect(masked).toBe('***');
    });
  });

  describe('edge cases', () => {
    test('should handle unicode data', () => {
      const unicodeData = '🔑 secret key with émojis and açcénts 🚀';
      const encrypted = encryptSensitiveData(unicodeData, testUserId);
      const decrypted = decryptSensitiveData(encrypted, testUserId);
      
      expect(decrypted).toBe(unicodeData);
    });

    test('should handle very long data', () => {
      const longData = 'a'.repeat(10000);
      const encrypted = encryptSensitiveData(longData, testUserId);
      const decrypted = decryptSensitiveData(encrypted, testUserId);
      
      expect(decrypted).toBe(longData);
    });

    test('should handle special characters', () => {
      const specialData = 'key with spaces, newlines\n\t and "quotes" & symbols!@#$%^&*()';
      const encrypted = encryptSensitiveData(specialData, testUserId);
      const decrypted = decryptSensitiveData(encrypted, testUserId);
      
      expect(decrypted).toBe(specialData);
    });
  });
});
