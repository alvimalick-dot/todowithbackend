'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';

const inputCls =
  'w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm outline-none transition-colors focus:border-ring focus:ring-2 focus:ring-ring/30';

export default function RegisterPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [generalError, setGeneralError] = useState('');
  const [loading, setLoading] = useState(false);

  // OTP step state
  const [step, setStep] = useState<'credentials' | 'otp'>('credentials');
  const [pendingToken, setPendingToken] = useState('');
  const [maskedEmail, setMaskedEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [otpError, setOtpError] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  const router = useRouter();
  const { refreshUser } = useAuth();

  // 60s resend countdown
  useEffect(() => {
    if (cooldown <= 0) return;
    const id = window.setInterval(
      () => setCooldown((c) => Math.max(0, c - 1)),
      1000
    );
    return () => window.clearInterval(id);
  }, [cooldown]);

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

      setPendingToken(data.pendingToken);
      setMaskedEmail(data.email || 'your email');
      setOtp('');
      setOtpError('');
      setCooldown(60);
      setStep('otp');
    } catch {
      setGeneralError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length !== 6) {
      setOtpError('Enter the 6-digit code from your email.');
      return;
    }
    setVerifying(true);
    setOtpError('');
    try {
      const res = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pendingToken, otp }),
      });
      const data = await res.json();

      if (!res.ok) {
        if (res.status === 401) {
          // The account already exists — logging in re-sends a fresh code.
          setStep('credentials');
          setPendingToken('');
          setGeneralError(
            'Your account was created, but the verification session expired. Log in to receive a new code.'
          );
        } else {
          setOtpError(data.message || 'Incorrect code. Please try again.');
        }
        return;
      }

      await refreshUser();
      router.push('/dashboard');
    } catch {
      setOtpError('An unexpected error occurred.');
    } finally {
      setVerifying(false);
    }
  };

  const handleResend = async () => {
    if (cooldown > 0 || resending) return;
    setResending(true);
    setOtpError('');
    try {
      const res = await fetch('/api/auth/resend-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pendingToken }),
      });
      const data = await res.json();
      if (res.status === 429) {
        setOtpError(data.message || 'Please wait before requesting a new code.');
        const match = data.message?.match(/(\d+)s/);
        if (match) setCooldown(Number(match[1]));
      } else if (!res.ok) {
        setOtpError(data.message || 'Could not resend the code.');
      } else {
        setCooldown(60);
        setOtp('');
        setOtpError('');
      }
    } catch {
      setOtpError('An unexpected error occurred.');
    } finally {
      setResending(false);
    }
  };

  const handleBack = () => {
    setStep('credentials');
    setPendingToken('');
    setOtp('');
    setOtpError('');
  };

  return (
    <div>
      <div className="mb-6 text-center">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-linear-to-br from-indigo-500 to-violet-600 text-2xl shadow-lg shadow-indigo-500/30">
          ⚡
        </span>
        <h1 className="mt-4 text-2xl font-bold">
          {step === 'credentials' ? 'Create an Account' : 'Verify Your Email'}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {step === 'credentials'
            ? 'Start organizing your work today.'
            : `We sent a 6-digit code to ${maskedEmail}.`}
        </p>
      </div>

      {step === 'credentials' ? (
        <>
          {generalError && (
            <p className="mb-4 rounded-lg bg-danger-bg/40 px-3 py-2.5 text-sm text-danger">
              {generalError}
            </p>
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
                autoComplete="email"
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
                autoComplete="new-password"
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
              {loading ? 'Creating account...' : 'Register'}
            </button>
            <p className="text-center text-xs text-muted-foreground">
              We&apos;ll email you a one-time code to verify your address.
            </p>
          </form>
        </>
      ) : (
        <>
          {otpError && (
            <p className="mb-4 rounded-lg bg-danger-bg/40 px-3 py-2.5 text-sm text-danger">
              {otpError}
            </p>
          )}

          <form onSubmit={handleVerify} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-semibold">
                One-time code
              </label>
              <input
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                value={otp}
                onChange={(e) =>
                  setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))
                }
                placeholder="······"
                autoFocus
                className="w-full rounded-lg border border-input bg-background px-3 py-3 text-center text-2xl font-bold tracking-[0.5em] outline-none transition-colors focus:border-ring focus:ring-2 focus:ring-ring/30"
              />
            </div>

            <button
              type="submit"
              disabled={verifying}
              className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-md shadow-primary/25 transition-all hover:bg-primary-hover active:scale-[0.98] disabled:opacity-50"
            >
              {verifying ? 'Verifying...' : 'Verify & Create Account'}
            </button>
          </form>

          <div className="mt-5 flex items-center justify-between text-sm">
            <button
              onClick={handleBack}
              className="font-semibold text-muted-foreground transition-colors hover:text-foreground"
            >
              ← Back to registration
            </button>
            <button
              onClick={handleResend}
              disabled={cooldown > 0 || resending}
              className="font-semibold text-primary transition-colors hover:text-primary-hover disabled:cursor-not-allowed disabled:opacity-50"
            >
              {resending
                ? 'Sending...'
                : cooldown > 0
                ? `Resend in 0:${String(cooldown).padStart(2, '0')}`
                : 'Resend code'}
            </button>
          </div>
        </>
      )}

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Already have an account?{' '}
        <Link href="/login" className="font-semibold text-primary hover:text-primary-hover">
          Log In
        </Link>
      </p>
    </div>
  );
}
