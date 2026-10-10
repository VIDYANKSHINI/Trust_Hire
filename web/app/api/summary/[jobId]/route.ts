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

    const record = await db.getBrief(jobId);
    if (!record || !record.public_summary) {
      return errorResponse(404, "Public summary not found", "NOT_FOUND");
    }

    return NextResponse.json({
      jobId,
      publicSummary: record.public_summary,
    });
  } catch (err: any) {
    console.error("GET summary error:", err);
    return errorResponse(500, "Failed to retrieve public summary", "INTERNAL_ERROR");
  }
}
