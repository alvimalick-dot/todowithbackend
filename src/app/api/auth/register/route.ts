import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import connectDB from '@/lib/db';
import User from '@/models/User';
import { registerSchema } from '@/lib/validators/auth.schema';

export async function POST(req: NextRequest) {
  try {
    // STEP 1: Parse the incoming JSON body from the client request
    const body = await req.json();

    // STEP 2: Validate using Zod to reject malformed input early
    const validation = registerSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { errors: validation.error.flatten().fieldErrors },
        { status: 400 } // 400 = Bad Request
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
        { status: 409 } // 409 = Conflict
      );
    }

    // STEP 5: Hash password before storing
    const hashedPassword = await bcrypt.hash(password, 10);

    // STEP 6: Write to the database
    const newUser = await User.create({
      name,
      email,
      password: hashedPassword,
    });

    // STEP 7: Return clean response
    return NextResponse.json(
      {
        message: 'Registered successfully',
        user: { id: newUser._id, name: newUser.name, email: newUser.email },
      },
      { status: 201 } // 201 = Created
    );
  } catch (error) {
    // Fallback for unexpected errors
    return NextResponse.json(
      { message: 'Server error', error: (error as Error).message },
      { status: 500 } // 500 = Internal Server Error
    );
  }
}