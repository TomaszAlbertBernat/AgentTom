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
    setupCompleted: z.boolean().optional(),
  }).optional(),
});

localUser.patch('/config', zValidator('json', updateConfigSchema), async (c) => {
  const updates = c.req.valid('json');

  // Merge updates with existing config to handle required fields
  const currentConfig = loadLocalUserConfig();
  const mergedUpdates = {
    ...updates,
    preferences: updates.preferences
      ? { ...currentConfig.preferences, ...updates.preferences }
      : currentConfig.preferences
  };

  const updated = saveLocalUserConfig(mergedUpdates);

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
  setupCompleted: z.boolean().optional(),
});

localUser.patch('/preferences', zValidator('json', updatePreferencesSchema), async (c) => {
  const preferences = c.req.valid('json');

  // Merge with existing preferences to handle required fields
  const currentPreferences = getUserPreferences();
  const mergedPreferences = { ...currentPreferences, ...preferences };

  const updated = updateUserPreferences(mergedPreferences);
  return c.json(updated.preferences);
});

// Get available API keys with metadata (without actual key values)
localUser.get('/api-keys', async (c) => {
  const keys = listApiKeys();
  return c.json(keys);
});

// API key management removed - use .env file only
// All API keys must be configured through environment variables in .env file

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

// Service status endpoint
localUser.get('/service-status', async (c) => {
  try {
    const availableServices = {
      core: {
        memory: true,
        file: true,
        speak: true,
        crypto: true,
        image: true
      },
      external: {
        spotify: !!process.env.SPOTIFY_CLIENT_ID && !!process.env.SPOTIFY_CLIENT_SECRET,
        linear: !!process.env.LINEAR_API_KEY,
        resend: !!process.env.RESEND_API_KEY,
        map: !!process.env.GOOGLE_API_KEY, // Google Maps API uses Google API key
        web: !!process.env.FIRECRAWL_API_KEY,
        calendar: !!process.env.CALENDAR_CLIENT_ID && !!process.env.CALENDAR_CLIENT_SECRET,
        youtube: true // Always available for transcript extraction
      }
    };

    const enabledCount = Object.values(availableServices.external).filter(Boolean).length;
    const totalExternal = Object.keys(availableServices.external).length;

    return c.json({
      success: true,
      data: {
        ...availableServices,
        summary: {
          coreServicesAvailable: 5,
          externalServicesAvailable: enabledCount,
          externalServicesTotal: totalExternal,
          externalServicesEnabled: enabledCount > 0
        }
      }
    });
  } catch (error) {
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  }
});

export { localUser as localUserRoutes };
