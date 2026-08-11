'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { format } from 'date-fns';
import { useTheme } from '@/context/ThemeContext';
import '@uiw/react-md-editor/markdown-editor.css';
import '@uiw/react-markdown-preview/markdown.css';

// Dynamically import MDEditor and MDPreview to avoid SSR hydration mismatches
const MDEditor = dynamic(() => import('@uiw/react-md-editor'), { ssr: false });
const MDPreview = dynamic(() => import('@uiw/react-markdown-preview'), { ssr: false });

interface Note {
  _id: string;
  title: string;
  content: string;
  folder?: string;
  pinned: boolean;
  createdAt: string;
  updatedAt: string;
}

const inputCls =
  'w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none transition-colors focus:border-ring focus:ring-2 focus:ring-ring/30';

export default function NotesPage() {
  const { theme } = useTheme();
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');
  const [folder, setFolder] = useState<string>('');

  // Create form state
  const [title, setTitle] = useState<string>('');
  const [content, setContent] = useState<string>('');
  const [noteFolder, setNoteFolder] = useState<string>('general');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Edit modal state
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editFolder, setEditFolder] = useState('');
  const [editContent, setEditContent] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);
  const [editError, setEditError] = useState('');

  const fetchNotes = useCallback(async (): Promise<Note[]> => {
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    if (folder) params.append('folder', folder);

    const res = await fetch(`/api/notes?${params.toString()}`);
    if (!res.ok) throw new Error('Failed to fetch notes');
    const data = await res.json();
    return (data.notes || []).sort((a: Note, b: Note) => Number(b.pinned) - Number(a.pinned));
  }, [search, folder]);

  useEffect(() => {
    let isMounted = true;
    const loadNotes = async () => {
      try {
        setLoading(true);
        const sortedNotes = await fetchNotes();
        if (isMounted) setNotes(sortedNotes);
      } catch (err) {
        console.error(err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    loadNotes();
    return () => {
      isMounted = false;
    };
  }, [fetchNotes]);

  const reload = useCallback(async () => {
    setNotes(await fetchNotes());
  }, [fetchNotes]);

  const handleCreateNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    try {
      setIsSubmitting(true);
      const res = await fetch('/api/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, content, folder: noteFolder }),
      });
      if (res.ok) {
        setTitle('');
        setContent('');
        setNoteFolder('general');
        reload();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const togglePin = async (id: string, currentPinned: boolean) => {
    const res = await fetch(`/api/notes/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pinned: !currentPinned }),
    });
    if (res.ok) reload();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this note?')) return;
    const res = await fetch(`/api/notes/${id}`, { method: 'DELETE' });
    if (res.ok) {
      if (editingNote?._id === id) setEditingNote(null);
      reload();
    }
  };

  const openEdit = (note: Note) => {
    setEditingNote(note);
    setEditTitle(note.title);
    setEditFolder(note.folder || 'general');
    setEditContent(note.content || '');
    setEditError('');
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingNote || !editTitle.trim()) return;
    setSavingEdit(true);
    setEditError('');
    try {
      const res = await fetch(`/api/notes/${editingNote._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: editTitle, folder: editFolder, content: editContent }),
      });
      if (res.ok) {
        setEditingNote(null);
        reload();
      } else {
        const data = await res.json();
        setEditError(data.message || 'Failed to save note');
      }
    } catch {
      setEditError('An unexpected error occurred.');
    } finally {
      setSavingEdit(false);
    }
  };

  const availableFolders = useMemo(() => {
    const set = new Set(notes.map((n) => n.folder || 'general'));
    if (noteFolder) set.add(noteFolder);
    if (editFolder) set.add(editFolder);
    return Array.from(set).sort();
  }, [notes, noteFolder, editFolder]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Notes</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {notes.length} {notes.length === 1 ? 'note' : 'notes'} · markdown supported
        </p>
      </div>

      {/* Creation form */}
      <form onSubmit={handleCreateNote} className="rounded-xl border border-border bg-card p-5 space-y-4">
        <h2 className="text-base font-bold">Create New Note</h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <input
            type="text"
            placeholder="Note title *"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            className={inputCls}
          />
          <input
            type="text"
            list="note-folders"
            placeholder="Folder (default: general)"
            value={noteFolder}
            onChange={(e) => setNoteFolder(e.target.value)}
            className={inputCls}
          />
          <datalist id="note-folders">
            {availableFolders.map((f) => (
              <option key={f} value={f} />
            ))}
          </datalist>
        </div>

        <div data-color-mode={theme}>
          <MDEditor value={content} onChange={(val) => setContent(val || '')} height={200} />
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-md shadow-primary/25 transition-all hover:bg-primary-hover active:scale-95 disabled:opacity-50"
        >
          {isSubmitting ? 'Saving...' : 'Add Note'}
        </button>
      </form>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <input
          type="search"
          placeholder="Search by title..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className={`${inputCls} sm:w-1/2`}
        />
        <input
          type="text"
          placeholder="Filter by folder..."
          value={folder}
          onChange={(e) => setFolder(e.target.value)}
          className={`${inputCls} sm:w-1/2`}
        />
      </div>

      {/* Notes list */}
      {loading ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {[0, 1].map((i) => (
            <div key={i} className="h-40 animate-pulse rounded-xl border border-border bg-card/60" />
          ))}
        </div>
      ) : notes.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card/50 px-6 py-16 text-center">
          <p className="text-4xl">📝</p>
          <p className="mt-3 font-semibold">No notes found</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {search || folder ? 'Try adjusting your search or filter.' : 'Create your first note above.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {notes.map((note) => (
            <div
              key={note._id}
              className={`group flex flex-col justify-between rounded-xl border p-4 transition-all ${
                note.pinned
                  ? 'border-primary/50 bg-accent/40'
                  : 'border-border bg-card hover:border-ring/40 hover:shadow-md hover:shadow-black/5'
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <h3 className="flex items-center gap-2 font-bold">
                    {note.pinned && <span>📌</span>}
                    <span className="truncate">{note.title}</span>
                  </h3>
                  <span className="shrink-0 rounded-full bg-secondary px-2 py-0.5 text-[11px] font-medium text-secondary-foreground">
                    {note.folder || 'general'}
                  </span>
                </div>

                <div className="prose prose-sm dark:prose-invert mt-3 max-h-44 overflow-y-auto text-muted-foreground">
                  <MDPreview source={note.content || '*No content*'} />
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between border-t border-border pt-3 text-xs">
                <span className="text-muted-foreground">Updated {format(new Date(note.updatedAt), 'MMM d, h:mm a')}</span>
                <div className="flex gap-1.5">
                  <button
                    onClick={() => openEdit(note)}
                    className="rounded-lg border border-border px-2.5 py-1.5 font-semibold transition-colors hover:bg-secondary"
                  >
                    ✏️ Edit
                  </button>
                  <button
                    onClick={() => togglePin(note._id, note.pinned)}
                    className="rounded-lg border border-border px-2.5 py-1.5 font-semibold transition-colors hover:bg-secondary"
                  >
                    {note.pinned ? 'Unpin' : 'Pin'}
                  </button>
                  <button
                    onClick={() => handleDelete(note._id)}
                    className="rounded-lg border border-danger-bg bg-danger-bg/30 px-2.5 py-1.5 font-semibold text-danger transition-colors hover:bg-danger-bg"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit modal */}
      {editingNote && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setEditingNote(null)} />
          <div className="relative w-full max-w-2xl overflow-hidden rounded-2xl border border-border bg-card shadow-2xl animate-fade-in-up">
            <div className="flex items-center justify-between border-b border-border px-6 py-4">
              <h2 className="text-lg font-bold">Edit Note</h2>
              <button
                onClick={() => setEditingNote(null)}
                aria-label="Close"
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-sm transition-colors hover:bg-secondary"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4 px-6 py-5">
              {editError && (
                <p className="rounded-lg bg-danger-bg/40 px-3 py-2 text-sm text-danger">{editError}</p>
              )}
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  required
                  placeholder="Note title"
                  className={inputCls}
                />
                <input
                  type="text"
                  list="edit-folders"
                  value={editFolder}
                  onChange={(e) => setEditFolder(e.target.value)}
                  placeholder="Folder"
                  className={inputCls}
                />
                <datalist id="edit-folders">
                  {availableFolders.map((f) => (
                    <option key={f} value={f} />
                  ))}
                </datalist>
              </div>

              <div data-color-mode={theme}>
                <MDEditor value={editContent} onChange={(val) => setEditContent(val || '')} height={250} />
              </div>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingNote(null)}
                  className="rounded-lg border border-border px-4 py-2 text-sm font-semibold transition-colors hover:bg-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="rounded-lg bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground shadow-md shadow-primary/25 transition-all hover:bg-primary-hover active:scale-95 disabled:opacity-50"
                >
                  {savingEdit ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
