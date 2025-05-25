/**
 * Redis caching service for frequently accessed data.
 * Provides caching functionality with TTL management, namespacing, and common patterns.
 * Supports object serialization, cache invalidation, and distributed caching across instances.
 * @module cache.service
 */

import { Redis } from 'ioredis';
import { logger } from './logger.service';

/** Component logger for cache service operations */
const cacheLogger = logger.child('CACHE_SERVICE');

/**
 * Initialize Redis client with connection handling and error recovery
 * @constant {Redis}
 */
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

// Add event handlers after initialization
redis.on('connect', () => cacheLogger.info('Redis connected successfully'));
redis.on('ready', () => cacheLogger.info('Redis ready for operations'));
redis.on('error', (error: Error) => cacheLogger.error('Redis connection error', error));
redis.on('close', () => cacheLogger.warn('Redis connection closed'));

/**
 * Interface for cache configuration options
 * @interface CacheOptions
 */
interface CacheOptions {
  /** Time-to-live in seconds (default: 3600 = 1 hour) */
  ttl?: number;
  /** Namespace for cache keys (default: 'app') */
  namespace?: string;
  /** Whether to compress data for storage (default: false) */
  compress?: boolean;
}

/**
 * Interface for cache statistics
 * @interface CacheStats
 */
interface CacheStats {
  /** Number of cache hits */
  hits: number;
  /** Number of cache misses */
  misses: number;
  /** Cache hit rate as percentage */
  hitRate: number;
  /** Total cache operations */
  total: number;
}

/**
 * Default cache configuration
 * @constant {Required<CacheOptions>}
 */
const DEFAULT_OPTIONS: Required<CacheOptions> = {
  ttl: 3600, // 1 hour
  namespace: 'app',
  compress: false
};

/**
 * Cache statistics tracking
 * @private
 */
let stats = {
  hits: 0,
  misses: 0
};

/**
 * Cache service providing Redis-based caching functionality
 * @namespace cacheService
 */
export const cacheService = {
  /**
   * Generates a namespaced cache key
   * @param {string} key - The base cache key
   * @param {string} [namespace='app'] - The namespace for the key
   * @returns {string} Fully qualified cache key
   * @private
   */
  _generateKey(key: string, namespace: string = DEFAULT_OPTIONS.namespace): string {
    return `${namespace}:${key}`;
  },

  /**
   * Serializes data for cache storage
   * @param {any} data - Data to serialize
   * @param {boolean} [compress=false] - Whether to compress the data
   * @returns {string} Serialized data string
   * @private
   */
  _serialize(data: any, compress: boolean = false): string {
    try {
      const serialized = JSON.stringify(data);
      // TODO: Implement compression if needed
      return serialized;
    } catch (error) {
      cacheLogger.error('Failed to serialize cache data', error as Error);
      throw new Error('Cache serialization failed');
    }
  },

  /**
   * Deserializes data from cache storage
   * @param {string} data - Serialized data string
   * @param {boolean} [compress=false] - Whether data was compressed
   * @returns {any} Deserialized data
   * @private
   */
  _deserialize(data: string, compress: boolean = false): any {
    try {
      // TODO: Implement decompression if needed
      return JSON.parse(data);
    } catch (error) {
      cacheLogger.error('Failed to deserialize cache data', error as Error);
      throw new Error('Cache deserialization failed');
    }
  },

  /**
   * Stores data in the cache with optional TTL
   * @param {string} key - Cache key
   * @param {any} value - Data to cache
   * @param {CacheOptions} [options] - Cache configuration options
   * @returns {Promise<boolean>} True if successful, false otherwise
   */
  async set(key: string, value: any, options: CacheOptions = {}): Promise<boolean> {
    try {
      const config = { ...DEFAULT_OPTIONS, ...options };
      const cacheKey = this._generateKey(key, config.namespace);
      const serializedValue = this._serialize(value, config.compress);

      const result = await redis.setex(cacheKey, config.ttl, serializedValue);
      
      cacheLogger.debug('Cache set operation', {
        key: cacheKey,
        ttl: config.ttl,
        success: result === 'OK'
      });

      return result === 'OK';
    } catch (error) {
      cacheLogger.error('Cache set failed', error as Error, { key });
      return false;
    }
  },

  /**
   * Retrieves data from the cache
   * @param {string} key - Cache key
   * @param {Pick<CacheOptions, 'namespace' | 'compress'>} [options] - Cache configuration options
   * @returns {Promise<any|null>} Cached data or null if not found/expired
   */
  async get(key: string, options: Pick<CacheOptions, 'namespace' | 'compress'> = {}): Promise<any | null> {
    try {
      const config = { ...DEFAULT_OPTIONS, ...options };
      const cacheKey = this._generateKey(key, config.namespace);

      const cachedData = await redis.get(cacheKey);
      
      if (cachedData === null) {
        stats.misses++;
        cacheLogger.debug('Cache miss', { key: cacheKey });
        return null;
      }

      stats.hits++;
      const deserializedData = this._deserialize(cachedData, config.compress);
      
      cacheLogger.debug('Cache hit', { key: cacheKey });
      return deserializedData;
    } catch (error) {
      stats.misses++;
      cacheLogger.error('Cache get failed', error as Error, { key });
      return null;
    }
  },

  /**
   * Deletes a specific cache entry
   * @param {string} key - Cache key to delete
   * @param {Pick<CacheOptions, 'namespace'>} [options] - Cache configuration options
   * @returns {Promise<boolean>} True if key was deleted, false otherwise
   */
  async delete(key: string, options: Pick<CacheOptions, 'namespace'> = {}): Promise<boolean> {
    try {
      const config = { ...DEFAULT_OPTIONS, ...options };
      const cacheKey = this._generateKey(key, config.namespace);

      const result = await redis.del(cacheKey);
      
      cacheLogger.debug('Cache delete operation', {
        key: cacheKey,
        deleted: result > 0
      });

      return result > 0;
    } catch (error) {
      cacheLogger.error('Cache delete failed', error as Error, { key });
      return false;
    }
  },

  /**
   * Deletes all cache entries matching a pattern
   * @param {string} pattern - Redis pattern to match (use * for wildcards)
   * @param {Pick<CacheOptions, 'namespace'>} [options] - Cache configuration options
   * @returns {Promise<number>} Number of keys deleted
   */
  async deletePattern(pattern: string, options: Pick<CacheOptions, 'namespace'> = {}): Promise<number> {
    try {
      const config = { ...DEFAULT_OPTIONS, ...options };
      const searchPattern = this._generateKey(pattern, config.namespace);

      const keys = await redis.keys(searchPattern);
      
      if (keys.length === 0) {
        return 0;
      }

      const result = await redis.del(...keys);
      
      cacheLogger.debug('Cache pattern delete operation', {
        pattern: searchPattern,
        keysFound: keys.length,
        deleted: result
      });

      return result;
    } catch (error) {
      cacheLogger.error('Cache pattern delete failed', error as Error, { pattern });
      return 0;
    }
  },

  /**
   * Checks if a cache key exists
   * @param {string} key - Cache key to check
   * @param {Pick<CacheOptions, 'namespace'>} [options] - Cache configuration options
   * @returns {Promise<boolean>} True if key exists, false otherwise
   */
  async exists(key: string, options: Pick<CacheOptions, 'namespace'> = {}): Promise<boolean> {
    try {
      const config = { ...DEFAULT_OPTIONS, ...options };
      const cacheKey = this._generateKey(key, config.namespace);

      const result = await redis.exists(cacheKey);
      return result === 1;
    } catch (error) {
      cacheLogger.error('Cache exists check failed', error as Error, { key });
      return false;
    }
  },

  /**
   * Gets the remaining TTL for a cache key
   * @param {string} key - Cache key to check
   * @param {Pick<CacheOptions, 'namespace'>} [options] - Cache configuration options
   * @returns {Promise<number>} TTL in seconds, -1 if no expiry, -2 if key doesn't exist
   */
  async ttl(key: string, options: Pick<CacheOptions, 'namespace'> = {}): Promise<number> {
    try {
      const config = { ...DEFAULT_OPTIONS, ...options };
      const cacheKey = this._generateKey(key, config.namespace);

      return await redis.ttl(cacheKey);
    } catch (error) {
      cacheLogger.error('Cache TTL check failed', error as Error, { key });
      return -2;
    }
  },

  /**
   * Invalidates all cache entries in a namespace
   * @param {string} [namespace='app'] - Namespace to clear
   * @returns {Promise<number>} Number of keys deleted
   */
  async invalidateNamespace(namespace: string = DEFAULT_OPTIONS.namespace): Promise<number> {
    return this.deletePattern('*', { namespace });
  },

  /**
   * Gets cache statistics
   * @returns {CacheStats} Current cache statistics
   */
  getStats(): CacheStats {
    const total = stats.hits + stats.misses;
    const hitRate = total > 0 ? (stats.hits / total) * 100 : 0;

    return {
      hits: stats.hits,
      misses: stats.misses,
      hitRate: Math.round(hitRate * 100) / 100,
      total
    };
  },

  /**
   * Resets cache statistics
   * @returns {void}
   */
  resetStats(): void {
    stats = { hits: 0, misses: 0 };
  },

  /**
   * Cache-aside pattern: get from cache or execute function and cache result
   * @param {string} key - Cache key
   * @param {Function} fn - Function to execute if cache miss
   * @param {CacheOptions} [options] - Cache configuration options
   * @returns {Promise<any>} Cached or freshly computed data
   */
  async getOrSet<T>(key: string, fn: () => Promise<T>, options: CacheOptions = {}): Promise<T> {
    // Try to get from cache first
    let cached = await this.get(key, options);
    
    if (cached !== null) {
      return cached;
    }

    // Cache miss - execute function
    try {
      const result = await fn();
      
      // Cache the result (don't wait for completion)
      this.set(key, result, options).catch(error => 
        cacheLogger.error('Background cache set failed', error, { key })
      );
      
      return result;
    } catch (error) {
      cacheLogger.error('Function execution failed in getOrSet', error as Error, { key });
      throw error;
    }
  },

  /**
   * Gracefully closes the Redis connection
   * @returns {Promise<void>}
   */
  async close(): Promise<void> {
    try {
      await redis.quit();
      cacheLogger.info('Redis connection closed gracefully');
    } catch (error) {
      cacheLogger.error('Error closing Redis connection', error as Error);
    }
  }
}; 