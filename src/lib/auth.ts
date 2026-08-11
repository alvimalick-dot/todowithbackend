import { SignJWT, jwtVerify } from 'jose';

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error('Please define JWT_SECRET in .env.local');
}

// Convert secret string into Uint8Array required by jose
const secretKey = new TextEncoder().encode(JWT_SECRET);

export interface JWTPayload {
  userId: string;
  [key: string]: unknown;
}

/**
 * Signs a JWT with the given userId
 */
export async function signToken(userId: string): Promise<string> {
  return await new SignJWT({ userId })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d') // Token expires in 7 days
    .sign(secretKey);
}

/**
 * Verifies and decodes a JWT token. Returns the payload or null if invalid/expired.
 * NOTE: This file is shared with the Edge middleware, so it must stay
 * edge-runtime-safe (no Node built-ins). OTP helpers live in ./otp.ts.
 */
export async function verifyToken(token: string): Promise<JWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey);
    // Pending OTP-login tokens are NOT sessions — never accept them here.
    if (payload.purpose === 'otp-login') return null;
    return payload as JWTPayload;
  } catch {
    // Returns null if token signature is invalid or expired
    return null;
  }
}
