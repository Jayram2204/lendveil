import { pgTable, uuid, varchar, timestamp, jsonb, boolean, text } from 'drizzle-orm/pg-core';

export const attestations = pgTable('attestations', {
  id: uuid('id').primaryKey().defaultRandom(),
  borrower_pubkey: varchar('borrower_pubkey', { length: 256 }).notNull(),
  issuer_name: varchar('issuer_name', { length: 256 }).notNull(),
  schema: varchar('schema', { length: 256 }).notNull(),
  issuer_signature: varchar('issuer_signature', { length: 512 }).notNull(),
  status: varchar('status', { length: 50 }).notNull(),
  issued_at: timestamp('issued_at').notNull(),
  expires_at: timestamp('expires_at').notNull(),
  extracted_inputs: jsonb('extracted_inputs'),
  created_at: timestamp('created_at').defaultNow().notNull(),
  verified_at: timestamp('verified_at')
});

export const underwriting_requests = pgTable('underwriting_requests', {
  request_id: uuid('request_id').primaryKey().defaultRandom(),
  borrower_pubkey: varchar('borrower_pubkey', { length: 256 }).notNull(),
  attestation_ids: text('attestation_ids').array().notNull(),
  status: varchar('status', { length: 50 }).notNull().default('PENDING'),
  created_at: timestamp('created_at').defaultNow().notNull(),
  completed_at: timestamp('completed_at'),
  error_message: text('error_message'),
  decision_id: uuid('decision_id')
});

export const underwriting_decisions = pgTable('underwriting_decisions', {
  decision_id: uuid('decision_id').primaryKey().defaultRandom(),
  borrower_pubkey: varchar('borrower_pubkey', { length: 256 }).notNull(),
  request_id: uuid('request_id').notNull(),
  eligible: boolean('eligible').notNull(),
  risk_band: varchar('risk_band', { length: 50 }),
  max_borrow_usd: varchar('max_borrow_usd', { length: 50 }), // Store as string to avoid precision issues
  collateral_ratio: varchar('collateral_ratio', { length: 50 }), // Store as string
  reason: varchar('reason', { length: 256 }).notNull(),
  policy_version_hash: varchar('policy_version_hash', { length: 512 }).notNull(),
  timestamp: timestamp('timestamp').defaultNow().notNull(),
  inputs_used: jsonb('inputs_used').notNull()
});

export const audit_logs = pgTable('audit_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  request_id: uuid('request_id'),
  event_type: varchar('event_type', { length: 256 }).notNull(),
  details: jsonb('details').notNull(),
  timestamp: timestamp('timestamp').defaultNow().notNull(),
  policy_version: varchar('policy_version', { length: 512 }).notNull()
});
