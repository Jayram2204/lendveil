# Lendveil

Lendveil is a Solana-native confidential underwriting product focused on private credit decisions for lending and RWA applications.

## Workspace Layout

- `apps/web` - Next.js borrower and lender dashboards
- `apps/api` - Fastify API, Drizzle persistence, Arcium integration scaffolding, and queue processing
- `packages/types` - shared underwriting policy and API types
- `programs/underwriting` - Solana Anchor workspace for future decision anchoring
- `docs` - product, policy, and phase documentation
- `config` - issuer trust configuration

## Working Commands

- `pnpm build`
- `pnpm test`
- `pnpm dev:web`
- `pnpm dev:api`
- `pnpm build:types`
- `pnpm build:api`
- `pnpm build:web`

## Environment

1. Copy `.env.template` to `.env.local`
2. Fill in Postgres, Redis, Solana, and optional Arcium values

## Local Infrastructure

`docker-compose.yml` includes:
- Postgres
- Redis
- API container
- Web container

## Current State

What is real now:
- shared policy/types package
- borrower and lender web routes
- Drizzle-backed API persistence
- BullMQ underwriting queue
- Arcium preparation and local encryption/decryption flow
- exact dependency versions locked in manifests

What is still incomplete:
- real SAS schema parsing instead of account-exists-only validation
- real MXE submission and result retrieval
- real onchain Anchor instruction wiring for decision anchoring
- automated unit/integration test suite beyond command-level verification
