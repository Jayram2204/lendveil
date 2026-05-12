# Quick Start Guide - Phase 7 (PostgreSQL)

## Prerequisites

- PostgreSQL 16 installed and running
- Database `lendveil_db` created
- User `jayeshkailaschavan` with peer authentication

## Verify Database Setup

```bash
# Check PostgreSQL is running
psql -U jayeshkailaschavan -d lendveil_db -c "SELECT version();"

# Check tables exist
psql -U jayeshkailaschavan -d lendveil_db -c "\dt"
```

Expected output:
```
                      List of relations
 Schema |          Name          | Type  |       Owner        
--------+------------------------+-------+--------------------
 public | attestations           | table | jayeshkailaschavan
 public | audit_logs             | table | jayeshkailaschavan
 public | underwriting_decisions | table | jayeshkailaschavan
 public | underwriting_requests  | table | jayeshkailaschavan
```

## Start the API

```bash
# From workspace root
export DB_USER=jayeshkailaschavan DB_PASSWORD="" DB_HOST=localhost DB_PORT=5432 DB_NAME=lendveil_db
pnpm dev:api
```

The API will start on `http://localhost:4000`

## Test Endpoints

### 1. Health Check
```bash
curl http://localhost:4000/api/health
```

### 2. Submit Attestation
```bash
curl -X POST http://localhost:4000/api/attestations/submit \
  -H "Content-Type: application/json" \
  -d '{
    "borrower_pubkey": "test_borrower_1",
    "issuer_name": "Solana Attestation Service - Jurisdiction Provider",
    "schema": "jurisdiction",
    "issuer_signature": "sig_test_1",
    "issued_at": "2026-04-01T00:00:00Z",
    "expires_at": "2027-04-01T00:00:00Z",
    "policy_inputs": {
      "attestation_account": "11111111111111111111111111111111",
      "jurisdiction": "US"
    }
  }'
```

### 3. Get Attestation
```bash
# Replace with actual attestation ID from previous response
curl http://localhost:4000/api/attestations/bf1c8a20-e908-4668-92af-cf39e9654d70
```

### 4. Submit Underwriting Request
```bash
curl -X POST http://localhost:4000/api/underwriting/request \
  -H "Content-Type: application/json" \
  -d '{
    "borrower_pubkey": "test_borrower_1",
    "attestation_ids": [
      "bf1c8a20-e908-4668-92af-cf39e9654d70",
      "11111111-1111-1111-1111-111111111111",
      "22222222-2222-2222-2222-222222222222"
    ]
  }'
```

### 5. Get Underwriting Request
```bash
# Replace with actual request ID from previous response
curl http://localhost:4000/api/underwriting/request/9f5c4a88-5550-4367-bd4e-1b1ed97210dd
```

## Query Database Directly

### View Attestations
```bash
psql -U jayeshkailaschavan -d lendveil_db -c "SELECT id, borrower_pubkey, issuer_name, status FROM attestations;"
```

### View Underwriting Requests
```bash
psql -U jayeshkailaschavan -d lendveil_db -c "SELECT request_id, borrower_pubkey, status, decision_id FROM underwriting_requests;"
```

### View Underwriting Decisions
```bash
psql -U jayeshkailaschavan -d lendveil_db -c "SELECT decision_id, borrower_pubkey, eligible, risk_band, max_borrow_usd FROM underwriting_decisions;"
```

### View Audit Logs
```bash
psql -U jayeshkailaschavan -d lendveil_db -c "SELECT id, request_id, event_type, timestamp FROM audit_logs ORDER BY timestamp DESC;"
```

## Insert Test Data (for testing without real verification)

```bash
psql -U jayeshkailaschavan -d lendveil_db << 'EOF'
INSERT INTO attestations (id, borrower_pubkey, issuer_name, schema, issuer_signature, status, issued_at, expires_at, extracted_inputs, created_at, verified_at)
VALUES 
  ('11111111-1111-1111-1111-111111111111', 'test_borrower_1', 'Reclaim Protocol - Official KYC Provider', 'kyc_status', 'sig_test_2', 'VALID', '2026-04-01', '2027-04-01', '{"kyc_status": "PASS"}', NOW(), NOW()),
  ('22222222-2222-2222-2222-222222222222', 'test_borrower_1', 'Solana Attestation Service - Jurisdiction Provider', 'income_band', 'sig_test_3', 'VALID', '2026-04-01', '2027-04-01', '{"income_band": "BAND_1"}', NOW(), NOW());
EOF
```

## Troubleshooting

### Database Connection Error: "role 'postgres' does not exist"
**Solution**: Make sure environment variables are set:
```bash
export DB_USER=jayeshkailaschavan DB_PASSWORD="" DB_HOST=localhost DB_PORT=5432 DB_NAME=lendveil_db
```

### Database Connection Error: "database 'lendveil_db' does not exist"
**Solution**: Create the database:
```bash
createdb -U jayeshkailaschavan lendveil_db
```

### PostgreSQL not running
**Solution**: Start PostgreSQL:
```bash
# macOS with Homebrew
brew services start postgresql@16

# Or manually
postgres -D /opt/homebrew/var/postgres
```

### Tables don't exist
**Solution**: Run migrations:
```bash
cd apps/api
pnpm drizzle-kit migrate
```

## Build & Type Check

```bash
# Check types
pnpm check:types
pnpm check:api

# Build
pnpm build:api
```

## Next Steps

After Phase 7 is working:

1. **Add BullMQ for Async Processing**
   ```bash
   pnpm add bullmq@5.34.0 ioredis@5.4.2 --save-exact
   ```

2. **Add Rate Limiting**
   ```bash
   pnpm add @fastify/rate-limit@10.2.0 --save-exact
   ```

3. **Implement Onchain Anchoring**
   - Update Anchor program
   - Deploy to devnet
   - Create onchain service

See `PHASE_7_8_IMPLEMENTATION_STATUS.md` for detailed implementation plans.
