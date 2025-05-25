import {sql, relations} from 'drizzle-orm';
import {text, integer, sqliteTable, index} from 'drizzle-orm/sqlite-core';
import {conversations} from './conversation';
import {actions} from './action';
import {taskDocuments} from './taskDocuments';

export const tasks = sqliteTable('tasks', {
  id: integer('id').primaryKey({autoIncrement: true}),
  uuid: text('uuid').notNull().unique(),
  conversation_uuid: text('conversation_uuid')
    .notNull()
    .references(() => conversations.uuid),
  name: text('name').notNull(),
  type: text('type').notNull(),
  status: text('status').notNull().default('pending'),
  description: text('description'),
  scheduled_for: text('scheduled_for'),
  completed_at: text('completed_at'),
  result: text('result'),
  created_at: text('created_at')
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
  updated_at: text('updated_at')
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`)
}, (table) => ({
  // Index for conversation-based queries (most common)
  conversationIdx: index('tasks_conversation_idx').on(table.conversation_uuid),
  // Index for status-based queries (filtering by task status)
  statusIdx: index('tasks_status_idx').on(table.status),
  // Index for type-based queries
  typeIdx: index('tasks_type_idx').on(table.type),
  // Composite index for conversation + status queries
  conversationStatusIdx: index('tasks_conversation_status_idx').on(table.conversation_uuid, table.status),
  // Index for scheduled tasks
  scheduledForIdx: index('tasks_scheduled_for_idx').on(table.scheduled_for),
  // Index for time-based queries
  createdAtIdx: index('tasks_created_at_idx').on(table.created_at),
  // Index for completed tasks
  completedAtIdx: index('tasks_completed_at_idx').on(table.completed_at),
  // Composite index for conversation + created_at (for chronological task queries)
  conversationCreatedIdx: index('tasks_conversation_created_idx').on(table.conversation_uuid, table.created_at),
}));

export const tasksRelations = relations(tasks, ({one, many}) => ({
  conversation: one(conversations, {
    fields: [tasks.conversation_uuid],
    references: [conversations.uuid]
  }),
  actions: many(actions),
  taskDocuments: many(taskDocuments)
}));

export type Task = typeof tasks.$inferSelect;
export type NewTask = typeof tasks.$inferInsert;
