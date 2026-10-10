# TrustHire — Full Plan (Monad Blitz Pune V3)

**Date:** Sat 10 Oct 2026 · **Coding window:** 11:30 AM–5:30 PM IST · **Code freeze:** 5:30 PM · **Submissions close:** 5:45 PM · **Demos:** 6:00–8:30 PM (3 minutes per team) · **Awards:** 8:50 PM
**Team:** Devesh Dolas (contract owner, backend, deploy, README) and Vidyankshini Vibhute (frontend, UX, content)

> This is the single readable plan. Exact specs for the agents live in `BUILD.md`, `BUILD_contract-backend.md`, `BUILD_frontend.md`, `INTEGRATION.md` and `SETUP.md`. If this file and `BUILD.md` ever disagree, `BUILD.md` wins.
> **Rule check:** the repo must be NEW and PUBLIC, created after 11:30 AM. No code from before the window.

---

## 1. One-line pitch

TrustHire is freelance escrow on Monad where an AI decision model **suggests who to hire and checks the work**, the client keeps the last word, and **neither side can ghost the other and win**: a silent client's money auto-releases after the review window (and the client still gets the work), and a freelancer who quits or misses the deadline gets the client refunded and takes an on-chain "abandoned" mark. The brief and the finished work stay **private**: only hashes go on-chain.

**10-second pitch line:** "Escrow with timeouts exists. What's new is that a decision model's probability changes what the contract does, it helps you pick the freelancer, and your work stays private."

**Why Monad (be honest on stage):** escrow works on any chain. Monad's cheap, fast settlement makes every step (deposit, assignment, verdict, review window, release, reputation) a visible on-chain action that feels instant, and keeps per-job reputation updates cheap.

### How we differ (say this first; never claim to be first)

| | Basic milestone escrow (timeout release) | AI-verified escrow (typical) | AI-matched marketplace | **TrustHire** |
|---|---|---|---|---|
| Examples seen | `milestone-escrow` on Monad (USDC, 7-day timeout, Telegram alerts) | `genmarket-escrow` on GenLayer (validators judge a public URL, approve or refund) | `trust-hire-ruddy` on Sui (AI matching + trust scores) | This project |
| Who judges the work | Client only | AI decides, often releases funds | n/a | AI returns a probability; **client keeps the last word** |
| What the AI result changes | Nothing | Releases or refunds funds | Ranking | **Sets the client's review window**; low confidence goes to dispute |
| Hiring suggestion | None | None | Yes | **Yes: AI scores applicants against the private brief + acceptance criteria** |
| Client ghosts | Timeout release | Varies | Varies | Timeout release + on-chain "ghosted" stat; client keeps access to the work |
| Freelancer ghosts | None | Varies | Varies | Cancel / abandon / deadline refund + on-chain "abandoned" stat |
| Private brief and work | Public or none | Public evidence | Varies | **Hashes on-chain; content encrypted and wallet-gated** |
| Reputation | None | Sometimes | Off-chain or Sui | On-chain, both sides |

Note: another unrelated project named "TrustHire" exists on Sui. The product name is one constant (`web/lib/brand.ts`), so a rename is a one-line change.

---

## 2. Scope

| In scope (ships today) | Cut for today |
|---|---|
| Escrow contract: create, assign, accept, submit, verdict, approve, auto-release | Multi-milestone jobs, partial payments |
| **Cancel** (client, before acceptance) and **abandon** (freelancer, before submitting) | Deadline extensions |
| Deadline refund (`claimRefund`) with freelancer "abandoned" stat | Freelancer stake / slashing |
| **Client review window with auto-release if the client ghosts** | RAG / embeddings over past work |
| AI reviewer (Jev primary, LLM fallback) → on-chain verdict; **confidence sets the window** | Job search / matching algorithms beyond the AI score |
| **AI applicant suggestion** (freelancers apply, Jev scores, client assigns) | Real file uploads (text only), IPFS |
| Private brief and deliverable (hashes on-chain, encrypted server-side, wallet-signature gated) | End-to-end encryption, key exchange |
| Dispute resolved by an arbitrator wallet | DAO / jury arbitration |
| On-chain reputation (completed, ghosted, abandoned, disputed) | Fiat on/off-ramp, USDC settlement |
| Platform fee (`feeBps`, 2%) on release | Notifications, chat, email |
| Wallet-connect frontend with role-aware screens | Mainnet, custom domain (stretch only after G4) |

---

## 3. Core flow

```
Client creates job (title, private brief + acceptance criteria, deadline, 0.01 MON deposit)
      │  (brief hash on-chain; brief text encrypted off-chain)
      ├── Client cancels before anyone accepts ───────▶ Cancelled (refund)
      ▼
Freelancers apply (pitch + skills, off-chain)
      ▼
Client clicks "Suggest best freelancer (AI)"  → Jev scores each applicant
      ▼                                           (skills fit · experience fit · scope fit)
Client assigns one on-chain ──▶ Freelancer accepts
      ├── Freelancer abandons ─────────────────────▶ Refunded (+ abandoned stat)
      ├── Deadline passes, nothing submitted ──────▶ Client claims refund (+ abandoned stat)
      ▼
Freelancer submits the work (text; hash on-chain)
      ▼
AI reviewer (Jev, LLM fallback) checks the work against the acceptance criteria
      ├── FAIL, below threshold, or ANY error ─────▶ Disputed ──▶ Arbitrator splits funds
      └── PASS (≥ threshold)
              ▼
        CLIENT REVIEW WINDOW (length set by AI confidence; demo 30 s / 90 s, production 1 / 2 days)
        Client can now SEE the work
              ├── Client approves ─────────────────▶ Released (freelancer paid)
              ├── Client disputes ─────────────────▶ Disputed ──▶ Arbitrator
              └── Client does nothing, window expires
                      ▼
                 Anyone calls autoRelease ────────▶ Released (+ client "ghosted" stat);
                                                    client keeps access to the work
```

**Key rules**
1. The AI never releases funds. A passing verdict only opens the client's review window; the client's approval or the timer releases the money.
2. The client cannot see the deliverable until the window opens, and keeps access permanently afterwards (that is the work they paid for).
3. A client who disappears cannot freeze the freelancer's payment: silence equals acceptance after the window.
4. A freelancer who disappears cannot trap the client's money: cancel, abandon or the deadline refund return it.
5. Any AI failure, timeout or garbage output becomes a dispute, never a release. If the AI never answers, either party can raise a dispute after `verdictTimeout`.
6. The AI suggestion is advisory. The client chooses the freelancer.

---

## 4. Architecture

```
┌───────────────────┐   ┌──────────────────────────────┐   ┌──────────────────────┐
│ Frontend (Next.js)│──▶│ Backend (Next.js API routes) │──▶│ AI provider adapter  │
│ wagmi/viem wallet │   │ · wallet-signature sessions  │   │  Jev  ──or──  LLM    │
└─────────┬─────────┘   │ · encrypted brief/deliverable│   └──────────────────────┘
          │             │ · applications + AI ranking  │
          │             │ · runs review, signs verdict │──▶ Supabase (encrypted data)
          ▼             └───────────────┬──────────────┘
┌────────────────────────────────────────────────────────────┐
│ TrustHire contract (Monad testnet, one file, verified)     │
│ escrow · assignment · verdict gate · review window ·       │
│ auto-release · cancel/abandon/refund · dispute · reputation│
└────────────────────────────────────────────────────────────┘
```

- One repo (`contracts/` Hardhat project + `web/` Next.js app including the API), one Vercel deploy, one Supabase project.
- The backend holds a single **reviewer wallet**. Only that address can call `submitVerdict`.
- The frontend reads state straight from the contract (no long `getLogs` scans: the public RPC caps ranges at about 100 blocks).

---

## 5. Contract summary (full spec in `BUILD.md` §3.3)

**States:** Funded → Accepted → Submitted → ClientReview → Released, with exits Cancelled, Refunded, Disputed → Resolved.

| Function | Caller | Effect |
|---|---|---|
| `createJob(title, briefHash, deadline)` payable | Client | Locks MON, state Funded |
| `assignFreelancer(id, address)` | Client | Designates who may accept |
| `acceptJob(id)` | Designated freelancer (or anyone if none designated) | State Accepted |
| `cancelJob(id)` | Client, before acceptance | Refund, state Cancelled |
| `abandonJob(id)` | Freelancer, before submitting | Refund, freelancer `abandoned` +1 |
| `claimRefund(id)` | Client, after the deadline with nothing submitted | Refund, freelancer `abandoned` +1 |
| `submitWork(id, deliverableHash)` | Freelancer | State Submitted |
| `submitVerdict(id, pass, confidenceBps, provider)` | Reviewer wallet only | Pass and confidence ≥ threshold → ClientReview with window by confidence; otherwise Disputed |
| `approveWork(id)` | Client | Pays freelancer minus fee |
| `autoRelease(id)` | **Anyone**, after the window | Pays freelancer minus fee, client `ghosted` +1 |
| `raiseDispute(id)` | Client in the window, or either party after `verdictTimeout` | State Disputed |
| `resolveDispute(id, freelancerShareBps)` | Arbitrator wallet only | Splits funds, state Resolved |

**Config (set at deploy):** `confidenceThreshold` 7500 bps · `highConfidenceBps` 9500 · `shortWindow` 30 s · `longWindow` 90 s · `verdictTimeout` 300 s · `feeBps` 200 (demo; production windows 1 day / 2 days).
**The Jev twist (innovation claim):** a passing verdict at or above 95% gets the short window, a passing verdict below it gets the long window. The model's probability changes what the contract does.
**Reputation (per address):** `completed`, `ghosted` (client let the window expire), `abandoned` (freelancer quit or missed the deadline), `disputed`. Shown in the UI so each side can check the other before committing.
**Safety:** one small contract, OpenZeppelin `ReentrancyGuard`, state changes before transfers, no admin withdrawal, no upgradeability. The 14-case Hardhat test list in `BUILD_contract-backend.md` must pass before any deploy.

---

## 6. AI roles: Jev first, LLM fallback

Jev is TypeSafe's decision model (launched 15 Sept 2026). It answers yes/no statements (`noul`) with a probability instead of generating text. We split every judgment into independent yes/no statements and combine them in code.

| Job | Statements asked | Combined into |
|---|---|---|
| **Review the work** | "The deliverable satisfies every acceptance criterion." · "The deliverable is real, substantive work, not placeholder or off-topic." | `confidence = min(...)`, `pass = confidence ≥ threshold` |
| **Rank applicants** | "Skills match the brief." · "Pitch shows relevant experience." · "Pitch shows they understand the scope and criteria." | `score = 100 × (0.4·skills + 0.35·experience + 0.25·scope)`; highest score is "Recommended" |

- **Selection:** Jev if a key is set and it answers within 4 seconds; any error, timeout or malformed answer falls through to the LLM; if that fails too, a review becomes a dispute and a ranking shows "Not scored". The UI badge always names who actually answered ("Reviewed by Jev" / "by LLM").
- **Jev access:** TypeSafe console, AI/ML API, NanoGPT or OpenRouter, whichever key arrives first (check the event page and mentors for any provided credits). The exact request shape is confirmed from the docs and saved in `docs/JEV_SCHEMA.md`; nothing is guessed.
- **Honest caveats:** an LLM's self-reported probability is not calibrated like Jev's; AI scoring is advisory and can be wrong; deliverable text could try to manipulate the model, so it is passed as untrusted data and the AI can never release funds by itself.

---

## 7. Privacy and security model

| Data | On-chain | Off-chain | Who can read it |
|---|---|---|---|
| Job title, amount, addresses, states, deadlines | Yes | — | Everyone |
| Public summary (client's choice) | No | Yes | Everyone |
| Private brief + acceptance criteria | Hash only | Encrypted (AES-256-GCM) | Client; the assigned freelancer. **Not applicants** |
| Applications (pitch, skills) | No | Encrypted | The client |
| Deliverable | Hash only | Encrypted | Freelancer always; client only after the review window opens (then permanently); arbitrator in a dispute |

Access = wallet-signature session (sign a nonce message, short-lived token) **plus** an on-chain role check on every request.
**Known limits, stated in the README:** the server operator can decrypt data; brief and work text are sent to the AI provider for scoring and review; this is not end-to-end encryption; the arbitrator is a single wallet; a client who sees the work could still dispute in bad faith (the arbitrator and the `disputed` stat are the deterrent, the same trade-off real platforms face).

---

## 8. Demo (3 minutes, split screen: Client left, Freelancer right)

Pre-seed before going on stage so nothing depends on live waiting: an open job with two applicants; a job sitting in review (run while the previous team presents so the countdown is running); a refund job whose deadline has passed. Everything shown is a real testnet transaction.

| Time | Beat |
|---|---|
| 0:00 | Say the four required items out loud: **repo link, contract address, live URL, deployed on Monad testnet** |
| 0:15 | Client: seeded job with two applicants → **Suggest best freelancer (AI)** → scores + "Scored by Jev" → assign top candidate |
| 0:50 | Freelancer: accept, submit → "Reviewed by Jev · N%" → review window starts, client now sees the work |
| 1:25 | Client approves → paid, reputation ticks up |
| 1:50 | **Privacy beat:** explorer shows only a hash and title; the app shows the full brief only to the client |
| 2:00 | **Ghost run:** countdown hits zero → any wallet clicks Release → freelancer paid, client "ghosted" +1, client still opens the work. "Two days in production, ninety seconds here." |
| 2:30 | **Refund run:** deadline passed → client claims refund → freelancer "abandoned" +1 |
| 2:50 | Close: "The AI suggests and scores, the client has the last word, and silence never holds a freelancer's money hostage." |

Notes: do not promise specific confidence numbers; show the "two different window lengths" twist only if two real jobs land on different sides of 95%. Cancel and abandon are working features shown in the recorded video, not the 3-minute slot.

---

## 9. Judging rubric (400 points) and how we score it

**Basic (100):** required to be eligible for prizes.
- [ ] Public GitHub repo (25) — created after 11:30 AM
- [ ] Proper README with live public page + contract address (25)
- [ ] Contracts deployed on Monad testnet (25)
- [ ] Project publicly hosted, any host (25) — Vercel

**Advance: Project Working (100)**
- [ ] All announced functions working (25) — announce only what passed the G4 sweep
- [ ] Live transaction during the demo (25) — every demo step is a real tx
- [ ] Contract verified on the explorer (25) — verify right after the first deploy; confirm with an organizer which explorer they check
- [ ] Someone else can run it from the README with no help (25) — test with an outsider before freeze

**Advance: Build in Public (100)** — post before 5:45 PM; late posts earn nothing
- [ ] Post on X/LinkedIn tagging `@monad`, `@monad_dev`, `@geeky_kartikey` (25)
- [ ] Demo video, 30 s or longer, product running (25)
- [ ] Creative product ad video (25)
- [ ] 5K+ combined views across posts made today (25) — post early, push to college and friend groups

**Bonus (100)**
- [ ] Mainnet deploy (25, organizers) — stretch only after G4; costs real MON
- [ ] Custom domain (15, organizers) — stretch; `*.vercel.app` does not count as custom
- [ ] Pre-market fit (up to 20, judges) — freelancers get ghosted, clients get unfinished work; README + pitch
- [ ] Revenue potential and strategy (up to 20, judges) — 2% `feeBps` on release, live on-chain; optional dispute/arbitration fee
- [ ] Innovation and originality (up to 20, judges) — confidence-scaled review window + AI applicant suggestion + two-sided ghost protection + private data + on-chain reputation, framed honestly against the three existing projects

**Priority:** Basic (100) and Project Working (100) are the cheapest points, then Build in Public (100). Innovation is only 20 of 400, so do not trade execution for novelty.

---

## 10. How the work is organized (modules and gates, not hours)

| Gate | Done when |
|---|---|
| **G0 Setup** | New public repo, both can push, Supabase + Vercel exist, wallets funded |
| **G1 Contract live** | 14 tests pass → deployed → verified → ABI + address pushed |
| **G2 Backend core** | Auth, brief, applications, deliverable endpoints pass their checks against the live contract |
| **G3 Happy path** | Real wallets, real UI: create → accept → submit → verdict → approve |
| **G4 All flows** | Auto-release, cancel, abandon, refund, assign + AI suggest, dispute/resolve all work; deployed; README tested by an outsider |
| **G5 Freeze** | 5:30 PM, code pushed, tag `freeze` |

| Devesh | Vidya |
|---|---|
| C0 repo/tooling → C1 contract (AI agent writes from spec) → C2 tests → C3 deploy, verify, export ABI | F1 scaffold + wallet + **mock mode** (build before the contract exists) |
| B0 Jev key + schema (in parallel) → B1 auth/crypto/DB → B2 brief/applications/deliverable APIs | F2 job list + create job → F3 job detail shell + client view → F4 freelancer view |
| B3 AI layer + review endpoint → B4 applicant ranking → B5 seed script | F5 review window, verdict, release → F6 applicant list + AI suggestion → F7 profile + arbitrator |
| B6 Vercel deploy → B7 README | F8 landing + polish → **F9 content (posts, demo video, ad video) starts early** |

**One clock rule besides the freeze:** at **4:00 PM**, any module that has not reached its gate is cut (arbitrator UI first, then AI suggestion). The core (create, accept, submit, review, approve, auto-release, cancel, abandon, claim refund) is never cut. After 4:30 PM, bug fixes only.

**Wallets and MON:** the event gives 50 testnet MON per participant. Devesh's main wallet is Client + Deployer, Vidya's is Freelancer. Helper wallets get gas from Devesh: Reviewer 3, Arbitrator 1, two seeded applicants 1 each. Every job deposit is 0.01 MON.

---

## 11. Submission checklist

- [ ] New public repo created after 11:30 AM
- [ ] README: pitch, honest "How we differ", problem, flow diagram, AI roles, security model with limits, architecture, contract address + explorer link, live URL, run-from-scratch steps (tested by an outsider), demo-vs-production config, future work
- [ ] Contract deployed on Monad testnet and **verified**, address in the README
- [ ] Vercel deploy live (mock mode OFF), URL in the README
- [ ] Only features that passed the G4 sweep are announced
- [ ] Social post with required tags, demo video, ad video, all posted before 5:45 PM
- [ ] Portal fields ready: project image (PNG/JPG/GIF, 4 MB max), title, category, description, team, optional tweet URL, GitHub URL, demo URL (repeat the repo URL if none), **pitch video** (required, 90 s max, landscape, clear audio, MP4/MOV/WebM, under 500 MB)
- [ ] Submitted through the Pune V3 event portal before 5:45 PM

---

## 12. Risks and mitigations

| Risk | Mitigation |
|---|---|
| "This already exists" feedback | Say it first (How we differ table); never claim to be first; lead with confidence-scaled window, AI suggestion and privacy |
| Neither teammate is a Solidity specialist | Exhaustive spec, one small contract, only `ReentrancyGuard`, 14-case test gate before deploy, testnet only |
| Jev access or schema not instant | Fallback built in; B0 saves the verified request shape; demo works with the LLM alone ("Reviewed by LLM") |
| Both AI providers fail on stage | Review fails safe to Disputed; approve, auto-release, refund and cancel don't depend on AI; backup demo video |
| AI manipulated by text inside a deliverable | Untrusted-data framing; AI can't release funds; client review and dispute remain |
| 2-day window can't be demoed | Demo deployment uses 30 s / 90 s windows; pre-seeded jobs; README states production values |
| Brief save fails after `createJob` | "Retry saving brief" on the job page; endpoints re-verify hashes |
| Verification fails | `evmVersion: shanghai`; Hardhat config copied from a repo that verified on Monad; verify immediately after the first deploy |
| Public RPC rate limit (about 25 requests/second) | Contract reads only, 3-second polling; backup RPCs listed in `SETUP.md` |
| Build in Public left to the end (100 pts) | Content module starts as soon as the UI is presentable; first post goes out early |
| Scope creep | Anything outside Section 2 is cut; 4:00 PM cut rule |

---

## 13. Monad-specific notes (confirmed from public docs or a verified Monad project)

- Testnet chain id `10143`, public RPC `https://testnet-rpc.monad.xyz`, symbol `MON`, event faucet tab plus `https://faucet.monad.xyz`. Mainnet is chain id `143`, RPC `https://rpc.monad.xyz`.
- Explorers listed by Monad include MonadVision, Monadscan and Socialscan; the verified project we studied links `https://testnet.monadexplorer.com`. Ask which one the judges check.
- Verification goes through Sourcify (not an Etherscan-style key); "partial match" still shows verified source.
- Compile with `evmVersion: "shanghai"`; Hardhat's default `paris` reportedly breaks verification.
- Public RPC caps `eth_getLogs` at about 100 blocks: read contract state directly.

---

## 14. Future work (pitch slide, not code)

- RAG over a freelancer's past deliverables for context-aware review and matching
- Decentralized arbitration (jury) replacing the single arbitrator wallet
- Client-side encryption with keys released on payment, and IPFS storage
- Multi-milestone jobs with partial releases; freelancer stake so abandoning costs money; deadline extensions by mutual agreement
- USDC settlement instead of native MON
- Jev for risk screening alongside an LLM that explains disputes in prose
