import { NextRequest, NextResponse } from "next/server";
import { requireAuth, errorResponse } from "@/lib/server/session";
import { getJobOnChain, getStatsOnChain } from "@/lib/server/chain";
import { decrypt } from "@/lib/server/crypto";
import { db } from "@/lib/server/db";
import { scoreApplicant } from "@/lib/server/ai/matcher";
import { JobState, Brief, Application, Address } from "@/lib/types";

export async function POST(
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
      return errorResponse(403, "Only the client can rank applicants", "FORBIDDEN");
    }

    if (job.state !== JobState.Funded) {
      return errorResponse(409, "Ranking is only permitted while job is in Funded state", "WRONG_STATE");
    }

    const briefRecord = await db.getBrief(jobId);
    if (!briefRecord) {
      return errorResponse(404, "Brief not found for this job", "BRIEF_NOT_FOUND");
    }

    const briefText = decrypt(briefRecord.brief_enc);
    const briefObj: Brief = JSON.parse(briefText);

    const rawApps = await db.getApplications(jobId);
    if (rawApps.length === 0) {
      return errorResponse(409, "Zero applications found to rank", "NO_APPLICATIONS");
    }

    if (rawApps.length > 8) {
      return errorResponse(400, "Maximum of 8 applicants can be evaluated at once", "TOO_MANY");
    }

    const applications: Application[] = [];

    // Evaluate sequentially
    for (const raw of rawApps) {
      let pitchText = "";
      try {
        pitchText = decrypt(raw.pitch_enc);
      } catch (e) {
        pitchText = "";
      }

      const applicantAddr = raw.applicant.toLowerCase() as Address;
      const stats = await getStatsOnChain(applicantAddr);

      const scoreResult = await scoreApplicant(briefObj, {
        applicant: applicantAddr,
        pitch: pitchText,
        skills: raw.skills || [],
        stats,
      });

      // Persist in DB
      await db.updateApplicationScore(
        jobId,
        applicantAddr,
        scoreResult.matchScore,
        scoreResult.matchDetail,
        scoreResult.provider
      );

      applications.push({
        applicant: applicantAddr,
        pitch: pitchText,
        skills: raw.skills || [],
        matchScore: scoreResult.matchScore,
        matchDetail: scoreResult.matchDetail,
        provider: scoreResult.provider,
        stats,
      });
    }

    // Sort by matchScore desc (nulls last)
    applications.sort((a, b) => {
      if (a.matchScore === null && b.matchScore === null) return 0;
      if (a.matchScore === null) return 1;
      if (b.matchScore === null) return -1;
      return b.matchScore - a.matchScore;
    });

    // Determine recommended: highest matchScore with tie-break (lower abandoned, higher completed)
    let recommended: Address | null = null;
    let best = applications[0];

    if (best && best.matchScore !== null) {
      for (let i = 1; i < applications.length; i++) {
        const candidate = applications[i];
        if (candidate.matchScore === null) continue;

        if (candidate.matchScore > (best.matchScore ?? -1)) {
          best = candidate;
        } else if (candidate.matchScore === best.matchScore) {
          // Tie-break: lower abandoned, then higher completed
          if (candidate.stats.abandoned < best.stats.abandoned) {
            best = candidate;
          } else if (
            candidate.stats.abandoned === best.stats.abandoned &&
            candidate.stats.completed > best.stats.completed
          ) {
            best = candidate;
          }
        }
      }
      recommended = best.applicant;
    }

    return NextResponse.json({
      recommended,
      applications,
    });
  } catch (err: any) {
    if (err.status) return errorResponse(err.status, err.message, err.code);
    console.error("POST applications rank error:", err);
    return errorResponse(500, "Failed to rank applicants", "INTERNAL_ERROR");
  }
}
