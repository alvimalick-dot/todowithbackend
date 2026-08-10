'use client';

import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';

export default function ProfilePage() {
  const { user, refreshUser } = useAuth();
  const [name, setName] = useState('');
  const [avatar, setAvatar] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [loadedUserId, setLoadedUserId] = useState<string | null>(null);

  if (user && user._id !== loadedUserId) {
    setLoadedUserId(user._id);
    setName(user.name);
    setAvatar(user.avatar || '');
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage('');

    try {
      const res = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, avatar }),
      });

      if (res.ok) {
        await refreshUser();
        setMessage('Profile updated successfully.');
      } else {
        const data = await res.json();
        setMessage(data.message || 'Failed to update profile.');
      }
    } catch {
      setMessage('An unexpected error occurred.');
    } finally {
      setSaving(false);
    }
  };

  if (!user) return <p style={{ padding: 24 }}>Loading...</p>;

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', padding: '24px 16px' }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 20, color: '#000' }}>My Profile</h1>

      {message && <p style={{ marginBottom: 16, color: '#2563eb' }}>{message}</p>}

      <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div>
          <label style={{ fontSize: 14, fontWeight: 600, color: '#000' }}>Name</label>
          <input value={name} onChange={(e) => setName(e.target.value)}
            style={{ width: '100%', padding: 10, borderRadius: 6, border: '1px solid #d1d5db', color: '#000' }} />
        </div>

        <div>
          <label style={{ fontSize: 14, fontWeight: 600, color: '#000' }}>Avatar URL</label>
          <input value={avatar} onChange={(e) => setAvatar(e.target.value)} placeholder="https://..."
            style={{ width: '100%', padding: 10, borderRadius: 6, border: '1px solid #d1d5db', color: '#000' }} />
        </div>

        <div>
          <label style={{ fontSize: 14, fontWeight: 600, color: '#000' }}>Email</label>
          <input value={user.email} disabled
            style={{ width: '100%', padding: 10, borderRadius: 6, border: '1px solid #d1d5db', color: '#6b7280', backgroundColor: '#f3f4f6' }} />
        </div>

        <button type="submit" disabled={saving}
          style={{ padding: 12, borderRadius: 6, border: 'none', backgroundColor: '#2563eb', color: '#fff', fontWeight: 600, cursor: 'pointer', marginTop: 8 }}>
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </form>
    </div>
  );
}