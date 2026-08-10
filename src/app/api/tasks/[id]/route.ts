import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import connectDB from '@/lib/db';
import Task from '@/models/Task';
import { updateTaskSchema } from '@/lib/validators/task.schema';

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

// PUT /api/tasks/[id] -> Update a task status
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params; // <--- Await params here

    const userId = getUserIdFromToken(req);
    if (!userId) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const validation = updateTaskSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { errors: validation.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    await connectDB();
    const updatedTask = await Task.findOneAndUpdate(
      { _id: id, user: userId },
      validation.data,
      { returnDocument: 'after' } // Updated to remove deprecation warning
    );

    if (!updatedTask) {
      return NextResponse.json({ message: 'Task not found' }, { status: 404 });
    }

    return NextResponse.json({ task: updatedTask }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { message: 'Failed to update task', error: (error as Error).message },
      { status: 500 }
    );
  }
}

// DELETE /api/tasks/[id] -> Delete a task
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params; // <--- Await params here

    const userId = getUserIdFromToken(req);
    if (!userId) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();
    const deletedTask = await Task.findOneAndDelete({
      _id: id,
      user: userId,
    });

    if (!deletedTask) {
      return NextResponse.json({ message: 'Task not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Task deleted successfully' }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { message: 'Failed to delete task', error: (error as Error).message },
      { status: 500 }
    );
  }
}