# TrustHire ⚡

> **Freelance escrow on Monad where an AI decision model suggests who to hire and verifies the work, the client keeps the last word, and silence cannot hold funds hostage.**

[![Solidity](https://img.shields.io/badge/Solidity-0.8.24-363636?logo=solidity)](https://soliditylang.org/)
[![Network](https://img.shields.io/badge/Network-Monad_Testnet_(10143)-836EF9)](https://testnet.monadexplorer.com)
[![Next.js](https://img.shields.io/badge/Next.js-14_App_Router-black?logo=next.js)](https://nextjs.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

---

## 1. One-Line Pitch
**TrustHire** is freelance escrow on Monad testnet where an AI decision model (TypeSafe **Jev**, with an LLM fallback) suggests the best applicant and reviews delivered work to set a confidence-scaled review window; if the client ghosts, funds auto-release after the window, and if a freelancer abandons, deposits are instantly refunded.

---

## 2. How We Differ

Escrow with timeout auto-release and AI-verified escrow already exist. We do not claim to be first. Here is how TrustHire uniquely compares:

| Feature | Basic Milestone Escrow | AI-Verified Escrow | AI Matching Marketplace | **TrustHire** |
|:---|:---|:---|:---|:---|
| **Examples Seen** | `milestone-escrow` (Monad) | `genmarket-escrow` (GenLayer) | `trust-hire-ruddy` (Sui) | **This Project** |
| **Who Judges Work** | Client only | AI validator decides & releases | N/A | AI returns typed probability; **client keeps last word** |
| **Effect of AI Verdict** | None | Releases / refunds directly | Ranking only | **Sets client review window**; low confidence routes to dispute |
| **Hiring Suggestion** | None | None | Trust score | **AI matches applicants against private brief & criteria** |
| **Client Ghosts** | Timeout release | Varies | Varies | **Timeout release + on-chain "ghosted" stat** (client keeps work) |
| **Freelancer Ghosts** | None | Varies | Varies | **Cancel / abandon / deadline refund + "abandoned" stat** |
| **Data Privacy** | Public deliverables | Public evidence | Off-chain | **Hashes on-chain; brief & deliverable encrypted + signature-gated** |
| **Reputation** | None | Minimal | Off-chain / Sui | **On-chain reputation for both parties** |

---

## 3. The Problem
1. **Freelancers get ghosted:** Clients receive work, vanish, and the freelancer's payment remains frozen indefinitely.
2. **Clients receive unfinished work:** Freelancers miss deadlines or submit placeholder code with no recourse for immediate refund.
3. **Black-box AI overrides humans:** Existing AI escrow attempts allow LLMs to directly seize or transfer funds. Models hallucinate and make mistakes.
4. **Public exposure of intellectual property:** Storing contracts and deliverables directly on public blockchains exposes proprietary briefs and unfinished deliverables to competitors.

---

## 4. Core Flow

```text
Client funds job (0.01 MON)
      │  (brief hash on-chain; text encrypted off-chain)
      ├── Client cancels before acceptance ─────────▶ Cancelled (Full refund)
      ▼
Freelancers apply off-chain (pitch + skills)
      ▼
Client clicks "Suggest best freelancer (AI)" ──────▶ Jev / LLM scores fit (0-100)
      ▼
Client assigns on-chain ──▶ Freelancer accepts
      ├── Freelancer abandons ──────────────────────▶ Refunded (+ abandoned mark)
      ├── Deadline passes with no submission ───────▶ Client claims refund (+ abandoned mark)
      ▼
Freelancer submits work (hash on-chain; encrypted text off-chain)
      ▼
AI Reviewer checks deliverable against acceptance criteria
      ├── FAIL (< 75% confidence) or ANY error ─────▶ Disputed ──▶ Arbitrator splits funds
      └── PASS (≥ 75% confidence)
              ▼
        CLIENT REVIEW WINDOW (Length dynamically set by AI confidence: ≥95% → short; <95% → long)
        Client can now inspect the deliverable
              ├── Client approves ──────────────────▶ Released (Freelancer paid, 2% fee deducted)
              ├── Client disputes ──────────────────▶ Disputed ──▶ Arbitrator resolves
              └── Client does nothing (window ends)
                      ▼
                 Anyone calls autoRelease ─────────▶ Released (Freelancer paid, client "ghosted" +1)
                                                     Client keeps permanent access to deliverable
```

---

## 5. AI Roles (Jev Primary + LLM Fallback)

### Two Critical Jobs:
1. **Applicant Suggestion:** Evaluates applicants against the client's private brief across 3 axes: `skillsFit` (40%), `experienceFit` (35%), and `scopeFit` (25%). Recommends the highest score with tie-breaking based on on-chain reputation.
2. **Deliverable Review:** Answers two bounded `noul` questions:
   - `criteria`: *"The deliverable satisfies every acceptance criterion listed in the brief."*
   - `substantive`: *"The deliverable is real, substantive work for the described job, not placeholder, empty, or off-topic content."*
   - Overall confidence = $\min(\text{criteria}, \text{substantive})$.

### Truthful Provider Badging:
- **Jev (TypeSafe):** Used when `JEV_API_KEY` is present and responds within a strict 4-second timeout.
- **LLM Fallback (Anthropic Claude / Google Gemini):** Strict JSON probability extraction.
- **Badge in UI:** Clearly displays *"Reviewed by Jev"* or *"Reviewed by LLM"*.
- **Fail-safe principle:** ANY timeout, network error, or invalid AI output routes the contract state into **Disputed**; AI never releases funds autonomously.

---

## 6. Security & Privacy Model

- **On-chain footprint:** Only titles, amounts, addresses, state transitions, deadlines, and cryptographic **hashes** (`briefHash`, `deliverableHash`) touch the Monad blockchain.
- **Off-chain encryption:** Briefs and deliverables are encrypted at rest using AES-256-GCM (`DATA_ENC_KEY`).
- **Signature-gated access:** API access requires an EIP-191 wallet signature session (JWT token).
  - Applicants cannot view the private brief (only the client's public summary).
  - Clients cannot view the deliverable until the review window has officially opened.
  - Freelancers always retain access to their own submitted work.
- **Known Limitations:** The backend server operator can decrypt stored data; brief and work text are processed by AI endpoints; this is server-assisted encryption rather than peer-to-peer zero-knowledge proofs.

---

## 7. Architecture

```text
┌─────────────────────────┐     ┌───────────────────────────────┐     ┌───────────────────────┐
│  Next.js 14 Frontend    │────▶│  Route Handlers (Next.js API) │────▶│  AI Provider Adapter  │
│  wagmi v2 / viem v2     │     │  · EIP-191 session auth       │     │  Jev  ──or──  LLM     │
└────────────┬────────────┘     │  · AES-256-GCM crypto         │     └───────────────────────┘
             │                  │  · Supabase encrypted store   │
             │                  │  · Reviewer wallet (signer)   │
             ▼                  └───────────────┬───────────────┘
┌───────────────────────────────────────────────▼─────────────────────────────────────────────┐
│                       TrustHire Smart Contract (Monad Testnet)                             │
│  escrow · assignment · verdict gate · review window · auto-release · dispute · reputation  │
└─────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 8. Deployed Contracts & Live App

- **Network:** Monad Testnet (`chainId: 10143`)
- **Contract Address:** `0x...` *(Updated upon live deployment)*
- **Explorer:** [https://testnet.monadexplorer.com](https://testnet.monadexplorer.com)
- **Live Frontend:** `https://trusthire.vercel.app` *(or Vercel URL)*

---

## 9. Run From Scratch

### Prerequisites
- Node.js 20 LTS
- Monad Testnet MON from the [Monad Faucet](https://faucet.monad.xyz/)

### 1. Clone & Install
```bash
git clone https://github.com/Dev-43/Trust_Hire.git
cd Trust_Hire

# Install contract dependencies
cd contracts
npm install

# Install frontend dependencies
cd ../web
npm install
```

### 2. Environment Configuration
**In `contracts/.env`:**
```bash
DEPLOYER_PRIVATE_KEY=0x...
REVIEWER_ADDRESS=0x2ABeA64944c05282480b7D87B96b526110Eb6aAf
ARBITRATOR_ADDRESS=0xca4CE2169d4fFee7c2560A136Df4cc9792eebD74
FEE_RECIPIENT_ADDRESS=0xca4CE2169d4fFee7c2560A136Df4cc9792eebD74
RPC_URL=https://testnet-rpc.monad.xyz
```

**In `web/.env.local`:**
```bash
NEXT_PUBLIC_CONTRACT_ADDRESS=0x...
NEXT_PUBLIC_RPC_URL=https://testnet-rpc.monad.xyz
NEXT_PUBLIC_EXPLORER_URL=https://testnet.monadexplorer.com
NEXT_PUBLIC_CHAIN_ID=10143
NEXT_PUBLIC_MOCK=0

REVIEWER_PRIVATE_KEY=0x...
JWT_SECRET=your_32_byte_hex_jwt_secret
DATA_ENC_KEY=your_32_byte_base64_encryption_key
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# AI Provider Keys (at least one)
JEV_API_KEY=
LLM_API_KEY=
GEMINI_API_KEY=
```

### 3. Run Smart Contract Tests
```bash
cd contracts
npx hardhat test
```
All 14 unit tests will execute and pass against the local Hardhat EVM.

### 4. Deploy & Verify on Monad Testnet
```bash
npx hardhat run scripts/deploy.ts --network monadTestnet
npx hardhat verify --network monadTestnet <CONTRACT_ADDRESS> --constructor-args scripts/verify-args.ts
npx ts-node scripts/export-abi.ts
```

### 5. Run Web Application
```bash
cd ../web
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 10. Demo vs. Production Configuration

| Parameter | Demo Configuration | Production Configuration |
|:---|:---|:---|
| `shortWindow` (High Confidence $\ge 95\%$) | **30 seconds** | **1 day** (86,400s) |
| `longWindow` (Standard Confidence $< 95\%$) | **90 seconds** | **2 days** (172,800s) |
| `verdictTimeout` (Reviewer SLA) | **300 seconds** (5 mins) | **1 day** (86,400s) |
| `confidenceThreshold` | 7500 bps (75%) | 7500 bps (75%) |
| `feeBps` | 200 bps (2%) | 200 bps (2%) |

---

## 11. Testing & Verification

- **14 Hardhat Unit Tests:** Cover zero deposit checks, role validations, deadline enforcement, state machine transitions, timeout calculations, dispute splits, and terminal zero-balance guarantees.
- **Compiler Target:** `evmVersion: "shanghai"`, optimizer enabled (`runs: 200`).
- **Sourcify Verification:** Automated verification script configured for Monad testnet explorer.

---

## 12. Future Work

- **Decentralized Arbitration:** Integration with Kleros-style dispute jurors to replace the single arbitrator address.
- **Client-Side Key Exchange:** End-to-end asymmetric encryption using ECDH between client and designated freelancer.
- **Multi-Milestone Support:** Fractional escrow releases across progressive sprint deliverables.
- **Freelancer Staking:** Optional freelancer security deposits that slash upon deadline abandonment.
- **Stablecoin Settlement:** Support for native Monad USDC.

---

## License
MIT License. Built for Monad Blitz Pune V3.
