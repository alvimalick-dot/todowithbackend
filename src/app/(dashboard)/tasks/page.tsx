'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { format, differenceInCalendarDays } from 'date-fns';

interface Task {
  _id: string;
  title: string;
  description?: string;
  status: 'pending' | 'in-progress' | 'completed';
  priority: 'low' | 'medium' | 'high';
  category: string;
  dueDate?: string;
  remind: boolean;
  createdAt: string;
}

type StatusFilter = 'all' | Task['status'];
type SortKey = 'created' | 'dueDate' | 'priority' | 'title';

const EMPTY_FORM = {
  title: '',
  description: '',
  status: 'pending' as Task['status'],
  priority: 'medium' as Task['priority'],
  category: 'general',
  dueDate: '',
  remind: false,
};

const priorityStyles: Record<Task['priority'], { badge: string; dot: string }> = {
  high: { badge: 'bg-danger-bg text-danger', dot: 'bg-danger' },
  medium: { badge: 'bg-warning-bg text-warning', dot: 'bg-warning' },
  low: { badge: 'bg-success-bg text-success', dot: 'bg-success' },
};

const statusMeta: Record<Task['status'], { label: string; badge: string }> = {
  pending: { label: 'Pending', badge: 'bg-muted text-muted-foreground' },
  'in-progress': { label: 'In Progress', badge: 'bg-accent text-accent-foreground' },
  completed: { label: 'Completed', badge: 'bg-success-bg text-success' },
};

function dueInfo(dueDate?: string) {
  if (!dueDate) return null;
  const d = new Date(dueDate);
  const diff = differenceInCalendarDays(d, new Date());
  let label = format(d, 'MMM d, yyyy');
  if (diff < 0) label = `Overdue · ${format(d, 'MMM d')}`;
  else if (diff === 0) label = 'Due today';
  else if (diff === 1) label = 'Due tomorrow';
  const cls =
    diff < 0
      ? 'bg-danger-bg text-danger'
      : diff === 0
      ? 'bg-warning-bg text-warning'
      : 'bg-muted text-muted-foreground';
  return { label, cls };
}

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [formError, setFormError] = useState('');

  // Toolbar state
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [priorityFilter, setPriorityFilter] = useState<'all' | Task['priority']>('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [sortKey, setSortKey] = useState<SortKey>('created');

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const fetchTasks = useCallback(async () => {
    try {
      const res = await fetch('/api/tasks');
      if (!res.ok) throw new Error('Failed to fetch tasks');
      const data = await res.json();
      setTasks(data.tasks || []);
    } catch {
      setLoadError('Failed to load tasks');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void (async () => {
      await fetchTasks();
    })();
  }, [fetchTasks]);

  const categories = useMemo(() => {
    const set = new Set(tasks.map((t) => t.category || 'general'));
    return Array.from(set).sort();
  }, [tasks]);

  const filteredTasks = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = tasks.filter((t) => {
      if (statusFilter !== 'all' && t.status !== statusFilter) return false;
      if (priorityFilter !== 'all' && t.priority !== priorityFilter) return false;
      if (categoryFilter !== 'all' && (t.category || 'general') !== categoryFilter) return false;
      if (q && !`${t.title} ${t.description ?? ''}`.toLowerCase().includes(q)) return false;
      return true;
    });

    list = [...list].sort((a, b) => {
      switch (sortKey) {
        case 'dueDate':
          if (!a.dueDate && !b.dueDate) return 0;
          if (!a.dueDate) return 1;
          if (!b.dueDate) return -1;
          return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
        case 'priority': {
          const order = { high: 0, medium: 1, low: 2 };
          return order[a.priority] - order[b.priority];
        }
        case 'title':
          return a.title.localeCompare(b.title);
        default:
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
    });
    return list;
  }, [tasks, search, statusFilter, priorityFilter, categoryFilter, sortKey]);

  const counts = useMemo(() => {
    const total = tasks.length;
    const completed = tasks.filter((t) => t.status === 'completed').length;
    const pending = total - completed;
    return { total, completed, pending };
  }, [tasks]);

  const openCreate = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFormError('');
    setModalOpen(true);
  };

  const openEdit = (task: Task) => {
    setEditingId(task._id);
    setFormError('');
    setForm({
      title: task.title,
      description: task.description ?? '',
      status: task.status,
      priority: task.priority,
      category: task.category || 'general',
      dueDate: task.dueDate ? format(new Date(task.dueDate), 'yyyy-MM-dd') : '',
      remind: task.remind,
    });
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    setSaving(true);
    setFormError('');

    const payload = {
      title: form.title,
      description: form.description,
      status: form.status,
      priority: form.priority,
      category: form.category,
      dueDate: form.dueDate || undefined,
      remind: form.remind,
    };

    try {
      const res = editingId
        ? await fetch(`/api/tasks/${editingId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          })
        : await fetch('/api/tasks', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });

      if (!res.ok) {
        const data = await res.json();
        setFormError(data.message || 'Failed to save task');
        return;
      }
      setModalOpen(false);
      fetchTasks();
    } catch {
      setFormError('An unexpected error occurred.');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async (task: Task) => {
    const next = task.status === 'completed' ? 'pending' : 'completed';
    const res = await fetch(`/api/tasks/${task._id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: next }),
    });
    if (res.ok) fetchTasks();
  };

  const handleToggleRemind = async (task: Task) => {
    const res = await fetch(`/api/tasks/${task._id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ remind: !task.remind }),
    });
    if (res.ok) fetchTasks();
  };

  const handleDelete = async (task: Task) => {
    if (!confirm(`Delete task "${task.title}"?`)) return;
    const res = await fetch(`/api/tasks/${task._id}`, { method: 'DELETE' });
    if (res.ok) fetchTasks();
  };

  const inputCls =
    'w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none transition-colors focus:border-ring focus:ring-2 focus:ring-ring/30';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Tasks</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {counts.total} total · {counts.completed} completed · {counts.pending} remaining
          </p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-md shadow-primary/25 transition-all hover:bg-primary-hover active:scale-95"
        >
          <span className="text-base leading-none">＋</span> New Task
        </button>
      </div>

      {loadError && (
        <p className="rounded-lg border border-danger-bg bg-danger-bg/40 px-4 py-2.5 text-sm text-danger">
          {loadError}
        </p>
      )}

      {/* Toolbar */}
      <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4">
        <input
          type="search"
          placeholder="Search tasks by title or description..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className={inputCls}
        />
        <div className="flex flex-wrap items-center gap-2">
          {/* Status pills */}
          <div className="flex flex-wrap gap-1.5">
            {(['all', 'pending', 'in-progress', 'completed'] as const).map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`rounded-full px-3 py-1 text-xs font-semibold transition-all ${
                  statusFilter === s
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'bg-secondary text-secondary-foreground hover:bg-accent'
                }`}
              >
                {s === 'all' ? 'All' : statusMeta[s].label}
              </button>
            ))}
          </div>

          <div className="ml-auto flex flex-wrap items-center gap-2">
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value as 'all' | Task['priority'])}
              className="rounded-lg border border-input bg-background px-2.5 py-1.5 text-xs font-medium outline-none focus:border-ring"
            >
              <option value="all">All priorities</option>
              <option value="high">High priority</option>
              <option value="medium">Medium priority</option>
              <option value="low">Low priority</option>
            </select>

            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="rounded-lg border border-input bg-background px-2.5 py-1.5 text-xs font-medium outline-none focus:border-ring"
            >
              <option value="all">All categories</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>

            <select
              value={sortKey}
              onChange={(e) => setSortKey(e.target.value as SortKey)}
              className="rounded-lg border border-input bg-background px-2.5 py-1.5 text-xs font-medium outline-none focus:border-ring"
            >
              <option value="created">Newest first</option>
              <option value="dueDate">Due date</option>
              <option value="priority">Priority</option>
              <option value="title">Title A–Z</option>
            </select>
          </div>
        </div>
      </div>

      {/* Task list */}
      {loading ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-xl border border-border bg-card/60" />
          ))}
        </div>
      ) : filteredTasks.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card/50 px-6 py-16 text-center">
          <p className="text-4xl">🗒️</p>
          <p className="mt-3 font-semibold">No tasks found</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {tasks.length === 0
              ? 'Create your first task to get started.'
              : 'Try adjusting your search or filters.'}
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {filteredTasks.map((task) => {
            const due = dueInfo(task.dueDate);
            const prio = priorityStyles[task.priority];
            const done = task.status === 'completed';
            return (
              <div
                key={task._id}
                className={`group flex items-start gap-3 rounded-xl border border-border bg-card p-4 transition-all hover:border-ring/40 hover:shadow-md hover:shadow-black/5 ${
                  done ? 'opacity-75' : ''
                }`}
              >
                {/* Complete toggle */}
                <button
                  onClick={() => handleToggleStatus(task)}
                  aria-label={done ? 'Mark as pending' : 'Mark as completed'}
                  className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-all active:scale-90 ${
                    done
                      ? 'border-success bg-success text-white'
                      : 'border-muted-foreground/50 hover:border-primary'
                  }`}
                >
                  {done && <span className="text-[10px] leading-none">✓</span>}
                </button>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className={`font-semibold ${done ? 'text-muted-foreground line-through' : ''}`}>
                      {task.title}
                    </h3>
                    <span className={`flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-semibold ${prio.badge}`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${prio.dot}`} />
                      {task.priority}
                    </span>
                    <span className="rounded-full bg-secondary px-2 py-0.5 text-[11px] font-medium text-secondary-foreground">
                      {task.category || 'general'}
                    </span>
                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${statusMeta[task.status].badge}`}>
                      {statusMeta[task.status].label}
                    </span>
                  </div>

                  {task.description && (
                    <p className="mt-1.5 line-clamp-2 text-sm text-muted-foreground">
                      {task.description}
                    </p>
                  )}

                  <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    {due && <span className={`rounded-full px-2 py-0.5 font-medium ${due.cls}`}>⏰ {due.label}</span>}
                    <span>Created {format(new Date(task.createdAt), 'MMM d')}</span>
                    {task.remind && <span title="Reminders enabled">🔔</span>}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex shrink-0 items-center gap-1 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100">
                  <button
                    onClick={() => handleToggleRemind(task)}
                    title={task.remind ? 'Disable reminder' : 'Enable reminder'}
                    className={`flex h-8 w-8 items-center justify-center rounded-lg border text-sm transition-colors ${
                      task.remind
                        ? 'border-warning-bg bg-warning-bg text-warning'
                        : 'border-border hover:bg-secondary'
                    }`}
                  >
                    🔔
                  </button>
                  <button
                    onClick={() => openEdit(task)}
                    title="Edit task"
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-sm transition-colors hover:bg-secondary"
                  >
                    ✏️
                  </button>
                  <button
                    onClick={() => handleDelete(task)}
                    title="Delete task"
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-sm transition-colors hover:bg-danger-bg"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create / Edit modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setModalOpen(false)} />
          <div className="relative w-full max-w-lg overflow-hidden rounded-2xl border border-border bg-card shadow-2xl animate-fade-in-up">
            <div className="flex items-center justify-between border-b border-border px-6 py-4">
              <h2 className="text-lg font-bold">{editingId ? 'Edit Task' : 'New Task'}</h2>
              <button
                onClick={() => setModalOpen(false)}
                aria-label="Close"
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-sm transition-colors hover:bg-secondary"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 px-6 py-5">
              {formError && (
                <p className="rounded-lg bg-danger-bg/40 px-3 py-2 text-sm text-danger">{formError}</p>
              )}

              <div>
                <label className="mb-1.5 block text-sm font-semibold">Title *</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="e.g. Finish project report"
                  required
                  autoFocus
                  className={inputCls}
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-semibold">Description</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Optional details..."
                  rows={3}
                  className={inputCls}
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-semibold">Status</label>
                  <select
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value as Task['status'] })}
                    className={inputCls}
                  >
                    <option value="pending">Pending</option>
                    <option value="in-progress">In Progress</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-semibold">Priority</label>
                  <select
                    value={form.priority}
                    onChange={(e) => setForm({ ...form, priority: e.target.value as Task['priority'] })}
                    className={inputCls}
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-semibold">Category</label>
                  <input
                    type="text"
                    list="task-categories"
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                    placeholder="e.g. Work"
                    className={inputCls}
                  />
                  <datalist id="task-categories">
                    {categories.map((c) => (
                      <option key={c} value={c} />
                    ))}
                  </datalist>
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-semibold">Due date</label>
                  <input
                    type="date"
                    value={form.dueDate}
                    onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
                    className={inputCls}
                  />
                </div>
              </div>

              <label className="flex cursor-pointer items-center gap-2.5 rounded-lg border border-border bg-muted/40 px-3 py-2.5">
                <input
                  type="checkbox"
                  checked={form.remind}
                  onChange={(e) => setForm({ ...form, remind: e.target.checked })}
                  className="h-4 w-4 accent-indigo-600"
                />
                <span className="text-sm font-medium">🔔 Show this task in my reminders</span>
              </label>

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="rounded-lg border border-border px-4 py-2 text-sm font-semibold transition-colors hover:bg-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-lg bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground shadow-md shadow-primary/25 transition-all hover:bg-primary-hover active:scale-95 disabled:opacity-50"
                >
                  {saving ? 'Saving...' : editingId ? 'Save Changes' : 'Create Task'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
