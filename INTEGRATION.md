# INTEGRATION.md — Merge Rules, Gates & Demo Path

> This document defines how the pieces come together. Read it before merging anything. The plan is **module- and gate-based, not hour-based**. The only clocks: **4:00 PM** (feature cut, below), **5:30 PM code freeze**, **5:45 PM submissions close**.

## 1. Gates (the order the project advances)

| Gate | Definition of done | Who | Unblocks |
|---|---|---|---|
| **G0 Setup** | New public repo (created after 11:30 AM) with the layout from BUILD.md §3.8; both can push; Supabase project + Vercel project exist; wallets funded via the event Token Faucet tab and SETUP.md (see §6) | Devesh | everything |
| **G1 Contract live** | C2 tests all pass → deployed to Monad testnet → verified on Sourcify/explorer → `web/lib/abi.ts` + `deployments/monadTestnet.json` pushed → address messaged to Vidya | Devesh | Vidya turns mock off; B2 |
| **G2 Backend core** | B1 + B2 pass their curl acceptance checks against the G1 contract (auth, brief, applications, deliverable with correct 403s) | Devesh | F4 real submit, B3 |
| **G3 Happy path on testnet** | From the deployed or local UI with real wallets: create → (apply → assign) or direct accept → submit → AI verdict → approve → funds released, stats updated | both | B4/F6 real wiring; seed script; video recording |
| **G4 All announced flows** | autoRelease, cancel, abandon, claimRefund, assign + AI suggest, dispute → arbitrator resolve all work on testnet; Vercel deploy live; README tested by an outsider | both | polish, stretch, content finalization |
| **G5 Freeze** | 5:30 PM. Final code pushed. No code changes after this. | both | submission |

**Feature-cut rule (the one clock rule besides freeze):** at **4:00 PM**, any module that has not reached its gate is cut: remove its UI entry points and its README mentions. Priority to cut first: arbitrator UI (F7 part 2) → AI suggest (B4/F6) → profile page polish. Core (G3 flows + cancel/abandon/claimRefund/autoRelease) is never cut. After 4:30 PM: bug fixes only.

## 2. Integration order
1. **Interface freeze first** (BUILD.md §3.2–§3.6 is already the freeze). Vidya builds F1–F6 on mock mode against the same types while Devesh does C0–C3.
2. G1: Devesh pushes ABI + address. Vidya sets `NEXT_PUBLIC_MOCK=0` locally and replaces mock reads with real ones (hooks already abstract this).
3. G2: Devesh tells Vidya the API base URL (local `http://localhost:3000` or the Vercel URL). Vidya turns on `lib/api.ts` real calls.
4. G3: both run the happy path together on one machine (two browser profiles).
5. B4/F6 wire the AI suggestion; B5 seed script is written and run.
6. G4 test sweep (Section 5), then polish and content.

## 3. Interface contracts (every handoff)

| From → To | Artifact | Exact shape | Done when |
|---|---|---|---|
| Devesh → Vidya | ABI | `web/lib/abi.ts` exports `trustHireAbi` `as const` | pushed after C3 |
| Devesh → Vidya | Address + chain | `NEXT_PUBLIC_CONTRACT_ADDRESS`, `NEXT_PUBLIC_RPC_URL`, `NEXT_PUBLIC_EXPLORER_URL` | messaged + in `.env.example` names |
| Devesh → Vidya | Types | `web/lib/types.ts` (frozen) | exists from G0 |
| Devesh → Vidya | API | BUILD.md §3.4 rows 1–13, errors as `ApiError` | G2 |
| Vidya → Devesh | Brief encoding | `briefString = JSON.stringify(Brief)`; `briefHash = keccak256(toBytes(briefString))`; the SAME string is PUT to `/api/brief` | F2 |
| Vidya → Devesh | Deliverable | raw text string; hash returned by `PUT /api/deliverable`, then passed to `submitWork` | F4 |
| Vidya → Devesh | Review trigger | `POST /api/review/{id}` right after `submitWork` confirms | F4 |
| Vidya → Devesh | Auth | Bearer token from `/api/auth/*` via the exact sign-in message | F1/B1 |

Any change to a row above requires: the one who needs it messages the owner, owner updates BUILD.md first, then both change code.

## 4. Merge rules
- Single branch: **`main`**. Two people, separate directories, so no long-lived branches.
- Commit small and often. Before every push: `git pull --rebase origin main`. Never force-push.
- Devesh pushes only: `contracts/**`, `web/app/api/**`, `web/lib/server/**`, `web/lib/{types,config,abi}.ts`, `web/supabase/**`, `README.md`, `docs/**`.
- Vidya pushes only: `web/app/**` (except `api`), `web/components/**`, `web/lib/{brand,mock,wagmi,auth,api,format,hooks}.ts`, and web config files from F1 (`package.json`, tailwind, next config, tsconfig).
- If both need a package, Vidya adds it to `web/package.json` only if it is already in BUILD.md §2; otherwise stop and ask.
- Test before pushing: Devesh runs `npx hardhat test` (contracts) / `curl` checks (API); Vidya runs `npm run build` in `web/`.
- At 5:30 PM Devesh tags `freeze` and no one pushes code afterwards.

### What each agent must NOT touch
| File / Module | Owner | Others must not modify |
|---|---|---|
| `contracts/**` | Devesh | Vidya |
| `web/app/api/**`, `web/lib/server/**`, `web/supabase/**` | Devesh | Vidya |
| `web/lib/types.ts`, `config.ts`, `abi.ts` | Devesh | Vidya (read only) |
| `web/app/**` (non-api), `web/components/**`, `web/lib/{brand,mock,wagmi,auth,api,format,hooks}.ts` | Vidya | Devesh |
| `README.md`, `docs/**` | Devesh | Vidya (suggest edits by message) |

## 5. Test sweep for Gate G4 (both people, with real wallets)
1. Create job → brief visible to client, hidden from a third wallet (403).
2. Two applicants apply → AI suggest → ranking shows scores + provider → assign top → only assigned wallet can accept.
3. Accept → submit good deliverable → verdict badge shows provider + confidence → ClientReview → client sees deliverable → Approve → payout minus 2% fee, stats updated.
4. Second job → submit → do nothing → countdown reaches 0 → **a third wallet** clicks Release → freelancer paid, client `ghosted` +1, client can still open the deliverable.
5. Third job → accept → Abandon → client refunded, freelancer `abandoned` +1.
6. Fourth job → accept → let a short deadline pass → Claim refund → `abandoned` +1.
7. Fifth job → Cancel before anyone accepts → refunded.
8. Sixth job → submit an empty/garbage deliverable → Disputed → arbitrator resolves 70/30 → balances correct.
9. Kill `JEV_API_KEY` in the environment → review still returns a verdict with `provider: llm`.
10. Contract verified on the explorer; README "run from scratch" followed by a person who did not write it.
Anything that fails here is **removed from the README, the pitch and the UI** rather than announced.

## 6. Wallets and MON budget (create before G3)
The event gives **50 testnet MON per participant** via the Token Faucet tab; Devesh and Vidya each claim on their main wallet, and Devesh sends gas money to the helper wallets. All job deposits are **0.01 MON**.

| Role | Used for | MON |
|---|---|---|
| Devesh main = Client (A) + Deployer | creates jobs, deploys | most of his 50 |
| Vidya main = Freelancer (B) | accepts, submits, abandons | her own 50 |
| Reviewer (R) | backend `submitVerdict`; address = `REVIEWER_ADDRESS`; key only in Vercel + local `.env` | 3 (from Devesh) |
| Arbitrator (C) | `resolveDispute`; address = `ARBITRATOR_ADDRESS` | 1 (from Devesh) |
| Applicant 2 (D), Applicant 3 (E) | seeded applications | 1 each (from Devesh) |
| Fee recipient | receives the 2% fee | 0 |
Use testnet-only wallets. Never reuse a real wallet's key. Send the helper-wallet MON as soon as G0 is done.

## 7. Demo path (3 minutes, split screen: Client window left, Freelancer window right)

Pre-seed BEFORE going on stage (so nothing depends on live waiting):
- `seed.ts --applicants` → an open job with two applicants already applied (strong + weak pitch).
- `seed.ts --ghost` → a job that goes through a real AI review into ClientReview. The window is only 30–90 s, so **run this while the previous team is presenting** so the countdown is still running (or already expired: then the Release button is already visible, still valid for the story).
- `seed.ts --refund --deadline-minutes 6` → run ~8 minutes before your slot so the deadline has passed.
- Two wallets pre-connected: Client (left), Freelancer (right). Arbitrator tab ready only if the dispute seed worked.

| # | Time | What happens | Code that runs |
|---|---|---|---|
| 1 | 0:00 | Say the four required items: repo link, contract address, live URL, "deployed on Monad testnet" | slides/README |
| 2 | 0:15 | **Client** opens the seeded open job; two applicants appear; click **Suggest best freelancer (AI)** → scores appear with Jev badge; assign the top one (tx) | F6, `/api/applications/rank`, `assignFreelancer` |
| 3 | 0:50 | **Freelancer** window: accepts, pastes deliverable, submits → "AI reviewer checking…" → badge "Reviewed by Jev · N%" | F4, `/api/deliverable`, `submitWork`, `/api/review`, `submitVerdict` |
| 4 | 1:25 | Show the review window length produced by that confidence; **Client** now sees the work → **Approve** → paid, reputation ticks | F5, `approveWork` |
| 5 | 1:50 | **Privacy beat (10 s):** open the explorer page of the create tx: only a hash and title on-chain; the app shows the full brief to the client only | explorer |
| 6 | 2:00 | **Ghost run:** open the seeded job: countdown at 0 → anyone clicks **Release funds** → freelancer paid, client "ghosted" +1, client can still open the work. Line: "2 days in production, 90 seconds here." | `autoRelease` |
| 7 | 2:30 | **Refund run:** seeded job past deadline → client **Claim refund** → freelancer "abandoned" +1 | `claimRefund` |
| 8 | 2:50 | Close: "The AI suggests and scores, the client has the last word, and silence never holds a freelancer's money hostage." | — |

Notes: (a) Do NOT promise specific confidence numbers; show whatever Jev returned. Only show the "two different windows" twist if two real jobs actually landed on different sides of 95%. (b) Cancel and abandon are working features; show them in the recorded video, not in the 3-minute slot. (c) Every on-chain step above is a real testnet transaction (counts for "live transaction during the demo").

## 8. Portal submission (event portal, fill at ~5:15, submit before 5:45)
Fields seen on the portal: project image (PNG/JPG/GIF ≤ 4 MB), title, category (e.g. "DeFi" or "Payments"), description, team (Devesh Dolas owner + Vidyankshini Vibhute), optional tweet URL, **GitHub URL**, **Demo URL** (if no demo, repeat the repo URL), **pitch video** (required, ≤ 90 s, landscape, clear audio, MP4/MOV/WebM, < 500 MB; plays on the big screen). Prepare the image and video before 5:15.

## 9. Final checklist
- [ ] Public repo created after 11:30 AM; README has live URL + contract address + explorer link
- [ ] Contract deployed on Monad testnet and **verified**
- [ ] Vercel deploy live, mock mode OFF, `/api/health` ok
- [ ] README "run from scratch" tested by an outsider
- [ ] X/LinkedIn post (tags `@monad @monad_dev @geeky_kartikey`), demo video ≥ 30 s, ad video 15–30 s, posted before 5:45
- [ ] Views being pushed to groups right after posting (target 5K combined)
- [ ] Only working features announced in README/pitch
- [ ] Pitch video + project image uploaded to the portal; submission completed before 5:45 PM
- [ ] Stretch only after G4 and only if time remains: mainnet deploy of the same contract (25 pts, costs real MON) → list the address in the README; custom domain (15 pts) → only if already purchased

## 10. Known integration risks
| Risk | Mitigation |
|---|---|
| Contract deploy slips | Vidya keeps building on mock mode; G1 is the only hard dependency; tests must pass first so deploy is one shot |
| Solidity bugs (neither teammate is a Solidity specialist) | Spec is exhaustive; 14-case test list is the acceptance gate; only `ReentrancyGuard` from OpenZeppelin; no upgrade or admin paths; testnet only |
| Jev key/schema not available | B0 documents the real shape or the LLM fallback ships alone with a truthful "Reviewed by LLM" badge |
| AI manipulated by text inside a deliverable | Deliverable passed as untrusted `<data>`; AI never releases funds; client review + dispute remain; stated openly in README limits |
| Both AI providers fail on stage | Fail-safe sends the job to Disputed; approve/autoRelease/refund flows don't depend on AI; backup demo video |
| Public RPC log limit | UI reads contract state only; no `getLogs` scans |
| Brief save fails after `createJob` | Detail page shows "Retry saving brief" (F2); deliverable/brief endpoints re-verify hashes |
| Verification fails | `evmVersion: shanghai`, config copied from a repo that verified on Monad; verify right after the first deploy; re-verify after any redeploy |
| Applicants/clients lose trust in AI scores | UI labels scores advisory; provider badge always truthful; null score shown as "Not scored" |
| Scope creep | Anything not in BUILD.md is cut; 4:00 PM feature-cut rule |
| Content (100 pts) left to the end | F9 starts as soon as the UI is presentable; first post goes out early; all posts live before 5:45 |
