import { drizzle } from 'drizzle-orm/libsql';
import { createClient } from '@libsql/client';
import * as schema from '../schema/users';
import * as conversationsSchema from '../schema/conversation';
import * as messagesSchema from '../schema/message';
import * as toolsSchema from '../schema/tool';
import * as toolExecutionsSchema from '../schema/tool_executions';
import { drizzle as drizzleSqlite } from 'drizzle-orm/bun-sqlite';
import { Database } from 'bun:sqlite';

// Initialize libSQL client
const client = createClient({
  url: 'file:agi.db',
});

// Create Drizzle instance with all schemas
export const db = drizzle(client, {
  schema: {
    ...schema,
    ...conversationsSchema,
    ...messagesSchema,
    ...toolsSchema,
    ...toolExecutionsSchema,
  },
});

// SQLite setup for migrations
const sqliteDb = new Database('./agi.db');
export const sqlite = drizzleSqlite(sqliteDb, {
  schema: {
    ...schema,
    ...conversationsSchema,
    ...messagesSchema,
    ...toolsSchema,
    ...toolExecutionsSchema,
  },
});

// Export for use in migrations
export { client }; 