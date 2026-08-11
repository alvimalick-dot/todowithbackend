import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import connectDB from '@/lib/db';
import User from '@/models/User';
import { registerSchema } from '@/lib/validators/auth.schema';
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
    // STEP 1: Parse the incoming JSON body from the client request
    const body = await req.json();

    // STEP 2: Validate using Zod to reject malformed input early
    const validation = registerSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { errors: validation.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { name, email, password } = validation.data;

    // STEP 3: Ensure database connection is active
    await connectDB();

    // STEP 4: Query the database for existing records
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return NextResponse.json(
        { message: 'Email already in use' },
        { status: 409 }
      );
    }

    // STEP 5: Hash password before storing
    const hashedPassword = await bcrypt.hash(password, 10);

    // STEP 6: Create the account (email starts unverified)
    let newUser;
    try {
      newUser = await User.create({
        name,
        email,
        password: hashedPassword,
        emailVerified: false,
      });
    } catch (error) {
      // Two concurrent registrations with the same email -> duplicate key.
      if ((error as { code?: number }).code === 11000) {
        return NextResponse.json(
          { message: 'Email already in use' },
          { status: 409 }
        );
      }
      throw error;
    }

    // STEP 7: Generate a 6-digit OTP, store only its hash, email it to the user
    const otp = generateOtpCode();
    await User.updateOne(
      { _id: newUser._id },
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
      await sendOtpEmail(email, otp);
    } catch {
      // Don't leave a half-created account behind
      await User.deleteOne({ _id: newUser._id });
      return NextResponse.json(
        { message: 'Could not send the verification email. Please try again.' },
        { status: 500 }
      );
    }

    // STEP 8: Pending token for the OTP step (register purpose — not a session)
    const pendingToken = await signOtpPendingToken(
      newUser._id.toString(),
      'otp-register'
    );

    return NextResponse.json(
      {
        message: 'Account created — verify your email to continue',
        pendingToken,
        email: maskEmail(email),
      },
      { status: 201 }
    );
  } catch (error) {
    return NextResponse.json(
      { message: 'Server error', error: (error as Error).message },
      { status: 500 }
    );
  }
}
