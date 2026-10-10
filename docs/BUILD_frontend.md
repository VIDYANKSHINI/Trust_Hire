# BUILD_frontend.md — Vidya (frontend, UX polish, content)

> ⚠️ AGENT INSTRUCTIONS: You are building ONLY the items in this file. Nothing else. Build exactly as specified. Shared definitions live in `BUILD.md` (read it first). If something is unclear, write `// UNCLEAR: [question]` and stop.

## Your Scope
All screens, components, wallet connection, contract calls from the browser, calls to the backend API, mock mode, visual polish, and the social/video content.

## Your Files
| File | Purpose |
|---|---|
| `web/package.json`, `next.config.js`, `tailwind.config.ts`, `postcss.config.js`, `tsconfig.json` | Next.js 14 + Tailwind scaffold |
| `web/lib/brand.ts` | `export const PROJECT_NAME = "TrustHire"` (single source of the name) |
| `web/lib/wagmi.ts` | wagmi config: Monad testnet chain (from `config.ts`), injected connector only |
| `web/lib/auth.ts` | Wallet sign-in: nonce → `signMessage` → token; token in `sessionStorage` key `th_token`; `authFetch` adds the Bearer header; on 401 re-run sign-in once |
| `web/lib/api.ts` | Typed wrappers for every endpoint in BUILD.md §3.4 |
| `web/lib/hooks.ts` | `useJob(id)`, `useJobCount()`, `useStats(address)`, contract write helpers |
| `web/lib/format.ts` | `shortAddr`, `formatMon(wei)` (4 decimals max), `explorerTx(hash)`, `explorerAddr(a)`, `countdown(seconds)` |
| `web/lib/mock.ts` | Mock data + mock write functions used when `NEXT_PUBLIC_MOCK=1` |
| `web/app/layout.tsx`, `page.tsx`, `globals.css` | Shell + landing |
| `web/app/jobs/page.tsx` | Job list |
| `web/app/jobs/new/page.tsx` | Create job |
| `web/app/jobs/[id]/page.tsx` | Job detail (role-aware, see matrix) |
| `web/app/profile/[address]/page.tsx` | Reputation page |
| `web/app/arbitrator/page.tsx` | Dispute resolution (only usable by the arbitrator wallet) |
| `web/components/*` | See component list below |

## Rules for reading chain data
- Read with viem/wagmi contract reads: `getJob`, `jobCount`, `stats`, `windowFor`, `confidenceThreshold`, `highConfidenceBps`. Poll `getJob` every 3 seconds on the detail page (React Query `refetchInterval: 3000`).
- NEVER call `getLogs` over a long range (public RPC caps ~100 blocks). Read a tx receipt's logs only to show a result.
- `amount`, `deadline`, `submittedAt`, `reviewDeadline` are `bigint`. `confidenceBps` and `state` are numbers.
- All write buttons: disable while the tx is pending, show "Confirm in wallet…" then "Waiting for Monad…", show the explorer link on success, show the decoded custom error name (e.g. `WindowNotExpired`) on failure. Never swallow errors.
- If the wallet is on the wrong chain, show one button "Switch to Monad Testnet" (use wagmi `useSwitchChain`) and disable everything else.

## Your Tasks (module order; each module has an acceptance test)

### Module F1 — Scaffold, wallet, mock mode  (no dependency; start immediately)
- Build: Next.js scaffold, Tailwind, wagmi config, `WalletButton` (connect / short address / switch chain / disconnect), page shell with top nav (Jobs, New job, My profile, Arbitrator), `mock.ts` implementing the `Job`, `Stats`, `Application` types from `lib/types.ts` with at least one job in EVERY state (0–8) and 3 applications. When `NEXT_PUBLIC_MOCK=1`, hooks read mock data and write functions mutate mock state with a 600 ms delay (no wallet needed).
- Acceptance: `npm run dev` runs; every job state renders in mock mode; `npm run build` passes.

### Module F2 — Job list + Create job  (depends on F1)
- `jobs/page.tsx`: card per job (newest first): title, amount in MON, state badge, deadline, client short address, public summary (from `/api/summary/[id]`, fall back to nothing). Filter chips: All / Open (Funded) / In progress / Done. Loops `1..jobCount` reading `getJob` (cap at the latest 30).
- `jobs/new/page.tsx` form: Title (≤80), Public summary (≤280, helper text: "Visible to everyone. Do not put private details here."), Detailed brief (≤4000, helper: "Private. Only you and the assigned freelancer can read this."), Acceptance criteria (1–8 single-line items, add/remove), Amount (MON), Delivery deadline (datetime-local; also quick buttons "+3 min", "+10 min", "+1 day" for demos). Submit sequence: (1) build `Brief` object and `briefString = JSON.stringify(brief)`; (2) `briefHash = keccak256(toBytes(briefString))`; (3) sign in if no token; (4) `createJob(title, briefHash, deadlineSeconds)` with `value = amount`; (5) parse `JobCreated` from the receipt to get `id`; (6) `PUT /api/brief/{id}` with `{brief: briefString, publicSummary}`; (7) navigate to `/jobs/{id}`. If step 6 fails, show a persistent banner on the detail page with a "Retry saving brief" button.
- Acceptance (after G1): a created job appears on-chain and in the list; brief is retrievable by the client only.

### Module F3 — Job detail (shared shell) + client view  (depends on F2)
- `jobs/[id]/page.tsx` determines the viewer's role: `client` (address == job.client), `freelancer` (== job.freelancer), `designated` (== job.designated, not yet accepted), `arbitrator` (== contract `arbitrator`), or `visitor`. Header: title, state badge, amount, deadline countdown, client + freelancer stats pills (`StatsPill`: ✓ completed · ⚠ ghosted · ✕ abandoned), explorer links.
- Show the UI per the **State × Role matrix** below. Client view components: `ApplicantList` (F6), assign, cancel, brief viewer (fetch `GET /api/brief` after sign-in), deliverable viewer, approve, dispute, claim refund.
- Acceptance: in mock mode, every state/role cell shows the correct controls and nothing else.

### Module F4 — Freelancer view  (depends on F3)
- Visitor/applicant on a Funded job: public summary + `ApplyForm` (pitch ≤1000, skills as comma-separated tags ≤8) → `POST /api/applications/{id}`; after applying show "Application sent" and the pitch read-only. If `designated == me`: show "You were selected" + brief viewer + **Accept job**.
- Freelancer on Accepted: brief viewer, deliverable textarea (≤20000), **Submit work** (sequence: sign in → `PUT /api/deliverable` → get `hash` → `submitWork(id, hash)` → once confirmed, automatically `POST /api/review/{id}` and show a spinner "AI reviewer is checking your work…"), **Abandon job** (confirm dialog: "You will take an 'abandoned' mark on your reputation and the client is refunded").
- On Submitted: if no verdict after 20 s show "Run review again" (calls review). If `now > submittedAt + verdictTimeout` show **Raise dispute**.
- Acceptance: freelancer can run apply → accept → submit in mock mode and, after G1/G2, on testnet.

### Module F5 — Review window, verdict, release  (depends on F3, F4)
- `VerdictBadge`: reads `GET /api/verdict/{id}` (public). Copy: "Reviewed by Jev · 91% confidence" / "Reviewed by LLM · 82% confidence" / provider `error` → "Review failed — sent to dispute". If the endpoint returns 404 show "Reviewed · {confidenceBps/100}% confidence" using on-chain `confidenceBps`.
- `ReviewCountdown`: for ClientReview shows "Client review window: {mm:ss} left" and a note "Window length is set by AI confidence: ≥95% → {shortWindow}s, otherwise {longWindow}s (production: 1 day / 2 days)". When the countdown reaches 0 show a prominent **Release funds (anyone can click)** button → `autoRelease`. Client sees Approve + Dispute while the window is open (Approve stays available after expiry until released).
- After Released via autoRelease show a banner on both sides: "Client did not respond. Funds auto-released. Client still has access to the work." and increment is visible via `StatsPill`.
- Acceptance: all paths (approve, dispute, autoRelease) work in mock mode, and on testnet after G3.

### Module F6 — Applicant list + AI suggestion  (depends on F3; real data after B4)
- `ApplicantList` (client, state Funded): list applications from `GET /api/applications/{id}`. Button **"Suggest best freelancer (AI)"** → `POST .../rank`. Show a loading state ("Scoring applicants…"). Show each applicant: short address (link to profile), skills tags, pitch, `matchScore` as a bar 0–100, three sub-scores (Skills / Experience / Scope), provider badge ("Scored by Jev" / "Scored by LLM"), stats pill. The recommended one gets a "Recommended" highlight and is sorted first. Each applicant has an **Assign** button → `assignFreelancer(id, applicant)`. Under the list show the disclaimer: "AI scores are advisory. You choose."
- If `matchScore` is null show "Not scored" (never invent a number).
- Acceptance: mock ranking renders; after B4 a real rank call shows scores.

### Module F7 — Profile + Arbitrator page  (depends on F1)
- `profile/[address]`: address, `stats(address)` as four large counters with labels: Completed jobs, Ghosted by client (client side counter), Abandoned jobs (freelancer side), Disputes. Short explanation under each. If no address in the URL use the connected one.
- `arbitrator`: if connected wallet != contract `arbitrator` show "Only the arbitrator wallet can use this page". Otherwise list jobs in state Disputed: load deliverable + brief via the two GET endpoints (arbitrator can read the deliverable; brief GET is NOT allowed for the arbitrator — show criteria as "not available" and rely on the deliverable). A slider "Freelancer share" 0–100% (steps of 10) + **Resolve** → `resolveDispute(id, share*100)`.
- Acceptance: both pages render in mock mode; resolve works on testnet.

### Module F8 — Landing + polish  (depends on F5)
- `page.tsx`: hero with the one-line pitch: "Escrow where silence can't hold your money hostage." Subline: "An AI decision model suggests who to hire and checks the work. The client keeps the last word. Neither side can ghost the other and win." Three feature cards (AI suggests the freelancer · Confidence sets the review window · Private by design). A **How we differ** table (copy below). "How it works" 5-step strip. Footer: contract address (link to explorer), repo link, "Built on Monad".
- How we differ table rows (use this copy): Basic escrow with timeout — judge: client only; AI-verified escrow — AI approves/rejects and often releases funds; **TrustHire** — AI returns a probability, it sets the client's review window, the client keeps the final word. Plus rows: ghosting client, ghosting freelancer, hiring suggestion, private data, on-chain reputation.
- Visual rules: dark theme, one accent color, consistent spacing, no layout shift on polling, all text readable at 1280×720 (the demo screen) and on a phone. Empty states and loading skeletons for every list. Favicon + page titles.
- Acceptance: full pass at 1280×720 and 390px wide.

### Module F9 — Content (Build in Public, 100 pts)  (start as soon as F2 looks presentable; not blocked by anything)
Required deliverables (all must be posted before **5:45 PM**; posts after the deadline earn nothing):
1. **Post on X or LinkedIn** tagging `@monad`, `@monad_dev`, `@geeky_kartikey`, with a screenshot and the repo/live link. Post once early, then a second "shipped" post.
2. **Demo video** ≥ 30 s showing the product running (screen recording of the real testnet flow; can double as the portal's pitch video).
3. **Creative ad video** 15–30 s (hook line → 3 quick UI shots → tagline "Escrow where silence can't hold your money hostage.").
4. **5K+ combined views** across posts made today: share links to college and friends groups right after posting.
- The portal's pitch video must be landscape, ≤ 90 s, clear audio, MP4/MOV/WebM, < 500 MB.
- Who records which video: decided by the team on the day; this file only lists what must exist.

## State × Role matrix (what to render)

| State | Client | Freelancer / designated | Visitor |
|---|---|---|---|
| 0 Funded | ApplicantList + Suggest + Assign, Cancel, brief viewer | designated: Accept + brief viewer | ApplyForm (if not applied) |
| 1 Accepted | Deadline countdown; **Claim refund** (enabled only when `now > deadline`) | Brief viewer, deliverable editor, Submit work, Abandon | Read-only summary |
| 2 Submitted | "AI reviewing…" | "AI reviewing…", Run review again, Raise dispute (after `verdictTimeout`) | Read-only |
| 3 ClientReview | Deliverable viewer, Approve, Dispute (while window open), ReviewCountdown | VerdictBadge, ReviewCountdown, "Release funds" when 0 | VerdictBadge, ReviewCountdown, "Release funds" when 0 |
| 4 Released | Deliverable viewer (permanent), payout details | Payout details | Read-only |
| 5 Refunded | Refund details | Abandoned notice | Read-only |
| 6 Cancelled | Cancelled notice | — | Read-only |
| 7 Disputed | Waiting for arbitrator (+ deliverable viewer if `reviewDeadline != 0`) | Waiting for arbitrator | Read-only |
| 8 Resolved | Split details + deliverable viewer if `reviewDeadline != 0` | Split details | Read-only |

## Components (all in `web/components/`)
`WalletButton, StatusBadge, StatsPill, JobCard, VerdictBadge, ReviewCountdown, ApplicantList, ApplyForm, BriefViewer, DeliverableViewer, DeliverableEditor, TxButton (handles pending/error/explorer link), CriteriaEditor, Skeleton, EmptyState, Banner`.

## Contracts You Must Honor
BUILD.md §3.1 (chain constants, RPC log limit), §3.2 (types), §3.3 (function names and parameter order for `writeContract`), §3.4 (endpoints, auth header, error shape), §3.7 (security wording used in UI helper text).

## DO NOT
- Do not build anything outside your scope list.
- Do not modify files owned by Devesh (`contracts/**`, `web/app/api/**`, `web/lib/server/**`, `web/lib/{types,config,abi}.ts`, `web/supabase/**`, `README.md`).
- Do not change the shared contract definitions. If you need a type or endpoint changed, message Devesh.
- Do not add packages without updating the master BUILD.md first.
- Do not store the brief, deliverable or any secret in browser storage; the only allowed key is `th_token` in `sessionStorage`.
- Do not hide errors, and do not show a fabricated score, provider name or balance.
- Do not leave `NEXT_PUBLIC_MOCK=1` in any deployed environment.
- Do not add dark/light toggle, animations that delay actions, routing libraries, or UI kits.
