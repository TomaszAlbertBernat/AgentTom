/**
 * Local user configuration
 * Manages user settings for local-first mode
 * @module local-user
 */

import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import * as fs from 'fs';
import * as path from 'path';
import { encryptSensitiveData, decryptSensitiveData, maskApiKey } from '../utils/encryption';

// Local user configuration schema
const localUserSchema = z.object({
  id: z.string().uuid().default(() => uuidv4()),
  name: z.string().default('Local User'),
  email: z.string().email().optional(),
  preferences: z.object({
    theme: z.enum(['light', 'dark', 'system']).default('system'),
    language: z.string().default('en'),
    timezone: z.string().default('Europe/Warsaw'),
    model: z.string().default('gemini-2.5-flash'),
    setupCompleted: z.boolean().default(false),
  }).default(() => ({
    theme: 'system' as const,
    language: 'en',
    timezone: 'Europe/Warsaw',
    model: 'gemini-2.5-flash',
    setupCompleted: false,
  })),
  apiKeys: z.object({
    google: z.string().optional(),
    openai: z.string().optional(),
    anthropic: z.string().optional(),
    xai: z.string().optional(),
    elevenlabs: z.string().optional(),
    resend: z.string().optional(),
    firecrawl: z.string().optional(),
    linear: z.string().optional(),
    spotify: z.object({
      clientId: z.string().optional(),
      clientSecret: z.string().optional(),
    }).optional(),
  }).default({}),
  apiKeyMetadata: z.object({
    google: z.object({ createdAt: z.string(), lastRotated: z.string().optional() }).optional(),
    openai: z.object({ createdAt: z.string(), lastRotated: z.string().optional() }).optional(),
    anthropic: z.object({ createdAt: z.string(), lastRotated: z.string().optional() }).optional(),
    xai: z.object({ createdAt: z.string(), lastRotated: z.string().optional() }).optional(),
    elevenlabs: z.object({ createdAt: z.string(), lastRotated: z.string().optional() }).optional(),
    resend: z.object({ createdAt: z.string(), lastRotated: z.string().optional() }).optional(),
    firecrawl: z.object({ createdAt: z.string(), lastRotated: z.string().optional() }).optional(),
    linear: z.object({ createdAt: z.string(), lastRotated: z.string().optional() }).optional(),
    spotify: z.object({ createdAt: z.string(), lastRotated: z.string().optional() }).optional(),
  }).default({}),
  createdAt: z.date().default(() => new Date()),
  updatedAt: z.date().default(() => new Date()),
});

export type LocalUserConfig = z.infer<typeof localUserSchema>;

// Default configuration
const defaultConfig: LocalUserConfig = {
  id: uuidv4(),
  name: 'Local User',
  preferences: {
    theme: 'system',
    language: 'en',
    timezone: 'Europe/Warsaw',
    model: 'gemini-2.5-flash',
    setupCompleted: false,
  },
  apiKeys: {},
  apiKeyMetadata: {},
  createdAt: new Date(),
  updatedAt: new Date(),
};

/**
 * Get the path to the local user configuration file
 */
const getConfigPath = (): string => {
  const configDir = path.join(process.cwd(), '.agenttom');
  const configPath = path.join(configDir, 'local-user.json');
  return configPath;
};

/**
 * Ensure configuration directory exists
 */
const ensureConfigDir = (): void => {
  const configDir = path.join(process.cwd(), '.agenttom');
  if (!fs.existsSync(configDir)) {
    fs.mkdirSync(configDir, { recursive: true });
  }
};

/**
 * Load local user configuration
 */
export const loadLocalUserConfig = (): LocalUserConfig => {
  try {
    const configPath = getConfigPath();

    if (!fs.existsSync(configPath)) {
      console.log('📝 No local user config found, creating default configuration');
      ensureConfigDir();
      fs.writeFileSync(configPath, JSON.stringify(defaultConfig, null, 2));
      return defaultConfig;
    }

    const configData = fs.readFileSync(configPath, 'utf-8');
    const parsed = JSON.parse(configData);

    // Parse with schema validation and update timestamps
    const validated = localUserSchema.parse({
      ...parsed,
      updatedAt: new Date(),
    });

    return validated;
  } catch (error) {
    console.error('❌ Failed to load local user config:', error);
    console.log('🔄 Using default configuration');
    return defaultConfig;
  }
};

/**
 * Save local user configuration
 */
export const saveLocalUserConfig = (config: Partial<LocalUserConfig>): LocalUserConfig => {
  try {
    ensureConfigDir();
    const configPath = getConfigPath();

    // Load existing config or create default
    const existing = fs.existsSync(configPath)
      ? JSON.parse(fs.readFileSync(configPath, 'utf-8'))
      : defaultConfig;

    // Merge and validate
    const updated = localUserSchema.parse({
      ...existing,
      ...config,
      updatedAt: new Date(),
    });

    // Save to file
    fs.writeFileSync(configPath, JSON.stringify(updated, null, 2));

    console.log('✅ Local user configuration saved');
    return updated;
  } catch (error) {
    console.error('❌ Failed to save local user config:', error);
    throw error;
  }
};

/**
 * Get API key for a specific service (handles decryption)
 */
export const getApiKey = (service: keyof LocalUserConfig['apiKeys']): string | undefined => {
  const config = loadLocalUserConfig();
  const encryptedKey = config.apiKeys[service] as string | undefined;
  
  if (!encryptedKey) return undefined;
  
  // If it looks like an encrypted key (base64), decrypt it
  if (isEncryptedKey(encryptedKey)) {
    try {
      return decryptSensitiveData(encryptedKey, config.id);
    } catch (error) {
      console.error(`Failed to decrypt API key for ${service}:`, error);
      return undefined;
    }
  }
  
  // For backward compatibility, return plaintext keys (they'll be encrypted on next save)
  return encryptedKey;
};

/**
 * Check if a string looks like an encrypted key
 */
function isEncryptedKey(key: string): boolean {
  try {
    // Encrypted keys are base64 and have minimum length
    return key.length > 100 && /^[A-Za-z0-9+/]+=*$/.test(key);
  } catch {
    return false;
  }
}

/**
 * Set API key for a specific service (with encryption)
 */
export const setApiKey = (service: keyof LocalUserConfig['apiKeys'], key: string): void => {
  const config = loadLocalUserConfig();
  
  // Encrypt the API key
  const encryptedKey = encryptSensitiveData(key, config.id);
  config.apiKeys[service] = encryptedKey;
  
  // Update metadata
  const now = new Date().toISOString();
  if (!config.apiKeyMetadata[service]) {
    config.apiKeyMetadata[service] = { createdAt: now };
  } else {
    config.apiKeyMetadata[service]!.lastRotated = now;
  }
  
  config.updatedAt = new Date();
  saveLocalUserConfig(config);
};

/**
 * Get user preferences
 */
export const getUserPreferences = () => {
  const config = loadLocalUserConfig();
  return config.preferences;
};

/**
 * Update user preferences
 */
export const updateUserPreferences = (preferences: Partial<LocalUserConfig['preferences']>) => {
  const config = loadLocalUserConfig();
  config.preferences = { ...config.preferences, ...preferences };
  config.updatedAt = new Date();
  return saveLocalUserConfig(config);
};

/**
 * Check if we're in local mode
 */
export const isLocalMode = (): boolean => {
  return process.env.AUTH_MODE === 'local' || process.env.AUTH_MODE === undefined;
};

/**
 * Get the local user ID (creates config if needed)
 */
export const getLocalUserId = (): string => {
  const config = loadLocalUserConfig();
  return config.id;
};

/**
 * Get the local user as a user object compatible with existing auth system
 */
export const getLocalUser = () => {
  const config = loadLocalUserConfig();
  return {
    id: config.id,
    uuid: config.id,
    name: config.name,
    email: config.email || null,
    scopes: ['user', 'local'],
    preferences: config.preferences,
    isLocal: true,
  };
};

/**
 * Delete API key for a specific service
 */
export const deleteApiKey = (service: keyof LocalUserConfig['apiKeys']): void => {
  const config = loadLocalUserConfig();
  delete config.apiKeys[service];
  delete config.apiKeyMetadata[service];
  config.updatedAt = new Date();
  saveLocalUserConfig(config);
};

/**
 * Get API key metadata (creation date, last rotation, etc.)
 */
export const getApiKeyMetadata = (service: keyof LocalUserConfig['apiKeys']) => {
  const config = loadLocalUserConfig();
  const metadata = config.apiKeyMetadata[service];
  const hasKey = !!config.apiKeys[service];
  
  return {
    hasKey,
    masked: hasKey ? maskApiKey(getApiKey(service) || '') : null,
    ...metadata,
  };
};

/**
 * List all configured API keys with their metadata
 */
export const listApiKeys = () => {
  const config = loadLocalUserConfig();
  const services = ['google', 'openai', 'anthropic', 'xai', 'elevenlabs', 'resend', 'firecrawl', 'linear', 'spotify'] as const;
  
  return services.reduce((acc, service) => {
    const metadata = getApiKeyMetadata(service);
    if (metadata.hasKey) {
      acc[service] = metadata;
    }
    return acc;
  }, {} as Record<string, any>);
};

/**
 * Test if an API key is valid by attempting to use it
 */
export const testApiKey = async (service: keyof LocalUserConfig['apiKeys']): Promise<{ valid: boolean; error?: string }> => {
  const apiKey = getApiKey(service);
  if (!apiKey) {
    return { valid: false, error: 'No API key configured' };
  }

  try {
    // Test the API key based on service type
    switch (service) {
      case 'google':
        return await testGoogleApiKey(apiKey);
      case 'openai':
        return await testOpenAIApiKey(apiKey);
      default:
        return { valid: true }; // For services without test endpoints
    }
  } catch (error) {
    return { 
      valid: false, 
      error: error instanceof Error ? error.message : 'Test failed' 
    };
  }
};

/**
 * Test Google API key
 */
async function testGoogleApiKey(apiKey: string): Promise<{ valid: boolean; error?: string }> {
  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
    if (response.ok) {
      return { valid: true };
    } else {
      return { valid: false, error: `HTTP ${response.status}: ${response.statusText}` };
    }
  } catch (error) {
    return { valid: false, error: error instanceof Error ? error.message : 'Network error' };
  }
}

/**
 * Test OpenAI API key
 */
async function testOpenAIApiKey(apiKey: string): Promise<{ valid: boolean; error?: string }> {
  try {
    const response = await fetch('https://api.openai.com/v1/models', {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
    });
    if (response.ok) {
      return { valid: true };
    } else {
      return { valid: false, error: `HTTP ${response.status}: ${response.statusText}` };
    }
  } catch (error) {
    return { valid: false, error: error instanceof Error ? error.message : 'Network error' };
  }
}
