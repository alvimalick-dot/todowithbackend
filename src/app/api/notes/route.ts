import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Note from '@/models/Note';
import { createNoteSchema } from '@/lib/validators/note.schema';
import { verifyToken } from '@/lib/auth';

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
  const { searchParams } = req.nextUrl;
  const folder = searchParams.get('folder');
  const search = searchParams.get('search');

  const filter: Record<string, unknown> = { user: userId };
  if (folder) filter.folder = folder;
  if (search) filter.title = { $regex: search, $options: 'i' };

  const notes = await Note.find(filter).sort({ pinned: -1, createdAt: -1 });
  return NextResponse.json({ notes }, { status: 200 });
}

export async function POST(req: NextRequest) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const validation = createNoteSchema.safeParse(body);
  if (!validation.success) {
    return NextResponse.json({ errors: validation.error.flatten().fieldErrors }, { status: 400 });
  }

  await connectDB();
  const newNote = await Note.create({ ...validation.data, user: userId });
  return NextResponse.json({ note: newNote }, { status: 201 });
}