import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { prettyJSON } from 'hono/pretty-json';
import { secureHeaders } from 'hono/secure-headers';
import { rateLimit } from './middleware/rate-limit';
import { HTTPException } from 'hono/http-exception';

// Import routes
import { authRoutes } from './routes/auth';
import { agiRoutes } from './routes/agi';
import { toolRoutes } from './routes/tools';

// Create Hono app
const app = new Hono();

// Global middleware
app.use('*', logger());
app.use('*', prettyJSON());
app.use('*', secureHeaders());
app.use('*', cors({
  origin: process.env.CORS_ORIGIN || '*',
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
  exposeHeaders: ['Content-Length', 'X-Request-Id'],
  maxAge: 86400,
  credentials: true,
}));

// Rate limiting
app.use('*', rateLimit({
  window: 15 * 60, // 15 minutes in seconds
  max: 100, // limit each IP to 100 requests per window
  message: 'Too many requests from this IP, please try again later',
}));

// Error handling
app.onError((err, c) => {
  if (err instanceof HTTPException) {
    return c.json({
      error: err.message,
      status: err.status,
    }, err.status);
  }

  console.error('Unhandled error:', err);
  return c.json({
    error: 'Internal Server Error',
    status: 500,
  }, 500);
});

// Health check
app.get('/health', (c) => c.json({ status: 'ok' }));

// Register routes
app.route('/auth', authRoutes);
app.route('/agi', agiRoutes);
app.route('/tools', toolRoutes);

export { app }; 