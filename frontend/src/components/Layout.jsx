import { NavLink, useLocation } from 'react-router-dom'
import { useAuth } from '../AuthContext'
import { useState, useEffect } from 'react'

const NAV_ITEMS = [
  { to: '/dashboard', icon: '📊', label: 'Dashboard' },
  { to: '/workout',   icon: '📋', label: 'Workout' },
  { to: '/session',   icon: '🏋️', label: 'Session' },
  { to: '/equipment', icon: '🔧', label: 'Equipment' },
  { to: '/profile',   icon: '👤', label: 'Profile' },
]

export default function Layout({ children }) {
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'dark')

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('theme', theme)
  }, [theme])

  return (
    <div className="app-shell">
      <button
        className="theme-toggle"
        onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')}
        title="Toggle theme"
        aria-label="Toggle theme"
      >
        {theme === 'dark' ? '☀️' : '🌙'}
      </button>
      <div className="main-content">{children}</div>
      <nav className="bottom-nav">
        {NAV_ITEMS.map(({ to, icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
          >
            <span className="nav-icon">{icon}</span>
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
