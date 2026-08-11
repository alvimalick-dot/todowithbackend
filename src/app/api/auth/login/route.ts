import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import connectDB from '@/lib/db';
import User from '@/models/User';
import { loginSchema } from '@/lib/validators/auth.schema';
import { generateOtpCode, hashOtp, signOtpPendingToken } from '@/lib/otp';
import { sendOtpEmail } from '@/lib/email';

const OTP_TTL_MS = 10 * 60 * 1000; // 10 minutes

/** Mask an email for display, e.g. j***@example.com */
function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!domain) return email;
  const visible = local.slice(0, Math.min(2, local.length));
  return `${visible}***@${domain}`;
}

export async function POST(req: NextRequest) {
  try {
    // 1. Parse request body
    const body = await req.json();

    // 2. Validate input with Zod schema
    const validation = loginSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        {
          message: 'Validation failed',
          errors: validation.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const { email, password } = validation.data;

    // 3. Connect to DB
    await connectDB();

    // 4. Find user by email (Explicitly select select:false fields we need)
    const user = await User.findOne({ email }).select(
      '+password +otpHash +otpExpiry +otpAttempts +otpSentAt +otpLockedUntil'
    );
    if (!user || !user.password) {
      return NextResponse.json(
        { message: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // 5. Compare input password with hashed password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return NextResponse.json(
        { message: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // 5a. Temporary lockout after too many wrong codes
    if (user.otpLockedUntil && user.otpLockedUntil.getTime() > Date.now()) {
      return NextResponse.json(
        { message: 'Too many attempts. Please try again later.' },
        { status: 429 }
      );
    }

    // 5b. Rate-limit OTP emails: at most one per minute per account
    if (user.otpSentAt && Date.now() - user.otpSentAt.getTime() < 60_000) {
      const wait = Math.ceil(
        (60_000 - (Date.now() - user.otpSentAt.getTime())) / 1000
      );
      return NextResponse.json(
        { message: `A code was just sent. Please wait ${wait}s before trying again.` },
        { status: 429 }
      );
    }

    // 6. Generate a 6-digit OTP, store only its hash, and email it to the user
    const otp = generateOtpCode();
    await User.updateOne(
      { _id: user._id },
      {
        $set: {
          otpHash: hashOtp(otp),
          otpExpiry: new Date(Date.now() + OTP_TTL_MS),
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

    // 7. Short-lived token proving the password step only — NOT a session.
    //    It can only be exchanged for a real session by presenting the OTP.
    const pendingToken = await signOtpPendingToken(
      user._id.toString(),
      'otp-login'
    );

    return NextResponse.json(
      {
        message: 'Verification code sent',
        pendingToken,
        email: maskEmail(user.email),
      },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      { message: 'Internal Server Error', error: (error as Error).message },
      { status: 500 }
    );
  }
}