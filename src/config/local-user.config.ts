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
 * Create configuration from environment variables
 * Automatically sets up API keys and marks setup as complete if keys are present
 */
const createConfigFromEnvironment = (): LocalUserConfig => {
  const baseConfig = { ...defaultConfig };
  let hasApiKeys = false;

  // Check for Google API key
  if (process.env.GOOGLE_API_KEY) {
    console.log('🔑 Found GOOGLE_API_KEY in environment, auto-configuring...');
    baseConfig.apiKeys.google = process.env.GOOGLE_API_KEY;
    baseConfig.apiKeyMetadata.google = {
      createdAt: new Date().toISOString(),
    };
    hasApiKeys = true;
  }

  // Check for OpenAI API key
  if (process.env.OPENAI_API_KEY) {
    console.log('🔑 Found OPENAI_API_KEY in environment, auto-configuring...');
    baseConfig.apiKeys.openai = process.env.OPENAI_API_KEY;
    baseConfig.apiKeyMetadata.openai = {
      createdAt: new Date().toISOString(),
    };
    hasApiKeys = true;
  }

  // Check for other optional API keys
  if (process.env.ELEVENLABS_API_KEY) {
    baseConfig.apiKeys.elevenlabs = process.env.ELEVENLABS_API_KEY;
    baseConfig.apiKeyMetadata.elevenlabs = {
      createdAt: new Date().toISOString(),
    };
  }

  if (process.env.RESEND_API_KEY) {
    baseConfig.apiKeys.resend = process.env.RESEND_API_KEY;
    baseConfig.apiKeyMetadata.resend = {
      createdAt: new Date().toISOString(),
    };
  }

  if (process.env.FIRECRAWL_API_KEY) {
    baseConfig.apiKeys.firecrawl = process.env.FIRECRAWL_API_KEY;
    baseConfig.apiKeyMetadata.firecrawl = {
      createdAt: new Date().toISOString(),
    };
  }

  if (process.env.LINEAR_API_KEY) {
    baseConfig.apiKeys.linear = process.env.LINEAR_API_KEY;
    baseConfig.apiKeyMetadata.linear = {
      createdAt: new Date().toISOString(),
    };
  }

  // If we have API keys from environment, mark setup as complete
  if (hasApiKeys) {
    console.log('✅ Auto-setup complete! Found API keys in environment.');
    baseConfig.preferences.setupCompleted = true;
    baseConfig.name = process.env.USER_NAME || process.env.USERNAME || 'Local User';
  } else {
    console.log('ℹ️  No API keys found in environment. Setup wizard will be required.');
  }

  return baseConfig;
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

      // Check for API keys in environment and auto-setup if found
      const envConfig = createConfigFromEnvironment();

      ensureConfigDir();
      fs.writeFileSync(configPath, JSON.stringify(envConfig, null, 2));
      return envConfig;
    }

    const configData = fs.readFileSync(configPath, 'utf-8');
    const parsed = JSON.parse(configData);

    // Parse with schema validation and update timestamps
    // Convert date strings back to Date objects if needed
    const withDates = {
      ...parsed,
      createdAt: parsed.createdAt ? new Date(parsed.createdAt) : new Date(),
      updatedAt: new Date(),
    };

    const validated = localUserSchema.parse(withDates);

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
    const existingRaw = fs.existsSync(configPath)
      ? JSON.parse(fs.readFileSync(configPath, 'utf-8'))
      : defaultConfig;

    // Convert date strings back to Date objects if needed
    const existing = {
      ...existingRaw,
      createdAt: existingRaw.createdAt ? new Date(existingRaw.createdAt) : new Date(),
    };

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
 * Set API key for a specific service (DISABLED - use .env file only)
 * @deprecated Use environment variables in .env file instead
 */
export const setApiKey = (service: keyof LocalUserConfig['apiKeys'], key: string): void => {
  throw new Error(`API key management via web interface is disabled. Please configure ${service.toUpperCase()}_API_KEY in your .env file.`);
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
 * Delete API key for a specific service (DISABLED - use .env file only)
 * @deprecated Remove environment variables from .env file instead
 */
export const deleteApiKey = (service: keyof LocalUserConfig['apiKeys']): void => {
  throw new Error(`API key management via web interface is disabled. Please remove ${service.toUpperCase()}_API_KEY from your .env file.`);
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
  const services = ['google', 'openai', 'xai', 'elevenlabs', 'resend', 'firecrawl', 'linear', 'spotify'] as const;
  
  return services.reduce((acc, service) => {
    const metadata = getApiKeyMetadata(service);
    if (metadata.hasKey) {
      acc[service] = metadata;
    }
    return acc;
  }, {} as Record<string, any>);
};

/**
 * Test if an API key is valid by attempting to use it (reads from environment variables)
 */
export const testApiKey = async (service: keyof LocalUserConfig['apiKeys']): Promise<{ valid: boolean; error?: string }> => {
  // Get API key directly from environment variables
  let apiKey: string | undefined;

  switch (service) {
    case 'google':
      apiKey = process.env.GOOGLE_API_KEY;
      break;
    case 'openai':
      apiKey = process.env.OPENAI_API_KEY;
      break;
    case 'elevenlabs':
      apiKey = process.env.ELEVENLABS_API_KEY;
      break;
    case 'resend':
      apiKey = process.env.RESEND_API_KEY;
      break;
    case 'firecrawl':
      apiKey = process.env.FIRECRAWL_API_KEY;
      break;
    case 'linear':
      apiKey = process.env.LINEAR_API_KEY;
      break;
    case 'spotify':
      // For Spotify, we need both client ID and secret
      const clientId = process.env.SPOTIFY_CLIENT_ID;
      const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
      if (clientId && clientSecret) {
        return await testSpotifyApiKeys(clientId, clientSecret);
      }
      apiKey = undefined;
      break;
    default:
      return { valid: false, error: `Service ${service} not supported for testing` };
  }

  if (!apiKey) {
    return { valid: false, error: `No ${service.toUpperCase()}_API_KEY found in environment variables. Please set it in your .env file.` };
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

/**
 * Test Spotify API keys
 */
async function testSpotifyApiKeys(clientId: string, clientSecret: string): Promise<{ valid: boolean; error?: string }> {
  try {
    // Test Spotify API by getting an access token
    const response = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
      },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
      }),
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
