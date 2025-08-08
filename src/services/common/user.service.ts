/**
 * User management service for handling user data and authentication tokens.
 * Provides functionality for user lookup, token management, and OAuth integration.
 * Supports Spotify and Google token management for external service integration.
 * @module user.service
 */

import { db } from '../../database';
import {users} from '../../schema/user';
import {eq, inArray} from 'drizzle-orm';
import type {User} from '../../schema/user';
import { logger } from './logger.service';
import { cacheService } from './cache.service';
import { measureQueryTime } from '../../database/query-utils';

/** Component logger for user service operations */
const userLogger = logger.child('USER_SERVICE');

/** Cache keys for user-related data */
const CACHE_KEYS = {
  USER_BY_TOKEN: (token: string) => `user:token:${token}`,
  USER_BY_UUID: (uuid: string) => `user:uuid:${uuid}`,
};

/** Cache TTL settings */
const CACHE_TTL = {
  USER_TOKEN: 1800,  // 30 minutes
  USER_UUID: 3600,   // 1 hour
};

/** User columns for auth (excluding unnecessary fields) */
const AUTH_USER_COLUMNS = {
  id: users.id,
  uuid: users.uuid,
  name: users.name,
  email: users.email,
  token: users.token,
  active: users.active,
  createdAt: users.createdAt,
  updatedAt: users.updatedAt,
  context: users.context,
  environment: users.environment,
  googleAccessToken: users.googleAccessToken,
  googleRefreshToken: users.googleRefreshToken,
  googleTokenExpiry: users.googleTokenExpiry,
  spotifyAccessToken: users.spotifyAccessToken,
  spotifyRefreshToken: users.spotifyRefreshToken,
  spotifyTokenExpiry: users.spotifyTokenExpiry,
};

/**
 * Finds a user by their authentication token with caching
 * @param {string} token - Authentication token to search for
 * @returns {Promise<User|undefined>} User object if found, undefined otherwise
 * @throws {Error} When database query fails
 */
export const findByToken = async (token: string): Promise<User | undefined> => {
  userLogger.debug('Finding user by token', { hasToken: !!token });
  
  if (!token) {
    userLogger.debug('No token provided');
    return undefined;
  }

  try {
    // Use cache-aside pattern for user token lookups
    const cacheKey = CACHE_KEYS.USER_BY_TOKEN(token);
    
    const user = await cacheService.getOrSet(
      cacheKey,
      async () => {
        userLogger.debug('Cache miss - querying database for user token');
        
        return await measureQueryTime('user-by-token', async () => {
          const [user] = await db
            .select(AUTH_USER_COLUMNS)
            .from(users)
            .where(eq(users.token, token))
            .limit(1);

          return user || null;
        });
      },
      {
        ttl: CACHE_TTL.USER_TOKEN,
        namespace: 'auth'
      }
    );

    userLogger.debug('User token lookup result', { 
      userFound: !!user, 
      userId: user?.uuid,
      userName: user?.name,
      fromCache: await cacheService.exists(cacheKey, { namespace: 'auth' })
    });
    
    return user || undefined;
  } catch (error) {
    userLogger.error('Error finding user by token', error as Error);
    throw error;
  }
};

/**
 * Finds a user by their UUID with caching
 * @param {string} uuid - User UUID to search for
 * @returns {Promise<User|undefined>} User object if found, undefined otherwise
 */
export const findByUUID = async (uuid: string): Promise<User | undefined> => {
  try {
    // Use cache-aside pattern for user UUID lookups
    const cacheKey = CACHE_KEYS.USER_BY_UUID(uuid);
    
    const user = await cacheService.getOrSet(
      cacheKey,
      async () => {
        userLogger.debug('Cache miss - querying database for user UUID');
        
        return await measureQueryTime('user-by-uuid', async () => {
          const [user] = await db
            .select()
            .from(users)
            .where(eq(users.uuid, uuid))
            .limit(1);

          return user || null;
        });
      },
      {
        ttl: CACHE_TTL.USER_UUID,
        namespace: 'auth'
      }
    );

    return user || undefined;
  } catch (error) {
    userLogger.error('Error finding user by UUID', error as Error);
    throw error;
  }
};

/**
 * Preloads user data into cache for frequent lookups
 * @param {string[]} uuids - Array of user UUIDs to preload
 * @returns {Promise<number>} Number of users preloaded
 */
export const preloadUserCache = async (uuids: string[]): Promise<number> => {
  if (!uuids.length) return 0;
  
  try {
    return await measureQueryTime('users-preload-cache', async () => {
      // Query all users in a single database call
      const userResults = await db
        .select()
        .from(users)
        .where(
          uuids.length === 1 
            ? eq(users.uuid, uuids[0]) 
            : inArray(users.uuid, uuids)
        );
      
      // Populate cache
      let cacheCount = 0;
      const cachePromises = userResults.map(async (user: User) => {
        if (user.uuid) {
          await cacheService.set(
            CACHE_KEYS.USER_BY_UUID(user.uuid),
            user,
            { ttl: CACHE_TTL.USER_UUID, namespace: 'auth' }
          );
          cacheCount++;
        }
        
        if (user.token) {
          await cacheService.set(
            CACHE_KEYS.USER_BY_TOKEN(user.token),
            user,
            { ttl: CACHE_TTL.USER_TOKEN, namespace: 'auth' }
          );
        }
      });
      
      await Promise.all(cachePromises);
      userLogger.debug(`Preloaded ${cacheCount} users into cache`);
      return cacheCount;
    });
  } catch (error) {
    userLogger.error('Error preloading user cache', error as Error);
    return 0;
  }
};

/**
 * Updates Spotify OAuth tokens for a user and invalidates cache
 * @param {string} user_uuid - UUID of the user to update
 * @param {string} access_token - Spotify access token
 * @param {string} refresh_token - Spotify refresh token
 * @param {number} expires_in - Token expiration time in seconds
 * @returns {Promise<void>}
 */
export const updateSpotifyTokens = async (
  user_uuid: string, 
  access_token: string, 
  refresh_token: string,
  expires_in: number
) => {
  const expiry = new Date(Date.now() + expires_in * 1000);
  
  await measureQueryTime('update-spotify-tokens', async () => {
    await db
      .update(users)
      .set({
        spotifyAccessToken: access_token,
        spotifyRefreshToken: refresh_token,
        spotifyTokenExpiry: expiry,
        updatedAt: new Date()
      })
      .where(eq(users.uuid, user_uuid));
  });

  // Invalidate user cache entries
  await cacheService.delete(CACHE_KEYS.USER_BY_UUID(user_uuid), { namespace: 'auth' });
  userLogger.debug('Invalidated user cache after Spotify token update', { user_uuid });
};

/**
 * Retrieves Spotify OAuth tokens for a user
 * @param {string} user_uuid - UUID of the user
 * @returns {Promise<{access_token?: string, refresh_token?: string, expires_at?: Date}|undefined>} Spotify tokens or undefined if user not found
 */
export const getSpotifyTokens = async (user_uuid: string): Promise<{ 
  access_token?: string; 
  refresh_token?: string;
  expires_at?: Date;
} | undefined> => {
  return await measureQueryTime('get-spotify-tokens', async () => {
    const [user] = await db
      .select({
        access_token: users.spotifyAccessToken,
        refresh_token: users.spotifyRefreshToken,
        expires_at: users.spotifyTokenExpiry
      })
      .from(users)
      .where(eq(users.uuid, user_uuid))
      .limit(1);

    if (!user) return undefined;

    return {
      access_token: user.access_token ?? undefined,
      refresh_token: user.refresh_token ?? undefined,
      expires_at: user.expires_at ?? undefined
    };
  });
};

/**
 * Updates Google OAuth tokens for a user and invalidates cache
 * @param {string} user_uuid - UUID of the user to update
 * @param {string} access_token - Google access token
 * @param {string} refresh_token - Google refresh token
 * @param {number} expires_in - Token expiration time in seconds
 * @returns {Promise<void>}
 */
export const updateGoogleTokens = async (
  user_uuid: string, 
  access_token: string, 
  refresh_token: string,
  expires_in: number
) => {
  const expiry = new Date(Date.now() + expires_in * 1000);
  
  await measureQueryTime('update-google-tokens', async () => {
    await db
      .update(users)
      .set({
        googleAccessToken: access_token,
        googleRefreshToken: refresh_token,
        googleTokenExpiry: expiry,
        updatedAt: new Date()
      })
      .where(eq(users.uuid, user_uuid));
  });

  // Invalidate user cache entries
  await cacheService.delete(CACHE_KEYS.USER_BY_UUID(user_uuid), { namespace: 'auth' });
  userLogger.debug('Invalidated user cache after Google token update', { user_uuid });
};

/**
 * Retrieves Google OAuth tokens for a user
 * @param {string} user_uuid - UUID of the user
 * @returns {Promise<{access_token?: string, refresh_token?: string, expires_at?: Date}|undefined>} Google tokens or undefined if user not found
 */
export const getGoogleTokens = async (user_uuid: string): Promise<{ 
  access_token?: string; 
  refresh_token?: string;
  expires_at?: Date;
} | undefined> => {
  return await measureQueryTime('get-google-tokens', async () => {
    const [user] = await db
      .select({
        access_token: users.googleAccessToken,
        refresh_token: users.googleRefreshToken,
        expires_at: users.googleTokenExpiry
      })
      .from(users)
      .where(eq(users.uuid, user_uuid))
      .limit(1);

    if (!user) return undefined;

    return {
      access_token: user.access_token ?? undefined,
      refresh_token: user.refresh_token ?? undefined,
      expires_at: user.expires_at ?? undefined
    };
  });
};

// Add other user-related functions as needed
