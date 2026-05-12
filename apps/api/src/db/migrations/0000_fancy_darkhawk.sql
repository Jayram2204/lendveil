CREATE TABLE "attestations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"borrower_pubkey" varchar(256) NOT NULL,
	"issuer_name" varchar(256) NOT NULL,
	"schema" varchar(256) NOT NULL,
	"issuer_signature" varchar(512) NOT NULL,
	"status" varchar(50) NOT NULL,
	"issued_at" timestamp NOT NULL,
	"expires_at" timestamp NOT NULL,
	"extracted_inputs" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"verified_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"request_id" uuid,
	"event_type" varchar(256) NOT NULL,
	"details" jsonb NOT NULL,
	"timestamp" timestamp DEFAULT now() NOT NULL,
	"policy_version" varchar(512) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "underwriting_decisions" (
	"decision_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"borrower_pubkey" varchar(256) NOT NULL,
	"request_id" uuid NOT NULL,
	"eligible" boolean NOT NULL,
	"risk_band" varchar(50),
	"max_borrow_usd" varchar(50),
	"collateral_ratio" varchar(50),
	"reason" varchar(256) NOT NULL,
	"policy_version_hash" varchar(512) NOT NULL,
	"timestamp" timestamp DEFAULT now() NOT NULL,
	"inputs_used" jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "underwriting_requests" (
	"request_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"borrower_pubkey" varchar(256) NOT NULL,
	"attestation_ids" text[] NOT NULL,
	"status" varchar(50) DEFAULT 'PENDING' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"completed_at" timestamp,
	"error_message" text,
	"decision_id" uuid
);
