/**
 * Input sanitization middleware
 * Protects against common web vulnerabilities like XSS and SQL injection
 * @module sanitize
 */

import { Context, Next } from 'hono';
import { logger } from '../services/common/logger.service';
import { HTTPException } from 'hono/http-exception';

// Maximum request size (10MB)
const MAX_REQUEST_SIZE = 10 * 1024 * 1024;

// SQL injection patterns
const SQL_INJECTION_PATTERNS = [
  /(\%27)|(\')|(\-\-)|(\%23)|(#)/i,
  /((\%3D)|(=))[^\n]*((\%27)|(\')|(\-\-)|(\%3B)|(;))/i,
  /\w*((\%27)|(\'))((\%6F)|o|(\%4F))((\%72)|r|(\%52))/i,
  /((\%27)|(\'))union/i,
  /exec(\s|\+)+(s|x)p\w+/i,
  /insert(\s|\+)+(into|table)/i,
  /select(\s|\+)+.*from/i,
  /update(\s|\+)+.*set/i,
  /delete(\s|\+)+from/i,
  /drop(\s|\+)+table/i,
  /truncate(\s|\+)+table/i,
  /alter(\s|\+)+table/i,
  /create(\s|\+)+table/i
];

// XSS patterns
const XSS_PATTERNS = [
  /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
  /javascript:/gi,
  /on\w+\s*=/gi,
  /data:/gi,
  /vbscript:/gi,
  /expression\s*\(/gi,
  /eval\s*\(/gi,
  /alert\s*\(/gi,
  /confirm\s*\(/gi,
  /prompt\s*\(/gi
];

/**
 * Sanitizes a string value
 * @param {string} value - The value to sanitize
 * @returns {string} Sanitized value
 */
const sanitizeString = (value: string): string => {
  // Remove SQL injection patterns
  let sanitized = value;
  SQL_INJECTION_PATTERNS.forEach(pattern => {
    sanitized = sanitized.replace(pattern, '');
  });

  // Remove XSS patterns
  XSS_PATTERNS.forEach(pattern => {
    sanitized = sanitized.replace(pattern, '');
  });

  // HTML encode special characters
  sanitized = sanitized
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');

  return sanitized;
};

/**
 * Recursively sanitizes an object
 * @param {unknown} obj - The object to sanitize
 * @returns {unknown} Sanitized object
 */
const sanitizeObject = (obj: unknown): unknown => {
  if (typeof obj !== 'object' || obj === null) {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(sanitizeObject);
  }

  const sanitized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      sanitized[key] = sanitizeString(value);
    } else {
      sanitized[key] = sanitizeObject(value);
    }
  }

  return sanitized;
};

/**
 * Input sanitization middleware
 * @returns {Function} Hono middleware function
 */
export const sanitize = () => {
  return async (c: Context, next: Next) => {
    try {
      // Check request size
      const contentLength = parseInt(c.req.header('Content-Length') || '0', 10);
      if (contentLength > MAX_REQUEST_SIZE) {
        throw new HTTPException(413, { message: 'Request entity too large' });
      }

      // Sanitize query parameters
      const query = c.req.query();
      if (Object.keys(query).length > 0) {
        c.set('query', sanitizeObject(query));
      }

      // Do not parse/sanitize JSON body here to avoid consuming the stream.
      // Body should be parsed by validation middleware or route handlers.

      // Sanitize URL parameters
      const params = c.req.param();
      if (Object.keys(params).length > 0) {
        c.set('params', sanitizeObject(params));
      }

      await next();
    } catch (error) {
      if (error instanceof HTTPException) {
        throw error;
      }

      logger.error('Sanitization error:', error instanceof Error ? error : new Error(String(error)));
      throw new HTTPException(400, { message: 'Invalid request' });
    }
  };
}; 