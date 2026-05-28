import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from './AuthContext'
import Layout from './components/Layout'
import ActiveSession from './pages/ActiveSession'
import Dashboard from './pages/Dashboard'
import Equipment from './pages/Equipment'
import Profile from './pages/Profile'
import WorkoutDay from './pages/WorkoutDay'

export default function App() {
  const { ready, authenticated } = useAuth()

  if (!ready) {
    return (
      <div className="loading-screen">
        <div className="loading-logo">IRON<span style={{ color: 'var(--white)' }}>DEN</span></div>
        <div className="loading-spinner" />
      </div>
    )
  }

  if (!authenticated) {
    return (
      <div className="loading-screen">
        <div className="loading-logo">IRON<span style={{ color: 'var(--white)' }}>DEN</span></div>
        <p style={{ color: 'var(--ash)', fontSize: 12, letterSpacing: 2 }}>REDIRECTING TO LOGIN…</p>
      </div>
    )
  }

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/workout" element={<WorkoutDay />} />
        <Route path="/session" element={<ActiveSession />} />
        <Route path="/equipment" element={<Equipment />} />
        <Route path="/profile" element={<Profile />} />
      </Routes>
    </Layout>
  )
}
