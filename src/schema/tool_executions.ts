import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { tools } from './tools';
import { users } from './users';

export const tool_executions = sqliteTable('tool_executions', {
  id: text('id').primaryKey(),
  tool_id: text('tool_id').notNull().references(() => tools.id),
  user_id: text('user_id').notNull().references(() => users.id),
  parameters: text('parameters').notNull(), // JSON string of parameters
  status: text('status', { enum: ['pending', 'completed', 'failed'] }).notNull(),
  result: text('result'), // JSON string of result
  error: text('error'),
  created_at: integer('created_at', { mode: 'timestamp' }).notNull(),
  updated_at: integer('updated_at', { mode: 'timestamp' }).notNull(),
}); 