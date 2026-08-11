import Link from 'next/link';

export default function Home() {
  return (
    <main style={styles.main}>
      {/* HERO SECTION */}
      <section style={styles.hero}>
        <div style={styles.badge}>Next.js + MongoDB + TypeScript</div>
        <h1 style={styles.title}>
          Your Productivity Hub for{' '}
          <span style={styles.highlight}>Tasks, Notes & Calendar</span>
        </h1>
        <p style={styles.subtitle}>
          Manage tasks with priorities and due dates, take rich markdown notes, schedule
          events, and get reminders — all in one secure workspace.
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
          <div style={styles.icon}>✅</div>
          <h3 style={styles.cardTitle}>Smart Task Management</h3>
          <p style={styles.cardDesc}>
            Priorities, categories, due dates, search, filter and sort — plus reminders.
          </p>
        </div>

        <div style={styles.card}>
          <div style={styles.icon}>📅</div>
          <h3 style={styles.cardTitle}>Calendar & Events</h3>
          <p style={styles.cardDesc}>
            Monthly and weekly views with your tasks and events together in one timeline.
          </p>
        </div>

        <div style={styles.card}>
          <div style={styles.icon}>📝</div>
          <h3 style={styles.cardTitle}>Markdown Notes</h3>
          <p style={styles.cardDesc}>
            Rich-text editor, folders, and pinned notes to keep your ideas organized.
          </p>
        </div>

        <div style={styles.card}>
          <div style={styles.icon}>🔒</div>
          <h3 style={styles.cardTitle}>Secure & Private</h3>
          <p style={styles.cardDesc}>
            JWT HTTP-only cookies, protected routes, and complete per-user data isolation.
          </p>
        </div>
      </section>
    </main>
  );
}

const styles: Record<string, React.CSSProperties> = {
  main: {
    minHeight: 'calc(100vh - 64px)',
    backgroundColor: '#0b1120',
    color: '#ffffff',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '48px 20px',
    fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  },
  hero: {
    textAlign: 'center',
    maxWidth: '760px',
    marginBottom: '56px',
  },
  badge: {
    display: 'inline-block',
    padding: '6px 16px',
    borderRadius: '20px',
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
    color: '#a5b4fc',
    fontSize: '13px',
    fontWeight: '600',
    marginBottom: '20px',
    border: '1px solid rgba(129, 140, 248, 0.3)',
  },
  title: {
    fontSize: '44px',
    fontWeight: '800',
    lineHeight: '1.15',
    marginBottom: '20px',
    letterSpacing: '-0.5px',
  },
  highlight: {
    background: 'linear-gradient(90deg, #818cf8, #c084fc)',
    WebkitBackgroundClip: 'text',
    backgroundClip: 'text',
    color: 'transparent',
  },
  subtitle: {
    fontSize: '18px',
    color: '#94a3b8',
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
    backgroundColor: '#6366f1',
    color: '#ffffff',
    padding: '12px 28px',
    borderRadius: '10px',
    fontSize: '16px',
    fontWeight: '600',
    textDecoration: 'none',
    boxShadow: '0 4px 14px rgba(99, 102, 241, 0.4)',
    transition: 'background-color 0.2s, transform 0.15s',
  },
  secondaryBtn: {
    backgroundColor: 'transparent',
    color: '#e2e8f0',
    padding: '12px 28px',
    borderRadius: '10px',
    fontSize: '16px',
    fontWeight: '600',
    textDecoration: 'none',
    border: '1px solid #334155',
  },
  features: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))',
    gap: '20px',
    maxWidth: '960px',
    width: '100%',
  },
  card: {
    backgroundColor: '#121b2e',
    padding: '24px',
    borderRadius: '14px',
    border: '1px solid #22304d',
    transition: 'transform 0.2s, border-color 0.2s',
  },
  icon: {
    fontSize: '28px',
    marginBottom: '12px',
  },
  cardTitle: {
    fontSize: '17px',
    fontWeight: '600',
    marginBottom: '8px',
    color: '#ffffff',
  },
  cardDesc: {
    fontSize: '14px',
    color: '#94a3b8',
    lineHeight: '1.55',
  },
};
