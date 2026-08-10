'use client';

import { useState, useEffect } from 'react';

interface Task {
  _id: string;
  title: string;
  description?: string;
  status: 'pending' | 'in-progress' | 'completed';
  createdAt: string;
}

export default function DashboardPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'in-progress' | 'completed'>('all');

  // New task form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<'pending' | 'in-progress' | 'completed'>('pending');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  // Fetch tasks on page load
  useEffect(() => {
    const fetchTasks = async () => {
      try {
        const res = await fetch('/api/tasks');
        if (res.ok) {
          const data = await res.json();
          setTasks(data.tasks || []);
        }
      } catch {
        setError('Failed to load tasks');
      } finally {
        setLoading(false);
      }
    };

    fetchTasks();
  }, []);

  // Handle new task creation
  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setError('');

    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, description, status }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || 'Failed to create task');
        return;
      }

      setTasks([data.task, ...tasks]);
      setTitle('');
      setDescription('');
      setStatus('pending');
    } catch {
      setError('An unexpected error occurred.');
    } finally {
      setCreating(false);
    }
  };

  // Handle task status update
  const handleStatusChange = async (id: string, newStatus: Task['status']) => {
    try {
      const res = await fetch(`/api/tasks/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      if (res.ok) {
        const data = await res.json();
        setTasks(tasks.map((t) => (t._id === id ? data.task : t)));
      }
    } catch {
      alert('Failed to update task status');
    }
  };

  // Handle task deletion
  const handleDeleteTask = async (id: string) => {
    if (!confirm('Are you sure you want to delete this task?')) return;

    try {
      const res = await fetch(`/api/tasks/${id}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        setTasks(tasks.filter((t) => t._id !== id));
      }
    } catch {
      alert('Failed to delete task');
    }
  };

  const filteredTasks = tasks.filter((t) => (filter === 'all' ? true : t.status === filter));

  return (
    <div style={styles.container}>
      <h1 style={styles.heading}>Task Management Dashboard</h1>

      {/* CREATE TASK FORM */}
      <div style={styles.card}>
        <h2 style={styles.subHeading}>Add New Task</h2>
        {error && <p style={styles.errorText}>{error}</p>}

        <form onSubmit={handleCreateTask} style={styles.form}>
          <input
            type="text"
            placeholder="Task Title *"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            style={styles.input}
          />

          <textarea
            placeholder="Description (optional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            style={{ ...styles.input, height: '80px' }}
          />

          <div style={styles.formRow}>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as Task['status'])}
              style={styles.select}
            >
              <option value="pending">Pending</option>
              <option value="in-progress">In Progress</option>
              <option value="completed">Completed</option>
            </select>

            <button type="submit" disabled={creating} style={styles.button}>
              {creating ? 'Adding...' : 'Add Task'}
            </button>
          </div>
        </form>
      </div>

      {/* FILTER CONTROLS */}
      <div style={styles.filterRow}>
        <h2 style={styles.subHeading}>Your Tasks ({filteredTasks.length})</h2>
        <div style={styles.filterGroup}>
          {(['all', 'pending', 'in-progress', 'completed'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              style={{
                ...styles.filterBtn,
                backgroundColor: filter === f ? '#2563eb' : '#e5e7eb',
                color: filter === f ? '#ffffff' : '#374151',
              }}
            >
              {f.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* TASK LIST */}
      {loading ? (
        <p style={{ textAlign: 'center', marginTop: '20px', color: '#000' }}>Loading tasks...</p>
      ) : filteredTasks.length === 0 ? (
        <p style={{ textAlign: 'center', marginTop: '20px', color: '#6b7280' }}>
          No tasks found. Create one above!
        </p>
      ) : (
        <div style={styles.list}>
          {filteredTasks.map((task) => (
            <div key={task._id} style={styles.taskCard}>
              <div style={styles.taskHeader}>
                <h3 style={styles.taskTitle}>{task.title}</h3>
                <button
                  onClick={() => handleDeleteTask(task._id)}
                  style={styles.deleteBtn}
                >
                  Delete
                </button>
              </div>

              {task.description && <p style={styles.taskDesc}>{task.description}</p>}

              <div style={styles.taskFooter}>
                <span style={styles.dateText}>
                  {new Date(task.createdAt).toLocaleDateString()}
                </span>

                <select
                  value={task.status}
                  onChange={(e) => handleStatusChange(task._id, e.target.value as Task['status'])}
                  style={{
                    ...styles.statusBadge,
                    backgroundColor:
                      task.status === 'completed'
                        ? '#dcfce7'
                        : task.status === 'in-progress'
                        ? '#fef9c3'
                        : '#f3f4f6',
                    color:
                      task.status === 'completed'
                        ? '#15803d'
                        : task.status === 'in-progress'
                        ? '#a16207'
                        : '#374151',
                  }}
                >
                  <option value="pending">Pending</option>
                  <option value="in-progress">In Progress</option>
                  <option value="completed">Completed</option>
                </select>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    maxWidth: '800px',
    margin: '0 auto',
    padding: '24px 16px',
  },
  heading: {
    fontSize: '28px',
    fontWeight: 'bold',
    marginBottom: '24px',
    color: '#000000',
  },
  subHeading: {
    fontSize: '18px',
    fontWeight: '600',
    marginBottom: '12px',
    color: '#000000',
  },
  card: {
    backgroundColor: '#ffffff',
    padding: '20px',
    borderRadius: '12px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
    marginBottom: '32px',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  formRow: {
    display: 'flex',
    gap: '12px',
  },
  input: {
    padding: '10px 12px',
    borderRadius: '6px',
    border: '1px solid #d1d5db',
    fontSize: '14px',
    outline: 'none',
    color: '#000000',
  },
  select: {
    padding: '10px 12px',
    borderRadius: '6px',
    border: '1px solid #d1d5db',
    fontSize: '14px',
    color: '#000000',
  },
  button: {
    padding: '10px 20px',
    backgroundColor: '#2563eb',
    color: '#ffffff',
    fontWeight: '600',
    borderRadius: '6px',
    border: 'none',
    cursor: 'pointer',
  },
  filterRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px',
    flexWrap: 'wrap',
    gap: '12px',
  },
  filterGroup: {
    display: 'flex',
    gap: '6px',
  },
  filterBtn: {
    padding: '6px 12px',
    borderRadius: '6px',
    border: 'none',
    fontSize: '12px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  list: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  taskCard: {
    backgroundColor: '#ffffff',
    padding: '16px',
    borderRadius: '8px',
    boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
    borderLeft: '4px solid #2563eb',
  },
  taskHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  taskTitle: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#000000',
  },
  taskDesc: {
    fontSize: '14px',
    color: '#4b5563',
    marginTop: '6px',
  },
  taskFooter: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: '12px',
  },
  dateText: {
    fontSize: '12px',
    color: '#9ca3af',
  },
  statusBadge: {
    padding: '4px 8px',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: '600',
    border: 'none',
    cursor: 'pointer',
  },
  deleteBtn: {
    backgroundColor: '#fee2e2',
    color: '#dc2626',
    border: 'none',
    padding: '4px 8px',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  errorText: {
    color: '#dc2626',
    fontSize: '14px',
    marginBottom: '12px',
  },
};