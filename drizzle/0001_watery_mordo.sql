CREATE INDEX `audit_created` ON `audit` (`created_at`);--> statement-breakpoint
CREATE INDEX `operations_item_status` ON `operations` (`item_id`,`status`,`due_at`);--> statement-breakpoint
CREATE INDEX `operations_person_status` ON `operations` (`person_id`,`status`);--> statement-breakpoint
CREATE INDEX `operations_created` ON `operations` (`created_at`);