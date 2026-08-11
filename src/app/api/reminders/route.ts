import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Task from '@/models/Task';
import Event from '@/models/Event';
import { verifyToken } from '@/lib/auth';

async function getUserId(req: NextRequest): Promise<string | null> {
  const token = req.cookies.get('token')?.value;
  if (!token) return null;
  const decoded = await verifyToken(token);
  return decoded?.userId ?? null;
}

/** Local date key like 2026-08-11 (server-local fallback for the anchor). */
function localDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * Date key for an item's intended day. Date-only values are stored as UTC
 * midnight (e.g. 2026-08-11T00:00:00.000Z), so the UTC date part encodes the
 * user's chosen day regardless of server/browser timezone.
 */
function itemDateKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

// GET /api/reminders?today=YYYY-MM-DD -> Due-today / upcoming reminders
// The optional `today` param is the client's local date, which keeps the
// buckets correct for users in any timezone.
export async function GET(req: NextRequest) {
  const userId = await getUserId(req);
  if (!userId) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  await connectDB();

  const { searchParams } = req.nextUrl;
  const todayParam = searchParams.get('today');
  const anchor =
    todayParam && /^\d{4}-\d{2}-\d{2}$/.test(todayParam)
      ? todayParam
      : localDateKey(new Date());

  const weekEndDate = new Date(`${anchor}T00:00:00.000Z`);
  weekEndDate.setUTCDate(weekEndDate.getUTCDate() + 7);
  const weekEndKey = weekEndDate.toISOString().slice(0, 10);

  const todayStart = new Date(`${anchor}T00:00:00.000Z`);

  const [tasks, events] = await Promise.all([
    Task.find({
      user: userId,
      dueDate: { $exists: true, $ne: null },
      status: { $ne: 'completed' },
    }).sort({ dueDate: 1 }),
    Event.find({ user: userId, date: { $gte: todayStart } }).sort({ date: 1 }),
  ]);

  const overdue = tasks.filter((t) => itemDateKey(t.dueDate as Date) < anchor);
  const dueToday = tasks.filter(
    (t) => itemDateKey(t.dueDate as Date) === anchor
  );
  const upcomingTasks = tasks.filter((t) => {
    const k = itemDateKey(t.dueDate as Date);
    return k > anchor && k <= weekEndKey;
  });
  const eventsToday = events.filter((e) => itemDateKey(e.date) === anchor);
  const eventsUpcoming = events.filter((e) => {
    const k = itemDateKey(e.date);
    return k > anchor && k <= weekEndKey;
  });

  return NextResponse.json(
    { overdue, dueToday, upcomingTasks, eventsToday, eventsUpcoming },
    { status: 200 }
  );
}
