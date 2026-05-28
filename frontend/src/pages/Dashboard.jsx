import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../AuthContext'
import { api } from '../api'
import MuscleMap from '../components/MuscleMap'

const PERIODS = [
  { key: 'today', label: 'Today' },
  { key: 'week',  label: 'Week' },
  { key: 'month', label: 'Month' },
  { key: 'all',   label: 'All Time' },
]

function formatDuration(secs) {
  if (!secs || secs === 0) return '0m'
  const h = Math.floor(secs / 3600)
  const m = Math.floor((secs % 3600) / 60)
  if (h === 0) return `${m}m`
  return `${h}h ${m}m`
}

function formatDate(iso) {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

function BigStat({ label, value, sub }) {
  return (
    <div style={{
      flex: 1,
      background: 'var(--iron)',
      border: '1px solid var(--steel)',
      borderRadius: 6,
      padding: '14px 10px',
      textAlign: 'center',
      minWidth: 0,
    }}>
      <div style={{
        fontFamily: 'Bebas Neue, sans-serif',
        fontSize: 30,
        color: 'var(--lime)',
        lineHeight: 1,
        marginBottom: 4,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
      }}>{value}</div>
      <div style={{ fontSize: 9, color: 'var(--white)', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 1 }}>{label}</div>
      {sub && <div style={{ fontSize: 9, color: 'var(--ash)' }}>{sub}</div>}
    </div>
  )
}

export default function Dashboard() {
  const { keycloak } = useAuth()
  const navigate = useNavigate()
  const [period, setPeriod] = useState('week')
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeSession, setActiveSession] = useState(null)
  const [deletingId, setDeletingId] = useState(null)

  const username =
    keycloak.tokenParsed?.preferred_username ||
    keycloak.tokenParsed?.name ||
    'Athlete'

  useEffect(() => {
    setLoading(true)
    Promise.all([
      api.get(`/dashboard/?period=${period}`),
      api.get('/sessions/active'),
    ])
      .then(([s, active]) => {
        setStats(s)
        setActiveSession(active)
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [period])

  const handleDelete = async (sessionId) => {
    if (!window.confirm('Delete this session? This cannot be undone.')) return
    setDeletingId(sessionId)
    try {
      await api.delete(`/sessions/${sessionId}`)
      setStats(prev => ({
        ...prev,
        recent_sessions: prev.recent_sessions.filter(s => s.id !== sessionId),
        total_sessions: Math.max(0, (prev.total_sessions ?? 1) - 1),
      }))
    } catch (e) {
      alert('Failed to delete session.')
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="fade-in">
      {/* Hero */}
      <div className="hero" style={{ paddingTop: 32, paddingBottom: 20 }}>
        <div className="hero-label">Iron Den</div>
        <h1 className="hero-title" style={{ fontSize: 30, marginBottom: 10 }}>
          WELCOME BACK,<br />
          <span>{username.toUpperCase()}</span>
        </h1>
        <div className="hero-meta">
          <div className="meta-chip">🔥 Streak <b>{stats?.current_streak ?? 0} days</b></div>
        </div>
      </div>

      {/* Active session banner */}
      {activeSession && (
        <div
          style={{
            background: 'linear-gradient(135deg, #0f1f00, #0a0a0a)',
            border: '1px solid var(--lime)',
            margin: '12px 14px 0', borderRadius: 4, padding: '12px 16px',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            cursor: 'pointer',
          }}
          onClick={() => navigate('/session')}
        >
          <div>
            <div style={{ fontSize: 9, color: 'var(--lime)', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 2 }}>
              ● Active Session In Progress
            </div>
            <div style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: 16 }}>
              Tap to continue workout
            </div>
          </div>
          <div style={{ fontSize: 20 }}>→</div>
        </div>
      )}

      {/* Period selector */}
      <div style={{ padding: '14px 14px 0' }}>
        <div style={{ display: 'flex', background: 'var(--iron)', borderRadius: 6, padding: 3, gap: 2 }}>
          {PERIODS.map((p) => (
            <button
              key={p.key}
              onClick={() => setPeriod(p.key)}
              style={{
                flex: 1,
                padding: '7px 4px',
                border: 'none',
                borderRadius: 4,
                background: period === p.key ? 'var(--lime)' : 'transparent',
                color: period === p.key ? 'var(--black)' : 'var(--ash)',
                fontSize: 10,
                letterSpacing: 0.5,
                fontWeight: period === p.key ? 700 : 400,
                cursor: 'pointer',
                transition: 'all 0.2s',
                fontFamily: 'DM Sans, sans-serif',
              }}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}>
          <div className="loading-spinner" />
        </div>
      ) : (
        <>
          {/* Stats row */}
          <div style={{ display: 'flex', gap: 8, padding: '12px 14px 0' }}>
            <BigStat
              label="Sessions"
              value={stats?.total_sessions ?? 0}
              sub="completed"
            />
            <BigStat
              label="Duration"
              value={formatDuration(stats?.total_duration_seconds)}
              sub="total time"
            />
            <BigStat
              label="Calories"
              value={Math.round(stats?.total_calories_burned ?? 0).toLocaleString()}
              sub="kcal burned"
            />
          </div>

          {/* Muscle anatomy */}
          <div style={{ margin: '16px 14px 0' }}>
            <div className="section-header" style={{ padding: '0 0 10px' }}>
              <div className="section-num">01</div>
              <div>
                <div className="section-title">Muscles Worked</div>
                <div className="section-sub">
                  {stats?.muscles_worked?.length
                    ? `${stats.muscles_worked.length} group${stats.muscles_worked.length > 1 ? 's' : ''} activated`
                    : 'No sessions in this period'}
                </div>
              </div>
            </div>
            <div className="card" style={{ padding: '16px 14px' }}>
              <MuscleMap muscles={stats?.muscles_worked ?? []} />
            </div>
          </div>

          {/* Quick actions */}
          <div style={{ padding: '12px 14px 0', display: 'flex', gap: 8 }}>
            <button className="btn btn-lime" style={{ flex: 1, justifyContent: 'center' }} onClick={() => navigate('/workout')}>
              🏋️ Start Workout
            </button>
            <button className="btn btn-steel" style={{ flex: 1, justifyContent: 'center' }} onClick={() => navigate('/equipment')}>
              🔧 Equipment
            </button>
          </div>

          {/* Recent sessions */}
          {stats?.recent_sessions?.length > 0 && (
            <div style={{ margin: '14px 14px 0' }}>
              <div className="section-header" style={{ padding: '0 0 10px' }}>
                <div className="section-num">02</div>
                <div>
                  <div className="section-title">Recent Sessions</div>
                  <div className="section-sub">Within selected period</div>
                </div>
              </div>
              <div className="card">
                {stats.recent_sessions.map((s) => (
                  <div key={s.id} className="session-row">
                    <div className="session-focus">{s.focus?.charAt(0) || '?'}</div>
                    <div className="session-info">
                      <div className="session-name">{s.workout_name}</div>
                      <div className="session-date">{formatDate(s.started_at)}</div>
                    </div>
                    <div className="session-cal">{Math.round(s.total_calories)} kcal</div>
                    <button
                      className="btn-delete-session"
                      disabled={deletingId === s.id}
                      onClick={() => handleDelete(s.id)}
                      title="Delete session"
                    >
                      {deletingId === s.id ? '…' : '✕'}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {stats?.recent_sessions?.length === 0 && (
            <div style={{ padding: 28, textAlign: 'center' }}>
              <div style={{ fontSize: 36, marginBottom: 8 }}>💪</div>
              <div style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: 20, marginBottom: 4 }}>No Sessions Yet</div>
              <div style={{ fontSize: 11, color: 'var(--ash)' }}>Start your first workout to see stats here.</div>
            </div>
          )}
        </>
      )}

      <div style={{ height: 16 }} />
    </div>
  )
}

