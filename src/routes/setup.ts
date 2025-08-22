/**
 * Setup wizard routes
 * Handles first-run configuration and setup process
 * @module setup-routes
 */

import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { setupService } from '../services/common/setup.service';
import { AppEnv } from '../types/hono';
import { isLocalMode } from '../config/local-user.config';

const setup = new Hono<AppEnv>();

// Middleware to ensure we're in local mode
setup.use('*', async (c, next) => {
  if (!isLocalMode()) {
    return c.json({ error: 'Setup wizard is only available in local mode' }, 403);
  }
  await next();
});

// Get setup status and guide
setup.get('/status', async (c) => {
  try {
    const status = setupService.getSetupStatus();
    const guide = setupService.getSetupGuide();
    
    return c.json({
      status,
      guide,
      availableModels: setupService.getAvailableModels(),
    });
  } catch (error) {
    return c.json({ 
      error: error instanceof Error ? error.message : 'Failed to get setup status' 
    }, 500);
  }
});

// Setup user information
const userInfoSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Valid email is required').optional(),
  timezone: z.string().optional(),
});

setup.post('/user-info', zValidator('json', userInfoSchema), async (c) => {
  try {
    const data = c.req.valid('json');
    const result = await setupService.setupUserInfo(data);
    
    return c.json(result);
  } catch (error) {
    return c.json({ 
      success: false,
      error: error instanceof Error ? error.message : 'Failed to setup user info' 
    }, 400);
  }
});

// Setup API key
const apiKeySchema = z.object({
  service: z.enum(['google', 'openai', 'anthropic', 'xai']),
  key: z.string().min(10, 'API key must be at least 10 characters'),
  testKey: z.boolean().optional().default(false),
});

setup.post('/api-key', zValidator('json', apiKeySchema), async (c) => {
  try {
    const data = c.req.valid('json');
    const result = await setupService.setupApiKey(data);
    
    return c.json(result);
  } catch (error) {
    return c.json({ 
      success: false,
      error: error instanceof Error ? error.message : 'Failed to setup API key' 
    }, 400);
  }
});

// Setup preferences
const preferencesSchema = z.object({
  theme: z.enum(['light', 'dark', 'system']).optional(),
  language: z.string().optional(),
  model: z.string().optional(),
});

setup.post('/preferences', zValidator('json', preferencesSchema), async (c) => {
  try {
    const data = c.req.valid('json');
    const result = await setupService.setupPreferences(data);
    
    return c.json(result);
  } catch (error) {
    return c.json({ 
      success: false,
      error: error instanceof Error ? error.message : 'Failed to setup preferences' 
    }, 400);
  }
});

// Complete setup
setup.post('/complete', async (c) => {
  try {
    const result = await setupService.completeSetup();
    
    return c.json(result);
  } catch (error) {
    return c.json({ 
      success: false,
      error: error instanceof Error ? error.message : 'Failed to complete setup' 
    }, 400);
  }
});

// Reset setup (development only)
setup.post('/reset', async (c) => {
  try {
    const result = await setupService.resetSetup();
    
    return c.json(result);
  } catch (error) {
    return c.json({ 
      success: false,
      error: error instanceof Error ? error.message : 'Failed to reset setup' 
    }, 400);
  }
});

// Test API key during setup
const testKeySchema = z.object({
  service: z.enum(['google', 'openai', 'anthropic', 'xai']),
  key: z.string().min(10),
});

setup.post('/test-api-key', zValidator('json', testKeySchema), async (c) => {
  try {
    const { service, key } = c.req.valid('json');
    
    // Temporarily set the key for testing (without saving)
    const originalSetApiKey = require('../config/local-user.config').setApiKey;
    const originalGetApiKey = require('../config/local-user.config').getApiKey;
    
    // Mock the getApiKey function to return our test key
    require('../config/local-user.config').getApiKey = (testService: string) => {
      return testService === service ? key : originalGetApiKey(testService);
    };
    
    const { testApiKey } = require('../config/local-user.config');
    const result = await testApiKey(service);
    
    // Restore original function
    require('../config/local-user.config').getApiKey = originalGetApiKey;
    
    return c.json({
      service,
      valid: result.valid,
      error: result.error,
      message: result.valid ? 'API key test successful' : 'API key test failed',
    });
  } catch (error) {
    return c.json({ 
      service: c.req.valid('json').service,
      valid: false,
      error: error instanceof Error ? error.message : 'Test failed',
      message: 'API key test failed',
    }, 400);
  }
});

export { setup as setupRoutes };
