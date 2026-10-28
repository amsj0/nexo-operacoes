CREATE TABLE `audit` (
	`id` text PRIMARY KEY NOT NULL,
	`operation_id` text,
	`action` text NOT NULL,
	`detail` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `connector_nonces` (
	`id` text PRIMARY KEY NOT NULL,
	`session_id` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `connector_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`key_jwk` text NOT NULL,
	`token_hash` text NOT NULL,
	`expires_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `items` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`subtitle` text NOT NULL,
	`category` text NOT NULL,
	`type` text NOT NULL,
	`code` text NOT NULL,
	`total` integer NOT NULL,
	`color` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `items_code_unique` ON `items` (`code`);--> statement-breakpoint
CREATE TABLE `operations` (
	`id` text PRIMARY KEY NOT NULL,
	`item_id` text NOT NULL,
	`person_id` text NOT NULL,
	`status` text NOT NULL,
	`created_at` integer NOT NULL,
	`due_at` integer,
	`loaned_at` integer,
	`returned_at` integer,
	`renewals` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`item_id`) REFERENCES `items`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`person_id`) REFERENCES `people`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `people` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`department` text NOT NULL,
	`active` integer DEFAULT 1 NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `people_email_unique` ON `people` (`email`);--> statement-breakpoint
CREATE TABLE `settings` (
	`id` text PRIMARY KEY NOT NULL,
	`institution` text NOT NULL,
	`loan_days` integer NOT NULL,
	`hold_days` integer NOT NULL,
	`max_loans` integer NOT NULL
);
