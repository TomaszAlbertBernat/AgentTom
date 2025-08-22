import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { conversations } from './conversations';

export const messages = sqliteTable('messages', {
  id: text('id').primaryKey(),
  conversation_id: text('conversation_id').notNull().references(() => conversations.id),
  role: text('role', { enum: ['user', 'assistant', 'system'] }).notNull(),
  content: text('content').notNull(),
  created_at: integer('created_at', { mode: 'timestamp' }).notNull(),
}); 