import { NextRequest, NextResponse } from "next/server";
import { keccak256, toBytes } from "viem";
import { requireAuth, errorResponse } from "@/lib/server/session";
import { getJobOnChain } from "@/lib/server/chain";
import { encrypt, decrypt } from "@/lib/server/crypto";
import { db } from "@/lib/server/db";
import { Brief, JobState } from "@/lib/types";

export async function PUT(
  req: NextRequest,
  { params }: { params: { jobId: string } }
) {
  try {
    const caller = await requireAuth(req);
    const jobId = parseInt(params.jobId, 10);
    if (isNaN(jobId) || jobId <= 0) {
      return errorResponse(400, "Invalid jobId", "BAD_PARAMS");
    }

    const body = await req.json();
    const { brief, publicSummary } = body;

    if (!brief || typeof brief !== "string" || !publicSummary || typeof publicSummary !== "string") {
      return errorResponse(400, "brief and publicSummary are required", "BAD_REQUEST");
    }

    if (publicSummary.length > 280) {
      return errorResponse(400, "publicSummary must be <= 280 characters", "BAD_SUMMARY");
    }

    // Validate Brief shape
    let parsed: Brief;
    try {
      parsed = JSON.parse(brief);
      if (
        typeof parsed.description !== "string" ||
        parsed.description.length > 4000 ||
        !Array.isArray(parsed.criteria) ||
        parsed.criteria.length < 1 ||
        parsed.criteria.length > 8 ||
        parsed.criteria.some((c) => typeof c !== "string" || c.length > 200)
      ) {
        return errorResponse(400, "Brief structure does not meet constraints", "BAD_BRIEF");
      }
    } catch (e) {
      return errorResponse(400, "Brief must be valid JSON matching Brief interface", "BAD_BRIEF");
    }

    // Verify on-chain state
    let job;
    try {
      job = await getJobOnChain(jobId);
    } catch (e: any) {
      return errorResponse(404, "Job not found on-chain", "JOB_NOT_FOUND");
    }

    if (job.client.toLowerCase() !== caller) {
      return errorResponse(403, "Only the client can upload the brief", "FORBIDDEN");
    }

    if (job.state !== JobState.Funded) {
      return errorResponse(409, "Job must be in Funded state", "WRONG_STATE");
    }

    // Verify keccak256 hash match
    const computedHash = keccak256(toBytes(brief));
    if (computedHash.toLowerCase() !== job.briefHash.toLowerCase()) {
      return errorResponse(409, "Brief content does not match on-chain briefHash", "HASH_MISMATCH");
    }

    // Check if already stored
    const existing = await db.getBrief(jobId);
    if (existing) {
      return errorResponse(409, "Brief has already been saved for this job", "ALREADY_STORED");
    }

    const briefEnc = encrypt(brief);
    await db.insertBrief(jobId, caller, briefEnc, publicSummary);

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    if (err.status) return errorResponse(err.status, err.message, err.code);
    console.error("PUT brief error:", err);
    return errorResponse(500, "Failed to save brief", "INTERNAL_ERROR");
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: { jobId: string } }
) {
  try {
    const caller = await requireAuth(req);
    const jobId = parseInt(params.jobId, 10);
    if (isNaN(jobId) || jobId <= 0) {
      return errorResponse(400, "Invalid jobId", "BAD_PARAMS");
    }

    let job;
    try {
      job = await getJobOnChain(jobId);
    } catch (e: any) {
      return errorResponse(404, "Job not found on-chain", "JOB_NOT_FOUND");
    }

    const isClient = caller === job.client.toLowerCase();
    const isFreelancer = job.freelancer !== "0x0000000000000000000000000000000000000000" && caller === job.freelancer.toLowerCase();
    const isDesignated = job.designated !== "0x0000000000000000000000000000000000000000" && caller === job.designated.toLowerCase();

    if (!isClient && !isFreelancer && !isDesignated) {
      return errorResponse(403, "Not authorized to view private brief", "FORBIDDEN");
    }

    const record = await db.getBrief(jobId);
    if (!record) {
      return errorResponse(404, "Brief not found", "NOT_FOUND");
    }

    const brief = decrypt(record.brief_enc);
    return NextResponse.json({ brief });
  } catch (err: any) {
    if (err.status) return errorResponse(err.status, err.message, err.code);
    console.error("GET brief error:", err);
    return errorResponse(500, "Failed to fetch brief", "INTERNAL_ERROR");
  }
}
