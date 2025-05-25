import {sqliteTable, text, integer, index} from 'drizzle-orm/sqlite-core';
import {sql, relations} from 'drizzle-orm';
import {conversations} from './conversation';
import {messageDocuments} from './messageDocuments';

export const messages = sqliteTable('messages', {
  id: integer('id').primaryKey({autoIncrement: true}),
  uuid: text('uuid').notNull().unique(),
  conversation_uuid: text('conversation_uuid').references(() => conversations.uuid),
  role: text('role', {enum: ['system', 'user', 'assistant', 'tool']}).notNull(),
  content_type: text('content_type', {enum: ['text', 'multi_part']}).notNull(),
  content: text('content'),
  multipart: text('multipart', {mode: 'json'}),
  created_at: text('created_at').default(sql`CURRENT_TIMESTAMP`),
  updated_at: text('updated_at').default(sql`CURRENT_TIMESTAMP`)
}, (table) => ({
  // Index for conversation-based queries (most common)
  conversationIdx: index('messages_conversation_idx').on(table.conversation_uuid),
  // Index for role-based queries (filtering by message type)
  roleIdx: index('messages_role_idx').on(table.role),
  // Composite index for conversation + role queries
  conversationRoleIdx: index('messages_conversation_role_idx').on(table.conversation_uuid, table.role),
  // Composite index for conversation + created_at (for chronological message queries)
  conversationCreatedIdx: index('messages_conversation_created_idx').on(table.conversation_uuid, table.created_at),
  // Index for time-based queries
  createdAtIdx: index('messages_created_at_idx').on(table.created_at),
  // Index for content_type queries
  contentTypeIdx: index('messages_content_type_idx').on(table.content_type),
}));

export const messagesRelations = relations(messages, ({one, many}) => ({
  conversation: one(conversations, {
    fields: [messages.conversation_uuid],
    references: [conversations.uuid]
  }),
  documents: many(messageDocuments)
}));

export type Message = typeof messages.$inferSelect;
export type NewMessage = typeof messages.$inferInsert;

/**
 multipart 
 [
    {
      type: "text",
      text: "Here are the photos from the inspection. What issues can you identify?"
    },
    {
      type: "image",
      image: "https://example.com/inspection-1.jpg",
      mimeType: "image/jpeg"
    },
    {
      type: "image",
      image: "data:image/jpeg;base64,/9j/4AAQSkZJRg...",
      mimeType: "image/jpeg"
    },
    {
      type: "image",
      image: "https://example.com/inspection-3.jpg",
      mimeType: "image/jpeg"
    }
  ]
 */
