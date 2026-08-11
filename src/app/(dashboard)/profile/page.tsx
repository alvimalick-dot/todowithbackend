'use client';

import { useRef, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

const inputCls =
  'w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none transition-colors focus:border-ring focus:ring-2 focus:ring-ring/30';

/** Resize an uploaded image to a compact JPEG data-URL (max 256px). */
function resizeImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new window.Image();
      img.onload = () => {
        const size = 256;
        const scale = Math.min(1, size / Math.max(img.width, img.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject(new Error('Canvas not supported'));
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.85));
      };
      img.onerror = reject;
      img.src = reader.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function ProfilePage() {
  const { user, refreshUser, logout } = useAuth();
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState('');
  const [avatar, setAvatar] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  const [curPw, setCurPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [pwSaving, setPwSaving] = useState(false);
  const [pwMessage, setPwMessage] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  const [deleting, setDeleting] = useState(false);

  // Sync local form state when the user record loads / changes
  // (React-recommended render-time state adjustment pattern)
  const [prevUserId, setPrevUserId] = useState<string | null>(null);
  if (user && user._id !== prevUserId) {
    setPrevUserId(user._id);
    setName(user.name);
    setAvatar(user.avatar || '');
  }

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await resizeImage(file);
      setAvatar(dataUrl);
      setMessage(null);
    } catch {
      setMessage({ type: 'err', text: 'Could not process that image.' });
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, avatar }),
      });
      if (res.ok) {
        await refreshUser();
        setMessage({ type: 'ok', text: 'Profile updated successfully.' });
      } else {
        const data = await res.json();
        setMessage({ type: 'err', text: data.message || 'Failed to update profile.' });
      }
    } catch {
      setMessage({ type: 'err', text: 'An unexpected error occurred.' });
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwMessage(null);
    if (newPw !== confirmPw) {
      setPwMessage({ type: 'err', text: 'New passwords do not match.' });
      return;
    }
    setPwSaving(true);
    try {
      const res = await fetch('/api/user/password', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword: curPw, newPassword: newPw }),
      });
      const data = await res.json();
      if (res.ok) {
        setPwMessage({ type: 'ok', text: data.message || 'Password changed.' });
        setCurPw('');
        setNewPw('');
        setConfirmPw('');
      } else {
        setPwMessage({ type: 'err', text: data.message || 'Failed to change password.' });
      }
    } catch {
      setPwMessage({ type: 'err', text: 'An unexpected error occurred.' });
    } finally {
      setPwSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (
      !confirm(
        'Are you sure? This will permanently delete your account and ALL your tasks, notes, and events. This cannot be undone.'
      )
    ) {
      return;
    }
    setDeleting(true);
    try {
      const res = await fetch('/api/user/profile', { method: 'DELETE' });
      if (res.ok) {
        await logout();
        router.push('/');
        router.refresh();
      } else {
        const data = await res.json();
        alert(data.message || 'Failed to delete account.');
        setDeleting(false);
      }
    } catch {
      alert('An unexpected error occurred.');
      setDeleting(false);
    }
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center py-24 text-sm text-muted-foreground">
        Loading...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">My Profile</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage your personal information, password, and account.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Profile info */}
        <form onSubmit={handleSaveProfile} className="rounded-xl border border-border bg-card p-6 space-y-4">
          <h2 className="text-base font-bold">Profile Information</h2>

          {message && (
            <p
              className={`rounded-lg px-3 py-2 text-sm ${
                message.type === 'ok'
                  ? 'bg-success-bg/50 text-success'
                  : 'bg-danger-bg/40 text-danger'
              }`}
            >
              {message.text}
            </p>
          )}

          {/* Avatar */}
          <div className="flex items-center gap-4">
            {avatar ? (
              <Image
                src={avatar}
                alt="Avatar"
                width={72}
                height={72}
                className="h-18 w-18 rounded-full border-2 border-border object-cover"
              />
            ) : (
              <span className="flex h-18 w-18 items-center justify-center rounded-full bg-linear-to-br from-indigo-500 to-violet-600 text-2xl font-bold text-white">
                {user.name.charAt(0).toUpperCase()}
              </span>
            )}
            <div>
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="rounded-lg border border-border px-3 py-2 text-sm font-semibold transition-colors hover:bg-secondary"
              >
                📷 Upload photo
              </button>
              <p className="mt-1.5 text-xs text-muted-foreground">
                JPG or PNG, resized automatically.
              </p>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarChange}
                className="hidden"
              />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-semibold">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className={inputCls}
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-semibold">Email</label>
            <input
              type="email"
              value={user.email}
              disabled
              className={`${inputCls} cursor-not-allowed bg-muted text-muted-foreground`}
            />
            <p className="mt-1 text-xs text-muted-foreground">Email cannot be changed.</p>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-md shadow-primary/25 transition-all hover:bg-primary-hover active:scale-95 disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </form>

        <div className="space-y-6">
          {/* Change password */}
          <form onSubmit={handleChangePassword} className="rounded-xl border border-border bg-card p-6 space-y-4">
            <h2 className="text-base font-bold">Change Password</h2>

            {pwMessage && (
              <p
                className={`rounded-lg px-3 py-2 text-sm ${
                  pwMessage.type === 'ok'
                    ? 'bg-success-bg/50 text-success'
                    : 'bg-danger-bg/40 text-danger'
                }`}
              >
                {pwMessage.text}
              </p>
            )}

            <div>
              <label className="mb-1.5 block text-sm font-semibold">Current password</label>
              <input
                type="password"
                value={curPw}
                onChange={(e) => setCurPw(e.target.value)}
                required
                autoComplete="current-password"
                className={inputCls}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-semibold">New password</label>
              <input
                type="password"
                value={newPw}
                onChange={(e) => setNewPw(e.target.value)}
                required
                minLength={6}
                autoComplete="new-password"
                className={inputCls}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-semibold">Confirm new password</label>
              <input
                type="password"
                value={confirmPw}
                onChange={(e) => setConfirmPw(e.target.value)}
                required
                minLength={6}
                autoComplete="new-password"
                className={inputCls}
              />
            </div>

            <button
              type="submit"
              disabled={pwSaving}
              className="rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-md shadow-primary/25 transition-all hover:bg-primary-hover active:scale-95 disabled:opacity-50"
            >
              {pwSaving ? 'Updating...' : 'Update Password'}
            </button>
          </form>

          {/* Danger zone */}
          <div className="rounded-xl border border-danger/30 bg-danger-bg/20 p-6">
            <h2 className="text-base font-bold text-danger">Danger Zone</h2>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Deleting your account removes all of your tasks, notes, and events permanently.
            </p>
            <button
              onClick={handleDeleteAccount}
              disabled={deleting}
              className="mt-4 rounded-lg border border-danger bg-danger/10 px-4 py-2.5 text-sm font-semibold text-danger transition-all hover:bg-danger hover:text-white active:scale-95 disabled:opacity-50"
            >
              {deleting ? 'Deleting...' : 'Delete My Account'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
