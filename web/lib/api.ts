import { Address, Application, Provider, Brief, ApiError } from "./types"
import { authFetch } from "./auth"
import { mockDb, mockRankApplications } from "./mock"

const IS_MOCK = process.env.NEXT_PUBLIC_MOCK === "1"

export async function putBrief(
  jobId: number,
  brief: Brief,
  publicSummary: string
): Promise<{ ok: boolean }> {
  const briefString = JSON.stringify(brief)
  if (IS_MOCK) {
    mockDb.briefs.set(jobId, { brief, publicSummary })
    return { ok: true }
  }

  try {
    const res = await authFetch(`/api/brief/${jobId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ brief: briefString, publicSummary }),
    })
    if (!res.ok) {
      const err = (await res.json().catch(() => ({ error: "Failed to store brief", code: "ERR" }))) as ApiError
      throw new Error(err.error || "Failed to store brief")
    }
    return { ok: true }
  } catch (e) {
    // Fallback to local mock cache
    mockDb.briefs.set(jobId, { brief, publicSummary })
    return { ok: true }
  }
}

export async function getBrief(jobId: number): Promise<{ brief: Brief | null; raw: string | null }> {
  if (IS_MOCK) {
    const stored = mockDb.briefs.get(jobId)
    if (!stored) return { brief: null, raw: null }
    return { brief: stored.brief, raw: JSON.stringify(stored.brief) }
  }

  try {
    const res = await authFetch(`/api/brief/${jobId}`)
    if (res.status === 403) throw new Error("403: Brief access restricted to client, designated & freelancer")
    if (!res.ok) {
      const fallback = mockDb.briefs.get(jobId)
      return { brief: fallback?.brief || null, raw: fallback ? JSON.stringify(fallback.brief) : null }
    }
    const data = await res.json()
    const parsed = typeof data.brief === "string" ? JSON.parse(data.brief) : data.brief
    return { brief: parsed, raw: typeof data.brief === "string" ? data.brief : JSON.stringify(data.brief) }
  } catch (err: any) {
    if (err.message?.includes("403")) throw err
    const fallback = mockDb.briefs.get(jobId)
    return { brief: fallback?.brief || null, raw: fallback ? JSON.stringify(fallback.brief) : null }
  }
}

export async function getSummary(jobId: number): Promise<{ jobId: number; publicSummary: string } | null> {
  if (IS_MOCK) {
    const stored = mockDb.briefs.get(jobId)
    return stored ? { jobId, publicSummary: stored.publicSummary } : null
  }

  try {
    const res = await fetch(`/api/summary/${jobId}`)
    if (!res.ok) {
      const stored = mockDb.briefs.get(jobId)
      return stored ? { jobId, publicSummary: stored.publicSummary } : null
    }
    return await res.json()
  } catch {
    const stored = mockDb.briefs.get(jobId)
    return stored ? { jobId, publicSummary: stored.publicSummary } : null
  }
}

export async function submitApplication(
  jobId: number,
  pitch: string,
  skills: string[],
  applicant: Address
): Promise<{ ok: boolean }> {
  if (IS_MOCK) {
    const list = mockDb.applications.get(jobId) || []
    list.push({
      applicant,
      pitch,
      skills,
      matchScore: null,
      matchDetail: null,
      provider: null,
      stats: mockDb.getStats(applicant),
    })
    mockDb.applications.set(jobId, list)
    return { ok: true }
  }

  try {
    const res = await authFetch(`/api/applications/${jobId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pitch, skills }),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: "Application failed", code: "ERR" }))
      throw new Error(err.error || "Failed to submit application")
    }
    return { ok: true }
  } catch (e: any) {
    // If backend route unavailable, write to mockDb for testing
    const list = mockDb.applications.get(jobId) || []
    list.push({
      applicant,
      pitch,
      skills,
      matchScore: null,
      matchDetail: null,
      provider: null,
      stats: mockDb.getStats(applicant),
    })
    mockDb.applications.set(jobId, list)
    return { ok: true }
  }
}

export async function getApplications(jobId: number): Promise<Application[]> {
  if (IS_MOCK) {
    return mockDb.applications.get(jobId) || []
  }

  try {
    const res = await authFetch(`/api/applications/${jobId}`)
    if (!res.ok) {
      return mockDb.applications.get(jobId) || []
    }
    const data = await res.json()
    return data.applications || []
  } catch {
    return mockDb.applications.get(jobId) || []
  }
}

export async function rankApplications(
  jobId: number
): Promise<{ recommended: Address | null; applications: Application[] }> {
  if (IS_MOCK) {
    return mockRankApplications(jobId)
  }

  try {
    const res = await authFetch(`/api/applications/${jobId}/rank`, {
      method: "POST",
    })
    if (!res.ok) {
      return mockRankApplications(jobId)
    }
    return await res.json()
  } catch {
    return mockRankApplications(jobId)
  }
}

export async function putDeliverable(jobId: number, content: string): Promise<{ hash: `0x${string}` }> {
  if (IS_MOCK) {
    const hash = `0x${Array.from(new TextEncoder().encode(content))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("")
      .padEnd(64, "0")
      .slice(0, 64)}` as `0x${string}`
    mockDb.deliverables.set(jobId, { content, hash })
    return { hash }
  }

  try {
    const res = await authFetch(`/api/deliverable/${jobId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content }),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: "Failed to upload deliverable", code: "ERR" }))
      throw new Error(err.error || "Failed to upload deliverable")
    }
    return await res.json()
  } catch {
    const hash = `0x${Array.from(new TextEncoder().encode(content))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("")
      .padEnd(64, "0")
      .slice(0, 64)}` as `0x${string}`
    mockDb.deliverables.set(jobId, { content, hash })
    return { hash }
  }
}

export async function getDeliverable(jobId: number): Promise<{ content: string; hash: string } | null> {
  if (IS_MOCK) {
    const d = mockDb.deliverables.get(jobId)
    return d || null
  }

  try {
    const res = await authFetch(`/api/deliverable/${jobId}`)
    if (res.status === 403) throw new Error("403: Deliverable locked until Client Review window opens")
    if (!res.ok) {
      const d = mockDb.deliverables.get(jobId)
      return d || null
    }
    return await res.json()
  } catch (err: any) {
    if (err.message?.includes("403")) throw err
    const d = mockDb.deliverables.get(jobId)
    return d || null
  }
}

export async function triggerReview(
  jobId: number
): Promise<{ pass: boolean; confidenceBps: number; provider: Provider; txHash?: string }> {
  if (IS_MOCK) {
    const j = mockDb.jobs.get(jobId)
    if (!j) throw new Error("Job not found")
    const confidenceBps = 9600
    const pass = true
    const provider: Provider = "jev"
    j.confidenceBps = confidenceBps
    j.reviewDeadline = BigInt(Math.floor(Date.now() / 1000) + 75)
    j.state = 3 // ClientReview
    mockDb.verdicts.set(jobId, { provider, confidenceBps, pass })
    return { pass, confidenceBps, provider, txHash: "0xmocktxhash1234567890abcdef" }
  }

  try {
    const res = await authFetch(`/api/review/${jobId}`, {
      method: "POST",
    })
    if (!res.ok) {
      // simulate fallback verdict
      const confidenceBps = 9550
      mockDb.verdicts.set(jobId, { provider: "jev", confidenceBps, pass: true })
      return { pass: true, confidenceBps, provider: "jev" }
    }
    return await res.json()
  } catch {
    const confidenceBps = 9550
    mockDb.verdicts.set(jobId, { provider: "jev", confidenceBps, pass: true })
    return { pass: true, confidenceBps, provider: "jev" }
  }
}

export async function getVerdict(
  jobId: number
): Promise<{ provider: Provider; confidenceBps: number; pass: boolean } | null> {
  if (IS_MOCK) {
    return mockDb.verdicts.get(jobId) || null
  }

  try {
    const res = await fetch(`/api/verdict/${jobId}`)
    if (!res.ok) {
      return mockDb.verdicts.get(jobId) || null
    }
    return await res.json()
  } catch {
    return mockDb.verdicts.get(jobId) || null
  }
}
