# TrustHire — Monad Blitz Pune V3 Build Plan

**Date:** Sat 10 Oct 2026 | **Coding starts:** 11:30 AM IST | **Code freeze:** 5:30 PM | **Submission closes:** 5:45 PM

> **Rule check:** Everything below is planning only. Do not write or commit any contract/app code before 11:30 AM. Create a brand-new public repo at start time.

---

## 1. One-line pitch

TrustHire is freelance escrow where **an AI decision model checks the work, the client confirms it, and silence can't hold the freelancer's money hostage**: if the client ghosts, funds auto-release after the review window and the client still gets the work they paid for.

**Why Monad:** cheap, fast settlement means every step (deposit, verdict, review, release, reputation) is a visible on-chain action. Be honest on stage: escrow itself works on any chain; Monad makes the verdict → review → release loop feel instant and keeps per-job reputation updates cheap.

### How we differ from existing projects

Escrow with a timeout release, and AI-verified escrow, both already exist (including on Monad testnet). Don't claim to be first. Say this in the README and in the pitch:

| | Basic milestone escrow (timeout release only) | AI-verified escrow (typical) | **TrustHire** |
|---|---|---|---|
| Who judges the work | Client only | LLM or agent approves/rejects, often releasing funds directly | Decision model (Jev) returns a typed probability; client keeps the last word |
| Effect of the AI result | None | Releases funds | **Confidence sets the review window**; low confidence routes to dispute |
| Client ghosts | Timeout release | Varies | Timeout release + on-chain "ghosted" stat |
| Freelancer ghosts | No handling | Varies | Deadline refund + on-chain "abandoned" stat |
| Disputes | None | Varies | Arbitrator splits funds |
| Reputation | None | Sometimes | On-chain, both sides |

**10-second pitch line:** "Escrow with timeouts exists. What's new is that a decision model's probability changes what the contract does, and neither side can ghost the other and win."

---

## 2. Scope: what ships today

| In scope (MVP) | Cut for today |
|---|---|
| Escrow contract: deposit, accept, submit, release | Job search / matching |
| AI reviewer (Jev, with LLM fallback) → on-chain verdict | RAG / embeddings over past work |
| **Client review window + auto-release if client ghosts** | Multi-milestone jobs |
| **Freelancer abandonment: cancel, abandon, deadline refund** | Deadline extensions |
| Simulated dispute: arbitrator wallet resolves | DAO / decentralised arbitration |
| On-chain reputation (incl. "ghosted" counter for clients) | Encrypted IPFS storage for deliverables |
| Platform fee (`feeBps`) on release | Fiat on/off-ramp |
| Frontend: wallet connect, full job flow, review countdown | Real file uploads (text + link only) |

---

## 3. Core flow (the important part)

```
Client funds job
      ↓
Freelancer accepts → submits work   (misses deadline → client claims refund)
      ↓
AI reviewer (Jev / LLM fallback) checks the work
      ├── FAIL or error ──────────────▶ Disputed ──▶ Arbitrator resolves
      └── PASS (≥ threshold)
              ↓
        CLIENT REVIEW WINDOW starts (length set by AI confidence; up to 2 days in prod, ~30-90s in demo)
        Client can now SEE the work
              ├── Client approves ─────────▶ Released (freelancer paid)
              ├── Client disputes ─────────▶ Disputed ──▶ Arbitrator resolves
              └── Client does nothing
                      ↓ window expires
                 Anyone calls autoRelease ─▶ Released (freelancer paid)
                                            + client keeps access to the work
```

**Key rules**
1. The AI verdict **does not release funds by itself**. It moves the job into the client review window. The client's approval or the timer releases funds.
2. The client can see the deliverable from the moment the review window opens. After release, the client keeps access permanently (that's the work they paid for).
3. A client who disappears cannot freeze the freelancer's payment. Silence = acceptance after the window.
4. If the AI fails or errors, the job goes to dispute. Funds never release on a failed or garbage AI result.
5. A freelancer who accepts and then disappears cannot trap the client's money: after the deadline the client claims a full refund, and the freelancer's `abandoned` stat goes up.

---

## 4. Architecture

```
┌──────────────┐     ┌──────────────────────┐     ┌────────────────────┐
│  Frontend    │────▶│  Backend             │────▶│  Provider adapter  │
│ (wallet UI)  │     │  · stores deliverable│     │  Jev  ──or──  LLM  │
└──────┬───────┘     │  · runs AI review    │     └────────────────────┘
       │             │  · signs verdict tx  │
       ▼             └──────────┬───────────┘
┌──────────────────────────────────────────────┐
│        TrustHire contract (Monad testnet)    │
│ escrow · verdict gate · review window ·      │
│ auto-release · dispute · reputation · fee    │
└──────────────────────────────────────────────┘
```

- The **reviewer backend** holds one "reviewer" wallet. Only that address can call `submitVerdict`.
- **Deliverable privacy:** blockchain data is public, so the contract stores only a `deliverableHash`. The actual text/link lives in the backend and is served to the client only once the job is in ClientReview or later (and to the freelancer always). For the hackathon, gate access by checking the wallet's signed message against the job's on-chain state. If time is short, gate by connected wallet address only and note it as a known limitation.

---

## 5. Smart contract spec

### Job states
`Created → Funded → Accepted → Submitted → ClientReview → Released | Disputed → Resolved`

Exits: `Funded → Cancelled` (client cancels before anyone accepts), `Accepted → Refunded` (freelancer abandons or misses the deadline).

### Core functions
| Function | Caller | Effect |
|---|---|---|
| `createJob(description, deadline)` payable | Client | Locks funds, state = Funded |
| `acceptJob(jobId)` | Freelancer | Sets freelancer, state = Accepted |
| `submitWork(jobId, deliverableHash)` | Freelancer | Stores hash, state = Submitted |
| `submitVerdict(jobId, pass, confidenceBps, provider)` | Reviewer wallet only | `pass && confidence ≥ threshold` → state = ClientReview, sets `reviewDeadline = now + windowFor(confidence)`. Otherwise → Disputed |
| `approveWork(jobId)` | Client, during ClientReview | Releases funds (minus fee) to freelancer |
| `raiseDispute(jobId)` | Client during ClientReview, or freelancer after a failed verdict | State = Disputed, funds stay locked |
| `autoRelease(jobId)` | **Anyone**, after `reviewDeadline` | Releases funds (minus fee) to freelancer. Client's access to the work stays unlocked |
| `cancelJob(jobId)` | Client, before anyone accepts | Refunds the deposit, state = Cancelled |
| `abandonJob(jobId)` | Freelancer, before submitting | Refunds the client immediately, state = Refunded, freelancer's `abandoned` +1 |
| `claimRefund(jobId)` | Client, after `deadline` if still Accepted (nothing submitted) | Refunds the full deposit, state = Refunded, freelancer's `abandoned` +1 |
| `resolveDispute(jobId, freelancerShareBps)` | Arbitrator wallet only | Splits funds, state = Resolved |

### Reputation (per address)
`jobsCompleted`, `jobsDisputed`, `disputesWon`, plus:
- **`autoReleased`** (on the client): count of times the client let the window expire without acting. Shown in the UI as a "ghosted" stat so freelancers can see it before accepting a job.
- **`abandoned`** (on the freelancer): count of accepted jobs the freelancer quit or missed the deadline on. Shown in the UI so clients can see it before hiring.

### Config (set at deploy)
- `confidenceThreshold` (default 7500 bps = 75%)
- `shortWindow` / `longWindow` (**seconds**: production 86400 / 172800, i.e. 1 and 2 days; **demo deployment ~30 / ~90**)
- `highConfidenceBps` (default 9500): a passing verdict at or above this gets `shortWindow`; a passing verdict below it gets `longWindow`. This is the Jev twist: the model's probability changes contract behaviour.
- `feeBps` (platform fee on release, e.g. 200 = 2%) and `feeRecipient`
- `reviewer` and `arbitrator` addresses

### Events (the frontend listens to these)
`JobCreated`, `JobAccepted`, `WorkSubmitted`, `VerdictRecorded(provider, pass, confidence)`, `ReviewWindowOpened(deadline)`, `Released(reason: approved | autoReleased | resolved)`, `Refunded(reason: cancelled | abandoned | deadlineMissed)`, `DisputeRaised`, `DisputeResolved`

### Design notes to be ready for
- **Why anyone can call `autoRelease`:** the freelancer, a bot, or a judge can trigger it, so no trusted party is needed. A small keeper script can also call it automatically.
- **Bad-faith disputes:** the client can see the work during review, so a client could take it and dispute. The arbitrator and the reputation system (`jobsDisputed`, `disputesWon`) are the deterrent. Mention this honestly; it's the same trade-off real platforms face.
- **Freelancer exits (MVP limits):** no partial payment if the freelancer quits at 70%, no deadline extensions, and no freelancer stake. All three are future work.

---

## 6. AI reviewer: Jev first, LLM fallback

### The questions we ask
Jev answers bounded yes/no ("noul") questions and returns a probability of yes. Split the judgment into independent questions and combine in code:

1. "Does the deliverable address every requirement in the job description?"
2. "Is the deliverable substantive, not placeholder or empty content?"

Final probability = **minimum** of the question probabilities (conservative: all must hold).

### Provider adapter (one interface, two implementations)

```
ReviewResult { pass: bool, confidence: float 0-1, provider: "jev" | "llm", reason?: string }

review(jobDescription, deliverable):
    if JEV_API_KEY is set:
        try Jev (timeout 4s)  → return result
        on error / timeout / non-200 / malformed → fall through
    return LLM fallback (strict JSON output)
```

**Selection rules**
1. `JEV_API_KEY` present **and** Jev answers within 4 seconds → Jev.
2. Missing key, API error, timeout or malformed response → LLM fallback automatically.
3. `provider` is written on-chain in `VerdictRecorded` and shown as a badge in the UI ("Reviewed by Jev" / "Reviewed by LLM"). What judges see is always truthful.

### Jev notes
- **Confirm the endpoint, auth header and request/response shape from TypeSafe's docs at 11:30.** Don't guess the schema. Wrap it in one function so a mismatch only affects one file.
- Jev returns a yes probability directly; `pass = probability ≥ threshold`.

### LLM fallback notes
- One call with a strict JSON-only prompt: `{"decision": true|false, "confidence": 0.0-1.0}`.
- Validate and clamp. If parsing fails, return `pass: false, confidence: 0` (fail-safe → dispute).
- **Honest caveat:** an LLM's self-reported confidence is not calibrated like Jev's probability. Say so if asked.

### Fail-safe principle
Any failure in the review pipeline resolves to "open dispute," never to "release funds."

---

## 7. Demo flow (3 minutes)

Three wallets: **Client**, **Freelancer**, **Arbitrator**. Deploy the demo contract with `reviewWindow` = 60 to 120 seconds.

1. **Client** posts a job and deposits MON → escrow visible on Monad.
2. **Freelancer** accepts and submits the deliverable.
3. UI shows "Reviewed by Jev: 87% yes" → job enters **Client Review** → the client sees the work.
4. **Client approves** → funds release, reputation ticks up on both profiles.
5. **Ghost run:** pre-seeded second job already in ClientReview. Show the countdown hit zero → click **autoRelease** (from any wallet) → freelancer paid, the client's "ghosted" stat increments, and the client still opens the deliverable. This is the standout moment: say "2 days in production, 90 seconds here."
6. **Refund run:** pre-seeded job with a ~2 minute deadline that the freelancer never submits → deadline passes → client claims the refund → freelancer's `abandoned` stat increments.
7. **Dispute run (if time):** pre-seeded failing job → Disputed → Arbitrator splits 70/30.
8. Close: "The AI returns a probability, the client gets the last word, and silence never holds a freelancer's money hostage."

**Show the Jev twist:** run two jobs with different confidence (e.g. 97% and 82%). The UI shows different review windows (short vs long). This is your originality proof, so don't skip it.

**Pre-seed** the ghost job, the refund job and the dispute job before going on stage so nothing depends on live typing or waiting.

---

## 8. Judging rubric: points checklist (300 total)

### Project Working (100) — highest priority, cheapest points
- [ ] **All announced functions working (25):** announce only what works at 4:30. Cut shaky features from the README and pitch.
- [ ] **Live transaction during demo (25):** every demo step is a real testnet tx.
- [ ] **Contract verified on explorer (25):** verify **immediately after the first deploy**, not at 5 PM. Re-verify after any redeploy.
- [ ] **Someone else can run it from the README (25):** at ~4:30, a teammate or outsider follows the README from scratch with zero help. Fix every gap.

### Build in Public (100) — one owner (third teammate), start at 11:30
- [ ] **Post on X or LinkedIn (25):** tag `@monad`, `@monad_dev`, `@geeky_kartikey`. Post a mid-day "what we're building" update.
- [ ] **Demo video (25):** 30+ seconds, product running. The backup demo recording can double as this.
- [ ] **Creative ad video (25):** separate 15–30s punchy clip.
- [ ] **5K+ combined views (25):** post early so views accumulate; push links into college and friend groups.

### Bonus (100)
- [ ] **Mainnet deploy (25):** stretch task, only after testnet is fully working (~4:30). Costs real MON.
- [ ] **Custom domain (25):** buy early (DNS takes time) and point at Vercel. Check whether a `*.vercel.app` address counts.
- [ ] **Product-market fit (15):** README + pitch. The pain is real: freelancers get ghosted, and clients get unfinished work.
- [ ] **Revenue potential (up to 20):** `feeBps` on release is the model, live on-chain. Optional second stream: a dispute/arbitration fee. Verify any competitor fee figure before citing it.
- [ ] **Innovation (up to 20):** confidence-scaled review window (a decision model's probability changes contract behaviour) + two-sided ghost protection + on-chain reputation for both sides.

---

## 9. Team split and timeline

| Time | You (contract + backend) | Frontend teammate | Third member |
|---|---|---|---|
| 11:30–12:00 | Repo, Foundry/Hardhat, Jev docs check | Next.js scaffold, wallet connect, Monad testnet config | README skeleton, **first social post**, buy domain |
| 12:00–2:30 | Contract + tests, deploy, **verify on explorer** | Create/accept/submit screens, job list | Fund test wallets, seed data, content for posts |
| 2:30–3:30 | Review backend + provider adapter + deliverable store | Verdict badge, **review window + countdown UI**, dispute screen | Demo script, record clips |
| 3:30–4:30 | Wire backend ↔ contract, end-to-end test, **autoRelease path** | Wire UI to events, reputation view | **README test with an outsider**, edit videos |
| 4:30–5:15 | Bug fixes only; optional mainnet deploy | Vercel deploy + domain, polish | Final README (contract address, live URL), post videos |
| 5:15–5:30 | Code freeze, final deploy check | | |
| 5:30–5:45 | **Submit** | | |

---

## 10. Submission checklist

- [ ] New public repo created at/after 11:30 AM
- [ ] README: problem, solution, flow diagram, architecture, run-from-scratch steps
- [ ] Contract deployed on Monad Testnet, **verified**, address in README
- [ ] Frontend live on Vercel (and custom domain if done), URL in README
- [ ] Demo contract uses a short `reviewWindow`; README states the production value (2 days)
- [ ] Backup demo video
- [ ] Social posts live with required tags
- [ ] Submitted before 5:45 PM

---

## 11. Risks and mitigations

| Risk | Mitigation |
|---|---|
| Jev API access not instant | Fallback built in; demo identical with the LLM |
| Both AI providers fail on stage | `approveWork`, `autoRelease` and arbitrator flows still work; backup video |
| 2-day window can't be demoed | Configurable `reviewWindow`; demo deploy uses ~90s; pre-seeded ghost job |
| Deliverable visible on a public chain | Store only the hash on-chain; content served by backend after state check |
| Client takes the work then disputes in bad faith | Arbitrator + on-chain dispute stats; stated openly in the pitch |
| Testnet slow/down | Backup video; one tx per demo step |
| "This already exists" feedback | Say it first (How we differ table); lead with the confidence-scaled window; never claim to be first |
| Scope creep | Anything outside Section 2's "In scope" is cut |

---

## 12. Monad-specific tips (from another Monad project's README; confirm on the day)

- **Verification (25 pts):** Monad's explorer verifies through Sourcify, not an Etherscan-style API key. A "partial match" still gives verified source.
- **EVM version:** set the compiler EVM version to `shanghai`; Hardhat's default `paris` reportedly produced bytecode that broke verification.
- **Event reads:** the public RPC reportedly caps `eth_getLogs` ranges at about 100 blocks. Have the frontend read job state directly from the contract instead of scanning long block ranges.
- **Faucets:** Monad faucet for testnet MON (the plan uses native MON).

---

## 13. Future work (pitch slide, not code)

- RAG over a freelancer's past deliverables for context-aware review
- Decentralised arbitration (Kleros-style jury) replacing the single arbitrator wallet
- Encrypted deliverables on IPFS, key released on payment
- Multi-milestone jobs with partial releases
- Freelancer stake so abandoning costs money; deadline extensions by mutual agreement
- USDC settlement instead of native MON
- Jev for risk screening alongside an LLM that explains disputes in prose
