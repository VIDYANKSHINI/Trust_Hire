# BUILD.md — TrustHire (Monad Blitz Pune V3)

> ⚠️ AGENT INSTRUCTIONS: Build ONLY what is listed here. Do not add features, do not infer requirements, do not improve on the spec. If something is unclear, output a comment `// UNCLEAR: [question]` and stop. Do not proceed past unclear points.

Event: Sat 10 Oct 2026. **Code freeze 5:30 PM IST. Submissions close 5:45 PM IST.** Repo must be NEW and PUBLIC, created after 11:30 AM.

---

## 1. Project Overview

TrustHire is freelance escrow on Monad testnet where an AI decision model (TypeSafe **Jev**, with an LLM fallback) does two jobs:

1. **Suggests the best freelancer** to the client by scoring each applicant against the client's private brief and acceptance criteria.
2. **Reviews the delivered work** and returns a probability. The probability sets the client's review window (high confidence = short window, lower confidence = long window; below threshold = dispute). The AI never releases funds by itself.

Neither side can ghost the other and win: a silent client's money auto-releases after the review window (client still gets the work); a freelancer who quits or misses the deadline gets refunded to the client and takes an on-chain "abandoned" mark. The client's brief and the freelancer's deliverable are **private**: only hashes go on-chain, content is encrypted server-side and gated by wallet signature.

Project name lives in ONE constant: `web/lib/brand.ts` → `export const PROJECT_NAME = "TrustHire"`. (Another unrelated project named TrustHire exists on Sui; a rename must be a one-line change.)

### Locked product decisions
- Native MON is the payment currency. No tokens.
- One contract, one chain (Monad testnet, chain id 10143).
- Job is funded at creation. Client can optionally assign a freelancer (`assignFreelancer`); if nobody is assigned, any non-client address may accept.
- Freelancers **apply off-chain** (backend). Client runs "AI suggest", then assigns on-chain.
- Cancel (client, before acceptance) and abandon (freelancer, before submitting) are REQUIRED features.
- Single milestone per job. No partial payments. No deadline extensions.

### Out of scope (do NOT build)
Multi-milestone, RAG, IPFS, fiat, DAO arbitration, file uploads (text only), chat/messaging, notifications, email, admin dashboards, i18n, dark/light toggle, mainnet deploy, custom domain (stretch only after Gate G4, see INTEGRATION.md).

---

## 2. Tech Stack (pinned majors; do not add packages)

| Layer | Choice |
|---|---|
| Node | 20 LTS |
| Contracts | Solidity `0.8.24`, `evmVersion: "shanghai"`, optimizer on (200 runs), OpenZeppelin Contracts `^5` (`ReentrancyGuard` only) |
| Contract tooling | Hardhat `^2.22` + `@nomicfoundation/hardhat-toolbox` + TypeScript, `@nomicfoundation/hardhat-verify` (Sourcify) |
| Web | Next.js `14` (App Router) + TypeScript + Tailwind CSS 3 |
| Wallet/chain | `wagmi@^2`, `viem@^2`, `@tanstack/react-query@^5`, injected connector only (MetaMask/Brave) |
| Backend | Next.js Route Handlers (same app, same Vercel deploy), `jose` (JWT HS256), `@supabase/supabase-js@^2` |
| DB | Supabase Postgres (service-role key, server only) |
| AI | Jev via HTTP (`fetch`, one file), LLM fallback via Anthropic Messages API (`fetch`, one file) |
| Hosting | Vercel (web + API). Supabase for DB. |

No other dependencies. No UI component libraries. No state management library beyond React Query.

---

## 3. Shared Contracts (ALL agents must honor)

### 3.1 Chain constants (`web/lib/config.ts`, frozen)
```ts
export const CHAIN_ID = 10143;            // Monad testnet
export const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS as `0x${string}`;
export const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL!;
export const EXPLORER_URL = process.env.NEXT_PUBLIC_EXPLORER_URL!; // https://testnet.monadexplorer.com
export const NATIVE_SYMBOL = "MON";
```
Use `monadTestnet` from `viem/chains` if exported; otherwise define the chain manually with id 10143 and the env RPC/explorer URLs. // UNCLEAR if the public RPC URL differs: copy the exact RPC URL from https://github.com/dannwaneri/milestone-escrow (hardhat.config.js) or Monad docs.

**RPC limit:** the public RPC rejects `eth_getLogs` ranges over ~100 blocks. NEVER scan logs over long ranges. Read state with contract reads (`getJob`, `jobCount`, `stats`). Use events only for the current tx receipt.

### 3.2 Shared types (`web/lib/types.ts`, frozen, owned by Devesh)
```ts
export type Address = `0x${string}`;

export enum JobState {
  Funded = 0, Accepted = 1, Submitted = 2, ClientReview = 3,
  Released = 4, Refunded = 5, Cancelled = 6, Disputed = 7, Resolved = 8,
}

export interface Job {            // return of getJob(id) via viem
  client: Address;
  freelancer: Address;            // 0x0 until accepted
  designated: Address;            // 0x0 if none assigned
  amount: bigint;                 // wei
  deadline: bigint;               // unix seconds, delivery deadline
  submittedAt: bigint;
  reviewDeadline: bigint;         // 0 until ClientReview opened; stays set afterwards
  confidenceBps: number;          // 0 until verdict
  state: number;                  // JobState
  briefHash: `0x${string}`;
  deliverableHash: `0x${string}`; // 0x00..00 until submitted
  title: string;
}

export interface Stats { completed: number; ghosted: number; abandoned: number; disputed: number; }

export type Provider = "jev" | "llm";

export interface Application {
  applicant: Address;
  pitch: string;
  skills: string[];
  matchScore: number | null;      // 0-100
  matchDetail: { skillsFit: number; experienceFit: number; scopeFit: number } | null; // each 0-100
  provider: Provider | null;
  stats: Stats;                   // read from chain at response time
}

export interface Brief {          // the string stored is JSON.stringify(Brief) EXACTLY; briefHash = keccak256(utf8(thatString))
  description: string;            // detailed work, <= 4000 chars
  criteria: string[];             // acceptance criteria, 1..8 items, each <= 200 chars
}

export interface ApiError { error: string; code: string; }
```

### 3.3 Contract: `TrustHire.sol` (single file)

**Constructor** `(address reviewer, address arbitrator, address feeRecipient, uint16 feeBps, uint16 confidenceThreshold, uint16 highConfidenceBps, uint32 shortWindow, uint32 longWindow, uint32 verdictTimeout)`.
Validation: `feeBps <= 1000`; `confidenceThreshold <= highConfidenceBps <= 10000`; all addresses non-zero; `shortWindow > 0`; `longWindow >= shortWindow`; `verdictTimeout > 0`. All stored as `immutable`.

**Demo deployment values:** feeBps 200, confidenceThreshold 7500, highConfidenceBps 9500, shortWindow 30, longWindow 90, verdictTimeout 300. Production values (README text only, not deployed): 86400 / 172800 / 86400.

**Public views:** `jobCount()`, `getJob(uint256) returns (Job)`, `stats(address) returns (completed, ghosted, abandoned, disputed)` (public mapping getter), `windowFor(uint16 confidenceBps) returns (uint32)` (= `confidenceBps >= highConfidenceBps ? shortWindow : longWindow`), plus public immutables: `reviewer, arbitrator, feeRecipient, feeBps, confidenceThreshold, highConfidenceBps, shortWindow, longWindow, verdictTimeout`.

Job ids start at 1.

| Function | Caller | Requires | Effect |
|---|---|---|---|
| `createJob(string title, bytes32 briefHash, uint64 deadline) payable returns (uint256 id)` | anyone | `msg.value>0`; title length 1..80 bytes; `briefHash!=0`; `deadline>block.timestamp` | stores job, client=msg.sender, state `Funded`, emits `JobCreated` |
| `assignFreelancer(uint256 id, address f)` | client | state `Funded`; `f!=0`; `f!=client` | sets `designated=f`; may be called again to reassign; emits `JobAssigned` |
| `acceptJob(uint256 id)` | non-client | state `Funded`; `now<deadline`; if `designated!=0` then sender==designated | `freelancer=sender`, state `Accepted`, emits `JobAccepted` |
| `cancelJob(uint256 id)` | client | state `Funded` | refund full amount to client, state `Cancelled`, emits `Refunded(reason=0)` |
| `abandonJob(uint256 id)` | freelancer | state `Accepted` | refund full amount to client, state `Refunded`, `stats[freelancer].abandoned++`, emits `Refunded(reason=1)` |
| `claimRefund(uint256 id)` | client | state `Accepted`; `now>deadline` | refund full amount, state `Refunded`, `stats[freelancer].abandoned++`, emits `Refunded(reason=2)` |
| `submitWork(uint256 id, bytes32 deliverableHash)` | freelancer | state `Accepted`; `now<=deadline`; hash!=0 | stores hash, `submittedAt=now`, state `Submitted`, emits `WorkSubmitted` |
| `submitVerdict(uint256 id, bool pass, uint16 confidenceBps, string provider)` | `reviewer` only | state `Submitted`; `confidenceBps<=10000` | stores `confidenceBps`. If `pass && confidenceBps>=confidenceThreshold`: `reviewDeadline=now+windowFor(confidenceBps)`, state `ClientReview`, emits `VerdictRecorded` + `ReviewWindowOpened`. Else: state `Disputed`, both parties `disputed++`, emits `VerdictRecorded` + `DisputeRaised(id, address(this))` |
| `approveWork(uint256 id)` | client | state `ClientReview` (allowed even after `reviewDeadline` if nobody called autoRelease yet) | pays freelancer minus fee, `freelancer.completed++`, state `Released`, emits `Released(reason=0)` |
| `autoRelease(uint256 id)` | **anyone** | state `ClientReview`; `now>reviewDeadline` | pays freelancer minus fee, `stats[client].ghosted++`, `freelancer.completed++`, state `Released`, emits `Released(reason=1)` |
| `raiseDispute(uint256 id)` | client OR freelancer | (a) sender is client AND state `ClientReview` AND `now<=reviewDeadline`; OR (b) state `Submitted` AND `now>submittedAt+verdictTimeout` AND sender is client or freelancer | state `Disputed`, both parties `disputed++`, emits `DisputeRaised(id, sender)` |
| `resolveDispute(uint256 id, uint16 freelancerShareBps)` | `arbitrator` only | state `Disputed`; `freelancerShareBps<=10000` | `fl = amount*share/10000`; fee = `fl*feeBps/10000`; freelancer gets `fl-fee`; client gets `amount-fl`; fee to `feeRecipient`; state `Resolved`; emits `DisputeResolved` |

Fee math on release: `fee = amount*feeBps/10000`; freelancer gets `amount-fee`.
Security rules: `nonReentrant` on every function that transfers MON; set state BEFORE transferring; transfers via `call{value:}` and revert with `TransferFailed` on failure; no `tx.origin`; no upgradeability; no admin withdraw.

**Custom errors (exact names):** `NotClient, NotFreelancer, NotReviewer, NotArbitrator, NotDesignated, WrongState, DeadlinePassed, DeadlineNotPassed, WindowNotExpired, WindowExpired, BadParams, TransferFailed`.

**Events (exact signatures):**
```solidity
event JobCreated(uint256 indexed id, address indexed client, uint256 amount, uint64 deadline, string title, bytes32 briefHash);
event JobAssigned(uint256 indexed id, address indexed designated);
event JobAccepted(uint256 indexed id, address indexed freelancer);
event WorkSubmitted(uint256 indexed id, bytes32 deliverableHash);
event VerdictRecorded(uint256 indexed id, string provider, bool pass, uint16 confidenceBps);
event ReviewWindowOpened(uint256 indexed id, uint64 reviewDeadline);
event Released(uint256 indexed id, address indexed freelancer, uint256 payout, uint256 fee, uint8 reason); // 0 approved, 1 autoReleased
event Refunded(uint256 indexed id, address indexed client, uint256 amount, uint8 reason);               // 0 cancelled, 1 abandoned, 2 deadlineMissed
event DisputeRaised(uint256 indexed id, address by);
event DisputeResolved(uint256 indexed id, uint16 freelancerShareBps, uint256 freelancerPayout, uint256 clientRefund, uint256 fee);
```
(For `resolveDispute`, `Released` is NOT emitted; only `DisputeResolved`.)

### 3.4 Backend API (Next.js Route Handlers under `web/app/api/`)

Auth = `Authorization: Bearer <jwt>`. JWT payload `{ sub: <lowercase address>, exp }`, HS256, 2h. Error body always `ApiError`. Status codes: 400 bad input, 401 missing/invalid token, 403 not allowed, 404 not found, 409 conflict/state, 500 internal.

| # | Method + path | Auth | Request | Success response | Rules |
|---|---|---|---|---|---|
| 1 | `GET /api/auth/nonce?address=0x..` | none | query | `{ message: string }` | Creates a nonce row (5 min expiry). `message` is exactly `TrustHire sign-in\nAddress: <address lowercase>\nNonce: <hex32>` |
| 2 | `POST /api/auth/verify` | none | `{ address, signature }` | `{ token, expiresAt }` | Verifies with viem `verifyMessage` against the stored message; nonce single-use |
| 3 | `PUT /api/brief/[jobId]` | client | `{ brief: string, publicSummary: string }` | `{ ok: true }` | On-chain: sender==job.client, state `Funded`, `keccak256(utf8(brief))==job.briefHash`. `publicSummary` ≤ 280 chars. 409 if already stored |
| 4 | `GET /api/brief/[jobId]` | client, designated, or freelancer | — | `{ brief: string }` | 403 for everyone else (including applicants not assigned) |
| 5 | `GET /api/summary/[jobId]` | none | — | `{ jobId, publicSummary }` | Public text the client chose to expose; 404 if none |
| 6 | `POST /api/applications/[jobId]` | applicant | `{ pitch: string ≤1000, skills: string[] ≤8, each ≤40 }` | `{ ok: true }` | On-chain: state `Funded`; sender != client. Upsert per (job, applicant) |
| 7 | `GET /api/applications/[jobId]` | client | — | `{ applications: Application[] }` | Sorted by `matchScore` desc (nulls last) |
| 8 | `POST /api/applications/[jobId]/rank` | client | — | `{ recommended: Address \| null, applications: Application[] }` | Runs matcher (see BUILD_contract-backend.md). State must be `Funded`. 409 if zero applications |
| 9 | `PUT /api/deliverable/[jobId]` | freelancer | `{ content: string ≤20000 }` | `{ hash: 0x.. }` | On-chain: sender==job.freelancer, state `Accepted`. `hash = keccak256(utf8(content))`. Overwrite allowed while `Accepted` |
| 10 | `GET /api/deliverable/[jobId]` | see rule | — | `{ content, hash }` | Allowed if: sender==freelancer (always); OR sender==client AND `job.reviewDeadline != 0`; OR sender==arbitrator AND state ∈ {Disputed, Resolved}. Else 403. 404 if none stored |
| 11 | `POST /api/review/[jobId]` | any signed-in | — | `{ pass, confidenceBps, provider, txHash }` | On-chain state must be `Submitted` else 409 `ALREADY_REVIEWED`. Stored content hash must equal `job.deliverableHash` else 409 `HASH_MISMATCH`. Calls `submitVerdict` from the reviewer wallet. ANY AI failure ⇒ `pass:false, confidenceBps:0, provider:"error"` (⇒ Disputed). Never releases funds |
| 12 | `GET /api/health` | none | — | `{ ok: true }` | |
| 13 | `GET /api/verdict/[jobId]` | none | — | `{ provider: "jev" \| "llm" \| "error", confidenceBps: number, pass: boolean }` | Public. Written by endpoint 11 after the verdict tx confirms. 404 if none |

### 3.5 Database (Supabase, created by Devesh via SQL in `web/supabase/schema.sql`)
```sql
create table nonces (address text primary key, message text not null, expires_at timestamptz not null);
create table briefs (job_id bigint primary key, client text not null, brief_enc text not null, public_summary text not null);
create table applications (
  job_id bigint not null, applicant text not null, pitch_enc text not null, skills text[] not null,
  match_score int, match_detail jsonb, provider text, created_at timestamptz default now(),
  primary key (job_id, applicant));
create table deliverables (job_id bigint primary key, freelancer text not null, content_enc text not null, hash text not null);
create table verdicts (job_id bigint primary key, provider text not null, confidence_bps int not null, pass boolean not null);
```
All addresses stored lowercase. `*_enc` = AES-256-GCM, format `base64(iv).base64(ciphertext).base64(tag)`, key `DATA_ENC_KEY` (32 bytes, base64). RLS ON for all tables with NO policies (only the service-role key reads/writes).

### 3.6 Environment variables

| Var | Used by | Owner who sets it |
|---|---|---|
| `NEXT_PUBLIC_CONTRACT_ADDRESS` | web | Devesh (after deploy) |
| `NEXT_PUBLIC_RPC_URL`, `NEXT_PUBLIC_EXPLORER_URL`, `NEXT_PUBLIC_CHAIN_ID=10143` | web | Devesh |
| `NEXT_PUBLIC_MOCK` (`1` = frontend uses `lib/mock.ts`, no chain/API) | web | Vidya (local only; MUST be unset/`0` in Vercel) |
| `RPC_URL` | server | Devesh |
| `REVIEWER_PRIVATE_KEY` | server only | Devesh |
| `JWT_SECRET` (≥32 random bytes) | server only | Devesh |
| `DATA_ENC_KEY` (32 bytes base64) | server only | Devesh |
| `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | server only | Devesh |
| `JEV_API_KEY`, `JEV_BASE_URL`, `JEV_MODEL` | server only | Devesh |
| `LLM_API_KEY`, `LLM_MODEL` | server only | Devesh |
| `DEPLOYER_PRIVATE_KEY`, `REVIEWER_ADDRESS`, `ARBITRATOR_ADDRESS`, `FEE_RECIPIENT_ADDRESS` | contracts/ | Devesh |

`.env*` files MUST be git-ignored. Provide `web/.env.example` and `contracts/.env.example` with names only, no values. Never put a secret in any `NEXT_PUBLIC_*` variable.

### 3.7 Security model (state this in README exactly; do not overclaim)
- On-chain: only title, amounts, addresses, states and **hashes**. Brief and deliverable text never touch the chain.
- Off-chain: encrypted at rest (AES-256-GCM). Reads require a wallet-signature session AND an on-chain role check.
- Applicants cannot read the private brief; they see only the client's public summary.
- The client cannot read the deliverable until the review window has opened. After that, the client keeps access permanently.
- Known limits (say so openly): the server operator can decrypt data; brief and deliverable text are sent to the AI provider (Jev/LLM) for review/ranking; this is not end-to-end encryption; AI scoring is advisory and can be wrong; the arbitrator is a single wallet.

### 3.8 Root file structure (repo root)
```
trusthire/
├─ README.md                         (Devesh)
├─ docs/
│  ├─ BUILD.md  BUILD_contract-backend.md  BUILD_frontend.md  INTEGRATION.md
│  └─ JEV_SCHEMA.md                  (Devesh, Task B0)
├─ contracts/                        (Devesh)
│  ├─ contracts/TrustHire.sol
│  ├─ test/TrustHire.test.ts
│  ├─ scripts/deploy.ts  scripts/seed.ts  scripts/export-abi.ts
│  ├─ deployments/monadTestnet.json
│  ├─ hardhat.config.ts  package.json  tsconfig.json  .env.example
└─ web/
   ├─ package.json  next.config.js  tailwind.config.ts  postcss.config.js  tsconfig.json  .env.example
   ├─ supabase/schema.sql                                   (Devesh)
   ├─ lib/
   │  ├─ types.ts  config.ts  abi.ts                        (Devesh, frozen)
   │  ├─ brand.ts  mock.ts  wagmi.ts  auth.ts  api.ts  format.ts  hooks.ts   (Vidya)
   │  └─ server/                                            (Devesh)
   │     ├─ db.ts  crypto.ts  session.ts  chain.ts
   │     └─ ai/ jev.ts  llm.ts  provider.ts  reviewer.ts  matcher.ts
   ├─ app/
   │  ├─ api/**/route.ts                                    (Devesh)
   │  ├─ layout.tsx  page.tsx  globals.css                  (Vidya)
   │  ├─ jobs/page.tsx  jobs/new/page.tsx  jobs/[id]/page.tsx   (Vidya)
   │  ├─ profile/[address]/page.tsx  arbitrator/page.tsx    (Vidya)
   └─ components/**                                         (Vidya)
```

---

## 4. Team Overview

| Teammate | Role | Owns | Integrates With |
|---|---|---|---|
| Devesh | Contract owner, backend, deploy, README, submission | `contracts/**`, `web/app/api/**`, `web/lib/server/**`, `web/lib/types.ts`, `config.ts`, `abi.ts`, `web/supabase/**`, `README.md`, Vercel + Supabase setup | Vidya via frozen ABI + types + API table §3.4 |
| Vidya | Frontend, UX polish, content | `web/app/**` (except `api`), `web/components/**`, `web/lib/{brand,mock,wagmi,auth,api,format,hooks}.ts`, social posts, ad video | Devesh via ABI + §3.4 endpoints; mock mode until Gate G1 |

Devesh uses AI agents to write the contract from §3.3 (he is not a Solidity specialist). The Hardhat test suite in BUILD_contract-backend.md is the acceptance gate: the contract is NOT deployed until every listed test passes.

---

## 5. DO NOT Section (applies to ALL agents)

- Do not add any feature not listed in this document.
- Do not change shared contract definitions (§3.2, §3.3, §3.4, §3.5, §3.6) without both teammates agreeing and this file updated first.
- Do not rename files or folders.
- Do not install packages not listed in §2.
- Do not use your own judgment to "improve" the code.
- Do not modify files owned by the other teammate.
- Do not scan event logs over long block ranges.
- Do not use `localStorage` for anything except the session token key `th_token` (sessionStorage preferred; see frontend file).
- Do not log secrets, tokens, briefs or deliverables.
- Do not commit `.env*`, private keys, or the Supabase service-role key.
- Do not claim to be first. Say escrow with timeouts and AI-verified escrow already exist; our difference is the confidence-scaled review window, AI applicant suggestion, two-sided ghost protection, and private data handling.
- Do not announce (README/pitch) any feature that is not working at the final test.
