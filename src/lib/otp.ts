import { SignJWT, jwtVerify } from 'jose';
import crypto from 'node:crypto';

// NOTE: This module runs only in Node.js route handlers (never the Edge
// middleware), so Node built-ins are safe here.

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error('Please define JWT_SECRET in .env.local');
}

const secretKey = new TextEncoder().encode(JWT_SECRET);

export type OtpPurpose = 'otp-login' | 'otp-register';

export interface OtpPendingPayload {
  userId: string;
  purpose: OtpPurpose;
}

/**
 * Short-lived token proving the user passed the password step.
 * Only usable to verify their emailed OTP — it is never a session.
 */
export async function signOtpPendingToken(
  userId: string,
  purpose: OtpPurpose
): Promise<string> {
  return await new SignJWT({ userId, purpose })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('10m')
    .sign(secretKey);
}

/**
 * Verifies a pending-login/register token and enforces its purpose claim.
 */
export async function verifyOtpPendingToken(
  token: string
): Promise<OtpPendingPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey);
    if (
      (payload.purpose !== 'otp-login' && payload.purpose !== 'otp-register') ||
      typeof payload.userId !== 'string'
    ) {
      return null;
    }
    return { userId: payload.userId, purpose: payload.purpose as OtpPurpose };
  } catch {
    return null;
  }
}

/** Generate a 6-digit one-time code. */
export function generateOtpCode(): string {
  return crypto.randomInt(0, 1_000_000).toString().padStart(6, '0');
}

/** Hash an OTP before storing it (never keep plaintext codes at rest). */
export function hashOtp(code: string): string {
  return crypto.createHash('sha256').update(code).digest('hex');
}
