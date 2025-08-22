import {sql, relations} from 'drizzle-orm';
import {text, integer, sqliteTable, index} from 'drizzle-orm/sqlite-core';
import {users} from './user';
import {messages} from './message';
import {conversationDocuments} from './conversationDocuments';
import {conversationMemories} from './conversationMemories';

export const conversations = sqliteTable('conversations', {
  id: integer('id').primaryKey({autoIncrement: true}),
  uuid: text('uuid').notNull().unique(),
  user_id: text('user_id').references(() => users.uuid),
  name: text('name'),
  status: text('status').default('active'),
  created_at: text('created_at').default(sql`CURRENT_TIMESTAMP`),
  updated_at: text('updated_at').default(sql`CURRENT_TIMESTAMP`)
}, (table) => ({
  // Index for user-based queries (most common)
  userIdx: index('conversations_user_idx').on(table.user_id),
  // Index for status-based queries
  statusIdx: index('conversations_status_idx').on(table.status),
  // Composite index for user + status queries
  userStatusIdx: index('conversations_user_status_idx').on(table.user_id, table.status),
  // Index for time-based queries
  createdAtIdx: index('conversations_created_at_idx').on(table.created_at),
  // Composite index for user + created_at (for chronological user queries)
  userCreatedIdx: index('conversations_user_created_idx').on(table.user_id, table.created_at),
}));

export const conversationsRelations = relations(conversations, ({one, many}) => ({
  user: one(users),
  messages: many(messages),
  conversationDocuments: many(conversationDocuments),
  conversationMemories: many(conversationMemories)
}));

export type Conversation = typeof conversations.$inferSelect;
export type NewConversation = typeof conversations.$inferInsert;
