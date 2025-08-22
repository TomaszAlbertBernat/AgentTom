import { sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

export const tool_executions = sqliteTable('tool_executions', {
  id: text('id').primaryKey(),
  tool_name: text('tool_name').notNull(),
  tool_uuid: text('tool_uuid'),
  user_uuid: text('user_uuid'),
  parameters: text('parameters').notNull(),
  status: text('status', { enum: ['pending', 'completed', 'failed'] }).notNull(),
  result: text('result'),
  error: text('error'),
  created_at: text('created_at').default(sql`CURRENT_TIMESTAMP`),
  updated_at: text('updated_at').default(sql`CURRENT_TIMESTAMP`),
});