import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/server/db";
import { errorResponse } from "@/lib/server/session";

export async function GET(
  req: NextRequest,
  { params }: { params: { jobId: string } }
) {
  try {
    const jobId = parseInt(params.jobId, 10);
    if (isNaN(jobId) || jobId <= 0) {
      return errorResponse(400, "Invalid jobId", "BAD_PARAMS");
    }

    const record = await db.getVerdict(jobId);
    if (!record) {
      return errorResponse(404, "Verdict not found", "NOT_FOUND");
    }

    return NextResponse.json({
      provider: record.provider,
      confidenceBps: record.confidence_bps,
      pass: record.pass,
    });
  } catch (err: any) {
    console.error("GET verdict error:", err);
    return errorResponse(500, "Failed to retrieve verdict", "INTERNAL_ERROR");
  }
}
