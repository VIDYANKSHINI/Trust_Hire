import { NextRequest, NextResponse } from "next/server";
import { verifyMessage } from "viem";
import { db } from "@/lib/server/db";
import { issueToken, errorResponse } from "@/lib/server/session";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { address, signature } = body;

    if (!address || !signature) {
      return errorResponse(400, "address and signature are required", "BAD_REQUEST");
    }

    const normalized = address.toLowerCase();
    const record = await db.getNonce(normalized);

    if (!record) {
      return errorResponse(401, "No pending sign-in message found for address", "NONCE_NOT_FOUND");
    }

    const now = new Date();
    if (new Date(record.expires_at) < now) {
      await db.deleteNonce(normalized);
      return errorResponse(401, "Sign-in nonce has expired", "NONCE_EXPIRED");
    }

    // Verify signature with viem
    let isValid = false;
    try {
      isValid = await verifyMessage({
        address: address as `0x${string}`,
        message: record.message,
        signature: signature as `0x${string}`,
      });
    } catch (e) {
      isValid = false;
    }

    // Single-use nonce: delete immediately regardless of outcome
    await db.deleteNonce(normalized);

    if (!isValid) {
      return errorResponse(401, "Invalid signature", "INVALID_SIGNATURE");
    }

    const { token, expiresAt } = await issueToken(normalized);
    return NextResponse.json({ token, expiresAt });
  } catch (err: any) {
    console.error("Auth verify error:", err);
    return errorResponse(500, "Authentication verification failed", "INTERNAL_ERROR");
  }
}
