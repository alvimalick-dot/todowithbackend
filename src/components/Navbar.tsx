'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

export default function Navbar() {
  const { user, loading, logout } = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  return (
    <header style={styles.header}>
      <div style={styles.container}>
        <Link href="/" style={styles.logo}>My Fullstack App</Link>

        <div style={styles.navLinks}>
          {loading ? null : user ? (
            <>
              <Link href="/dashboard" style={styles.loginBtn}>Dashboard</Link>
              <Link href="/profile" style={styles.profileLink}>
                {user.avatar ? (
                  <Image
                    src={user.avatar}
                    alt={user.name}
                    width={28}
                    height={28}
                    style={styles.avatar}
                  />
                ) : (
                  <span style={styles.avatarFallback}>{user.name.charAt(0).toUpperCase()}</span>
                )}
                <span>{user.name}</span>
              </Link>
              <button onClick={handleLogout} style={styles.logoutBtn}>Log Out</button>
            </>
          ) : (
            <>
              <Link href="/login" style={styles.loginBtn}>Log In</Link>
              <Link href="/register" style={styles.registerBtn}>Register</Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

const styles: Record<string, React.CSSProperties> = {
  header: { width: '100%', backgroundColor: '#ffffff', borderBottom: '1px solid #e5e7eb', padding: '12px 24px' },
  container: { maxWidth: '1200px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  logo: { fontSize: '18px', fontWeight: 'bold', color: '#111827', textDecoration: 'none' },
  navLinks: { display: 'flex', gap: '12px', alignItems: 'center' },
  loginBtn: { padding: '8px 16px', borderRadius: '6px', fontSize: '14px', fontWeight: '600', color: '#374151', textDecoration: 'none' },
  registerBtn: { padding: '8px 16px', borderRadius: '6px', fontSize: '14px', fontWeight: '600', backgroundColor: '#2563eb', color: '#ffffff', textDecoration: 'none' },
  profileLink: { display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none', color: '#111827', fontSize: '14px', fontWeight: '600' },
  avatar: { width: '28px', height: '28px', borderRadius: '50%', objectFit: 'cover' },
  avatarFallback: { width: '28px', height: '28px', borderRadius: '50%', backgroundColor: '#2563eb', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: '700' },
  logoutBtn: { padding: '8px 16px', borderRadius: '6px', fontSize: '14px', fontWeight: '600', color: '#dc2626', background: 'none', border: '1px solid #fecaca', cursor: 'pointer' },
};