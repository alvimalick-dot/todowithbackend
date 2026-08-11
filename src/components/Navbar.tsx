'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';

export default function Navbar() {
  const { user, loading, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close the dropdown when clicking outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleLogout = async () => {
    await logout();
    router.push('/');
    router.refresh();
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border bg-card/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-[1400px] items-center justify-between gap-4 px-4 sm:px-6">
        {/* Brand */}
        <Link href="/" className="group flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-linear-to-br from-indigo-500 to-violet-600 text-lg shadow-lg shadow-indigo-500/25 transition-transform group-hover:scale-105">
            ⚡
          </span>
          <span className="hidden text-lg font-bold tracking-tight sm:block">
            Productivity Hub
          </span>
        </Link>

        <div className="flex items-center gap-2">
          {/* Theme toggle */}
          <button
            onClick={toggleTheme}
            aria-label="Toggle dark mode"
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-card text-lg transition-all hover:bg-secondary active:scale-95"
          >
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>

          {loading ? null : user ? (
            <>
              {/* Settings shortcut */}
              <Link
                href="/settings"
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-card text-base transition-all hover:bg-secondary active:scale-95"
                aria-label="Settings"
                title="Settings"
              >
                ⚙️
              </Link>

              {/* User menu */}
              <div className="relative" ref={menuRef}>
                <button
                  onClick={() => setMenuOpen((o) => !o)}
                  className="flex items-center gap-2 rounded-lg border border-border bg-card py-1 pl-1 pr-2.5 transition-all hover:bg-secondary"
                >
                  {user.avatar ? (
                    <Image
                      src={user.avatar}
                      alt={user.name}
                      width={28}
                      height={28}
                      className="h-7 w-7 rounded-full object-cover"
                    />
                  ) : (
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-linear-to-br from-indigo-500 to-violet-600 text-xs font-bold text-white">
                      {user.name.charAt(0).toUpperCase()}
                    </span>
                  )}
                  <span className="hidden max-w-[120px] truncate text-sm font-semibold sm:block">
                    {user.name}
                  </span>
                  <span className={`text-xs text-muted-foreground transition-transform ${menuOpen ? 'rotate-180' : ''}`}>
                    ▾
                  </span>
                </button>

                {menuOpen && (
                  <div className="absolute right-0 top-12 w-52 overflow-hidden rounded-xl border border-border bg-popover shadow-xl shadow-black/10 animate-fade-in-up">
                    <div className="border-b border-border px-4 py-3">
                      <p className="truncate text-sm font-semibold">{user.name}</p>
                      <p className="truncate text-xs text-muted-foreground">{user.email}</p>
                    </div>
                    <nav className="p-1.5 text-sm">
                      <Link
                        href="/profile"
                        onClick={() => setMenuOpen(false)}
                        className="flex items-center gap-2.5 rounded-lg px-3 py-2 transition-colors hover:bg-accent hover:text-accent-foreground"
                      >
                        👤 Profile
                      </Link>
                      <Link
                        href="/settings"
                        onClick={() => setMenuOpen(false)}
                        className="flex items-center gap-2.5 rounded-lg px-3 py-2 transition-colors hover:bg-accent hover:text-accent-foreground"
                      >
                        ⚙️ Settings
                      </Link>
                      <button
                        onClick={handleLogout}
                        className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-red-500 transition-colors hover:bg-danger-bg"
                      >
                        🚪 Log out
                      </button>
                    </nav>
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="rounded-lg px-4 py-2 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground"
              >
                Log In
              </Link>
              <Link
                href="/register"
                className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-md shadow-primary/25 transition-all hover:bg-primary-hover active:scale-95"
              >
                Register
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
