### "LendVeil"

A High-Performance Confidential Underwriting Protocol for Private Credit & RWA. Architected natively on Solana with Privacy-Preserving Computation.


### "Overview"

LendVeil bridges the gap between traditional credit mechanics and decentralized finance by enabling **secure, algorithmic credit decisions without exposing sensitive borrower data**. Unlike traditional DeFi lending protocols that require massive over-collateralization (150-300%), LendVeil leverages confidential computing to perform private underwriting, unlocking under-collateralized lending for Real World Assets (RWA).

### "The Problem"

=Traditional DeFi**: Requires excessive collateral (150%+), making it capital inefficient
-Traditional Finance**: Centralized gatekeepers, slow processes, limited transparency
-Privacy Concerns**: Exposing credit scores and financial data on-chain is non-viable

### "Our Solution"

LendVeil utilizes **Trusted Execution Environments (TEE)  via Arcium to:

1. ✅ Process sensitive borrower data in encrypted enclaves
2. ✅ Generate confidential credit scores algorithmically
3. ✅ Anchor decisions immutably on Solana without revealing raw data
4. ✅ Enable under-collateralized loans (50-80% LTV) for verified borrowers


### "Key Features"

  For Borrowers

-  Privacy-First**: Your financial data never leaves the encrypted computation layer
-  Capital Efficient**: Access loans with 50-80% collateral (vs 150%+ in traditional DeFi)
-  Fast Decisions**: Algorithmic underwriting in minutes, not days
-  Permissionless**: No credit bureaus, no geographic restrictions

  For Lenders

-  Risk-Adjusted Returns**: Earn competitive yields on under-collateralized loans
-  Protected Downside**: On-chain collateral + algorithmic risk assessment
-  Transparency**: View aggregated pool metrics without compromising borrower privacy
-  Institutional Grade**: Compliance-ready infrastructure for regulated entities

"Protocol Features"

-  Confidential Computing**: Arcium TEE integration for private underwriting
-  On-Chain Settlement**: Immutable decision records anchored on Solana
-  Algorithmic Underwriting**: Customizable credit models without human bias
-  Real-Time Processing**: Background job queues with BullMQ for async workflows
-  Scalable Architecture**: Monorepo design supporting horizontal scaling

### "System Architecture"

LendVeil is built as a modular monorepo separating frontend, backend, and on-chain components for maximum scalability and security.


lendveil/
│
├── apps/
│   ├── web/                    # Next.js 14 frontend (borrower/lender dashboards)
│   └── api/                    # Fastify API (underwriting engine)
│
├── packages/
│   └── types/                  # Shared TypeScript types & underwriting policies
│
├── programs/
│   └── underwriting/           # Solana Anchor smart contracts
│
├── config/                     # Protocol configurations & issuer trust settings
├── docs/                       # Comprehensive protocol documentation
├── scripts/                    # Deployment & automation scripts
└── docker-compose.yml          # Local infrastructure orchestration


### "Data Flow Architecture"


<img width="514" height="401" alt="image" src="https://github.com/user-attachments/assets/9c6aae30-dd1d-43d6-a64f-52b51d947722" />


### Key Components


<img width="848" height="204" alt="image" src="https://github.com/user-attachments/assets/3150050e-e602-41bd-8b60-155e30c14ec5" />


## Technology Stack

### Frontend (`/apps/web`)

* **Framework**: Next.js 14 (App Router)
* **Language**: TypeScript 5.3+
* **Styling**: Tailwind CSS 3.4
* **State Management**: React Query (TanStack Query)
* **Wallet Integration**: Solana Wallet Adapter (Phantom, Solflare, Backpack)
* **Charts**: Recharts
* **Forms**: React Hook Form + Zod validation

### Backend (`/apps/api`)

* **Framework**: Fastify 4.x
* **Language**: TypeScript 5.3+
* **ORM**: Drizzle ORM
* **Database**: PostgreSQL 16
* **Job Queue**: BullMQ 5.x
* **Cache**: Redis 7.x
* **Validation**: Zod
* **Authentication**: JWT (jsonwebtoken)

### Blockchain (`/programs/underwriting`)

* **Chain**: Solana (Devnet/Mainnet)
* **Framework**: Anchor 0.30+
* **Language**: Rust 1.75+
* **Testing**: Anchor Test Framework
* **Deployment**: Anchor CLI

### Infrastructure

* **Containerization**: Docker, Docker Compose
* **CI/CD**: GitHub Actions
* **Monitoring**: (Planned: Datadog/Sentry)
* **Deployment**: Vercel (Frontend), Railway/Render (API)

---

## Quick Start

### Prerequisites

Ensure you have the following installed:

* **Node.js**: v20+ ([Download](https://nodejs.org/))
* **pnpm**: v8+ (`npm install -g pnpm`)
* **Docker Desktop**: Latest version ([Download](https://www.docker.com/products/docker-desktop))
* **Solana CLI**: v1.17+ ([Install Guide](https://docs.solana.com/cli/install-solana-cli-tools))
* **Anchor CLI**: v0.30+ (`cargo install --git https://github.com/coral-xyz/anchor avm --locked && avm install latest && avm use latest`)
* **Rust**: v1.75+ ([Install via rustup](https://rustup.rs/))


## Coverage Goals

| Component | Target Coverage | Current |

| Smart Contracts     | 95% | 92% |
| API Endpoints       | 90% | 87% |
| Frontend Components | 80% | 75% |
| Business Logic      | 95% | 90% |

##  Security

### Smart Contract Security

- **Audits**: Pre-mainnet audit by OtterSec (scheduled Q2 2024)
- **Bug Bounty**: Immunefi program with up to $50K rewards
- **Best Practices**:
  - PDA-based account derivation (no private key storage)
  - Strict signer validation on all state-changing instructions
  - Overflow protection via Rust's type system
  - Emergency pause mechanism for critical bugs

### API Security

- **Authentication**: JWT with RSA256 signing
- **Rate Limiting**: 100 requests/hour per IP (configurable)
- **Data Encryption**: AES-256 for sensitive data at rest
- **HTTPS Only**: TLS 1.3 enforced in production
- **CORS**: Whitelist-based origin validation

### Confidential Computing

- **TEE Provider**: Arcium (hardware-based SGX enclaves)
- **Data Flow**:
  1. Borrower data encrypted client-side (AES-GCM)
  2. Encrypted payload sent to API
  3. API forwards to Arcium TEE
  4. TEE decrypts, computes, re-encrypts result
  5. Only hash anchored on-chain
- **Attestation**: Remote attestation verifies TEE integrity

### 📄 License

This project is licensed under the **MIT License**

##  Acknowledgments

LendVeil is built on the shoulders of giants:

- **Solana Foundation** - For the high-performance blockchain infrastructure
- **Coral (Anchor)** - For making Solana development accessible
- **Arcium** - For pioneering confidential computing on Solana
- **Drizzle Team** - For the excellent TypeScript ORM
- **Vercel** - For the incredible developer experience


