/**
 * API Key management service
 * Handles API key creation, validation, rotation, and tracking
 * @module api-key.service
 */

import { z } from 'zod';
import { db } from '../../database';
import { apiKeys } from '../../schema/api-keys';
import { eq, and, lt } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { createHash } from 'crypto';

// Schema for API key creation
const createApiKeySchema = z.object({
  userId: z.string(),
  name: z.string(),
  expiresAt: z.date().optional(),
  scopes: z.array(z.string()).optional(),
  maxRequestsPerDay: z.number().optional()
});

// Schema for API key validation
const validateApiKeySchema = z.object({
  key: z.string(),
  requiredScopes: z.array(z.string()).optional()
});

/**
 * Service for managing API keys
 * @namespace apiKeyService
 */
const apiKeyService = {
  /**
   * Creates a new API key
   * @param {z.infer<typeof createApiKeySchema>} params - API key creation parameters
   * @returns {Promise<{key: string, hash: string}>} The generated API key and its hash
   */
  createApiKey: async (params: z.infer<typeof createApiKeySchema>) => {
    const { userId, name, expiresAt, scopes, maxRequestsPerDay } = createApiKeySchema.parse(params);
    
    // Generate a new API key
    const key = `sk_${uuidv4()}`;
    const hash = createHash('sha256').update(key).digest('hex');
    
    // Store the key in the database
    await db.insert(apiKeys).values({
      userId,
      name,
      hash,
      expiresAt,
      scopes: scopes || [],
      maxRequestsPerDay: maxRequestsPerDay || 1000,
      createdAt: new Date(),
      lastUsedAt: null,
      requestCount: 0
    });
    
    return { key, hash };
  },

  /**
   * Validates an API key
   * @param {z.infer<typeof validateApiKeySchema>} params - API key validation parameters
   * @returns {Promise<{valid: boolean, userId: string | null, scopes: string[]}>} Validation result
   */
  validateApiKey: async (params: z.infer<typeof validateApiKeySchema>) => {
    const { key, requiredScopes } = validateApiKeySchema.parse(params);
    
    // Hash the provided key
    const hash = createHash('sha256').update(key).digest('hex');
    
    // Find the key in the database
    const apiKey = await db.query.apiKeys.findFirst({
      where: and(
        eq(apiKeys.hash, hash),
        lt(apiKeys.expiresAt, new Date())
      )
    });
    
    if (!apiKey) {
      return { valid: false, userId: null, scopes: [] };
    }
    
    // Check if the key has expired
    if (apiKey.expiresAt && new Date() > apiKey.expiresAt) {
      return { valid: false, userId: null, scopes: [] };
    }
    
    // Check if the key has exceeded its daily request limit
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (apiKey.lastUsedAt && apiKey.lastUsedAt > today) {
      if (apiKey.requestCount >= apiKey.maxRequestsPerDay) {
        return { valid: false, userId: null, scopes: [] };
      }
    }
    
    // Check if the key has the required scopes
    if (requiredScopes && requiredScopes.length > 0) {
      const hasRequiredScopes = requiredScopes.every(scope => 
        apiKey.scopes.includes(scope)
      );
      
      if (!hasRequiredScopes) {
        return { valid: false, userId: null, scopes: [] };
      }
    }
    
    // Update the key's usage
    await db.update(apiKeys)
      .set({
        lastUsedAt: new Date(),
        requestCount: apiKey.requestCount + 1
      })
      .where(eq(apiKeys.hash, hash));
    
    return {
      valid: true,
      userId: apiKey.userId,
      scopes: apiKey.scopes
    };
  },

  /**
   * Rotates an API key
   * @param {string} hash - The hash of the API key to rotate
   * @returns {Promise<{key: string, hash: string}>} The new API key and its hash
   */
  rotateApiKey: async (hash: string) => {
    // Find the existing key
    const existingKey = await db.query.apiKeys.findFirst({
      where: eq(apiKeys.hash, hash)
    });
    
    if (!existingKey) {
      throw new Error('API key not found');
    }
    
    // Generate a new key
    const newKey = `sk_${uuidv4()}`;
    const newHash = createHash('sha256').update(newKey).digest('hex');
    
    // Update the key in the database
    await db.update(apiKeys)
      .set({
        hash: newHash,
        lastUsedAt: new Date(),
        requestCount: 0
      })
      .where(eq(apiKeys.hash, hash));
    
    return { key: newKey, hash: newHash };
  },

  /**
   * Revokes an API key
   * @param {string} hash - The hash of the API key to revoke
   * @returns {Promise<void>}
   */
  revokeApiKey: async (hash: string) => {
    await db.delete(apiKeys)
      .where(eq(apiKeys.hash, hash));
  },

  /**
   * Gets API key usage statistics
   * @param {string} hash - The hash of the API key
   * @returns {Promise<{requestCount: number, lastUsedAt: Date | null}>} Usage statistics
   */
  getApiKeyStats: async (hash: string) => {
    const apiKey = await db.query.apiKeys.findFirst({
      where: eq(apiKeys.hash, hash)
    });
    
    if (!apiKey) {
      throw new Error('API key not found');
    }
    
    return {
      requestCount: apiKey.requestCount,
      lastUsedAt: apiKey.lastUsedAt
    };
  }
};

export { apiKeyService }; 