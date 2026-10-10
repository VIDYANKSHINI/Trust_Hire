import { Job, JobState, Stats, Application, Address, Brief } from "./types"

export const MOCK_CLIENT: Address = "0x71cab503a4ea5332f85f9b63428d05b581e28935"
export const MOCK_FREELANCER: Address = "0x89205a3a3b2a69de6dbf7f01ed13b2108b2c43e7"
export const MOCK_ARBITRATOR: Address = "0x3c44cdddb6a900fa2b585dd299e03d12fa4293bc"
export const MOCK_APPLICANT_2: Address = "0x90f79bf6eb2c4f870365e785982e1f101e93b906"
export const MOCK_APPLICANT_3: Address = "0x15d34aaf54267db7d7c367839aaf71a00a2c6a65"
export const MOCK_REVIEWER: Address = "0x2546bcd3c84621e976d8185a91a922ae77ecec30"
export const ZERO_ADDRESS: Address = "0x0000000000000000000000000000000000000000"

const nowSec = Math.floor(Date.now() / 1000)

export interface MockStore {
  jobs: Map<number, Job>
  briefs: Map<number, { brief: Brief; publicSummary: string }>
  deliverables: Map<number, { content: string; hash: `0x${string}` }>
  applications: Map<number, Application[]>
  verdicts: Map<number, { provider: "jev" | "llm" | "error"; confidenceBps: number; pass: boolean }>
  stats: Map<string, Stats>
}

// Initial mock stats
const initialStats: Record<string, Stats> = {
  [MOCK_CLIENT.toLowerCase()]: { completed: 8, ghosted: 1, abandoned: 0, disputed: 0 },
  [MOCK_FREELANCER.toLowerCase()]: { completed: 14, ghosted: 0, abandoned: 1, disputed: 1 },
  [MOCK_APPLICANT_2.toLowerCase()]: { completed: 5, ghosted: 0, abandoned: 0, disputed: 0 },
  [MOCK_APPLICANT_3.toLowerCase()]: { completed: 2, ghosted: 0, abandoned: 1, disputed: 1 },
}

export const initialJobs: Job[] = [
  // 0: Funded (Open for applicants)
  {
    client: MOCK_CLIENT,
    freelancer: ZERO_ADDRESS,
    designated: ZERO_ADDRESS,
    amount: 50000000000000000n, // 0.05 MON
    deadline: BigInt(nowSec + 86400 * 3),
    submittedAt: 0n,
    reviewDeadline: 0n,
    confidenceBps: 0,
    state: JobState.Funded,
    briefHash: "0x7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b",
    deliverableHash: "0x0000000000000000000000000000000000000000000000000000000000000000",
    title: "Rust Smart Contract Auditing & Formal Verification",
  },
  // 1: Accepted (In Progress)
  {
    client: MOCK_CLIENT,
    freelancer: MOCK_FREELANCER,
    designated: MOCK_FREELANCER,
    amount: 120000000000000000n, // 0.12 MON
    deadline: BigInt(nowSec + 3600 * 5),
    submittedAt: 0n,
    reviewDeadline: 0n,
    confidenceBps: 0,
    state: JobState.Accepted,
    briefHash: "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
    deliverableHash: "0x0000000000000000000000000000000000000000000000000000000000000000",
    title: "Monad RPC Subgraph Indexer Implementation",
  },
  // 2: Submitted (AI Reviewing)
  {
    client: MOCK_CLIENT,
    freelancer: MOCK_FREELANCER,
    designated: MOCK_FREELANCER,
    amount: 80000000000000000n, // 0.08 MON
    deadline: BigInt(nowSec + 86400),
    submittedAt: BigInt(nowSec - 120),
    reviewDeadline: 0n,
    confidenceBps: 0,
    state: JobState.Submitted,
    briefHash: "0x9876543210fedcba9876543210fedcba9876543210fedcba9876543210fedcba",
    deliverableHash: "0x3333333333333333333333333333333333333333333333333333333333333333",
    title: "Solidity Escrow Reentrancy Guard Hardening",
  },
  // 3: ClientReview (AI passed, review window active)
  {
    client: MOCK_CLIENT,
    freelancer: MOCK_FREELANCER,
    designated: MOCK_FREELANCER,
    amount: 150000000000000000n, // 0.15 MON
    deadline: BigInt(nowSec - 300),
    submittedAt: BigInt(nowSec - 200),
    reviewDeadline: BigInt(nowSec + 75), // 75 seconds left on window!
    confidenceBps: 9600, // 96% confidence -> Short window
    state: JobState.ClientReview,
    briefHash: "0x4444444444444444444444444444444444444444444444444444444444444444",
    deliverableHash: "0x5555555555555555555555555555555555555555555555555555555555555555",
    title: "Decentralized Liquidity Pool Router V3",
  },
  // 4: Released (Paid)
  {
    client: MOCK_CLIENT,
    freelancer: MOCK_FREELANCER,
    designated: MOCK_FREELANCER,
    amount: 100000000000000000n, // 0.10 MON
    deadline: BigInt(nowSec - 86400 * 2),
    submittedAt: BigInt(nowSec - 86400 * 2 + 1000),
    reviewDeadline: BigInt(nowSec - 86400 * 2 + 2000),
    confidenceBps: 9800,
    state: JobState.Released,
    briefHash: "0x6666666666666666666666666666666666666666666666666666666666666666",
    deliverableHash: "0x7777777777777777777777777777777777777777777777777777777777777777",
    title: "MEV Shield Relayer Bot Architecture",
  },
  // 5: Refunded (Abandoned by freelancer / missed deadline)
  {
    client: MOCK_CLIENT,
    freelancer: MOCK_FREELANCER,
    designated: MOCK_FREELANCER,
    amount: 40000000000000000n, // 0.04 MON
    deadline: BigInt(nowSec - 3600),
    submittedAt: 0n,
    reviewDeadline: 0n,
    confidenceBps: 0,
    state: JobState.Refunded,
    briefHash: "0x8888888888888888888888888888888888888888888888888888888888888888",
    deliverableHash: "0x0000000000000000000000000000000000000000000000000000000000000000",
    title: "Cross-Chain Relayer Gas Optimizer",
  },
  // 6: Cancelled (Client cancelled before acceptance)
  {
    client: MOCK_CLIENT,
    freelancer: ZERO_ADDRESS,
    designated: ZERO_ADDRESS,
    amount: 25000000000000000n, // 0.025 MON
    deadline: BigInt(nowSec + 86400),
    submittedAt: 0n,
    reviewDeadline: 0n,
    confidenceBps: 0,
    state: JobState.Cancelled,
    briefHash: "0x9999999999999999999999999999999999999999999999999999999999999999",
    deliverableHash: "0x0000000000000000000000000000000000000000000000000000000000000000",
    title: "Oracle Aggregator Unit Tests",
  },
  // 7: Disputed (Under Arbitration)
  {
    client: MOCK_CLIENT,
    freelancer: MOCK_FREELANCER,
    designated: MOCK_FREELANCER,
    amount: 90000000000000000n, // 0.09 MON
    deadline: BigInt(nowSec - 7200),
    submittedAt: BigInt(nowSec - 7000),
    reviewDeadline: BigInt(nowSec - 6000),
    confidenceBps: 6200, // Below threshold 75% -> Auto disputed
    state: JobState.Disputed,
    briefHash: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    deliverableHash: "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
    title: "High-Throughput Mempool Monitoring SDK",
  },
  // 8: Resolved (Arbitrator split)
  {
    client: MOCK_CLIENT,
    freelancer: MOCK_FREELANCER,
    designated: MOCK_FREELANCER,
    amount: 60000000000000000n, // 0.06 MON
    deadline: BigInt(nowSec - 86400 * 3),
    submittedAt: BigInt(nowSec - 86400 * 3 + 200),
    reviewDeadline: BigInt(nowSec - 86400 * 3 + 400),
    confidenceBps: 7100,
    state: JobState.Resolved,
    briefHash: "0xcccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc",
    deliverableHash: "0xdddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd",
    title: "Zk-SNARK Circuit Benchmarks on Monad",
  },
]

// Global mock storage for client interactions
class MockDatabase {
  public jobs: Map<number, Job> = new Map()
  public briefs: Map<number, { brief: Brief; publicSummary: string }> = new Map()
  public deliverables: Map<number, { content: string; hash: `0x${string}` }> = new Map()
  public applications: Map<number, Application[]> = new Map()
  public verdicts: Map<number, { provider: "jev" | "llm" | "error"; confidenceBps: number; pass: boolean }> = new Map()
  public stats: Map<string, Stats> = new Map()

  constructor() {
    this.reset()
  }

  reset() {
    this.jobs.clear()
    this.briefs.clear()
    this.deliverables.clear()
    this.applications.clear()
    this.verdicts.clear()
    this.stats.clear()

    // Populate jobs (ids start at 1)
    initialJobs.forEach((j, idx) => {
      const id = idx + 1
      this.jobs.set(id, { ...j })
    })

    // Populate stats
    Object.entries(initialStats).forEach(([addr, st]) => {
      this.stats.set(addr.toLowerCase(), { ...st })
    })

    // Seed briefs
    this.briefs.set(1, {
      publicSummary: "Audit our upcoming Monad protocol smart contracts for vulnerabilities.",
      brief: {
        description:
          "Conduct a thorough formal verification and security audit of the TrustHire escrow and settlement engine. Detect reentrancy, integer overflow, flash loan exploits, and frontrunning risks.",
        criteria: [
          "Zero critical or high severity vulnerabilities left unresolved",
          "Automated invariant test suite with >95% statement coverage",
          "Comprehensive audit report markdown document provided",
        ],
      },
    })

    this.briefs.set(2, {
      publicSummary: "Build a high-performance Subgraph indexer for Monad RPC nodes.",
      brief: {
        description:
          "Develop an event-driven subgraph indexing pipeline that tracks job creation, escrow locking, review timeouts, and releases on Monad Testnet 10143.",
        criteria: [
          "Dockerized indexer running with sub-second block sync",
          "GraphQL API exposing Job, Application, and Reputations",
        ],
      },
    })

    this.briefs.set(4, {
      publicSummary: "Deliverable review window active for Pool Router V3.",
      brief: {
        description: "Deploy and optimize Pool Router V3 with gas benchmarks.",
        criteria: ["Gas benchmarks < 120k per multi-hop swap", "Contract verification on testnet.monadexplorer.com"],
      },
    })

    // Seed applications for Job #1
    this.applications.set(1, [
      {
        applicant: MOCK_FREELANCER,
        pitch:
          "Senior smart contract auditor with 4 years EVM security experience. Former lead auditor at CertiK/OpenZeppelin. Specializing in high-throughput EVMs like Monad.",
        skills: ["Solidity", "Foundry", "Formal Verification", "Slither", "EVM internals"],
        matchScore: 94,
        matchDetail: { skillsFit: 96, experienceFit: 94, scopeFit: 92 },
        provider: "jev",
        stats: this.getStats(MOCK_FREELANCER),
      },
      {
        applicant: MOCK_APPLICANT_2,
        pitch:
          "Full-stack Web3 developer and protocol contributor. I have tested multiple DeFi protocols and written extensive fuzz testing suites.",
        skills: ["Rust", "Solidity", "Hardhat", "TypeScript"],
        matchScore: 81,
        matchDetail: { skillsFit: 84, experienceFit: 78, scopeFit: 82 },
        provider: "jev",
        stats: this.getStats(MOCK_APPLICANT_2),
      },
      {
        applicant: MOCK_APPLICANT_3,
        pitch:
          "Junior smart contract engineer enthusiastic about Monad. Ready to review your codebase and document findings.",
        skills: ["JavaScript", "Solidity Basics", "Remix"],
        matchScore: 58,
        matchDetail: { skillsFit: 60, experienceFit: 52, scopeFit: 62 },
        provider: "llm",
        stats: this.getStats(MOCK_APPLICANT_3),
      },
    ])

    // Seed deliverables
    this.deliverables.set(4, {
      hash: "0x5555555555555555555555555555555555555555555555555555555555555555",
      content: `## TrustHire Security Audit & Pool Router Report
All acceptance criteria satisfied:
1. Invariant testing verified over 100,000 runs with Foundry.
2. Zero high or critical severity vulnerabilities discovered.
3. Gas benchmark per multi-hop route verified at 94,320 gas on Monad.
Verified contract address: 0x89205A3A3b2A69De6Dbf7f01ED13B2108B2c43e7
Repository PR: https://github.com/trusthire/monad-escrow/pull/42`,
    })

    this.verdicts.set(4, {
      provider: "jev",
      confidenceBps: 9600,
      pass: true,
    })

    this.verdicts.set(8, {
      provider: "llm",
      confidenceBps: 7100,
      pass: false,
    })
  }

  getStats(address: string): Stats {
    return this.stats.get(address.toLowerCase()) || { completed: 0, ghosted: 0, abandoned: 0, disputed: 0 }
  }

  mutateStats(address: string, delta: Partial<Stats>) {
    const cur = this.getStats(address)
    this.stats.set(address.toLowerCase(), {
      completed: cur.completed + (delta.completed || 0),
      ghosted: cur.ghosted + (delta.ghosted || 0),
      abandoned: cur.abandoned + (delta.abandoned || 0),
      disputed: cur.disputed + (delta.disputed || 0),
    })
  }
}

export const mockDb = new MockDatabase()

// Helpers with 600ms latency simulation
const delay = (ms = 600) => new Promise((resolve) => setTimeout(resolve, ms))

export async function mockGetJob(id: number): Promise<Job | null> {
  await delay(100)
  return mockDb.jobs.get(id) || null
}

export async function mockGetJobCount(): Promise<number> {
  await delay(50)
  return mockDb.jobs.size
}

export async function mockGetAllJobs(): Promise<{ id: number; job: Job }[]> {
  await delay(100)
  const items: { id: number; job: Job }[] = []
  mockDb.jobs.forEach((job, id) => {
    items.push({ id, job })
  })
  return items.reverse()
}

export async function mockCreateJob(
  title: string,
  brief: Brief,
  publicSummary: string,
  amountWei: bigint,
  deadlineSec: bigint,
  clientAddr: Address
): Promise<number> {
  await delay(600)
  const newId = mockDb.jobs.size + 1
  const briefString = JSON.stringify(brief)
  // simple mock hash
  const briefHash = `0x${Array.from(new TextEncoder().encode(briefString))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
    .padEnd(64, "0")
    .slice(0, 64)}` as `0x${string}`

  const newJob: Job = {
    client: clientAddr,
    freelancer: ZERO_ADDRESS,
    designated: ZERO_ADDRESS,
    amount: amountWei,
    deadline: deadlineSec,
    submittedAt: 0n,
    reviewDeadline: 0n,
    confidenceBps: 0,
    state: JobState.Funded,
    briefHash,
    deliverableHash: ZERO_ADDRESS,
    title,
  }

  mockDb.jobs.set(newId, newJob)
  mockDb.briefs.set(newId, { brief, publicSummary })
  return newId
}

export async function mockAssignFreelancer(jobId: number, designated: Address): Promise<void> {
  await delay(600)
  const j = mockDb.jobs.get(jobId)
  if (!j) throw new Error("Job not found")
  j.designated = designated
}

export async function mockAcceptJob(jobId: number, freelancer: Address): Promise<void> {
  await delay(600)
  const j = mockDb.jobs.get(jobId)
  if (!j) throw new Error("Job not found")
  j.freelancer = freelancer
  j.state = JobState.Accepted
}

export async function mockCancelJob(jobId: number): Promise<void> {
  await delay(600)
  const j = mockDb.jobs.get(jobId)
  if (!j) throw new Error("Job not found")
  j.state = JobState.Cancelled
}

export async function mockAbandonJob(jobId: number): Promise<void> {
  await delay(600)
  const j = mockDb.jobs.get(jobId)
  if (!j) throw new Error("Job not found")
  j.state = JobState.Refunded
  mockDb.mutateStats(j.freelancer, { abandoned: 1 })
}

export async function mockClaimRefund(jobId: number): Promise<void> {
  await delay(600)
  const j = mockDb.jobs.get(jobId)
  if (!j) throw new Error("Job not found")
  j.state = JobState.Refunded
  mockDb.mutateStats(j.freelancer, { abandoned: 1 })
}

export async function mockSubmitWork(jobId: number, content: string): Promise<string> {
  await delay(600)
  const j = mockDb.jobs.get(jobId)
  if (!j) throw new Error("Job not found")
  const hash = `0x${Array.from(new TextEncoder().encode(content))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
    .padEnd(64, "0")
    .slice(0, 64)}` as `0x${string}`
  j.deliverableHash = hash
  j.submittedAt = BigInt(Math.floor(Date.now() / 1000))
  j.state = JobState.Submitted
  mockDb.deliverables.set(jobId, { content, hash })
  return hash
}

export async function mockRunReview(jobId: number): Promise<{ pass: boolean; confidenceBps: number; provider: "jev" | "llm" }> {
  await delay(1200) // realistic AI inspection delay
  const j = mockDb.jobs.get(jobId)
  if (!j) throw new Error("Job not found")

  // High confidence by default (94% or 96%)
  const confidenceBps = 9550
  const pass = true
  const provider: "jev" | "llm" = "jev"

  j.confidenceBps = confidenceBps
  // short window (30s demo) or long window (90s demo)
  const windowSec = confidenceBps >= 9500 ? 30 : 90
  j.reviewDeadline = BigInt(Math.floor(Date.now() / 1000) + windowSec)
  j.state = JobState.ClientReview

  mockDb.verdicts.set(jobId, { provider, confidenceBps, pass })
  return { pass, confidenceBps, provider }
}

export async function mockApproveWork(jobId: number): Promise<void> {
  await delay(600)
  const j = mockDb.jobs.get(jobId)
  if (!j) throw new Error("Job not found")
  j.state = JobState.Released
  mockDb.mutateStats(j.freelancer, { completed: 1 })
}

export async function mockAutoRelease(jobId: number): Promise<void> {
  await delay(600)
  const j = mockDb.jobs.get(jobId)
  if (!j) throw new Error("Job not found")
  j.state = JobState.Released
  mockDb.mutateStats(j.client, { ghosted: 1 })
  mockDb.mutateStats(j.freelancer, { completed: 1 })
}

export async function mockRaiseDispute(jobId: number): Promise<void> {
  await delay(600)
  const j = mockDb.jobs.get(jobId)
  if (!j) throw new Error("Job not found")
  j.state = JobState.Disputed
  mockDb.mutateStats(j.client, { disputed: 1 })
  mockDb.mutateStats(j.freelancer, { disputed: 1 })
}

export async function mockResolveDispute(jobId: number, freelancerShareBps: number): Promise<void> {
  await delay(600)
  const j = mockDb.jobs.get(jobId)
  if (!j) throw new Error("Job not found")
  j.state = JobState.Resolved
}

export async function mockApply(jobId: number, applicant: Address, pitch: string, skills: string[]): Promise<void> {
  await delay(600)
  const list = mockDb.applications.get(jobId) || []
  const existingIdx = list.findIndex((a) => a.applicant.toLowerCase() === applicant.toLowerCase())
  const app: Application = {
    applicant,
    pitch,
    skills,
    matchScore: null,
    matchDetail: null,
    provider: null,
    stats: mockDb.getStats(applicant),
  }
  if (existingIdx >= 0) {
    list[existingIdx] = app
  } else {
    list.push(app)
  }
  mockDb.applications.set(jobId, list)
}

export async function mockRankApplications(jobId: number): Promise<{ recommended: Address | null; applications: Application[] }> {
  await delay(900)
  const list = mockDb.applications.get(jobId) || []
  if (list.length === 0) return { recommended: null, applications: [] }

  // Assign AI match scores
  list.forEach((app, i) => {
    const base = 95 - i * 15
    const score = Math.max(45, Math.min(99, base + Math.floor(Math.random() * 8)))
    app.matchScore = score
    app.matchDetail = {
      skillsFit: Math.min(100, score + 2),
      experienceFit: Math.max(50, score - 3),
      scopeFit: score,
    }
    app.provider = i % 2 === 0 ? "jev" : "llm"
  })

  // Sort desc by matchScore
  list.sort((a, b) => (b.matchScore || 0) - (a.matchScore || 0))
  mockDb.applications.set(jobId, list)

  return { recommended: list[0]?.applicant || null, applications: list }
}
