/**
 * CORS middleware
 * Handles Cross-Origin Resource Sharing with secure defaults
 * @module cors
 */

import { Context, Next } from 'hono';

// Default CORS configuration
const DEFAULT_CORS_CONFIG = {
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
};

interface CorsConfig {
  origin?: string | string[] | ((origin: string) => boolean);
  methods?: string[];
  allowedHeaders?: string[];
  exposedHeaders?: string[];
  credentials?: boolean;
  maxAge?: number;
}

/**
 * CORS middleware factory
 * @param {CorsConfig} config - CORS configuration
 * @returns {Function} Hono middleware function
 */
export const cors = (config: CorsConfig = {}) => {
  const corsConfig = { ...DEFAULT_CORS_CONFIG, ...config };

  return async (c: Context, next: Next) => {
    const origin = c.req.header('Origin');
    const isProduction = (process.env.NODE_ENV || 'development') === 'production';

    // Handle preflight requests
    if (c.req.method === 'OPTIONS') {
      // Set CORS headers
      if (origin) {
        // If credentials are used, echo specific origin (not *)
        const allowWildcard = corsConfig.origin === '*';
        const allowCredentials = !!corsConfig.credentials;

        if (allowCredentials) {
          c.header('Access-Control-Allow-Origin', origin);
          c.header('Access-Control-Allow-Credentials', 'true');
        } else {
          c.header('Access-Control-Allow-Origin', allowWildcard ? '*' : origin);
        }
        c.header('Access-Control-Allow-Methods', corsConfig.methods.join(', '));
        c.header('Access-Control-Allow-Headers', corsConfig.allowedHeaders.join(', '));
        c.header('Access-Control-Expose-Headers', corsConfig.exposedHeaders.join(', '));
        c.header('Access-Control-Max-Age', corsConfig.maxAge.toString());
      }
      
      return c.text('', 204);
    }

    // Handle actual requests
    if (origin) {
      // Validate origin
      let allowOrigin = false;
      
      if (typeof corsConfig.origin === 'function') {
        allowOrigin = corsConfig.origin(origin);
      } else if (Array.isArray(corsConfig.origin)) {
        allowOrigin = corsConfig.origin.includes(origin);
      } else {
        if (corsConfig.origin === '*') {
          allowOrigin = true;
        } else if (typeof corsConfig.origin === 'string' && corsConfig.origin.includes(',')) {
          const list = corsConfig.origin.split(',').map((o) => o.trim()).filter(Boolean);
          allowOrigin = list.includes(origin);
        } else {
          allowOrigin = corsConfig.origin === origin;
        }
      }

      if (allowOrigin) {
        const allowWildcard = corsConfig.origin === '*';
        const allowCredentials = !!corsConfig.credentials;

        if (allowCredentials) {
          // With credentials, echo the specific origin (not *)
          c.header('Access-Control-Allow-Origin', origin);
          c.header('Access-Control-Allow-Credentials', 'true');
        } else {
          c.header('Access-Control-Allow-Origin', allowWildcard ? '*' : origin);
        }
        c.header('Access-Control-Expose-Headers', corsConfig.exposedHeaders.join(', '));
      }
    }

    // Add security headers
    c.header('X-Content-Type-Options', 'nosniff');
    c.header('X-Frame-Options', 'DENY');
    c.header('X-XSS-Protection', '1; mode=block');
    c.header('Referrer-Policy', 'strict-origin-when-cross-origin');
    if (isProduction) {
      c.header('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    }
    
    // Content Security Policy
    c.header('Content-Security-Policy', [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https:",
      "font-src 'self'",
      "connect-src 'self'",
      "frame-ancestors 'none'",
      "form-action 'self'",
      "base-uri 'self'",
      "object-src 'none'"
    ].join('; '));

    await next();
  };
}; 