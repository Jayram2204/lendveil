# Confidential Underwriting API

Monorepo for a Solana-native confidential underwriting product focused on private credit decisions.

## Workspace Layout

- `apps/web` - Next.js product surface and demo UI
- `apps/api` - decisioning service and integration layer
- `packages/shared` - shared types and schemas
- `programs/underwriting` - Anchor workspace for onchain decision references
- `docs` - product and build documentation

## Getting Started

1. Install dependencies with `pnpm install`
2. Run the web app with `pnpm dev:web`
3. Run the API with `pnpm dev:api`

## Deployment Notes

- Deploy `apps/web` as its own project with the root directory set to `apps/web`
- Deploy `apps/api` separately as a backend service
- Deploy the Anchor program through Solana tooling, not through the web or API host
