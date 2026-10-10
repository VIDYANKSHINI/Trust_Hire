import { NextRequest, NextResponse } from "next/server";
import { keccak256, toBytes } from "viem";
import { requireAuth, errorResponse } from "@/lib/server/session";
import { getJobOnChain, submitVerdictOnChain } from "@/lib/server/chain";
import { decrypt } from "@/lib/server/crypto";
import { db } from "@/lib/server/db";
import { reviewDeliverable } from "@/lib/server/ai/reviewer";
import { JobState, Brief } from "@/lib/types";

export async function POST(
  req: NextRequest,
  { params }: { params: { jobId: string } }
) {
  let jobId = 0;
  try {
    await requireAuth(req);
    jobId = parseInt(params.jobId, 10);
    if (isNaN(jobId) || jobId <= 0) {
      return errorResponse(400, "Invalid jobId", "BAD_PARAMS");
    }

    // 1. Read job on-chain
    let job = await getJobOnChain(jobId);
    if (job.state !== JobState.Submitted) {
      return errorResponse(409, "Job is not in Submitted state", "ALREADY_REVIEWED");
    }

    // 2. Load brief and deliverable
    const briefRecord = await db.getBrief(jobId);
    if (!briefRecord) {
      return errorResponse(404, "Job brief record not found", "BRIEF_NOT_FOUND");
    }

    const deliverableRecord = await db.getDeliverable(jobId);
    if (!deliverableRecord) {
      return errorResponse(404, "Deliverable record not found", "DELIVERABLE_NOT_FOUND");
    }

    const briefText = decrypt(briefRecord.brief_enc);
    const deliverableText = decrypt(deliverableRecord.content_enc);
    const briefObj: Brief = JSON.parse(briefText);

    // Recompute deliverable hash and verify
    const computedHash = keccak256(toBytes(deliverableText));
    if (computedHash.toLowerCase() !== job.deliverableHash.toLowerCase()) {
      return errorResponse(409, "Stored deliverable hash mismatch with on-chain record", "HASH_MISMATCH");
    }

    // 3. Evaluate using AI reviewer
    let reviewOutcome;
    try {
      reviewOutcome = await reviewDeliverable(briefObj, deliverableText);
    } catch (aiErr) {
      console.warn("AI review execution failed, falling back to fail-safe dispute:", aiErr);
      // Fail-safe to error
      reviewOutcome = {
        pass: false,
        confidenceBps: 0,
        provider: "error" as const,
        confidence: 0,
      };
    }

    // 4. Re-check on-chain state to avoid race condition double submission
    job = await getJobOnChain(jobId);
    if (job.state !== JobState.Submitted) {
      return errorResponse(409, "Job state changed before verdict submission", "ALREADY_REVIEWED");
    }

    // 5. Submit on-chain verdict
    let txHash: string;
    try {
      txHash = await submitVerdictOnChain(
        jobId,
        reviewOutcome.pass,
        reviewOutcome.confidenceBps,
        reviewOutcome.provider
      );
    } catch (chainErr: any) {
      console.error("Failed to submit verdict on-chain:", chainErr);
      return errorResponse(500, "Failed to submit on-chain verdict", "TX_FAILED");
    }

    // 6. Record verdict in database
    await db.upsertVerdict(
      jobId,
      reviewOutcome.provider,
      reviewOutcome.confidenceBps,
      reviewOutcome.pass
    );

    return NextResponse.json({
      pass: reviewOutcome.pass,
      confidenceBps: reviewOutcome.confidenceBps,
      provider: reviewOutcome.provider,
      txHash,
    });
  } catch (err: any) {
    if (err.status) return errorResponse(err.status, err.message, err.code);
    console.error("Critical error in POST /api/review:", err);

    // Fail-safe: if something failed unexpectedly and job is still submitted, submit error verdict if possible
    if (jobId > 0) {
      try {
        const job = await getJobOnChain(jobId);
        if (job.state === JobState.Submitted) {
          const failTx = await submitVerdictOnChain(jobId, false, 0, "error");
          await db.upsertVerdict(jobId, "error", 0, false);
          return NextResponse.json({
            pass: false,
            confidenceBps: 0,
            provider: "error",
            txHash: failTx,
          });
        }
      } catch (innerErr) {
        // Log and return 500
      }
    }

    return errorResponse(500, "Review process failed", "INTERNAL_ERROR");
  }
}
