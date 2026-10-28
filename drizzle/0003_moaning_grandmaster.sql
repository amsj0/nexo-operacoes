CREATE TABLE `partner_events` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant_id` text,
	`session_id` text,
	`operation` text NOT NULL,
	`status` integer NOT NULL,
	`reason` text NOT NULL,
	`steps` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `partner_items` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant_id` text NOT NULL,
	`title` text NOT NULL,
	`author` text NOT NULL,
	`total` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `partner_keys` (
	`id` text PRIMARY KEY NOT NULL,
	`jwk` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `partner_members` (
	`id` text PRIMARY KEY NOT NULL,
	`subject` text NOT NULL,
	`tenant_id` text NOT NULL,
	`name` text NOT NULL,
	`active` integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE INDEX `partner_member_scope` ON `partner_members` (`subject`,`tenant_id`);--> statement-breakpoint
CREATE TABLE `partner_requests` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant_id` text NOT NULL,
	`item_id` text NOT NULL,
	`subject` text NOT NULL,
	`status` text NOT NULL,
	`created_at` integer NOT NULL,
	`due_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `partner_request_stock` ON `partner_requests` (`tenant_id`,`item_id`,`status`,`due_at`);--> statement-breakpoint
CREATE TABLE `partner_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`subject` text NOT NULL,
	`actor_id` text NOT NULL,
	`mfa` integer NOT NULL,
	`created_at` integer NOT NULL,
	`expires_at` integer NOT NULL,
	`revoked` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `partner_tenants` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`enabled` integer DEFAULT 1 NOT NULL,
	`mfa_required` integer DEFAULT 1 NOT NULL
);
