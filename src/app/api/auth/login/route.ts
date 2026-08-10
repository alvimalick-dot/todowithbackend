import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import connectDB from '@/lib/db';
import User from '@/models/User';
import { loginSchema } from '@/lib/validators/auth.schema';
import { signToken } from '@/lib/auth';

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

    // 4. Find user by email (Explicitly select password since select: false in schema)
    const user = await User.findOne({ email }).select('+password');
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

    // 6. Sign JWT with user ID
    const token = await signToken(user._id.toString());

    // 7. Format sanitized user response (exclude password)
    const userResponse = {
      _id: user._id,
      name: user.name,
      email: user.email,
      avatar: user.avatar,
    };

    // 8. Create response and set httpOnly cookie
    const response = NextResponse.json(
      {
        message: 'Login successful',
        user: userResponse,
      },
      { status: 200 }
    );

    const isProduction = process.env.NODE_ENV === 'production';

    response.cookies.set({
      name: 'token',
      value: token,
      httpOnly: true, // Prevents JavaScript client-side access
      secure: isProduction, // HTTPS only in production
      sameSite: 'lax', // CSRF protection
      path: '/', // Cookie accessible across the entire app
      maxAge: 7 * 24 * 60 * 60, // 7 days in seconds
    });

    return response;
  } catch (error) {
    return NextResponse.json(
      { message: 'Internal Server Error', error: (error as Error).message },
      { status: 500 }
    );
  }
}