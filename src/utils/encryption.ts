/**
 * Encryption utilities for local user data
 * Provides secure encryption/decryption for sensitive data like API keys
 * @module encryption
 */

import { createHash, createCipheriv, createDecipheriv, randomBytes, pbkdf2Sync } from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32;
const IV_LENGTH = 16;
const TAG_LENGTH = 16;
const SALT_LENGTH = 32;

/**
 * Derives an encryption key from a master key and salt
 */
function deriveKey(masterKey: string, salt: Buffer): Buffer {
  return pbkdf2Sync(masterKey, salt, 100000, KEY_LENGTH, 'sha256');
}

/**
 * Gets or creates a master encryption key for local mode
 * Uses a deterministic key based on user ID but adds entropy
 */
function getMasterKey(userId: string): string {
  // In production, this could be enhanced with user-provided passwords
  // For now, we use a deterministic key with system entropy
  const base = createHash('sha256').update(userId + process.cwd()).digest('hex');
  return base;
}

/**
 * Encrypts sensitive data (like API keys)
 */
export function encryptSensitiveData(data: string, userId: string): string {
  if (!data) return '';
  
  try {
    const masterKey = getMasterKey(userId);
    const salt = randomBytes(SALT_LENGTH);
    const key = deriveKey(masterKey, salt);
    const iv = randomBytes(IV_LENGTH);
    
    const cipher = createCipheriv(ALGORITHM, key, iv);
    let encrypted = cipher.update(data, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const tag = cipher.getAuthTag();
    
    // Combine salt + iv + tag + encrypted data
    const combined = Buffer.concat([salt, iv, tag, Buffer.from(encrypted, 'hex')]);
    return combined.toString('base64');
  } catch (error) {
    console.error('Failed to encrypt data:', error);
    throw new Error('Encryption failed');
  }
}

/**
 * Decrypts sensitive data (like API keys)
 */
export function decryptSensitiveData(encryptedData: string, userId: string): string {
  if (!encryptedData) return '';
  
  try {
    const masterKey = getMasterKey(userId);
    const combined = Buffer.from(encryptedData, 'base64');
    
    // Extract components
    const salt = combined.subarray(0, SALT_LENGTH);
    const iv = combined.subarray(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
    const tag = combined.subarray(SALT_LENGTH + IV_LENGTH, SALT_LENGTH + IV_LENGTH + TAG_LENGTH);
    const encrypted = combined.subarray(SALT_LENGTH + IV_LENGTH + TAG_LENGTH);
    
    const key = deriveKey(masterKey, salt);
    
    const decipher = createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(tag);
    
    let decrypted = decipher.update(encrypted, null, 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    console.error('Failed to decrypt data:', error);
    // Return empty string instead of throwing to handle corruption gracefully
    return '';
  }
}

/**
 * Validates if encrypted data is valid (can be decrypted)
 */
export function validateEncryptedData(encryptedData: string, userId: string): boolean {
  try {
    const decrypted = decryptSensitiveData(encryptedData, userId);
    return decrypted.length > 0;
  } catch {
    return false;
  }
}

/**
 * Creates a secure hash for API key validation
 */
export function hashApiKey(apiKey: string): string {
  return createHash('sha256').update(apiKey).digest('hex');
}

/**
 * Masks an API key for display (shows only first/last few characters)
 */
export function maskApiKey(apiKey: string): string {
  if (apiKey.length <= 8) {
    return '***';
  }
  const start = apiKey.substring(0, 4);
  const end = apiKey.substring(apiKey.length - 4);
  return `${start}...${end}`;
}
