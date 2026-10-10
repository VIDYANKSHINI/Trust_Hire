import { NextRequest, NextResponse } from "next/server";
import { keccak256, toBytes } from "viem";
import { requireAuth, errorResponse } from "@/lib/server/session";
import { getJobOnChain } from "@/lib/server/chain";
import { encrypt, decrypt } from "@/lib/server/crypto";
import { db } from "@/lib/server/db";
import { JobState } from "@/lib/types";

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
    const { content } = body;

    if (!content || typeof content !== "string" || content.length > 20000) {
      return errorResponse(400, "content is required and must be <= 20000 characters", "BAD_CONTENT");
    }

    let job;
    try {
      job = await getJobOnChain(jobId);
    } catch (e) {
      return errorResponse(404, "Job not found on-chain", "JOB_NOT_FOUND");
    }

    if (job.freelancer.toLowerCase() !== caller) {
      return errorResponse(403, "Only the assigned freelancer can upload deliverable", "FORBIDDEN");
    }

    if (job.state !== JobState.Accepted) {
      return errorResponse(409, "Deliverable can only be uploaded while job is in Accepted state", "WRONG_STATE");
    }

    const hash = keccak256(toBytes(content));
    const contentEnc = encrypt(content);

    await db.upsertDeliverable(jobId, caller, contentEnc, hash);

    return NextResponse.json({ hash });
  } catch (err: any) {
    if (err.status) return errorResponse(err.status, err.message, err.code);
    console.error("PUT deliverable error:", err);
    return errorResponse(500, "Failed to store deliverable", "INTERNAL_ERROR");
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
    } catch (e) {
      return errorResponse(404, "Job not found on-chain", "JOB_NOT_FOUND");
    }

    const isFreelancer = caller === job.freelancer.toLowerCase();
    const isClientAllowed = caller === job.client.toLowerCase() && job.reviewDeadline !== BigInt(0);

    // Check arbitrator address from environment or contract
    const arbitratorAddress = (process.env.ARBITRATOR_ADDRESS || "").toLowerCase();
    const isArbitrator = caller === arbitratorAddress && (job.state === JobState.Disputed || job.state === JobState.Resolved);

    if (!isFreelancer && !isClientAllowed && !isArbitrator) {
      return errorResponse(403, "Not authorized to access deliverable in current job state", "FORBIDDEN");
    }

    const record = await db.getDeliverable(jobId);
    if (!record) {
      return errorResponse(404, "Deliverable not found", "NOT_FOUND");
    }

    const content = decrypt(record.content_enc);
    return NextResponse.json({
      content,
      hash: record.hash,
    });
  } catch (err: any) {
    if (err.status) return errorResponse(err.status, err.message, err.code);
    console.error("GET deliverable error:", err);
    return errorResponse(500, "Failed to retrieve deliverable", "INTERNAL_ERROR");
  }
}
