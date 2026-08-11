import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import connectDB from '@/lib/db';
import User from '@/models/User';
import { verifyToken } from '@/lib/auth';
import { z } from 'zod';

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(6, 'New password must be at least 6 characters'),
});

async function getUserId(req: NextRequest): Promise<string | null> {
  const token = req.cookies.get('token')?.value;
  if (!token) return null;
  const decoded = await verifyToken(token);
  return decoded?.userId ?? null;
}

// PUT /api/user/password -> Change the logged-in user's password
export async function PUT(req: NextRequest) {
  const userId = await getUserId(req);
  if (!userId) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const validation = changePasswordSchema.safeParse(body);
  if (!validation.success) {
    return NextResponse.json(
      { errors: validation.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const { currentPassword, newPassword } = validation.data;

  await connectDB();
  const user = await User.findById(userId).select('+password');
  if (!user || !user.password) {
    return NextResponse.json({ message: 'User not found' }, { status: 404 });
  }

  const isMatch = await bcrypt.compare(currentPassword, user.password);
  if (!isMatch) {
    return NextResponse.json(
      { message: 'Current password is incorrect' },
      { status: 400 }
    );
  }

  user.password = await bcrypt.hash(newPassword, 10);
  await user.save();

  return NextResponse.json(
    { message: 'Password changed successfully' },
    { status: 200 }
  );
}
