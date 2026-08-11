'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const navItems = [
  { label: 'Dashboard', href: '/dashboard', icon: '📊' },
  { label: 'Tasks', href: '/tasks', icon: '✅' },
  { label: 'Calendar', href: '/calendar', icon: '📅' },
  { label: 'Notes', href: '/notes', icon: '📝' },
  { label: 'Profile', href: '/profile', icon: '👤' },
  { label: 'Settings', href: '/settings', icon: '⚙️' },
];

function NavList({ pathname, onNavigate }: { pathname: string; onNavigate?: () => void }) {
  return (
    <nav className="flex flex-col gap-1.5">
      <p className="px-3 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        Menu
      </p>
      {navItems.map((item) => {
        const isActive = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={[
              'group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all',
              isActive
                ? 'bg-primary text-primary-foreground shadow-md shadow-primary/25'
                : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
            ].join(' ')}
          >
            <span className={`text-base transition-transform group-hover:scale-110 ${isActive ? '' : ''}`}>
              {item.icon}
            </span>
            <span>{item.label}</span>
            {isActive && (
              <span className="ml-auto h-1.5 w-1.5 rounded-full bg-primary-foreground/80" />
            )}
          </Link>
        );
      })}
    </nav>
  );
}

export default function Sidebar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Mobile hamburger (below navbar) */}
      <button
        onClick={() => setOpen(true)}
        aria-label="Open navigation"
        className="fixed left-4 top-20 z-30 flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-card text-lg shadow-md transition-all hover:bg-secondary active:scale-95 lg:hidden"
      >
        ☰
      </button>

      {/* Desktop sidebar */}
      <aside className="sticky top-16 hidden h-[calc(100vh-4rem)] w-64 shrink-0 flex-col gap-2 overflow-y-auto border-r border-border bg-sidebar px-3 py-6 lg:flex">
        <NavList pathname={pathname} />
        <div className="mt-auto rounded-xl border border-border bg-muted/60 p-3.5 text-xs leading-relaxed text-muted-foreground">
          <p className="mb-1 font-semibold text-foreground">💡 Tip</p>
          Set a due date and priority on tasks — they&apos;ll show up on your
          calendar and reminders automatically.
        </div>
      </aside>

      {/* Mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />
          <aside className="absolute left-0 top-0 h-full w-72 overflow-y-auto border-r border-border bg-sidebar px-3 py-6 shadow-2xl animate-fade-in-up">
            <div className="mb-4 flex items-center justify-between px-3">
              <span className="text-lg font-bold">⚡ Productivity Hub</span>
              <button
                onClick={() => setOpen(false)}
                aria-label="Close navigation"
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-sm transition-colors hover:bg-secondary"
              >
                ✕
              </button>
            </div>
            <NavList pathname={pathname} onNavigate={() => setOpen(false)} />
          </aside>
        </div>
      )}
    </>
  );
}
