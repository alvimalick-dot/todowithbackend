import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Event from '@/models/Event';
import { createEventSchema } from '@/lib/validators/event.schema';
import { verifyToken } from '@/lib/auth';

async function getUserIdFromToken(req: NextRequest): Promise<string | null> {
  const token = req.cookies.get('token')?.value;
  if (!token) return null;

  const decoded = await verifyToken(token);
  return decoded?.userId ?? null;
}

// GET /api/events -> Query events scoped to user & date range
export async function GET(req: NextRequest) {
  try {
    const userId = await getUserIdFromToken(req);
    if (!userId) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const { searchParams } = req.nextUrl;
    const start = searchParams.get('start');
    const end = searchParams.get('end');

    const filter: Record<string, unknown> = { user: userId };

    if (start && end) {
      filter.date = { $gte: new Date(start), $lte: new Date(end) };
    }

    const events = await Event.find(filter).sort({ date: 1 });

    return NextResponse.json({ events }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { message: 'Failed to fetch events', error: (error as Error).message },
      { status: 500 }
    );
  }
}

// POST /api/events -> Create new event
export async function POST(req: NextRequest) {
  try {
    const userId = await getUserIdFromToken(req);
    if (!userId) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const validation = createEventSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { errors: validation.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    await connectDB();
    const newEvent = await Event.create({
      ...validation.data,
      user: userId,
    });

    return NextResponse.json({ event: newEvent }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { message: 'Failed to create event', error: (error as Error).message },
      { status: 500 }
    );
  }
}