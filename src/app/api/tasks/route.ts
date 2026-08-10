import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import connectDB from '@/lib/db';
import Task from '@/models/Task';
import { createTaskSchema } from '@/lib/validators/task.schema';

interface DecodedToken {
  userId: string;
}

function getUserIdFromToken(req: NextRequest): string | null {
  const token = req.cookies.get('token')?.value;
  if (!token) return null;

  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET as string
    ) as DecodedToken;
    return decoded.userId;
  } catch {
    return null;
  }
}

// GET /api/tasks -> Fetch all tasks for logged-in user
export async function GET(req: NextRequest) {
  try {
    const userId = getUserIdFromToken(req);
    if (!userId) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();
    const tasks = await Task.find({ user: userId }).sort({ createdAt: -1 });

    return NextResponse.json({ tasks }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { message: 'Failed to fetch tasks', error: (error as Error).message },
      { status: 500 }
    );
  }
}

// POST /api/tasks -> Create new task
export async function POST(req: NextRequest) {
  try {
    const userId = getUserIdFromToken(req);
    if (!userId) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const validation = createTaskSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { errors: validation.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    await connectDB();
    const newTask = await Task.create({
      ...validation.data,
      user: userId,
    });

    return NextResponse.json({ task: newTask }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { message: 'Failed to create task', error: (error as Error).message },
      { status: 500 }
    );
  }
}