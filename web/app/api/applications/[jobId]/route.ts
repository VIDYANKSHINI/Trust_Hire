import { NextRequest, NextResponse } from "next/server";
import { requireAuth, errorResponse } from "@/lib/server/session";
import { getJobOnChain, getStatsOnChain } from "@/lib/server/chain";
import { encrypt, decrypt } from "@/lib/server/crypto";
import { db } from "@/lib/server/db";
import { Application, JobState, Address } from "@/lib/types";

export async function POST(
  req: NextRequest,
  { params }: { params: { jobId: string } }
) {
  try {
    const applicant = await requireAuth(req);
    const jobId = parseInt(params.jobId, 10);
    if (isNaN(jobId) || jobId <= 0) {
      return errorResponse(400, "Invalid jobId", "BAD_PARAMS");
    }

    const body = await req.json();
    const { pitch, skills } = body;

    if (!pitch || typeof pitch !== "string" || pitch.length > 1000) {
      return errorResponse(400, "pitch is required and must be <= 1000 characters", "BAD_PITCH");
    }

    if (
      !Array.isArray(skills) ||
      skills.length === 0 ||
      skills.length > 8 ||
      skills.some((s) => typeof s !== "string" || s.length > 40)
    ) {
      return errorResponse(400, "skills must be an array of 1..8 items, each <= 40 characters", "BAD_SKILLS");
    }

    let job;
    try {
      job = await getJobOnChain(jobId);
    } catch (e) {
      return errorResponse(404, "Job not found on-chain", "JOB_NOT_FOUND");
    }

    if (job.state !== JobState.Funded) {
      return errorResponse(409, "Applications are only accepted when job is in Funded state", "WRONG_STATE");
    }

    if (job.client.toLowerCase() === applicant) {
      return errorResponse(403, "Client cannot apply to their own job", "FORBIDDEN");
    }

    const pitchEnc = encrypt(pitch);
    await db.upsertApplication(jobId, applicant, pitchEnc, skills);

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    if (err.status) return errorResponse(err.status, err.message, err.code);
    console.error("POST application error:", err);
    return errorResponse(500, "Failed to submit application", "INTERNAL_ERROR");
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

    if (job.client.toLowerCase() !== caller) {
      return errorResponse(403, "Only the client can list applications", "FORBIDDEN");
    }

    const rawApps = await db.getApplications(jobId);

    const applications: Application[] = await Promise.all(
      rawApps.map(async (row) => {
        let decryptedPitch = "";
        try {
          decryptedPitch = decrypt(row.pitch_enc);
        } catch (e) {
          decryptedPitch = "[Decryption error]";
        }

        const appAddress = row.applicant.toLowerCase() as Address;
        const stats = await getStatsOnChain(appAddress);

        return {
          applicant: appAddress,
          pitch: decryptedPitch,
          skills: row.skills || [],
          matchScore: row.match_score ?? null,
          matchDetail: row.match_detail ?? null,
          provider: row.provider ?? null,
          stats,
        };
      })
    );

    // Sort by matchScore desc (nulls last)
    applications.sort((a, b) => {
      if (a.matchScore === null && b.matchScore === null) return 0;
      if (a.matchScore === null) return 1;
      if (b.matchScore === null) return -1;
      return b.matchScore - a.matchScore;
    });

    return NextResponse.json({ applications });
  } catch (err: any) {
    if (err.status) return errorResponse(err.status, err.message, err.code);
    console.error("GET applications error:", err);
    return errorResponse(500, "Failed to retrieve applications", "INTERNAL_ERROR");
  }
}
