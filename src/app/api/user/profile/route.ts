import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import User from '@/models/User';
import Task from '@/models/Task';
import Event from '@/models/Event';
import Note from '@/models/Note';
import { verifyToken } from '@/lib/auth';
import { z } from 'zod';

const updateProfileSchema = z.object({
  name: z.string().min(2).max(50).optional(),
  avatar: z.string().url().optional().or(z.literal('')),
});

async function getUserId(req: NextRequest): Promise<string | null> {
  const token = req.cookies.get('token')?.value;
  if (!token) return null;
  const decoded = await verifyToken(token);
  return decoded?.userId ?? null;
}

export async function GET(req: NextRequest) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

  await connectDB();
  const user = await User.findById(userId).select('-password');
  if (!user) return NextResponse.json({ message: 'User not found' }, { status: 404 });

  return NextResponse.json({ user }, { status: 200 });
}

export async function PUT(req: NextRequest) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const validation = updateProfileSchema.safeParse(body);
  if (!validation.success) {
    return NextResponse.json({ errors: validation.error.flatten().fieldErrors }, { status: 400 });
  }

  await connectDB();
  const updatedUser = await User.findByIdAndUpdate(userId, validation.data, { new: true }).select('-password');

  return NextResponse.json({ user: updatedUser }, { status: 200 });
}

// DELETE /api/user/profile -> Permanently delete account and all related data
export async function DELETE(req: NextRequest) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

  await connectDB();

  const deletedUser = await User.findByIdAndDelete(userId);
  if (!deletedUser) {
    return NextResponse.json({ message: 'User not found' }, { status: 404 });
  }

  // Cascade delete all user data
  await Promise.all([
    Task.deleteMany({ user: userId }),
    Event.deleteMany({ user: userId }),
    Note.deleteMany({ user: userId }),
  ]);

  const response = NextResponse.json(
    { message: 'Account deleted successfully' },
    { status: 200 }
  );

  // Clear the auth cookie
  response.cookies.set({
    name: 'token',
    value: '',
    httpOnly: true,
    expires: new Date(0),
    path: '/',
  });

  return response;
}