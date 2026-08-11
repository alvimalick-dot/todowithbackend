'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Calendar,
  dateFnsLocalizer,
  type Event as RBCEvent,
} from 'react-big-calendar';
import { format, parse, startOfWeek, getDay, startOfMonth, endOfMonth } from 'date-fns';
import { enUS } from 'date-fns/locale/en-US';
import 'react-big-calendar/lib/css/react-big-calendar.css';

const locales = { 'en-US': enUS };
const localizer = dateFnsLocalizer({ format, parse, startOfWeek, getDay, locales });

interface AppEvent {
  _id: string;
  title: string;
  description?: string;
  date: string;
  startTime?: string;
  endTime?: string;
  remind: boolean;
}

interface DisplayItem extends RBCEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  allDay?: boolean;
  type: 'event' | 'task';
}

const EMPTY_FORM = {
  title: '',
  description: '',
  date: '',
  startTime: '',
  endTime: '',
  remind: false,
};

function parseTimeToDate(base: Date, time?: string): Date {
  if (!time) return new Date(base);
  const [h, m] = time.split(':').map(Number);
  const d = new Date(base);
  d.setHours(h, m, 0, 0);
  return d;
}

function eventStart(e: AppEvent): Date {
  return parseTimeToDate(new Date(e.date), e.startTime);
}
function eventEnd(e: AppEvent): Date {
  if (e.endTime) return parseTimeToDate(new Date(e.date), e.endTime);
  if (e.startTime) return new Date(eventStart(e).getTime() + 60 * 60 * 1000);
  // Date-only event: spans the whole day
  const d = new Date(e.date);
  d.setDate(d.getDate() + 1);
  return d;
}

const inputCls =
  'w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none transition-colors focus:border-ring focus:ring-2 focus:ring-ring/30';

export default function CalendarPage() {
  const router = useRouter();
  const [events, setEvents] = useState<AppEvent[]>([]);
  const [tasks, setTasks] = useState<{ _id: string; title: string; dueDate?: string }[]>([]);
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [loading, setLoading] = useState(true);

  // Create form (right panel)
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  // Edit modal
  const [editing, setEditing] = useState<AppEvent | null>(null);
  const [editForm, setEditForm] = useState(EMPTY_FORM);
  const [savingEdit, setSavingEdit] = useState(false);

  const fetchData = useCallback(async (rangeDate: Date) => {
    const start = startOfMonth(rangeDate).toISOString();
    const end = endOfMonth(rangeDate).toISOString();
    try {
      const [eventsRes, tasksRes] = await Promise.all([
        fetch(`/api/events?start=${start}&end=${end}`),
        fetch('/api/tasks'),
      ]);
      const eventsData = await eventsRes.json();
      const tasksData = await tasksRes.json();
      setEvents(eventsData.events || []);
      setTasks(
        (tasksData.tasks || []).filter((t: { dueDate?: string }) => t.dueDate)
      );
    } catch {
      setEvents([]);
      setTasks([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void (async () => {
      await fetchData(currentDate);
    })();
  }, [currentDate, fetchData]);

  const refreshEvents = useCallback(() => {
    fetchData(currentDate);
  }, [fetchData, currentDate]);

  const displayItems = useMemo<DisplayItem[]>(() => {
    const evts: DisplayItem[] = events.map((e) => ({
      id: e._id,
      title: `📅 ${e.title}`,
      start: eventStart(e),
      end: eventEnd(e),
      allDay: !e.startTime && !e.endTime,
      type: 'event',
    }));
    const tsk: DisplayItem[] = tasks.map((t) => ({
      id: t._id,
      title: `☑️ ${t.title}`,
      start: new Date(t.dueDate as string),
      end: new Date(t.dueDate as string),
      type: 'task',
    }));
    return [...evts, ...tsk];
  }, [events, tasks]);

  const upcomingEvents = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return events
      .filter((e) => eventStart(e).getTime() >= today.getTime())
      .sort((a, b) => eventStart(a).getTime() - eventStart(b).getTime())
      .slice(0, 8);
  }, [events]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim() || !form.date) return;
    setSaving(true);
    setFormError('');
    try {
      const res = await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: form.title,
          description: form.description,
          date: form.date,
          startTime: form.startTime || undefined,
          endTime: form.endTime || undefined,
          remind: form.remind,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        setFormError(data.message || 'Failed to create event');
        return;
      }
      setForm(EMPTY_FORM);
      refreshEvents();
    } catch {
      setFormError('An unexpected error occurred.');
    } finally {
      setSaving(false);
    }
  };

  const openEdit = (event: AppEvent) => {
    setEditing(event);
    setEditForm({
      title: event.title,
      description: event.description ?? '',
      date: format(new Date(event.date), 'yyyy-MM-dd'),
      startTime: event.startTime ?? '',
      endTime: event.endTime ?? '',
      remind: event.remind,
    });
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    setSavingEdit(true);
    try {
      const res = await fetch(`/api/events/${editing._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: editForm.title,
          description: editForm.description,
          date: editForm.date,
          startTime: editForm.startTime || undefined,
          endTime: editForm.endTime || undefined,
          remind: editForm.remind,
        }),
      });
      if (res.ok) {
        setEditing(null);
        refreshEvents();
      }
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDelete = async (event: AppEvent) => {
    if (!confirm(`Delete event "${event.title}"?`)) return;
    const res = await fetch(`/api/events/${event._id}`, { method: 'DELETE' });
    if (res.ok) {
      setEditing(null);
      refreshEvents();
    }
  };

  const handleSelectItem = (item: DisplayItem) => {
    if (item.type === 'task') {
      router.push('/tasks');
      return;
    }
    const found = events.find((e) => e._id === item.id);
    if (found) openEdit(found);
  };

  const eventStyleGetter = (item: DisplayItem) => {
    const isTask = item.type === 'task';
    return {
      style: {
        backgroundColor: isTask ? 'var(--success)' : 'var(--primary)',
        color: '#ffffff',
        borderRadius: '6px',
        border: 'none',
        padding: '2px 6px',
      },
    };
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Calendar</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Your events (blue) and tasks with due dates (green) in one view.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_340px]">
        {/* Calendar */}
        <div className="rounded-xl border border-border bg-card p-4">
          {loading ? (
            <div className="flex h-[600px] items-center justify-center text-sm text-muted-foreground">
              Loading calendar...
            </div>
          ) : (
            <Calendar<DisplayItem>
              localizer={localizer}
              events={displayItems}
              startAccessor="start"
              endAccessor="end"
              allDayAccessor="allDay"
              views={['month', 'week', 'day']}
              defaultView="month"
              onNavigate={(newDate: Date) => setCurrentDate(newDate)}
              onSelectEvent={handleSelectItem}
              eventPropGetter={eventStyleGetter}
              className="h-[600px]"
            />
          )}
        </div>

        {/* Right panel */}
        <div className="space-y-6">
          {/* Create event */}
          <form onSubmit={handleCreate} className="rounded-xl border border-border bg-card p-5 space-y-3">
            <h2 className="text-base font-bold">Add Event</h2>
            {formError && (
              <p className="rounded-lg bg-danger-bg/40 px-3 py-2 text-xs text-danger">{formError}</p>
            )}
            <div>
              <label className="mb-1 block text-xs font-semibold text-muted-foreground">Title *</label>
              <input
                type="text"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="e.g. Team standup"
                required
                className={inputCls}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-muted-foreground">Date *</label>
              <input
                type="date"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
                required
                className={inputCls}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-semibold text-muted-foreground">Start time</label>
                <input
                  type="time"
                  value={form.startTime}
                  onChange={(e) => setForm({ ...form, startTime: e.target.value })}
                  className={inputCls}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-muted-foreground">End time</label>
                <input
                  type="time"
                  value={form.endTime}
                  onChange={(e) => setForm({ ...form, endTime: e.target.value })}
                  className={inputCls}
                />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-muted-foreground">Description</label>
              <input
                type="text"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Optional"
                className={inputCls}
              />
            </div>
            <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-border bg-muted/40 px-3 py-2">
              <input
                type="checkbox"
                checked={form.remind}
                onChange={(e) => setForm({ ...form, remind: e.target.checked })}
                className="h-4 w-4 accent-indigo-600"
              />
              <span className="text-sm font-medium">🔔 Remind me</span>
            </label>
            <button
              type="submit"
              disabled={saving}
              className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-md shadow-primary/25 transition-all hover:bg-primary-hover active:scale-95 disabled:opacity-50"
            >
              {saving ? 'Adding...' : 'Add Event'}
            </button>
          </form>

          {/* Upcoming events */}
          <section className="rounded-xl border border-border bg-card p-5">
            <h2 className="mb-3 text-base font-bold">Upcoming events</h2>
            {upcomingEvents.length === 0 ? (
              <p className="rounded-lg border border-dashed border-border bg-muted/30 px-4 py-8 text-center text-sm text-muted-foreground">
                No upcoming events.
              </p>
            ) : (
              <ul className="space-y-2">
                {upcomingEvents.map((e) => (
                  <li
                    key={e._id}
                    className="group flex items-center gap-3 rounded-lg border border-border p-2.5 transition-all hover:border-ring/40 hover:bg-muted/40"
                  >
                    <div className="flex h-10 w-10 shrink-0 flex-col items-center justify-center rounded-lg bg-accent text-accent-foreground">
                      <span className="text-sm font-bold leading-none">{format(eventStart(e), 'd')}</span>
                      <span className="text-[10px] uppercase leading-tight">{format(eventStart(e), 'MMM')}</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">
                        {e.title}
                        {e.remind && <span title="Reminder enabled" className="ml-1.5 text-xs">🔔</span>}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {e.startTime
                          ? format(eventStart(e), 'EEE, h:mm a')
                          : format(eventStart(e), 'EEE, MMM d')}
                      </p>
                    </div>
                    <button
                      onClick={() => openEdit(e)}
                      className="flex h-7 w-7 items-center justify-center rounded-lg border border-border text-xs opacity-100 transition-all hover:bg-secondary sm:opacity-0 sm:group-hover:opacity-100"
                      title="Edit event"
                    >
                      ✏️
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>

      {/* Edit modal */}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setEditing(null)} />
          <div className="relative w-full max-w-md overflow-hidden rounded-2xl border border-border bg-card shadow-2xl animate-fade-in-up">
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <h2 className="text-lg font-bold">Edit Event</h2>
              <button
                onClick={() => setEditing(null)}
                aria-label="Close"
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-sm transition-colors hover:bg-secondary"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleSaveEdit} className="space-y-3 px-5 py-4">
              <input
                type="text"
                value={editForm.title}
                onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                required
                placeholder="Event title"
                className={inputCls}
              />
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="date"
                  value={editForm.date}
                  onChange={(e) => setEditForm({ ...editForm, date: e.target.value })}
                  required
                  className={inputCls}
                />
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="time"
                    value={editForm.startTime}
                    onChange={(e) => setEditForm({ ...editForm, startTime: e.target.value })}
                    className={inputCls}
                  />
                  <input
                    type="time"
                    value={editForm.endTime}
                    onChange={(e) => setEditForm({ ...editForm, endTime: e.target.value })}
                    className={inputCls}
                  />
                </div>
              </div>
              <input
                type="text"
                value={editForm.description}
                onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                placeholder="Description (optional)"
                className={inputCls}
              />
              <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-border bg-muted/40 px-3 py-2">
                <input
                  type="checkbox"
                  checked={editForm.remind}
                  onChange={(e) => setEditForm({ ...editForm, remind: e.target.checked })}
                  className="h-4 w-4 accent-indigo-600"
                />
                <span className="text-sm font-medium">🔔 Remind me</span>
              </label>
              <div className="flex items-center justify-between pt-1">
                <button
                  type="button"
                  onClick={() => handleDelete(editing)}
                  className="rounded-lg border border-danger-bg bg-danger-bg/40 px-3 py-2 text-sm font-semibold text-danger transition-colors hover:bg-danger-bg"
                >
                  Delete
                </button>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setEditing(null)}
                    className="rounded-lg border border-border px-4 py-2 text-sm font-semibold transition-colors hover:bg-secondary"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={savingEdit}
                    className="rounded-lg bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground transition-all hover:bg-primary-hover active:scale-95 disabled:opacity-50"
                  >
                    {savingEdit ? 'Saving...' : 'Save'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
