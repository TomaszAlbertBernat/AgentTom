/**
 * Local user configuration routes
 * Handles local user settings and API key management
 * @module local-user-routes
 */

import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { 
  loadLocalUserConfig, 
  saveLocalUserConfig, 
  getApiKey, 
  setApiKey, 
  deleteApiKey,
  getUserPreferences, 
  updateUserPreferences, 
  getLocalUser,
  listApiKeys,
  getApiKeyMetadata,
  testApiKey
} from '../config/local-user.config';
import { AppEnv } from '../types/hono';

const localUser = new Hono<AppEnv>();

// Get local user configuration
localUser.get('/config', async (c) => {
  const config = loadLocalUserConfig();
  return c.json({
    id: config.id,
    name: config.name,
    email: config.email,
    preferences: config.preferences,
    createdAt: config.createdAt,
    updatedAt: config.updatedAt,
    // Don't return API keys for security
    hasApiKeys: Object.keys(config.apiKeys).length > 0
  });
});

// Update local user configuration
const updateConfigSchema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email().optional(),
  preferences: z.object({
    theme: z.enum(['light', 'dark', 'system']).optional(),
    language: z.string().optional(),
    timezone: z.string().optional(),
    model: z.string().optional(),
  }).optional(),
});

localUser.patch('/config', zValidator('json', updateConfigSchema), async (c) => {
  const updates = c.req.valid('json');
  const updated = saveLocalUserConfig(updates);

  return c.json({
    id: updated.id,
    name: updated.name,
    email: updated.email,
    preferences: updated.preferences,
    createdAt: updated.createdAt,
    updatedAt: updated.updatedAt,
    hasApiKeys: Object.keys(updated.apiKeys).length > 0
  });
});

// Get user preferences
localUser.get('/preferences', async (c) => {
  const preferences = getUserPreferences();
  return c.json(preferences);
});

// Update user preferences
const updatePreferencesSchema = z.object({
  theme: z.enum(['light', 'dark', 'system']).optional(),
  language: z.string().optional(),
  timezone: z.string().optional(),
  model: z.string().optional(),
});

localUser.patch('/preferences', zValidator('json', updatePreferencesSchema), async (c) => {
  const preferences = c.req.valid('json');
  const updated = updateUserPreferences(preferences);
  return c.json(updated.preferences);
});

// Get available API keys with metadata (without actual key values)
localUser.get('/api-keys', async (c) => {
  const keys = listApiKeys();
  return c.json(keys);
});

// Set API key for a service
const setApiKeySchema = z.object({
  service: z.enum(['google', 'openai', 'anthropic', 'xai', 'elevenlabs', 'resend', 'firecrawl', 'linear']),
  key: z.string().min(1),
});

localUser.post('/api-keys', zValidator('json', setApiKeySchema), async (c) => {
  const { service, key } = c.req.valid('json');

  try {
    setApiKey(service, key);
    return c.json({ success: true, service });
  } catch (error) {
    return c.json({ error: 'Failed to save API key' }, 500);
  }
});

// Delete API key for a service
localUser.delete('/api-keys/:service', async (c) => {
  const service = c.req.param('service') as keyof ReturnType<typeof loadLocalUserConfig>['apiKeys'];

  try {
    deleteApiKey(service);
    return c.json({ success: true, service });
  } catch (error) {
    return c.json({ error: 'Failed to delete API key' }, 500);
  }
});

// Set Spotify API keys
const setSpotifyKeysSchema = z.object({
  clientId: z.string().min(1),
  clientSecret: z.string().min(1),
});

localUser.post('/api-keys/spotify', zValidator('json', setSpotifyKeysSchema), async (c) => {
  const { clientId, clientSecret } = c.req.valid('json');

  try {
    const config = loadLocalUserConfig();
    config.apiKeys.spotify = { clientId, clientSecret };
    saveLocalUserConfig(config);
    return c.json({ success: true, service: 'spotify' });
  } catch (error) {
    return c.json({ error: 'Failed to save Spotify API keys' }, 500);
  }
});

// Test API key for a service
localUser.post('/api-keys/:service/test', async (c) => {
  const service = c.req.param('service') as keyof ReturnType<typeof loadLocalUserConfig>['apiKeys'];

  try {
    const result = await testApiKey(service);
    return c.json(result);
  } catch (error) {
    return c.json({ 
      valid: false, 
      error: error instanceof Error ? error.message : 'Test failed' 
    }, 500);
  }
});

// Get metadata for a specific API key
localUser.get('/api-keys/:service/metadata', async (c) => {
  const service = c.req.param('service') as keyof ReturnType<typeof loadLocalUserConfig>['apiKeys'];

  try {
    const metadata = getApiKeyMetadata(service);
    return c.json(metadata);
  } catch (error) {
    return c.json({ error: 'Failed to get API key metadata' }, 500);
  }
});

// Get current user info (for compatibility with existing auth routes)
localUser.get('/me', async (c) => {
  const user = getLocalUser();
  return c.json({
    id: user.id,
    uuid: user.uuid,
    name: user.name,
    email: user.email,
    scopes: user.scopes,
    isLocal: user.isLocal,
  });
});

export { localUser as localUserRoutes };
