import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Note from '@/models/Note';
import { updateNoteSchema } from '@/lib/validators/note.schema';
import { verifyToken } from '@/lib/auth';

async function getUserIdFromToken(req: NextRequest): Promise<string | null> {
  const token = req.cookies.get('token')?.value;
  if (!token) return null;
  const decoded = await verifyToken(token);
  return decoded?.userId ?? null;
}

// PUT /api/notes/[id] -> Update a note
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
    const validation = updateNoteSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { errors: validation.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    await connectDB();

    // Secure query matching BOTH note _id and user ID
    const updatedNote = await Note.findOneAndUpdate(
      { _id: id, user: userId },
      validation.data,
      { returnDocument: 'after' }
    );

    if (!updatedNote) {
      return NextResponse.json({ message: 'Note not found' }, { status: 404 });
    }

    return NextResponse.json({ note: updatedNote }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { message: 'Failed to update note', error: (error as Error).message },
      { status: 500 }
    );
  }
}

// DELETE /api/notes/[id] -> Delete a note
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

    // Secure query matching BOTH note _id and user ID
    const deletedNote = await Note.findOneAndDelete({
      _id: id,
      user: userId,
    });

    if (!deletedNote) {
      return NextResponse.json({ message: 'Note not found' }, { status: 404 });
    }

    return NextResponse.json(
      { message: 'Note deleted successfully' },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      { message: 'Failed to delete note', error: (error as Error).message },
      { status: 500 }
    );
  }
}