# Lendveil

## Project Report

### 1. Executive Summary

Lendveil is a decisioning layer for Solana applications that need to evaluate borrower eligibility without collecting or exposing raw sensitive user data.

The product enables a borrower to present verifiable attestations, run underwriting logic through confidential computation, and return only the outputs a protocol needs to act on:

- Eligibility status
- Risk band
- Maximum borrow amount
- Required collateral ratio

The goal is to help private lending, RWA, and OTC finance applications make better credit decisions while reducing compliance burden and data exposure.

This is not a lending protocol and not a generic identity product. It is underwriting infrastructure for onchain finance.

### 2. Problem Statement

Solana DeFi and RWA applications face a tradeoff:

- If they collect raw financial or identity data, they increase legal, operational, and security risk.
- If they avoid collecting data, they cannot support nuanced underwriting and must rely on crude collateral-only models.

This limits undercollateralized credit, institutional participation, and privacy-preserving financial products.

Current onboarding is also fragmented. Users repeatedly re-submit sensitive documents across applications, and protocols rebuild similar trust checks from scratch.

### 3. Proposed Solution

Lendveil introduces a reusable underwriting flow:

1. A borrower connects a wallet and presents attestations from approved issuers.
2. The application verifies attestation validity, issuer trust, and expiry.
3. Underwriting policy inputs are evaluated through confidential computation.
4. The protocol receives only a compact decision output.
5. The protocol uses that output to gate access or generate lending terms.

This creates a privacy-preserving decision layer that can be reused across multiple financial applications on Solana.

### 4. Why This Matters

This product helps unlock:

- Private undercollateralized lending
- RWA access control
- Compliant OTC credit
- Capital-efficient onboarding for verified users

The value proposition is straightforward:

- Users keep sensitive data private
- Protocols reduce data custody risk
- Issuers become reusable trust providers
- Solana applications can support more sophisticated financial products

### 5. Target Customers

Primary customers:

- Private credit protocols
- Undercollateralized lending applications
- RWA issuance platforms
- OTC and structured finance products on Solana

Secondary customers:

- Payroll finance platforms
- B2B treasury tools
- Token-gated financial products with compliance requirements

### 6. Primary Use Case for MVP

The MVP should focus on one workflow only:

Private undercollateralized lending for verified borrowers.

User story:

- A borrower wants access to a lending pool with better terms than a fully collateralized loan.
- The borrower presents approved attestations such as KYC status, jurisdiction, accreditation, or income band.
- Lendveil evaluates the borrower privately.
- The lending protocol receives:
  - Eligible or not eligible
  - Risk band
  - Maximum borrow amount
  - Required collateral ratio

This use case is the best starting point because it is easy to explain, commercially relevant, and narrow enough to demo cleanly.

### 7. Product Scope

#### In Scope for Hackathon MVP

- Borrower wallet connection
- Attestation ingestion and verification
- Approved issuer allowlist
- Policy-based confidential underwriting
- Decision output API
- Simple lender dashboard or demo UI
- Onchain recording of minimal decision metadata or references

#### Out of Scope for MVP

- Building a full lending market
- General identity wallet or vault product
- Full cross-protocol reputation layer
- Broad multi-policy compliance engine
- Complex custom ZK circuit ecosystem
- Institutional admin suite with billing and permissions

### 8. Product Differentiation

Most hackathon products in this space will likely fall into one of these categories:

- Generic agent infrastructure
- Identity dashboards
- Privacy middleware without a clear buyer
- New lending protocols with small feature differences

Lendveil is different because:

- It targets a concrete buyer: Solana financial applications
- It solves a direct business problem: private credit decisioning
- It integrates identity, policy, and privacy into one usable workflow
- It can grow into a recurring infrastructure business instead of remaining a one-off protocol

### 9. Core Product Principles

These should not be compromised:

- One narrow workflow before platform expansion
- Product-first framing over protocol-first framing
- Private outputs, not private data storage as the headline
- Clear policy versioning and auditability
- Trusted issuer model from day one
- Fast integration path for partner protocols

### 10. Technical Architecture

#### Core Components

1. Frontend application
   - Borrower onboarding flow
   - Attestation presentation
   - Eligibility and terms display
   - Demo lender dashboard

2. Backend decisioning service
   - Request intake
   - Attestation validation
   - Issuer allowlist management
   - Policy management
   - Audit logging
   - Output generation

3. Confidential compute layer
   - Private evaluation of underwriting policy
   - Confidential handling of policy inputs
   - Result generation without exposing raw user data

4. Solana program
   - Record decision references or proofs
   - Enable protocol-side verification hooks
   - Anchor lightweight onchain trust assumptions

#### Recommended Stack

- Frontend: Next.js, TypeScript, Tailwind CSS, Solana Wallet Adapter
- Backend: Node.js or NestJS, TypeScript
- Database: PostgreSQL
- Job handling: queue-based async workers
- Solana program: Anchor
- Attestation layer: Solana Attestation Service
- Confidential compute: Arcium
- RPC provider: Helius or equivalent
- Optional compressed state: Light Protocol only where needed

### 11. System Flow

1. Borrower connects wallet.
2. Borrower selects or presents attestations.
3. Backend validates issuer, schema, expiry, and revocation status.
4. Validated inputs are transformed into underwriting inputs.
5. Inputs are evaluated using confidential computation.
6. Decision engine returns:
   - Eligibility
   - Risk band
   - Max borrow
   - Collateral requirement
7. Lender UI consumes the decision.
8. Optional minimal decision metadata is written onchain.

### 12. Data Model

#### Inputs

- Wallet address
- Attestation references
- Issuer identifiers
- Policy version
- Underwriting attributes such as:
  - KYC status
  - Jurisdiction
  - Accreditation
  - Income band
  - Risk history or repayment signal

#### Outputs

- Eligibility flag
- Risk band
- Max borrow amount
- Required collateral ratio
- Reason codes
- Timestamp
- Policy version hash

### 13. Risk Areas

#### Product Risks

- No initial design partner or protocol integration
- Overbuilding a platform before shipping a workflow
- Weak explanation of why private decisioning matters

#### Technical Risks

- Latency in confidential evaluation
- Attestation schema inconsistency
- Complex integration between credential verification and decisioning
- Onchain complexity if too much logic is forced into the program

#### Market Risks

- Protocols may still want raw offchain compliance review
- Attestation ecosystem may be immature for some underwriting signals
- Institutional customers may require explainability before adoption

### 14. Risk Mitigation

- Start with one design partner profile in mind: a lending protocol
- Keep the underwriting policy simple and transparent
- Return reason codes with policy-version references
- Use async request processing if confidential evaluation adds latency
- Maintain strict issuer allowlists
- Separate offchain policy execution from minimal onchain anchoring
- Treat Light Protocol as optional, not foundational, for MVP

### 15. Production Deployment Setup

#### Environments

- Local development
- Devnet or test environment
- Staging
- Production

#### Deployment Components

- Frontend deployed on Vercel or Cloudflare
- Backend API deployed on Fly.io, Railway, or AWS
- PostgreSQL with backups and migration control
- Queue workers for underwriting jobs
- Dedicated RPC provider
- Secret management for issuer keys and service credentials
- Observability stack for logs, traces, and failures

#### Operational Requirements

- Policy version control
- Request tracing
- Replay protection
- Attestation expiry and revocation checks
- Monitoring for failed decision runs
- Audit trail for every underwriting response

### 16. Common Problems and Solutions

#### Problem: Attestations expire or are revoked
Solution: Re-check validity on every underwriting request and fail safely.

#### Problem: Decision engine is too slow
Solution: Use asynchronous job processing with status polling and clear UI states.

#### Problem: Lenders do not trust black-box outputs
Solution: Expose policy definitions, policy version hash, and structured reason codes.

#### Problem: Integration is too hard
Solution: Provide a simple SDK, REST API, and sandbox example app.

#### Problem: Not enough underwriting data
Solution: Support an explicit "insufficient attestations" result rather than forcing a low-confidence decision.

#### Problem: Team scope expands mid-build
Solution: Lock the MVP to one borrower flow, one lender flow, one underwriting policy.

### 17. Scalability Path

#### Phase 1

- Single underwriting flow
- Single policy
- Single protocol demo

#### Phase 2

- Multi-policy support
- Protocol dashboard
- Policy management UI
- Better issuer support

#### Phase 3

- SDK and API productization
- Multi-tenant integrations
- Expanded decisioning for RWAs and OTC finance

#### Phase 4

- Broader trust and risk infrastructure for onchain finance
- Cross-application reuse of underwriting outputs and attested signals

### 18. Why Users and Customers Will Adopt

#### Why protocols adopt

- Reduced sensitive data handling
- Better borrower selection
- Cleaner compliance posture
- Ability to offer differentiated financial products

#### Why users adopt

- Less repetitive KYC and document submission
- Improved privacy
- Faster onboarding
- Better access to capital

### 19. Why Judges May Care

This idea has the right characteristics for a Frontier-style evaluation:

- Strong startup narrative
- Concrete pain point
- Clear buyer and user
- Sponsor-aligned technology story
- Demoable end-to-end workflow
- Potential to become real infrastructure for Solana finance

What judges will want to see:

- A polished, believable demo
- A narrow but complete user journey
- Clear explanation of why this matters now
- Evidence that the team understands distribution, not just engineering

### 20. Hackathon Demo Structure

#### Demo story

1. Show the current broken tradeoff:
   - either expose sensitive data
   - or rely on blunt collateral-only decisions
2. Show borrower presenting verified attestations
3. Show confidential underwriting run
4. Show lender receiving only the final decision outputs
5. Show lending terms generated from the decision

#### Demo message

"We let Solana apps make private credit decisions from verifiable credentials."

### 21. Three-Minute Pitch Draft

Today, private lending and RWA applications on Solana face a bad tradeoff. If they collect sensitive user data, they become compliance and security liabilities. If they avoid collecting it, they cannot underwrite users properly and leave institutional capital on the table.

We built Lendveil, a decisioning layer for Solana finance. Users present verifiable attestations from trusted issuers. Our system evaluates those inputs through confidential computation and returns only what the protocol needs: eligibility, risk band, maximum borrow amount, and collateral requirements.

This means applications can make better credit decisions without exposing raw user identity or financial data.

We are starting with private undercollateralized lending, but the same infrastructure can power RWA access, OTC credit, and compliant onchain finance more broadly.

Lendveil helps unlock capital-efficient, privacy-preserving financial products on Solana.

### 22. Immediate Build Priorities

1. Finalize one underwriting policy for MVP.
2. Define required attestations and issuer assumptions.
3. Build the borrower-to-decision flow end to end.
4. Implement a lightweight lender-facing dashboard.
5. Anchor outputs in a minimal Solana program.
6. Prepare a clean demo environment and scripted pitch.

### 23. Success Criteria

The MVP is successful if:

- A borrower can complete the flow end to end
- Attestations are verified correctly
- A confidential underwriting decision is generated
- The lender receives usable terms from that decision
- The demo communicates the product value in under three minutes

### 24. Final Positioning

Lendveil is not another lending protocol, not another identity wallet, and not a speculative privacy primitive.

It is a product that helps Solana financial applications make private, verifiable, and actionable credit decisions.
