import { relations, sql } from "drizzle-orm";
import { text, integer, sqliteTable, index } from "drizzle-orm/sqlite-core";
import { documents } from './document';
import { categories } from './category';
import { conversationMemories } from './conversationMemories';
import { vectorService } from '../services/common/vector.service';
import { embedding } from "../services/common/llm.service";
import { v4 as uuidv4 } from 'uuid';

export const memories = sqliteTable('memories', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  uuid: text('uuid', { length: 36 }).notNull().unique(),
  name: text('name').notNull(),
  category_uuid: text('category_uuid').notNull().references(() => categories.uuid),
  document_uuid: text('document_uuid').notNull().references(() => documents.uuid),
  created_at: text('created_at').default(sql`CURRENT_TIMESTAMP`),
  updated_at: text('updated_at').default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  // Index for category-based queries (most common memory search pattern)
  categoryIdx: index('memories_category_idx').on(table.category_uuid),
  // Index for document-based queries
  documentIdx: index('memories_document_idx').on(table.document_uuid),
  // Index for name-based searches
  nameIdx: index('memories_name_idx').on(table.name),
  // Index for time-based queries
  createdAtIdx: index('memories_created_at_idx').on(table.created_at),
  // Composite index for category + created_at (for recent memories by category)
  categoryCreatedIdx: index('memories_category_created_idx').on(table.category_uuid, table.created_at),
}));

export const memoriesRelations = relations(memories, ({ one, many }) => ({
  document: one(documents, {
    fields: [memories.document_uuid],
    references: [documents.uuid],
  }),
  category: one(categories, {
    fields: [memories.category_uuid],
    references: [categories.uuid],
  }),
  conversationMemories: many(conversationMemories)
}));

export type Memory = typeof memories.$inferSelect;
export type NewMemory = typeof memories.$inferInsert;
