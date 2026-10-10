# SETUP.md — Step-by-step setup for Devesh and Vidya

Do the shared steps first (both people), then your own section. Everything here is a one-time setup; the build specs are in `BUILD*.md`.

> **Never paste a private key or API key into a chat, a GitHub issue or a social post.** Keys live only in local `.env` files and in Vercel/Supabase settings. `.env*` must be git-ignored.

## 0. Shared: Monad testnet in your wallet (both)

Add the network to MetaMask/Brave Wallet manually (Settings → Networks → Add network):

| Field | Value |
|---|---|
| Network name | Monad Testnet |
| RPC URL | `https://testnet-rpc.monad.xyz` |
| Chain ID | `10143` |
| Currency symbol | `MON` |
| Block explorer | `https://testnet.monadexplorer.com` (used by the verified Monad project we studied) |

Other public RPCs from Monad's docs, if the main one rate-limits you (it allows about 25 requests/second): `https://rpc-testnet.monadinfra.com` (20 rps, no batching) and `https://rpc.ankr.com/monad_testnet`. Put the one you choose in `NEXT_PUBLIC_RPC_URL` / `RPC_URL`.

Other explorers listed by Monad: MonadVision `https://testnet.monadvision.com`, Monadscan `https://testnet.monadscan.com/`, Socialscan `https://monad-testnet.socialscan.io/`.
**Ask an organizer or mentor today which explorer the judges check for "contract verified"**, and make sure your contract shows source there.

### Get test MON (faucet)
- **First use the event's Token Faucet tab** on the Blitz page (next to Form a Team / Submit Project). The event gives **50 MON per participant**. It most likely funds only the wallet tied to your login, so Devesh and Vidya each claim once on their own main wallet. Check on the tab whether it is one claim only, and claim on the wallet you will deploy from right away.
- Backup faucets: `https://faucet.monad.xyz` and `https://faucet.quicknode.com/monad` (the Quicknode one allows one claim per wallet every 12 hours).
- **MON budget (50 MON is plenty; gas is cheap):**

| Wallet | MON | Source |
|---|---|---|
| Devesh main (Deployer + Client) | keep most of the 50 | Faucet tab |
| Vidya main (Freelancer) | her own 50 | Faucet tab |
| Reviewer | 3 | Sent from Devesh. Pays gas for every verdict; its key sits on the server, so never fund it with more |
| Arbitrator | 1 | Sent from Devesh |
| Applicant 2, Applicant 3 | 1 each | Sent from Devesh |
| Fee recipient | 0 | Receives only |

- **Keep every job deposit tiny: 0.01 MON** (the contract only needs it above zero). Seed jobs, the G4 test sweep and the demo all fit easily.
- Create each non-main wallet as a fresh testnet-only account. Export private keys only into local `.env` files. Do not reuse a real wallet.

### Accounts both need
GitHub (the repo), Vercel, Supabase (Devesh creates the project; Vidya does not need it), and a wallet extension.

## 1. Devesh

### 1.1 Repo (Gate G0)
1. Create a NEW public GitHub repo **now** (it must be created after 11:30 AM). Name it anything; the product name lives in `web/lib/brand.ts`.
2. Add Vidya as collaborator (Settings → Collaborators).
3. Put these four docs in `docs/`: `BUILD.md`, `BUILD_contract-backend.md`, `BUILD_frontend.md`, `INTEGRATION.md` (and this file).
4. Create the folders from BUILD.md §3.8 and commit an empty `web/lib/types.ts` filled with the types from BUILD.md §3.2 and `web/lib/config.ts` from §3.1, so Vidya can import them immediately.

### 1.2 Contracts project
```
cd contracts
npm init -y
npm i -D hardhat@^2.22 @nomicfoundation/hardhat-toolbox @nomicfoundation/hardhat-verify typescript ts-node dotenv
npm i @openzeppelin/contracts@^5
npx hardhat init   # choose TypeScript project
```
Then open `https://github.com/dannwaneri/milestone-escrow/blob/main/hardhat.config.js`, copy its `monadTestnet` network block and its `sourcify` / `etherscan` blocks into `hardhat.config.ts`, and set the compiler to `0.8.24` with `evmVersion: "shanghai"` and the optimizer on (BUILD_contract-backend.md C0).

`contracts/.env`:
```
DEPLOYER_PRIVATE_KEY=
REVIEWER_ADDRESS=
ARBITRATOR_ADDRESS=
FEE_RECIPIENT_ADDRESS=
```

### 1.3 Have the AI agent write the contract
Give the agent `BUILD.md` and `BUILD_contract-backend.md` (modules C1 and C2). Then run:
```
npx hardhat compile
npx hardhat test        # all 14 listed cases must pass before deploying
```

### 1.4 Deploy and verify (Gate G1)
```
npx hardhat run scripts/deploy.ts --network monadTestnet
npx hardhat verify --network monadTestnet <ADDRESS> --constructor-args scripts/verify-args.ts
npx ts-node scripts/export-abi.ts      # writes web/lib/abi.ts
git add -A && git commit -m "contract deployed + abi" && git push
```
Open the address on the explorer and confirm the source is visible (a "partial match" is fine). Message Vidya the address.

### 1.5 Supabase (needed for G2)
1. New project → SQL editor → run `web/supabase/schema.sql` (BUILD.md §3.5). Turn Row Level Security ON for every table with no policies.
2. Copy the project URL and the **service role** key into `web/.env.local` (never into `NEXT_PUBLIC_*`).
3. Generate secrets locally:
```
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"   # DATA_ENC_KEY
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"      # JWT_SECRET
```

### 1.6 Jev API key (Module B0)
Jev is TypeSafe's decision model (it returns a yes/no probability, not text). Get access through whichever of these gives you a key first:
- TypeSafe console (direct)
- AI/ML API: `https://docs.aimlapi.com/api-references/decision-models/typesafe/jev` (endpoint `https://api.aimlapi.com/v1/decisions`, model `typesafe/jev`)
- NanoGPT: `https://docs.nano-gpt.com/api-reference/endpoint/jev-decisions` (model `typesafe/jev-1.13`)
- OpenRouter Decisions API (model `typesafe/jev-1.13`)

**If the hackathon gave you credits or a key** (for example through the sponsor workshop or the event page), use that one and skip the others. I could not read the event Notion, so I do not know the details. Look for it on the Luma page, the Notion "Resources" section, or ask a mentor.

Then copy that provider's `noul` example curl from its docs, run it once with a trivial yes/no question, and paste the **working request and response** into `docs/JEV_SCHEMA.md`. Fill `JEV_BASE_URL`, `JEV_MODEL`, `JEV_API_KEY` in `web/.env.local`. If nothing works, leave `JEV_API_KEY` empty: the LLM fallback runs alone and the badge says "Reviewed by LLM".

LLM fallback key: set `LLM_API_KEY` (Anthropic) and `LLM_MODEL`.

### 1.7 Vercel (Gate G4, but connect early)
Import the repo, set the **Root Directory to `web`**, and add every server and `NEXT_PUBLIC_*` variable from BUILD.md §3.6. Leave `NEXT_PUBLIC_MOCK` unset. After each deploy open `/api/health`.

## 2. Vidya

1. Accept the repo invite and clone it. Install Node 20.
2. Create the web app in `web/` (Next.js 14, TypeScript, Tailwind), then:
```
cd web
npm i wagmi@^2 viem@^2 @tanstack/react-query@^5
```
3. Create `web/.env.local`:
```
NEXT_PUBLIC_MOCK=1
NEXT_PUBLIC_CHAIN_ID=10143
NEXT_PUBLIC_RPC_URL=https://testnet-rpc.monad.xyz
NEXT_PUBLIC_EXPLORER_URL=https://testnet.monadexplorer.com
NEXT_PUBLIC_CONTRACT_ADDRESS=
```
4. Build against mock mode (module F1 in `BUILD_frontend.md`). You do not need a wallet or MON for this.
5. When Devesh says G1 is done: `git pull`, set `NEXT_PUBLIC_MOCK=0` and `NEXT_PUBLIC_CONTRACT_ADDRESS=<address>`, add Monad testnet to your wallet (section 0), claim faucet MON, and test the real create/accept flow.
6. Start the content module (F9) as soon as the UI looks presentable.

## 3. What is not covered here
- **Hackathon-provided credits, keys or sponsor tools:** unknown to me. Check the event pages and ask a mentor, then tell me what you found and I will update the specs.
- **Mainnet (25 bonus points):** needs real MON; only after G4, and the config would use mainnet chain id `143` and RPC `https://rpc.monad.xyz`. Not required for the core.
