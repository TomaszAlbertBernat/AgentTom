import { sql, relations } from "drizzle-orm";
import { text, integer, sqliteTable, index } from "drizzle-orm/sqlite-core";
import { tasks } from './task';

export const jobs = sqliteTable('jobs', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  uuid: text('uuid').notNull().unique(),
  task_uuid: text('task_uuid')
    .notNull()
    .references(() => tasks.uuid),
  name: text('name').notNull(),
  type: text('type').notNull(), // 'cron' | 'scheduled' | 'recurring'
  schedule: text('schedule').notNull(), // cron expression or ISO date
  status: text('status')
    .notNull()
    .default('pending'), // 'pending' | 'running' | 'completed' | 'failed' | 'cancelled'
  last_run: text('last_run'),
  next_run: text('next_run'),
  result: text('result', { mode: 'json' }),
  metadata: text('metadata', { mode: 'json' }),
  created_at: text('created_at').default(sql`CURRENT_TIMESTAMP`),
  updated_at: text('updated_at').default(sql`CURRENT_TIMESTAMP`)
}, (table) => ({
  // Index for status-based queries (most common for job scheduling)
  statusIdx: index('jobs_status_idx').on(table.status),
  // Index for next_run queries (critical for cron job processing)
  nextRunIdx: index('jobs_next_run_idx').on(table.next_run),
  // Index for type-based queries
  typeIdx: index('jobs_type_idx').on(table.type),
  // Index for task-based queries
  taskIdx: index('jobs_task_idx').on(table.task_uuid),
  // Composite index for status + next_run (for efficient job scheduling)
  statusNextRunIdx: index('jobs_status_next_run_idx').on(table.status, table.next_run),
  // Index for last_run queries (for job history)
  lastRunIdx: index('jobs_last_run_idx').on(table.last_run),
  // Index for time-based queries
  createdAtIdx: index('jobs_created_at_idx').on(table.created_at),
  // Composite index for type + status (for filtering job types by status)
  typeStatusIdx: index('jobs_type_status_idx').on(table.type, table.status),
}));

export const jobsRelations = relations(jobs, ({ one }) => ({
  task: one(tasks, {
    fields: [jobs.task_uuid],
    references: [tasks.uuid]
  })
}));

export type Job = typeof jobs.$inferSelect;
export type NewJob = typeof jobs.$inferInsert;

/**
 * Example metadata structure:
 * {
 *   retry_count: number,
 *   max_retries: number,
 *   timeout: number,
 *   priority: number,
 *   dependencies: string[], // task_uuids
 *   notifications: {
 *     on_success: boolean,
 *     on_failure: boolean,
 *     channels: string[]
 *   },
 * }
 */
