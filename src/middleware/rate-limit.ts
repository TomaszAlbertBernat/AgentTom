/**
 * Rate limiting middleware
 * Implements distributed rate limiting using Redis
 * @module rate-limit
 */

import { Context, Next } from 'hono';
import { HTTPException } from 'hono/http-exception';
let RedisCtor: any = null;
try {
  // Dynamically require to avoid hard dependency in dev
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  RedisCtor = require('ioredis').Redis;
} catch (_) {
  RedisCtor = null;
}
import { logger } from '../services/common/logger.service';

// Initialize Redis client if available and configured
const hasRedisUrl = typeof process.env.REDIS_URL === 'string' && process.env.REDIS_URL.length > 0;
const redis = RedisCtor && hasRedisUrl ? new RedisCtor(process.env.REDIS_URL) : null;

interface RateLimitOptions {
  max: number;        // maximum requests
  window: number;     // time window in seconds
  message?: string;   // custom error message
  keyPrefix?: string; // prefix for Redis keys
}

interface RateLimitInfo {
  count: number;
  reset: number;
}

/**
 * Rate limiting middleware factory
 * @param {RateLimitOptions} options - Rate limiting configuration
 * @returns {Function} Hono middleware function
 */
export const rateLimit = (options: RateLimitOptions) => {
  const {
    max,
    window: windowSeconds,
    message = 'Too many requests',
    keyPrefix = 'rate_limit:'
  } = options;

  return async (c: Context, next: Next) => {
    try {
      // If Redis is not configured, pass-through without rate limiting (dev-friendly)
      if (!redis) {
        return next();
      }
      // Get client identifier (IP or user ID)
      const ip = c.req.header('x-forwarded-for') || 'unknown';
      const userId = c.get('request')?.user?.id;
      const identifier = userId || ip;
      
      // Create Redis key
      const key = `${keyPrefix}${identifier}`;
      const now = Date.now();
      const resetTime = now + (windowSeconds * 1000);
      
      // Get current rate limit info from Redis
      const info = await redis.get(key);
      let rateLimitInfo: RateLimitInfo;
      
      if (!info) {
        // First request in the window
        rateLimitInfo = { count: 1, reset: resetTime };
        await redis.set(key, JSON.stringify(rateLimitInfo), 'PX', windowSeconds * 1000);
      } else {
        // Parse existing rate limit info
        rateLimitInfo = JSON.parse(info);
        
        if (now > rateLimitInfo.reset) {
          // Window has expired, reset counter
          rateLimitInfo = { count: 1, reset: resetTime };
          await redis.set(key, JSON.stringify(rateLimitInfo), 'PX', windowSeconds * 1000);
        } else if (rateLimitInfo.count >= max) {
          // Rate limit exceeded
          c.header('X-RateLimit-Limit', max.toString());
          c.header('X-RateLimit-Remaining', '0');
          c.header('X-RateLimit-Reset', Math.ceil(rateLimitInfo.reset / 1000).toString());
          
          throw new HTTPException(429, { message });
        } else {
          // Increment counter
          rateLimitInfo.count++;
          await redis.set(key, JSON.stringify(rateLimitInfo), 'PX', windowSeconds * 1000);
        }
      }
      
      // Set rate limit headers
      c.header('X-RateLimit-Limit', max.toString());
      c.header('X-RateLimit-Remaining', (max - rateLimitInfo.count).toString());
      c.header('X-RateLimit-Reset', Math.ceil(rateLimitInfo.reset / 1000).toString());
      
      await next();
    } catch (error) {
      if (error instanceof HTTPException) {
        throw error;
      }
      
      // Log Redis errors but allow the request to proceed
      logger.error('Rate limit error:', error instanceof Error ? error : new Error(String(error)));
      await next();
    }
  };
}; 