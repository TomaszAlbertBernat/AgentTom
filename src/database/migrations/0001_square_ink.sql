CREATE TABLE `api_keys` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`name` text NOT NULL,
	`hash` text NOT NULL,
	`expires_at` text,
	`scopes` text DEFAULT '[]' NOT NULL,
	`max_requests_per_day` integer DEFAULT 1000 NOT NULL,
	`created_at` text NOT NULL,
	`last_used_at` text,
	`request_count` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `api_keys_hash_unique` ON `api_keys` (`hash`);--> statement-breakpoint
CREATE TABLE `tool_executions` (
	`id` text PRIMARY KEY NOT NULL,
	`tool_name` text NOT NULL,
	`tool_uuid` text,
	`user_uuid` text,
	`parameters` text NOT NULL,
	`status` text NOT NULL,
	`result` text,
	`error` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
ALTER TABLE `users` ADD `password` text;--> statement-breakpoint
CREATE INDEX `actions_task_idx` ON `actions` (`task_uuid`);--> statement-breakpoint
CREATE INDEX `actions_tool_idx` ON `actions` (`tool_uuid`);--> statement-breakpoint
CREATE INDEX `actions_status_idx` ON `actions` (`status`);--> statement-breakpoint
CREATE INDEX `actions_type_idx` ON `actions` (`type`);--> statement-breakpoint
CREATE INDEX `actions_task_status_idx` ON `actions` (`task_uuid`,`status`);--> statement-breakpoint
CREATE INDEX `actions_task_sequence_idx` ON `actions` (`task_uuid`,`sequence`);--> statement-breakpoint
CREATE INDEX `actions_created_at_idx` ON `actions` (`created_at`);--> statement-breakpoint
CREATE INDEX `actions_task_created_idx` ON `actions` (`task_uuid`,`created_at`);--> statement-breakpoint
CREATE INDEX `conversations_user_idx` ON `conversations` (`user_id`);--> statement-breakpoint
CREATE INDEX `conversations_status_idx` ON `conversations` (`status`);--> statement-breakpoint
CREATE INDEX `conversations_user_status_idx` ON `conversations` (`user_id`,`status`);--> statement-breakpoint
CREATE INDEX `conversations_created_at_idx` ON `conversations` (`created_at`);--> statement-breakpoint
CREATE INDEX `conversations_user_created_idx` ON `conversations` (`user_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `documents_conversation_idx` ON `documents` (`conversation_uuid`);--> statement-breakpoint
CREATE INDEX `documents_source_idx` ON `documents` (`source_uuid`);--> statement-breakpoint
CREATE INDEX `documents_conversation_created_idx` ON `documents` (`conversation_uuid`,`created_at`);--> statement-breakpoint
CREATE INDEX `documents_created_at_idx` ON `documents` (`created_at`);--> statement-breakpoint
CREATE INDEX `documents_updated_at_idx` ON `documents` (`updated_at`);--> statement-breakpoint
CREATE INDEX `jobs_status_idx` ON `jobs` (`status`);--> statement-breakpoint
CREATE INDEX `jobs_next_run_idx` ON `jobs` (`next_run`);--> statement-breakpoint
CREATE INDEX `jobs_type_idx` ON `jobs` (`type`);--> statement-breakpoint
CREATE INDEX `jobs_task_idx` ON `jobs` (`task_uuid`);--> statement-breakpoint
CREATE INDEX `jobs_status_next_run_idx` ON `jobs` (`status`,`next_run`);--> statement-breakpoint
CREATE INDEX `jobs_last_run_idx` ON `jobs` (`last_run`);--> statement-breakpoint
CREATE INDEX `jobs_created_at_idx` ON `jobs` (`created_at`);--> statement-breakpoint
CREATE INDEX `jobs_type_status_idx` ON `jobs` (`type`,`status`);--> statement-breakpoint
CREATE INDEX `memories_category_idx` ON `memories` (`category_uuid`);--> statement-breakpoint
CREATE INDEX `memories_document_idx` ON `memories` (`document_uuid`);--> statement-breakpoint
CREATE INDEX `memories_name_idx` ON `memories` (`name`);--> statement-breakpoint
CREATE INDEX `memories_created_at_idx` ON `memories` (`created_at`);--> statement-breakpoint
CREATE INDEX `memories_category_created_idx` ON `memories` (`category_uuid`,`created_at`);--> statement-breakpoint
CREATE INDEX `messages_conversation_idx` ON `messages` (`conversation_uuid`);--> statement-breakpoint
CREATE INDEX `messages_role_idx` ON `messages` (`role`);--> statement-breakpoint
CREATE INDEX `messages_conversation_role_idx` ON `messages` (`conversation_uuid`,`role`);--> statement-breakpoint
CREATE INDEX `messages_conversation_created_idx` ON `messages` (`conversation_uuid`,`created_at`);--> statement-breakpoint
CREATE INDEX `messages_created_at_idx` ON `messages` (`created_at`);--> statement-breakpoint
CREATE INDEX `messages_content_type_idx` ON `messages` (`content_type`);--> statement-breakpoint
CREATE INDEX `tasks_conversation_idx` ON `tasks` (`conversation_uuid`);--> statement-breakpoint
CREATE INDEX `tasks_status_idx` ON `tasks` (`status`);--> statement-breakpoint
CREATE INDEX `tasks_type_idx` ON `tasks` (`type`);--> statement-breakpoint
CREATE INDEX `tasks_conversation_status_idx` ON `tasks` (`conversation_uuid`,`status`);--> statement-breakpoint
CREATE INDEX `tasks_scheduled_for_idx` ON `tasks` (`scheduled_for`);--> statement-breakpoint
CREATE INDEX `tasks_created_at_idx` ON `tasks` (`created_at`);--> statement-breakpoint
CREATE INDEX `tasks_completed_at_idx` ON `tasks` (`completed_at`);--> statement-breakpoint
CREATE INDEX `tasks_conversation_created_idx` ON `tasks` (`conversation_uuid`,`created_at`);