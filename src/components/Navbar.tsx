'use client';

import Link from 'next/link';

export default function Navbar() {
  return (
    <header style={styles.header}>
      <div style={styles.container}>
        <Link href="/" style={styles.logo}>
          My Fullstack App
        </Link>

        <div style={styles.navLinks}>
          <Link href="/login" style={styles.loginBtn}>
            Log In
          </Link>
          <Link href="/register" style={styles.registerBtn}>
            Register
          </Link>
        </div>
      </div>
    </header>
  );
}

const styles: Record<string, React.CSSProperties> = {
  header: {
    width: '100%',
    backgroundColor: '#ffffff',
    borderBottom: '1px solid #e5e7eb',
    padding: '12px 24px',
  },
  container: {
    maxWidth: '1200px',
    margin: '0 auto',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  logo: {
    fontSize: '18px',
    fontWeight: 'bold',
    color: '#111827',
    textDecoration: 'none',
  },
  navLinks: {
    display: 'flex',
    gap: '12px',
    alignItems: 'center',
  },
  loginBtn: {
    padding: '8px 16px',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: '600',
    color: '#374151',
    textDecoration: 'none',
  },
  registerBtn: {
    padding: '8px 16px',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: '600',
    backgroundColor: '#2563eb',
    color: '#ffffff',
    textDecoration: 'none',
  },
};