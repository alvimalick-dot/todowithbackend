import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Event from '@/models/Event';
import { updateEventSchema } from '@/lib/validators/event.schema';
import { verifyToken } from '@/lib/auth';

async function getUserIdFromToken(req: NextRequest): Promise<string | null> {
  const token = req.cookies.get('token')?.value;
  if (!token) return null;
  const decoded = await verifyToken(token);
  return decoded?.userId ?? null;
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const userId = await getUserIdFromToken(req);
    if (!userId) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const validation = updateEventSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { errors: validation.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    await connectDB();
    const updatedEvent = await Event.findOneAndUpdate(
      { _id: id, user: userId },
      validation.data,
      { returnDocument: 'after' }
    );

    if (!updatedEvent) {
      return NextResponse.json({ message: 'Event not found' }, { status: 404 });
    }

    return NextResponse.json({ event: updatedEvent }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { message: 'Failed to update event', error: (error as Error).message },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const userId = await getUserIdFromToken(req);
    if (!userId) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();
    const deletedEvent = await Event.findOneAndDelete({
      _id: id,
      user: userId,
    });

    if (!deletedEvent) {
      return NextResponse.json({ message: 'Event not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Event deleted' }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { message: 'Failed to delete event', error: (error as Error).message },
      { status: 500 }
    );
  }
}