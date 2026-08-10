import Link from 'next/link';

export default function Home() {
  return (
    <main style={styles.main}>
      {/* HERO SECTION */}
      <section style={styles.hero}>
        <div style={styles.badge}>Next.js + MongoDB + TypeScript</div>
        <h1 style={styles.title}>
          Organize Your Tasks with <span style={styles.highlight}>Ease & Precision</span>
        </h1>
        <p style={styles.subtitle}>
          A lightweight, powerful task management app built to streamline your workflow, track priorities, and get things done effortlessly.
        </p>

        <div style={styles.ctaGroup}>
          <Link href="/register" style={styles.primaryBtn}>
            Get Started Free
          </Link>
          <Link href="/login" style={styles.secondaryBtn}>
            Sign In
          </Link>
        </div>
      </section>

      {/* FEATURE CARDS */}
      <section style={styles.features}>
        <div style={styles.card}>
          <div style={styles.icon}>⚡</div>
          <h3 style={styles.cardTitle}>Real-time Updates</h3>
          <p style={styles.cardDesc}>
            Create, update status, and manage tasks instantly with zero page reloads.
          </p>
        </div>

        <div style={styles.card}>
          <div style={styles.icon}>🔒</div>
          <h3 style={styles.cardTitle}>Secure & Private</h3>
          <p style={styles.cardDesc}>
            Protected with JWT HTTP-only cookies and complete user data isolation.
          </p>
        </div>

        <div style={styles.card}>
          <div style={styles.icon}>📊</div>
          <h3 style={styles.cardTitle}>Status Tracking</h3>
          <p style={styles.cardDesc}>
            Filter tasks by Pending, In-Progress, and Completed with dynamic badges.
          </p>
        </div>
      </section>
    </main>
  );
}

const styles: Record<string, React.CSSProperties> = {
  main: {
    minHeight: 'calc(100vh - 70px)',
    backgroundColor: '#0d1117',
    color: '#ffffff',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '40px 20px',
    fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  },
  hero: {
    textAlign: 'center',
    maxWidth: '750px',
    marginBottom: '60px',
  },
  badge: {
    display: 'inline-block',
    padding: '6px 16px',
    borderRadius: '20px',
    backgroundColor: 'rgba(37, 99, 235, 0.15)',
    color: '#60a5fa',
    fontSize: '13px',
    fontWeight: '600',
    marginBottom: '20px',
    border: '1px solid rgba(96, 165, 250, 0.3)',
  },
  title: {
    fontSize: '48px',
    fontWeight: '800',
    lineHeight: '1.2',
    marginBottom: '20px',
    letterSpacing: '-0.5px',
  },
  highlight: {
    color: '#2563eb',
  },
  subtitle: {
    fontSize: '18px',
    color: '#9ca3af',
    lineHeight: '1.6',
    marginBottom: '32px',
  },
  ctaGroup: {
    display: 'flex',
    gap: '16px',
    justifyContent: 'center',
    flexWrap: 'wrap',
  },
  primaryBtn: {
    backgroundColor: '#2563eb',
    color: '#ffffff',
    padding: '12px 28px',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: '600',
    textDecoration: 'none',
    boxShadow: '0 4px 14px rgba(37, 99, 235, 0.4)',
  },
  secondaryBtn: {
    backgroundColor: 'transparent',
    color: '#e5e7eb',
    padding: '12px 28px',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: '600',
    textDecoration: 'none',
    border: '1px solid #374151',
  },
  features: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: '24px',
    maxWidth: '900px',
    width: '100%',
  },
  card: {
    backgroundColor: '#161b22',
    padding: '24px',
    borderRadius: '12px',
    border: '1px solid #30363d',
  },
  icon: {
    fontSize: '28px',
    marginBottom: '12px',
  },
  cardTitle: {
    fontSize: '18px',
    fontWeight: '600',
    marginBottom: '8px',
    color: '#ffffff',
  },
  cardDesc: {
    fontSize: '14px',
    color: '#8b949e',
    lineHeight: '1.5',
  },
};