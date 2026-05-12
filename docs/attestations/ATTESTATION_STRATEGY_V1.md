# Attestation Strategy V1 - Data Source Selection

## Strategy Version
- Version: 1.0.0
- Created: 2026-04-09
- Status: LOCKED FOR MVP

## 1. Protocol Selection

### Protocol 1: Reclaim Protocol (Primary)
- URL: https://docs.reclaimprotocol.org
- Use Case: KYC status and income band
- MVP Role: first real attestation integration target
- Verification: issuer signature verification and extracted policy inputs

### Protocol 2: Solana Attestation Service (Secondary)
- URL: https://attest.solana.com/
- Use Case: jurisdiction and accreditation attestations
- MVP Role: secondary source and future onchain-native credential path
- Verification: signature or onchain attestation verification

## 2. Issuer Allowlist

Trusted issuers are defined in `config/ISSUER_ALLOWLIST.json`.

Approval rules:
1. Issuer must be manually reviewed.
2. Issuer public key must be added to the allowlist.
3. Supported schemas must be explicitly mapped.
4. Unknown issuers are rejected by default.

## 3. Attestation Expiry Policy

| Attestation Type | Expiry Duration | Refresh Required |
|---|---|---|
| KYC Status | 1 year | Yes |
| Income Band | 1 year | Yes |
| Jurisdiction | 2 years | Yes if changed |
| Accreditation | 2 years | No |

The backend must reject expired attestations with `ATTESTATION_EXPIRED`.

## 4. Data Mapping

| Policy Input | Attestation Source | Source Field | Validation Rule |
|---|---|---|---|
| `kyc_status` | Reclaim KYC | `status` | Must be PASS, FAIL, or PENDING |
| `income_band` | Reclaim Bank | `amount_band` | Must be BAND_0, BAND_1, or BAND_2 |
| `jurisdiction` | SAS Jurisdiction | `country_code` | Must be valid ISO 3166-1 alpha-2 |
| `accreditation_status` | SAS Accreditation | `is_accredited` | Maps to ACCREDITED, NOT_ACCREDITED, or UNKNOWN |

## 5. Verification Flow

```text
1. Borrower submits attestation metadata and extracted policy inputs.
2. Backend checks issuer allowlist membership.
3. Backend checks expiry.
4. Backend marks signature verification as TODO until live issuer integration is active.
5. Backend stores only extracted policy inputs, never raw source documents.
```

## 6. No Raw Data Storage Policy

The backend never stores raw bank statements, identity documents, or full provider payloads.

Stored fields are limited to:
- attestation ID
- issuer name
- schema
- verification timestamps
- expiry
- extracted policy inputs

## 7. Revocation Strategy

- Reclaim revocation checks: integrate before production launch
- SAS revocation checks: integrate before production launch
- MVP behavior: explicit TODO with audit log marker for unverified revocation state
