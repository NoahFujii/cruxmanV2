import { NavLink } from 'react-router-dom';

const HomeIcon = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 9.5L10 3l7 6.5" />
    <path d="M5 8v8h4v-4h2v4h4V8" />
  </svg>
);

const BoulderIcon = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="10,2 18,17 2,17" />
    <line x1="10" y1="2" x2="6" y2="10" />
    <line x1="6" y1="10" x2="14" y2="13" />
  </svg>
);

const AnalyticsIcon = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="12" width="3" height="5" />
    <rect x="8.5" y="7" width="3" height="10" />
    <rect x="14" y="3" width="3" height="14" />
  </svg>
);

const navItems = [
  { to: '/', icon: <HomeIcon />, label: 'Home' },
  { to: '/designer', icon: <BoulderIcon />, label: 'Boulder Designer' },
  { to: '/analytics', icon: <AnalyticsIcon />, label: 'Analytics' },
];

export default function Layout({ children }) {
  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      <nav style={{
        width: 64,
        flexShrink: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        paddingTop: 20,
        gap: 8,
        background: 'var(--surface)',
        borderRight: '1px solid var(--border)',
      }}>
        {navItems.map(({ to, icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            title={label}
            style={({ isActive }) => ({
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 40,
              height: 40,
              borderRadius: 8,
              color: isActive ? 'var(--accent)' : 'var(--text-muted)',
              background: isActive ? 'var(--accent-muted)' : 'transparent',
              transition: 'color 0.15s, background 0.15s',
            })}
          >
            {icon}
          </NavLink>
        ))}
      </nav>
      <main style={{ flex: 1, overflow: 'auto' }}>
        {children}
      </main>
    </div>
  );
}
