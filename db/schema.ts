import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';
export const items = sqliteTable('items', {
  id: text('id').primaryKey(), title: text('title').notNull(), subtitle: text('subtitle').notNull(),
  category: text('category').notNull(), type: text('type').notNull(), code: text('code').notNull().unique(),
  total: integer('total').notNull(), color: text('color').notNull(), createdAt: integer('created_at').notNull()
});
export const people = sqliteTable('people', {
  id: text('id').primaryKey(), name: text('name').notNull(), email: text('email').notNull().unique(),
  department: text('department').notNull(), active: integer('active').notNull().default(1), createdAt: integer('created_at').notNull()
});
export const operations = sqliteTable('operations', {
  id: text('id').primaryKey(), itemId: text('item_id').notNull().references(()=>items.id),
  personId: text('person_id').notNull().references(()=>people.id), status: text('status').notNull(),
  createdAt: integer('created_at').notNull(), dueAt: integer('due_at'), loanedAt: integer('loaned_at'),
  returnedAt: integer('returned_at'), renewals: integer('renewals').notNull().default(0)
}, t=>[index('operations_item_status').on(t.itemId,t.status,t.dueAt),index('operations_person_status').on(t.personId,t.status),index('operations_created').on(t.createdAt)]);
export const audit = sqliteTable('audit', {
  id: text('id').primaryKey(), operationId: text('operation_id'), action: text('action').notNull(),
  detail: text('detail').notNull(), createdAt: integer('created_at').notNull()
},t=>[index('audit_created').on(t.createdAt)]);
export const settings = sqliteTable('settings', {
  id: text('id').primaryKey(), institution: text('institution').notNull(),
  loanDays: integer('loan_days').notNull(), holdDays: integer('hold_days').notNull(), maxLoans: integer('max_loans').notNull()
});
export const connectorSessions = sqliteTable('connector_sessions', {
 id:text('id').primaryKey(), keyJwk:text('key_jwk').notNull(), tokenHash:text('token_hash').notNull(), expiresAt:integer('expires_at').notNull()
});
export const connectorNonces = sqliteTable('connector_nonces', {
 id:text('id').primaryKey(), sessionId:text('session_id').notNull()
});
export const mobileWallets = sqliteTable('mobile_wallets', {
 personId:text('person_id').primaryKey(), services:text('services').notNull(), updatedAt:integer('updated_at').notNull()
});
export const partnerTenants=sqliteTable('partner_tenants',{
 id:text('id').primaryKey(),name:text('name').notNull(),enabled:integer('enabled').notNull().default(1),mfaRequired:integer('mfa_required').notNull().default(1)
});
export const partnerMembers=sqliteTable('partner_members',{
 id:text('id').primaryKey(),subject:text('subject').notNull(),tenantId:text('tenant_id').notNull(),name:text('name').notNull(),active:integer('active').notNull().default(1)
},t=>[index('partner_member_scope').on(t.subject,t.tenantId)]);
export const partnerKeys=sqliteTable('partner_keys',{id:text('id').primaryKey(),jwk:text('jwk').notNull()});
export const partnerSessions=sqliteTable('partner_sessions',{
 id:text('id').primaryKey(),subject:text('subject').notNull(),actorId:text('actor_id').notNull(),mfa:integer('mfa').notNull(),createdAt:integer('created_at').notNull(),expiresAt:integer('expires_at').notNull(),revoked:integer('revoked').notNull().default(0)
});
export const partnerItems=sqliteTable('partner_items',{
 id:text('id').primaryKey(),tenantId:text('tenant_id').notNull(),title:text('title').notNull(),author:text('author').notNull(),total:integer('total').notNull()
});
export const partnerRequests=sqliteTable('partner_requests',{
 id:text('id').primaryKey(),tenantId:text('tenant_id').notNull(),itemId:text('item_id').notNull(),subject:text('subject').notNull(),status:text('status').notNull(),createdAt:integer('created_at').notNull(),dueAt:integer('due_at').notNull()
},t=>[index('partner_request_stock').on(t.tenantId,t.itemId,t.status,t.dueAt)]);
export const partnerEvents=sqliteTable('partner_events',{
 id:text('id').primaryKey(),tenantId:text('tenant_id'),sessionId:text('session_id'),operation:text('operation').notNull(),status:integer('status').notNull(),reason:text('reason').notNull(),steps:text('steps').notNull(),createdAt:integer('created_at').notNull()
});
