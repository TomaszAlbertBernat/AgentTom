/**
 * Main application setup
 * Configures middleware, routes, and error handling
 * @module app
 */

import { Hono } from 'hono';
import { logger } from 'hono/logger';
import { prettyJSON } from 'hono/pretty-json';
import { HTTPException } from 'hono/http-exception';
import { swaggerUI } from '@hono/swagger-ui';
import { openApiConfig } from './config/openapi.config';
import { createLogger } from './services/common/logger.service';

// Import middleware
import { authMiddleware } from './middleware/auth';
import { rateLimit } from './middleware/rate-limit';
import { cors } from './middleware/cors';
import { sanitize } from './middleware/sanitize';

// Import routes
import { authRoutes } from './routes/auth';
import { agiRoutes } from './routes/agi';
import { toolRoutes } from './routes/tools';
import conversations from './routes/conversation';
import { users_router } from './routes/users';
import linearRoutes from './routes/linear';
import files from './routes/files';
import memory from './routes/memory';
import text from './routes/text';
import web from './routes/web';
import media from './routes/spotify';

// Create Hono app
const app = new Hono();
const appLogger = createLogger('App');

// Global middleware
app.use('*', logger());
app.use('*', prettyJSON());

// Security middleware
app.use('*', cors({
  origin: process.env.CORS_ORIGIN || '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'Accept',
    'Origin',
    'X-RateLimit-Limit',
    'X-RateLimit-Remaining',
    'X-RateLimit-Reset'
  ],
  exposedHeaders: [
    'X-RateLimit-Limit',
    'X-RateLimit-Remaining',
    'X-RateLimit-Reset'
  ],
  credentials: true,
  maxAge: 86400 // 24 hours
}));

// Rate limiting with different tiers
app.use('/api/*', rateLimit({
  window: 60, // 1 minute
  max: 60, // 60 requests per minute
  message: 'Too many requests, please try again later',
  keyPrefix: 'rate_limit:api:'
}));

app.use('/api/tools/*', rateLimit({
  window: 60, // 1 minute
  max: 30, // 30 requests per minute
  message: 'Too many tool requests, please try again later',
  keyPrefix: 'rate_limit:tools:'
}));

// Input sanitization
app.use('*', sanitize());

// Authentication (skip for public routes)
app.use('/api/*', authMiddleware());

// Error handling
app.onError((err, c) => {
  if (err instanceof HTTPException) {
    return c.json({
      error: err.message,
      status: err.status,
    }, err.status);
  }

  appLogger.error('Unhandled error', err as Error);
  return c.json({
    error: 'Internal Server Error',
    status: 500,
  }, 500);
});

// Health check
app.get('/health', (c) => c.json({ status: 'ok' }));

// OpenAPI documentation endpoints
app.get('/docs', swaggerUI({ 
  url: '/docs/openapi.json'
}));

app.get('/docs/openapi.json', c => {
  return c.json(openApiConfig);
});

// Register routes
app.route('/api/auth', authRoutes);
app.route('/api/agi', agiRoutes);
app.route('/api/tools', toolRoutes);
app.route('/api/conversations', conversations);
app.route('/api/users', users_router);
app.route('/api/linear', linearRoutes);
app.route('/api/files', files);
app.route('/api/memory', memory);
app.route('/api/text', text);
app.route('/api/web', web);
app.route('/api/spotify', media);

export { app }; 