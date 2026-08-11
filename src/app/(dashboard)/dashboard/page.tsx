'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { useAuth } from '@/context/AuthContext';
import { useSettings } from '@/context/SettingsContext';

interface Task {
  _id: string;
  title: string;
  status: 'pending' | 'in-progress' | 'completed';
  dueDate?: string;
  remind: boolean;
}
interface AppEvent {
  _id: string;
  title: string;
  date: string;
  remind: boolean;
}
interface Note {
  _id: string;
  title: string;
  updatedAt: string;
  pinned: boolean;
}
interface ReminderData {
  overdue: Task[];
  dueToday: Task[];
  upcomingTasks: Task[];
  eventsToday: AppEvent[];
  eventsUpcoming: AppEvent[];
}

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

function dateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function statCard(icon: string, label: string, value: number | string, href: string, tint: string) {
  return (
    <Link
      href={href}
      className="group rounded-xl border border-border bg-card p-4 transition-all hover:-translate-y-0.5 hover:border-ring/40 hover:shadow-lg hover:shadow-black/5"
    >
      <div className={`flex h-10 w-10 items-center justify-center rounded-lg text-lg ${tint}`}>{icon}</div>
      <p className="mt-3 text-2xl font-bold tabular-nums">{value}</p>
      <p className="text-xs font-medium text-muted-foreground transition-colors group-hover:text-foreground">
        {label}
      </p>
    </Link>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  const { browserNotifications, updateSettings } = useSettings();
  const router = useRouter();

  const [tasks, setTasks] = useState<Task[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [reminders, setReminders] = useState<ReminderData | null>(null);
  const [events, setEvents] = useState<AppEvent[]>([]);
  const [loading, setLoading] = useState(true);

  // Mini calendar state
  const [month, setMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  // Quick add state
  const [quickTitle, setQuickTitle] = useState('');
  const [quickDue, setQuickDue] = useState('');
  const [quickSaving, setQuickSaving] = useState(false);

  const todayKey = useMemo(() => dateKey(new Date()), []);

  // Track which due-today items have already been notified this session
  const notifiedRef = useRef<Set<string>>(new Set());

  const fetchAll = useCallback(async () => {
    try {
      const [tasksRes, notesRes, remindersRes] = await Promise.all([
        fetch('/api/tasks'),
        fetch('/api/notes'),
        fetch(`/api/reminders?today=${todayKey}`),
      ]);
      const [tasksData, notesData, remindersData] = await Promise.all([
        tasksRes.json(),
        notesRes.json(),
        remindersRes.json(),
      ]);
      setTasks(tasksData.tasks || []);
      setNotes(notesData.notes || []);
      setReminders(remindersData);
    } catch {
      // keep partial state
    } finally {
      setLoading(false);
    }
  }, [todayKey]);

  const fetchEvents = useCallback(async () => {
    const start = new Date(month.getFullYear(), month.getMonth(), 1).toISOString();
    const end = new Date(month.getFullYear(), month.getMonth() + 1, 0).toISOString();
    try {
      const res = await fetch(`/api/events?start=${start}&end=${end}`);
      const data = await res.json();
      setEvents(data.events || []);
    } catch {
      setEvents([]);
    }
  }, [month]);

  useEffect(() => {
    void (async () => {
      await fetchAll();
    })();
  }, [fetchAll]);

  useEffect(() => {
    void (async () => {
      await fetchEvents();
    })();
  }, [fetchEvents]);

  // Browser notifications for due-today, remind-enabled items
  useEffect(() => {
    if (typeof Notification === 'undefined' || !browserNotifications) return;
    if (Notification.permission !== 'granted') return;
    if (!reminders) return;
    const freshTasks = reminders.dueToday.filter(
      (t) => t.remind && !notifiedRef.current.has(`task:${t._id}`)
    );
    const freshOverdue = reminders.overdue.filter(
      (t) => t.remind && !notifiedRef.current.has(`overdue:${t._id}`)
    );
    const freshEvents = reminders.eventsToday.filter(
      (e) => e.remind && !notifiedRef.current.has(`event:${e._id}`)
    );

    freshTasks.forEach((t) => notifiedRef.current.add(`task:${t._id}`));
    freshOverdue.forEach((t) => notifiedRef.current.add(`overdue:${t._id}`));
    freshEvents.forEach((e) => notifiedRef.current.add(`event:${e._id}`));

    const count = freshTasks.length + freshOverdue.length + freshEvents.length;
    if (count === 0) return;
    const first =
      freshOverdue[0]?.title ?? freshTasks[0]?.title ?? freshEvents[0]?.title;
    const prefix = freshOverdue.length > 0 ? 'Overdue: ' : '';
    const body = count > 1 ? `${prefix}${first} (+${count - 1} more today)` : `${prefix}${first}`;
    try {
      new Notification('🔔 Reminder', { body });
    } catch {
      /* ignore */
    }
  }, [browserNotifications, reminders]);

  const stats = useMemo(() => {
    const total = tasks.length;
    const completed = tasks.filter((t) => t.status === 'completed').length;
    const pending = total - completed;
    const upcomingEvents = reminders
      ? reminders.eventsToday.length + reminders.eventsUpcoming.length
      : 0;
    return { total, completed, pending, upcomingEvents };
  }, [tasks, reminders]);

  const handleEnableNotifications = async () => {
    if (typeof Notification === 'undefined') return;
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      updateSettings({ browserNotifications: true });
    }
  };

  const handleQuickAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickTitle.trim()) return;
    setQuickSaving(true);
    try {
      await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: quickTitle, dueDate: quickDue || undefined }),
      });
      setQuickTitle('');
      setQuickDue('');
      fetchAll();
    } finally {
      setQuickSaving(false);
    }
  };

  // Mini calendar data: date -> count of items
  const dotMap = useMemo(() => {
    const map = new Map<string, number>();
    tasks.forEach((t) => {
      if (!t.dueDate) return;
      const k = dateKey(new Date(t.dueDate));
      map.set(k, (map.get(k) ?? 0) + 1);
    });
    events.forEach((e) => {
      const k = dateKey(new Date(e.date));
      map.set(k, (map.get(k) ?? 0) + 1);
    });
    return map;
  }, [tasks, events]);

  const reminderItems = useMemo(() => {
    if (!reminders) return [];
    const items: { type: 'task' | 'event'; overdue: boolean; title: string; meta: string; remind: boolean }[] = [];
    reminders.overdue.forEach((t) =>
      items.push({ type: 'task', overdue: true, title: t.title, meta: 'Overdue', remind: t.remind })
    );
    reminders.dueToday.forEach((t) =>
      items.push({ type: 'task', overdue: false, title: t.title, meta: 'Due today', remind: t.remind })
    );
    reminders.eventsToday.forEach((e) =>
      items.push({ type: 'event', overdue: false, title: e.title, meta: 'Event today', remind: e.remind })
    );
    return items.slice(0, 6);
  }, [reminders]);

  const upcomingList = useMemo(() => {
    if (!reminders) return [];
    const list: { _id: string; title: string; date: Date }[] = [
      ...reminders.upcomingTasks.map((t) => ({ _id: t._id, title: t.title, date: new Date(t.dueDate as string) })),
      ...reminders.eventsUpcoming.map((e) => ({ _id: e._id, title: e.title, date: new Date(e.date) })),
    ];
    return list.sort((a, b) => a.date.getTime() - b.date.getTime()).slice(0, 5);
  }, [reminders]);

  const recentNotes = useMemo(() => {
    return [...notes]
      .sort((a, b) => Number(b.pinned) - Number(a.pinned) || new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .slice(0, 4);
  }, [notes]);

  // Mini calendar cells
  const firstWeekday = month.getDay();
  const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const cells = useMemo(() => {
    const arr: (number | null)[] = [];
    for (let i = 0; i < firstWeekday; i++) arr.push(null);
    for (let d = 1; d <= daysInMonth; d++) arr.push(d);
    return arr;
  }, [firstWeekday, daysInMonth]);

  return (
    <div className="space-y-6">
      {/* Greeting */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            {user ? `Welcome back, ${user.name.split(' ')[0]} 👋` : 'Welcome back 👋'}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">{format(new Date(), 'EEEE, MMMM d, yyyy')}</p>
        </div>
        <Link
          href="/tasks"
          className="rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-md shadow-primary/25 transition-all hover:bg-primary-hover active:scale-95"
        >
          ＋ New Task
        </Link>
      </div>

      {/* Stats */}
      {loading ? (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-28 animate-pulse rounded-xl border border-border bg-card/60" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {statCard('📋', 'Total tasks', stats.total, '/tasks', 'bg-accent text-accent-foreground')}
          {statCard('✅', 'Completed', stats.completed, '/tasks', 'bg-success-bg text-success')}
          {statCard('⏳', 'Pending', stats.pending, '/tasks', 'bg-warning-bg text-warning')}
          {statCard('📅', 'Upcoming events', stats.upcomingEvents, '/calendar', 'bg-danger-bg text-danger')}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left column */}
        <div className="space-y-6 lg:col-span-2">
          {/* Quick add */}
          <form onSubmit={handleQuickAdd} className="rounded-xl border border-border bg-card p-4">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Quick add task
            </h2>
            <div className="flex flex-col gap-2 sm:flex-row">
              <input
                type="text"
                placeholder="What needs to be done?"
                value={quickTitle}
                onChange={(e) => setQuickTitle(e.target.value)}
                className="flex-1 rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none transition-colors focus:border-ring focus:ring-2 focus:ring-ring/30"
              />
              <input
                type="date"
                value={quickDue}
                onChange={(e) => setQuickDue(e.target.value)}
                className="rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none transition-colors focus:border-ring focus:ring-2 focus:ring-ring/30"
              />
              <button
                type="submit"
                disabled={quickSaving}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-all hover:bg-primary-hover active:scale-95 disabled:opacity-50"
              >
                {quickSaving ? 'Adding...' : 'Add'}
              </button>
            </div>
          </form>

          {/* Reminders */}
          <section className="rounded-xl border border-border bg-card p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-lg font-bold">🔔 Reminders</h2>
              {typeof Notification !== 'undefined' && !browserNotifications && Notification.permission !== 'granted' && (
                <button
                  onClick={handleEnableNotifications}
                  className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold transition-colors hover:bg-secondary"
                >
                  Enable browser notifications
                </button>
              )}
            </div>

            {reminderItems.length === 0 ? (
              <div className="mt-4 rounded-xl border border-dashed border-border bg-muted/30 px-4 py-8 text-center">
                <p className="text-3xl">🎉</p>
                <p className="mt-2 text-sm font-medium">You&apos;re all caught up!</p>
                <p className="text-xs text-muted-foreground">
                  No tasks or events due today. Enjoy the calm.
                </p>
              </div>
            ) : (
              <ul className="mt-4 divide-y divide-border">
                {reminderItems.map((item, i) => (
                  <li key={i} className="flex items-center gap-3 py-2.5">
                    <span
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-sm ${
                        item.overdue ? 'bg-danger-bg' : 'bg-accent'
                      }`}
                    >
                      {item.type === 'event' ? '📅' : item.overdue ? '⚠️' : '✅'}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-sm font-medium">{item.title}</span>
                    {item.remind && <span title="Reminder enabled" className="text-xs">🔔</span>}
                    <span
                      className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                        item.overdue ? 'bg-danger-bg text-danger' : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      {item.meta}
                    </span>
                  </li>
                ))}
              </ul>
            )}

            {(reminders?.upcomingTasks.length || reminders?.eventsUpcoming.length) ? (
              <Link
                href="/calendar"
                className="mt-3 inline-block text-sm font-semibold text-primary transition-colors hover:text-primary-hover"
              >
                View upcoming in calendar →
              </Link>
            ) : null}
          </section>

          {/* Upcoming events */}
          <section className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold">📅 Upcoming</h2>
              <Link href="/calendar" className="text-sm font-semibold text-primary transition-colors hover:text-primary-hover">
                View all →
              </Link>
            </div>
            {upcomingList.length === 0 ? (
              <p className="mt-4 rounded-xl border border-dashed border-border bg-muted/30 px-4 py-8 text-center text-sm text-muted-foreground">
                Nothing scheduled in the next 7 days.
              </p>
            ) : (
              <ul className="mt-3 divide-y divide-border">
                {upcomingList.map((item) => (
                  <li key={item._id} className="flex items-center gap-3 py-2.5">
                    <div className="flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-lg bg-accent text-accent-foreground">
                      <span className="text-sm font-bold leading-none">{format(item.date, 'd')}</span>
                      <span className="text-[10px] uppercase leading-tight">{format(item.date, 'MMM')}</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{item.title}</p>
                      <p className="text-xs text-muted-foreground">{format(item.date, 'EEEE, MMM d')}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        {/* Right column */}
        <div className="space-y-6">
          {/* Mini calendar */}
          <section className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-center justify-between">
              <h2 className="font-bold">{format(month, 'MMMM yyyy')}</h2>
              <div className="flex gap-1">
                <button
                  onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}
                  aria-label="Previous month"
                  className="flex h-7 w-7 items-center justify-center rounded-lg border border-border text-xs transition-colors hover:bg-secondary"
                >
                  ‹
                </button>
                <button
                  onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}
                  aria-label="Next month"
                  className="flex h-7 w-7 items-center justify-center rounded-lg border border-border text-xs transition-colors hover:bg-secondary"
                >
                  ›
                </button>
              </div>
            </div>

            <div className="mt-3 grid grid-cols-7 gap-1 text-center">
              {WEEKDAYS.map((w) => (
                <span key={w} className="text-[10px] font-semibold uppercase text-muted-foreground">
                  {w}
                </span>
              ))}
              {cells.map((day, i) => {
                if (day === null) return <span key={`empty-${i}`} />;
                const key = `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                const isToday = key === todayKey;
                const hasItems = dotMap.get(key);
                return (
                  <button
                    key={key}
                    onClick={() => router.push('/calendar')}
                    className={`relative flex h-9 flex-col items-center justify-center rounded-lg text-xs font-medium transition-all ${
                      isToday
                        ? 'bg-primary text-primary-foreground shadow-md shadow-primary/25'
                        : hasItems
                        ? 'bg-accent text-accent-foreground hover:bg-accent/70'
                        : 'hover:bg-muted'
                    }`}
                  >
                    {day}
                    <span className={`absolute bottom-1 flex gap-0.5 ${isToday ? '' : ''}`}>
                      {hasItems && (
                        <span className={`h-1 w-1 rounded-full ${isToday ? 'bg-primary-foreground' : 'bg-primary'}`} />
                      )}
                    </span>
                  </button>
                );
              })}
            </div>
            <div className="mt-3 flex items-center gap-4 text-[11px] text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-primary" /> Has events/tasks
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded bg-primary" /> Today
              </span>
            </div>
          </section>

          {/* Recent notes */}
          <section className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold">📝 Recent notes</h2>
              <Link href="/notes" className="text-sm font-semibold text-primary transition-colors hover:text-primary-hover">
                All notes →
              </Link>
            </div>
            {recentNotes.length === 0 ? (
              <p className="mt-4 rounded-xl border border-dashed border-border bg-muted/30 px-4 py-8 text-center text-sm text-muted-foreground">
                No notes yet.
              </p>
            ) : (
              <ul className="mt-3 space-y-2">
                {recentNotes.map((note) => (
                  <li key={note._id}>
                    <Link
                      href="/notes"
                      className="flex items-start gap-2.5 rounded-lg border border-border p-3 transition-all hover:border-ring/40 hover:bg-muted/40"
                    >
                      <span className="mt-0.5 text-base">{note.pinned ? '📌' : '🗒️'}</span>
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium">{note.title}</span>
                        <span className="block text-xs text-muted-foreground">
                          Updated {format(new Date(note.updatedAt), 'MMM d, h:mm a')}
                        </span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
