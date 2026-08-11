'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

const inputCls =
  'w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm outline-none transition-colors focus:border-ring focus:ring-2 focus:ring-ring/30';

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token') || '';
  const router = useRouter();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');

    if (!token) {
      setError('Reset token is missing or invalid URL.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || 'Failed to reset password.');
        return;
      }

      setMessage(data.message);
      setTimeout(() => {
        router.push('/login');
      }, 2000);
    } catch {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="mb-6 text-center">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-linear-to-br from-indigo-500 to-violet-600 text-2xl shadow-lg shadow-indigo-500/30">
          🔐
        </span>
        <h1 className="mt-4 text-2xl font-bold">Set New Password</h1>
        <p className="mt-1 text-sm text-muted-foreground">Choose a new password for your account.</p>
      </div>

      {message && (
        <p className="mb-4 rounded-lg bg-success-bg/50 px-3 py-2.5 text-sm text-success">{message}</p>
      )}
      {error && (
        <p className="mb-4 rounded-lg bg-danger-bg/40 px-3 py-2.5 text-sm text-danger">{error}</p>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mb-1.5 block text-sm font-semibold">New Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
            minLength={6}
            className={inputCls}
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-semibold">Confirm New Password</label>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="••••••••"
            required
            minLength={6}
            className={inputCls}
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-md shadow-primary/25 transition-all hover:bg-primary-hover active:scale-[0.98] disabled:opacity-50"
        >
          {loading ? 'Resetting...' : 'Reset Password'}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Back to{' '}
        <Link href="/login" className="font-semibold text-primary hover:text-primary-hover">
          Log In
        </Link>
      </p>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="py-10 text-center text-sm text-muted-foreground">Loading...</div>
      }
    >
      <ResetPasswordForm />
    </Suspense>
  );
}
