'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

const inputCls =
  'w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm outline-none transition-colors focus:border-ring focus:ring-2 focus:ring-ring/30';

export default function RegisterPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [generalError, setGeneralError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setGeneralError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.errors) {
          setErrors(data.errors);
        } else {
          setGeneralError(data.message || 'Registration failed');
        }
        return;
      }

      router.push('/login');
    } catch {
      setGeneralError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="mb-6 text-center">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 text-2xl shadow-lg shadow-indigo-500/30">
          ⚡
        </span>
        <h1 className="mt-4 text-2xl font-bold">Create an Account</h1>
        <p className="mt-1 text-sm text-muted-foreground">Start organizing your work today.</p>
      </div>

      {generalError && (
        <p className="mb-4 rounded-lg bg-danger-bg/40 px-3 py-2.5 text-sm text-danger">{generalError}</p>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mb-1.5 block text-sm font-semibold">Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="John Doe"
            required
            className={inputCls}
          />
          {errors.name && <p className="mt-1 text-xs text-danger">{errors.name[0]}</p>}
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-semibold">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="john@example.com"
            required
            className={inputCls}
          />
          {errors.email && <p className="mt-1 text-xs text-danger">{errors.email[0]}</p>}
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-semibold">Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
            className={inputCls}
          />
          {errors.password ? (
            <p className="mt-1 text-xs text-danger">{errors.password[0]}</p>
          ) : (
            <p className="mt-1 text-xs text-muted-foreground">
              8+ characters with uppercase, lowercase & a number.
            </p>
          )}
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-md shadow-primary/25 transition-all hover:bg-primary-hover active:scale-[0.98] disabled:opacity-50"
        >
          {loading ? 'Creating Account...' : 'Register'}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Already have an account?{' '}
        <Link href="/login" className="font-semibold text-primary hover:text-primary-hover">
          Log In
        </Link>
      </p>
    </div>
  );
}
