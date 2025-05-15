import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

export const tools = sqliteTable('tools', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description').notNull(),
  parameters: text('parameters').notNull(), // JSON string of parameter schema
  created_at: integer('created_at', { mode: 'timestamp' }).notNull(),
  updated_at: integer('updated_at', { mode: 'timestamp' }).notNull(),
}); 