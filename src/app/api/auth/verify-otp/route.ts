import { NextRequest, NextResponse } from 'next/server';
import crypto from 'node:crypto';
import connectDB from '@/lib/db';
import User from '@/models/User';
import { signToken } from '@/lib/auth';
import { hashOtp, verifyOtpPendingToken } from '@/lib/otp';
import { z } from 'zod';

const verifyOtpSchema = z.object({
  pendingToken: z.string().min(1, 'Pending token is required'),
  otp: z.string().regex(/^\d{6}$/, 'Code must be exactly 6 digits'),
});

const MAX_ATTEMPTS = 5;

/** Constant-time string comparison to avoid leaking timing info. */
function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return crypto.timingSafeEqual(ab, bb);
}

// POST /api/auth/verify-otp -> Exchange pending token + OTP for a real session
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validation = verifyOtpSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { errors: validation.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { pendingToken, otp } = validation.data;

    // The pending token is bound to the user who passed the password step,
    // so this OTP can only ever be verified against that same account.
    const pending = await verifyOtpPendingToken(pendingToken);
    if (!pending) {
      return NextResponse.json(
        { message: 'Session expired. Please log in again.' },
        { status: 401 }
      );
    }

    await connectDB();

    const user = await User.findById(pending.userId).select(
      '+otpHash +otpExpiry +otpAttempts +otpLockedUntil'
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

    if (!user.otpHash || !user.otpExpiry) {
      return NextResponse.json(
        { message: 'No code was requested. Please log in again.' },
        { status: 400 }
      );
    }

    if (user.otpExpiry.getTime() < Date.now()) {
      return NextResponse.json(
        { message: 'Code expired. Please request a new one.' },
        { status: 400 }
      );
    }

    if ((user.otpAttempts ?? 0) >= MAX_ATTEMPTS) {
      return NextResponse.json(
        { message: 'Too many attempts. Please request a new code.' },
        { status: 429 }
      );
    }

    if (!safeEqual(hashOtp(otp), user.otpHash)) {
      const nextAttempts = (user.otpAttempts ?? 0) + 1;
      if (nextAttempts >= MAX_ATTEMPTS) {
        // Lock the account for 10 minutes and invalidate the current code
        await User.updateOne(
          { _id: user._id },
          {
            $set: {
              otpAttempts: nextAttempts,
              otpLockedUntil: new Date(Date.now() + 10 * 60 * 1000),
            },
            $unset: { otpHash: '', otpExpiry: '' },
          }
        );
      } else {
        await User.updateOne(
          { _id: user._id },
          { $inc: { otpAttempts: 1 } }
        );
      }
      return NextResponse.json(
        { message: 'Incorrect code. Please try again.' },
        { status: 400 }
      );
    }

    // Single-use: wipe the OTP, mark the email verified, then issue the session
    await User.updateOne(
      { _id: user._id },
      {
        $set: { emailVerified: true },
        $unset: { otpHash: '', otpExpiry: '', otpAttempts: '', otpSentAt: '' },
      }
    );

    const token = await signToken(user._id.toString());

    const userResponse = {
      _id: user._id,
      name: user.name,
      email: user.email,
      avatar: user.avatar,
    };

    const response = NextResponse.json(
      { message: 'Login successful', user: userResponse },
      { status: 200 }
    );

    const isProduction = process.env.NODE_ENV === 'production';
    response.cookies.set({
      name: 'token',
      value: token,
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60,
    });

    return response;
  } catch (error) {
    return NextResponse.json(
      { message: 'Internal Server Error', error: (error as Error).message },
      { status: 500 }
    );
  }
}
