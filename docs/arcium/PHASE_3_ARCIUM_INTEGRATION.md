# Phase 3 - Arcium Integration

## Scope

Phase 3 adds the confidential compute integration layer for Lendveil.

This phase does not yet submit real underwriting jobs to an MXE-backed Solana program. Instead, it establishes the pieces we need to do that safely:

- official Arcium SDK dependencies
- environment and readiness checks
- deterministic encoding of underwriting inputs
- encryption of underwriting inputs with `x25519` + `RescueCipher`
- in-memory encrypted session tracking for local development

## Official SDKs Installed

- `@arcium-hq/client@0.3.0`
- `@arcium-hq/reader@0.3.0`
- `@coral-xyz/anchor@0.31.1`
- `@solana/web3.js@1.98.4`

## Environment

### Minimum for readiness checks
- `ARCIUM_ENABLED=true`
- `ARCIUM_RPC_URL=<solana rpc url>`
- `ARCIUM_MXE_PROGRAM_ID=<mxe program pubkey>`

### Optional local encryption shortcut
- `ARCIUM_MXE_PUBLIC_KEY_HEX=<32-byte x25519 public key as hex>`

If `ARCIUM_MXE_PUBLIC_KEY_HEX` is set, Lendveil can prepare encrypted underwriting payloads without fetching the MXE key from chain.

## Input Encoding

Underwriting inputs are encoded into finite-field friendly integers before encryption:

| Input | Encoding |
|---|---|
| `kyc_status` | `FAIL=0`, `PENDING=1`, `PASS=2` |
| `income_band` | `BAND_0=0`, `BAND_1=1`, `BAND_2=2` |
| `jurisdiction` | two ASCII bytes packed into one integer |
| `accreditation_status` | `UNKNOWN=0`, `NOT_ACCREDITED=1`, `ACCREDITED=2` |

## API Surface Added

- `GET /api/arcium/status`
- `POST /api/arcium/prepare-underwriting`
- `POST /api/arcium/decrypt-result`

## What This Enables Next

After this phase, the next Arcium tasks are:

1. map the encoded input layout to the actual confidential program interface
2. submit encrypted computations on-chain
3. wait for computation finalization using official Arcium utilities
4. decrypt final results from callback or fetched computation output
