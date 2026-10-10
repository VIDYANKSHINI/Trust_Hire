import { SignJWT, jwtVerify } from "jose";
import { NextResponse } from "next/server";
import { Address, ApiError } from "../types";

export class AuthError extends Error {
  code: string;
  status: number;

  constructor(message: string, code: string = "UNAUTHORIZED", status: number = 401) {
    super(message);
    this.name = "AuthError";
    this.code = code;
    this.status = status;
  }
}

export function errorResponse(status: number, message: string, code: string): NextResponse<ApiError> {
  return NextResponse.json({ error: message, code }, { status });
}

function getJwtSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET || "default_dev_jwt_secret_must_be_at_least_32_bytes_long_123456";
  return new TextEncoder().encode(secret);
}

/**
 * Issues a JWT token for the specified lowercase address, valid for 2 hours.
 */
export async function issueToken(address: string): Promise<{ token: string; expiresAt: number }> {
  const normalized = address.toLowerCase() as Address;
  const secret = getJwtSecret();
  const now = Math.floor(Date.now() / 1000);
  const expiresAt = now + 2 * 3600; // 2 hours

  const token = await new SignJWT({ sub: normalized })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt(now)
    .setExpirationTime(expiresAt)
    .sign(secret);

  return { token, expiresAt };
}

/**
 * Validates the Authorization Bearer token from the request.
 * Returns the lowercase wallet address or throws AuthError with 401.
 */
export async function requireAuth(req: Request): Promise<Address> {
  const authHeader = req.headers.get("authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw new AuthError("Missing or invalid Authorization header", "UNAUTHORIZED", 401);
  }

  const token = authHeader.substring(7).trim();
  try {
    const secret = getJwtSecret();
    const { payload } = await jwtVerify(token, secret, {
      algorithms: ["HS256"],
    });

    if (!payload.sub || typeof payload.sub !== "string") {
      throw new AuthError("Invalid token subject", "UNAUTHORIZED", 401);
    }

    return payload.sub.toLowerCase() as Address;
  } catch (err: any) {
    if (err instanceof AuthError) throw err;
    throw new AuthError("Invalid or expired session token", "UNAUTHORIZED", 401);
  }
}
