import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import User from '@/models/User';
import { generateOtpCode, hashOtp, verifyOtpPendingToken } from '@/lib/otp';
import { sendOtpEmail } from '@/lib/email';
import { z } from 'zod';

const resendOtpSchema = z.object({
  pendingToken: z.string().min(1, 'Pending token is required'),
});

const RESEND_COOLDOWN_MS = 60 * 1000; // 1 minute between emails

function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!domain) return email;
  const visible = local.slice(0, Math.min(2, local.length));
  return `${visible}***@${domain}`;
}

// POST /api/auth/resend-otp -> Send a fresh code for the pending login
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validation = resendOtpSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { errors: validation.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { pendingToken } = validation.data;

    const pending = await verifyOtpPendingToken(pendingToken);
    if (!pending) {
      return NextResponse.json(
        { message: 'Session expired. Please log in again.' },
        { status: 401 }
      );
    }

    await connectDB();

    const user = await User.findById(pending.userId).select(
      '+otpSentAt +otpHash +otpExpiry +otpAttempts +otpLockedUntil'
    );
    if (!user) {
      return NextResponse.json(
        { message: 'No code was requested. Please log in again.' },
        { status: 400 }
      );
    }

    // Locked out after too many wrong codes
    if (user.otpLockedUntil && user.otpLockedUntil.getTime() > Date.now()) {
      return NextResponse.json(
        { message: 'Too many attempts. Please log in again later.' },
        { status: 429 }
      );
    }

    // Cooldown so the account's inbox isn't spammed
    if (user.otpSentAt && Date.now() - user.otpSentAt.getTime() < RESEND_COOLDOWN_MS) {
      const wait = Math.ceil(
        (RESEND_COOLDOWN_MS - (Date.now() - user.otpSentAt.getTime())) / 1000
      );
      return NextResponse.json(
        { message: `Please wait ${wait}s before requesting another code.` },
        { status: 429 }
      );
    }

    const otp = generateOtpCode();
    await User.updateOne(
      { _id: user._id },
      {
        $set: {
          otpHash: hashOtp(otp),
          otpExpiry: new Date(Date.now() + 10 * 60 * 1000),
          otpAttempts: 0,
          otpSentAt: new Date(),
          otpLockedUntil: null,
        },
      }
    );

    try {
      await sendOtpEmail(user.email, otp);
    } catch {
      return NextResponse.json(
        { message: 'Could not send the verification code. Please try again.' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { message: 'A new code has been sent.', email: maskEmail(user.email) },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      { message: 'Internal Server Error', error: (error as Error).message },
      { status: 500 }
    );
  }
}
