/**
 * Local user configuration
 * Manages user settings for local-first mode
 * @module local-user
 */

import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import * as fs from 'fs';
import * as path from 'path';

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
  }).default(() => ({
    theme: 'system' as const,
    language: 'en',
    timezone: 'Europe/Warsaw',
    model: 'gemini-2.5-flash',
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
  },
  apiKeys: {},
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
 * Get API key for a specific service
 */
export const getApiKey = (service: keyof LocalUserConfig['apiKeys']): string | undefined => {
  const config = loadLocalUserConfig();
  return config.apiKeys[service] as string | undefined;
};

/**
 * Set API key for a specific service
 */
export const setApiKey = (service: keyof LocalUserConfig['apiKeys'], key: string): void => {
  const config = loadLocalUserConfig();
  config.apiKeys[service] = key;
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
