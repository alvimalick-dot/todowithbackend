'use client';

import { useState } from 'react';
import Link from 'next/link';

const inputCls =
  'w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm outline-none transition-colors focus:border-ring focus:ring-2 focus:ring-ring/30';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || 'Something went wrong. Please try again.');
        return;
      }

      setMessage(data.message);
    } catch {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="mb-6 text-center">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 text-2xl shadow-lg shadow-indigo-500/30">
          🔑
        </span>
        <h1 className="mt-4 text-2xl font-bold">Forgot Password</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Enter your account email and we&apos;ll generate a reset link.
        </p>
      </div>

      {message && (
        <p className="mb-4 rounded-lg bg-success-bg/50 px-3 py-2.5 text-sm text-success">{message}</p>
      )}
      {error && (
        <p className="mb-4 rounded-lg bg-danger-bg/40 px-3 py-2.5 text-sm text-danger">{error}</p>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mb-1.5 block text-sm font-semibold">Email Address</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="john@example.com"
            required
            className={inputCls}
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-md shadow-primary/25 transition-all hover:bg-primary-hover active:scale-[0.98] disabled:opacity-50"
        >
          {loading ? 'Sending...' : 'Send Reset Link'}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Remember your password?{' '}
        <Link href="/login" className="font-semibold text-primary hover:text-primary-hover">
          Log In
        </Link>
      </p>
    </div>
  );
}
