import { NextRequest, NextResponse } from 'next/server';
import crypto from 'node:crypto';
import connectDB from '@/lib/db';
import User from '@/models/User';
import { z } from 'zod';

const forgotPasswordSchema = z.object({
  email: z.string().email('Please enter a valid email address').trim().toLowerCase(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const validation = forgotPasswordSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { errors: validation.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { email } = validation.data;

    await connectDB();

    const user = await User.findOne({ email });

    // Security practice: Return generic success to prevent email enumeration
    if (!user) {
      return NextResponse.json(
        { message: 'If an account exists with that email, a password reset link has been generated.' },
        { status: 200 }
      );
    }

    // 1. Generate unhashed reset token to pass in link
    const resetToken = crypto.randomBytes(32).toString('hex');

    // 2. Hash token before saving to database
    const hashedToken = crypto
      .createHash('sha256')
      .update(resetToken)
      .digest('hex');

    // 3. Store hashed token & expiration (1 hour from now)
    user.resetPasswordToken = hashedToken;
    user.resetPasswordExpiry = new Date(Date.now() + 60 * 60 * 1000);

    await user.save();

    // Construct reset URL
    const resetUrl = `http://localhost:3000/reset-password?token=${resetToken}`;

    // Log to terminal for local testing
    console.log('--------------------------------------------------');
    console.log(`PASSWORD RESET FOR: ${user.email}`);
    console.log(`RESET TOKEN: ${resetToken}`);
    console.log(`RESET URL: ${resetUrl}`);
    console.log('--------------------------------------------------');

    return NextResponse.json(
      { message: 'If an account exists with that email, a password reset link has been generated.' },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      { message: 'Internal Server Error', error: (error as Error).message },
      { status: 500 }
    );
  }
}