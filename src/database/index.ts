import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import * as schema from '../schema/users';
import * as conversationsSchema from '../schema/conversations';
import * as messagesSchema from '../schema/messages';
import * as toolsSchema from '../schema/tools';
import * as toolExecutionsSchema from '../schema/tool_executions';

// Initialize SQLite database
const sqlite = new Database('agi.db');

// Create Drizzle instance with all schemas
export const db = drizzle(sqlite, {
  schema: {
    ...schema,
    ...conversationsSchema,
    ...messagesSchema,
    ...toolsSchema,
    ...toolExecutionsSchema,
  },
});

// Export for use in migrations
export { sqlite }; 