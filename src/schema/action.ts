import {sql, relations} from 'drizzle-orm';
import {text, integer, sqliteTable, index} from 'drizzle-orm/sqlite-core';
import {tasks} from './task';
import {tools} from './tool';
import {actionDocuments} from './actionDocuments';

export const actions = sqliteTable('actions', {
  id: integer('id').primaryKey({autoIncrement: true}),
  uuid: text('uuid').notNull().unique(),
  task_uuid: text('task_uuid')
    .notNull()
    .references(() => tasks.uuid),
  tool_uuid: text('tool_uuid')
    .notNull()
    .references(() => tools.uuid),
  name: text('name').notNull(),
  type: text('type').notNull(), // sync / async
  payload: text('payload', {mode: 'json'}),
  result: text('result', {mode: 'json'}),
  sequence: integer('sequence'),
  status: text('status').default('pending'),
  created_at: text('created_at').default(sql`CURRENT_TIMESTAMP`),
  updated_at: text('updated_at').default(sql`CURRENT_TIMESTAMP`)
}, (table) => ({
  // Index for task-based queries (most common)
  taskIdx: index('actions_task_idx').on(table.task_uuid),
  // Index for tool-based queries
  toolIdx: index('actions_tool_idx').on(table.tool_uuid),
  // Index for status-based queries (filtering by action status)
  statusIdx: index('actions_status_idx').on(table.status),
  // Index for type-based queries (sync/async filtering)
  typeIdx: index('actions_type_idx').on(table.type),
  // Composite index for task + status queries
  taskStatusIdx: index('actions_task_status_idx').on(table.task_uuid, table.status),
  // Composite index for task + sequence (for ordered action execution)
  taskSequenceIdx: index('actions_task_sequence_idx').on(table.task_uuid, table.sequence),
  // Index for time-based queries
  createdAtIdx: index('actions_created_at_idx').on(table.created_at),
  // Composite index for task + created_at (for chronological action queries)
  taskCreatedIdx: index('actions_task_created_idx').on(table.task_uuid, table.created_at),
}));

export const actionsRelations = relations(actions, ({one, many}) => ({
  task: one(tasks, {
    fields: [actions.task_uuid],
    references: [tasks.uuid]
  }),
  tool: one(tools, {
    fields: [actions.tool_uuid],
    references: [tools.uuid]
  }),
  actionDocuments: many(actionDocuments)
}));

export type Action = typeof actions.$inferSelect;
export type NewAction = typeof actions.$inferInsert;
