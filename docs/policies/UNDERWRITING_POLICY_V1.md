# Underwriting Policy V1 - Private Undercollateralized Lending

## Policy Version Identifier
- Version: 1.0.0
- Hash: see `POLICY_V1_HASH.txt`
- Created: 2026-04-09
- Status: LOCKED FOR MVP

## 1. Policy Objective
Evaluate borrower eligibility for private undercollateralized lending based on KYC status, income band, and jurisdiction compliance.

## 2. Input Schema

| Input Field | Source Attestation | Type | Required | Example |
|---|---|---|---|---|
| `kyc_status` | Reclaim Protocol (KYC Provider) | enum: PASS, FAIL, PENDING | YES | PASS |
| `income_band` | Reclaim Protocol (Bank Statement) | enum: BAND_0, BAND_1, BAND_2 | YES | BAND_2 |
| `jurisdiction` | Solana Attestation Service | string (ISO 3166-1) | YES | US |
| `accreditation_status` | Optional - SAS | enum: ACCREDITED, NOT_ACCREDITED, UNKNOWN | NO | ACCREDITED |
| `credit_score_band` | Optional - Future | enum: BAND_A, BAND_B, BAND_C | NO | BAND_A |

## 3. Decision Logic

```text
FUNCTION evaluate_borrower(inputs):

  IF inputs.kyc_status != PASS:
    RETURN {eligible: FALSE, reason: "KYC_NOT_PASSED", risk_band: null, max_borrow: 0}

  IF inputs.jurisdiction IN ["KP", "IR", "SY", "CU", "ZW"]:
    RETURN {eligible: FALSE, reason: "RESTRICTED_JURISDICTION", risk_band: null, max_borrow: 0}

  IF inputs.income_band == BAND_2:
    risk_band = "A"
    base_borrow_multiplier = 0.4
  ELSE IF inputs.income_band == BAND_1:
    risk_band = "B"
    base_borrow_multiplier = 0.25
  ELSE:
    risk_band = "C"
    base_borrow_multiplier = 0.15

  IF inputs.accreditation_status == ACCREDITED:
    risk_band = upgrade_risk_band(risk_band)

  income_midpoint = get_band_midpoint(inputs.income_band)
  max_borrow_usd = income_midpoint * base_borrow_multiplier

  IF risk_band == "A":
    collateral_ratio = 0.75
  ELSE IF risk_band == "B":
    collateral_ratio = 0.85
  ELSE:
    collateral_ratio = 0.95

  RETURN {
    eligible: TRUE,
    risk_band: risk_band,
    max_borrow_usd: max_borrow_usd,
    collateral_ratio: collateral_ratio,
    reason: "APPROVED"
  }
```

## 4. Output Schema

| Output Field | Type | Description | Example |
|---|---|---|---|
| `eligible` | boolean | Whether borrower is eligible | true |
| `risk_band` | enum: A, B, C | Risk classification | A |
| `max_borrow_usd` | number | Maximum borrow amount in USD | 40000 |
| `collateral_ratio` | number | Required collateral ratio | 0.75 |
| `reason` | string | Decision reason code | APPROVED |
| `policy_version` | string | Policy version hash | abc123 |
| `timestamp` | ISO 8601 | Decision timestamp | 2026-04-09T10:30:00Z |

## 5. Test Cases

### Test Case 1: Eligible, High Income
- Inputs: `kyc_status=PASS`, `income_band=BAND_2`, `jurisdiction=US`
- Expected Output: `eligible=true`, `risk_band=A`, `max_borrow_usd=40000`, `collateral_ratio=0.75`

### Test Case 2: KYC Failed
- Inputs: `kyc_status=FAIL`, `income_band=BAND_2`, `jurisdiction=US`
- Expected Output: `eligible=false`, `reason=KYC_NOT_PASSED`

### Test Case 3: Restricted Jurisdiction
- Inputs: `kyc_status=PASS`, `income_band=BAND_2`, `jurisdiction=KP`
- Expected Output: `eligible=false`, `reason=RESTRICTED_JURISDICTION`

### Test Case 4: Low Income, Accredited
- Inputs: `kyc_status=PASS`, `income_band=BAND_0`, `jurisdiction=US`, `accreditation_status=ACCREDITED`
- Expected Output: `eligible=true`, `risk_band=B`, `max_borrow_usd=5250`, `collateral_ratio=0.85`

## 6. Policy Immutability
- This policy is locked for the MVP.
- Any change requires a version increment.
- Backend must return a policy version hash with each decision.
- Old policies must remain queryable for audit purposes.

## 7. Audit Trail Requirements
- Every evaluation must log inputs, outputs, timestamp, policy version, and decision ID.
- Logs must be queryable for lender review.
- MVP may use in-memory or local development persistence, but the shape must map to a durable audit log store.
