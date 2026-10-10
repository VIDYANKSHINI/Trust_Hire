import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { db } from "@/lib/server/db";
import { errorResponse } from "@/lib/server/session";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const address = searchParams.get("address");

    if (!address || !address.startsWith("0x") || address.length !== 42) {
      return errorResponse(400, "Valid Ethereum address is required", "BAD_ADDRESS");
    }

    const normalized = address.toLowerCase();
    const nonce = crypto.randomBytes(16).toString("hex"); // 32 hex chars
    const message = `TrustHire sign-in\nAddress: ${normalized}\nNonce: ${nonce}`;

    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes
    await db.setNonce(normalized, message, expiresAt);

    return NextResponse.json({ message });
  } catch (err: any) {
    console.error("Nonce generation error:", err);
    return errorResponse(500, "Failed to generate sign-in nonce", "INTERNAL_ERROR");
  }
}
