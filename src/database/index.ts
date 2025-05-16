import { drizzle } from 'drizzle-orm/libsql';
import { createClient } from '@libsql/client';
import * as schema from '../schema/users';
import * as conversationsSchema from '../schema/conversations';
import * as messagesSchema from '../schema/messages';
import * as toolsSchema from '../schema/tools';
import * as toolExecutionsSchema from '../schema/tool_executions';

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

// Export for use in migrations
export { client }; 