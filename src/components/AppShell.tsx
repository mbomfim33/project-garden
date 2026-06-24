import { NavLink, Outlet } from 'react-router-dom';

const TABS = [
  { to: '/inicio', icon: '🏠', label: 'Início' },
  { to: '/projeto', icon: '🗺️', label: 'Projeto' },
  { to: '/cronograma', icon: '📅', label: 'Plantio' },
  { to: '/diagnostico', icon: '🔬', label: 'Diagnóstico' },
  { to: '/chat', icon: '🤖', label: 'IA Chat' },
  { to: '/mais', icon: '⋯', label: 'Mais' },
];

/** App frame: sticky header, routed tab content, fixed bottom nav. */
export function AppShell() {
  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="app-logo">
          🌿 Plant<span>AI</span>
        </div>
        <div className="hdr-badge">IA Ativa</div>
      </header>

      <main className="main">
        <Outlet />
      </main>

      <nav className="bottom-nav">
        {TABS.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            className={({ isActive }) => (isActive ? 'nav-btn active' : 'nav-btn')}
          >
            <span className="ni">{tab.icon}</span>
            {tab.label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
