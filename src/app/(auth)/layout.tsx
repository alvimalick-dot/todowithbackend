import React from 'react';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center bg-gradient-to-br from-background via-background to-accent/40 p-4">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 shadow-2xl shadow-black/5">
        {children}
      </div>
    </div>
  );
}
