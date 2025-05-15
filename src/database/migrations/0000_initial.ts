import { sql } from 'drizzle-orm';
import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  email: text('email').notNull().unique(),
  password: text('password').notNull(),
  name: text('name').notNull(),
  created_at: integer('created_at', { mode: 'timestamp' }).notNull(),
  updated_at: integer('updated_at', { mode: 'timestamp' }).notNull(),
});

export const conversations = sqliteTable('conversations', {
  id: text('id').primaryKey(),
  user_id: text('user_id').notNull().references(() => users.id),
  created_at: integer('created_at', { mode: 'timestamp' }).notNull(),
  updated_at: integer('updated_at', { mode: 'timestamp' }).notNull(),
});

export const messages = sqliteTable('messages', {
  id: text('id').primaryKey(),
  conversation_id: text('conversation_id').notNull().references(() => conversations.id),
  role: text('role', { enum: ['user', 'assistant', 'system'] }).notNull(),
  content: text('content').notNull(),
  created_at: integer('created_at', { mode: 'timestamp' }).notNull(),
});

export const tools = sqliteTable('tools', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description').notNull(),
  parameters: text('parameters').notNull(),
  created_at: integer('created_at', { mode: 'timestamp' }).notNull(),
  updated_at: integer('updated_at', { mode: 'timestamp' }).notNull(),
});

export const tool_executions = sqliteTable('tool_executions', {
  id: text('id').primaryKey(),
  tool_id: text('tool_id').notNull().references(() => tools.id),
  user_id: text('user_id').notNull().references(() => users.id),
  parameters: text('parameters').notNull(),
  status: text('status', { enum: ['pending', 'completed', 'failed'] }).notNull(),
  result: text('result'),
  error: text('error'),
  created_at: integer('created_at', { mode: 'timestamp' }).notNull(),
  updated_at: integer('updated_at', { mode: 'timestamp' }).notNull(),
});

export async function up(db: any) {
  await db.schema.createTable(users).execute();
  await db.schema.createTable(conversations).execute();
  await db.schema.createTable(messages).execute();
  await db.schema.createTable(tools).execute();
  await db.schema.createTable(tool_executions).execute();
}

export async function down(db: any) {
  await db.schema.dropTable(tool_executions).execute();
  await db.schema.dropTable(tools).execute();
  await db.schema.dropTable(messages).execute();
  await db.schema.dropTable(conversations).execute();
  await db.schema.dropTable(users).execute();
} 