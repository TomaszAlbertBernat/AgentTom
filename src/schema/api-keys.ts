/**
 * API Keys schema
 * Defines the database schema for API keys
 * @module api-keys
 */

import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

/**
 * API Keys table schema
 * Stores API key information including hashes, scopes, and usage tracking
 */
export const apiKeys = sqliteTable('api_keys', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  name: text('name').notNull(),
  hash: text('hash').notNull().unique(),
  expiresAt: text('expires_at'),
  scopes: text('scopes', { mode: 'json' }).notNull().default('[]'),
  maxRequestsPerDay: integer('max_requests_per_day').notNull().default(1000),
  createdAt: text('created_at').notNull(),
  lastUsedAt: text('last_used_at'),
  requestCount: integer('request_count').notNull().default(0)
}); 