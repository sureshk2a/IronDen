import { useEffect, useState } from 'react'
import { api } from '../api'
import { useAuth } from '../AuthContext'

function bmiCategory(bmi) {
  if (bmi < 18.5) return { label: 'Underweight', color: 'var(--orange)' }
  if (bmi < 25)   return { label: 'Normal',      color: 'var(--lime)' }
  if (bmi < 30)   return { label: 'Overweight',  color: 'var(--orange)' }
  return              { label: 'Obese',          color: 'var(--red)' }
}

const PROGRAMS = [
  {
    id: 'lean_and_mean',
    label: 'Lean & Mean',
    sub: '7-day · Dumbbell · Fat loss + muscle',
    emoji: '🔥',
  },
  {
    id: 'pure_strength',
    label: 'Pure Strength',
    sub: '7-day · Heavy compound · 5×5 focus',
    emoji: '💪',
  },
  {
    id: 'fat_burner',
    label: 'Fat Burner',
    sub: '7-day · HIIT + circuits · Max calorie burn',
    emoji: '⚡',
  },
  {
    id: 'body_recomp',
    label: 'Body Recomp',
    sub: '7-day · Strength + conditioning · Balanced',
    emoji: '⚖️',
  },
  {
    id: 'beginner_basics',
    label: 'Beginner Basics',
    sub: '7-day · 3 full-body days · Form first',
    emoji: '🌱',
  },
  {
    id: 'upper_lower',
    label: 'Upper / Lower Split',
    sub: '7-day · 4-day split · Classic powerbuilding',
    emoji: '🏗️',
  },
]

export default function Profile() {
  const { keycloak } = useAuth()
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [savingProgram, setSavingProgram] = useState(false)
  const [toast, setToast] = useState('')
  const [form, setForm] = useState({ height_cm: '', weight_kg: '', username: '' })
  const [selectedProgram, setSelectedProgram] = useState('lean_and_mean')

  const kc = keycloak.tokenParsed || {}

  useEffect(() => {
    api.get('/profile/').then((p) => {
      setProfile(p)
      setForm({
        height_cm: p.height_cm ?? '',
        weight_kg: p.weight_kg ?? '',
        username:  p.username  ?? kc.preferred_username ?? '',
      })
      setSelectedProgram(p.workout_program || 'lean_and_mean')
    }).finally(() => setLoading(false))
  }, [])

  const save = async () => {
    setSaving(true)
    try {
      const payload = {}
      if (form.height_cm !== '') payload.height_cm = parseFloat(form.height_cm)
      if (form.weight_kg !== '') payload.weight_kg = parseFloat(form.weight_kg)
      if (form.username  !== '') payload.username  = form.username
      const updated = await api.patch('/profile/', payload)
      setProfile(updated)
      setToast('Profile saved!')
    } catch (e) {
      setToast('Error: ' + e.message)
    } finally {
      setSaving(false)
      setTimeout(() => setToast(''), 2500)
    }
  }

  const saveProgram = async (programId) => {
    setSelectedProgram(programId)
    setSavingProgram(true)
    try {
      const updated = await api.patch('/profile/', { workout_program: programId })
      setProfile(updated)
      setToast('Program updated!')
    } catch (e) {
      setToast('Error: ' + e.message)
    } finally {
      setSavingProgram(false)
      setTimeout(() => setToast(''), 2500)
    }
  }

  if (loading) return <div className="loading-screen" style={{ height: '60vh' }}><div className="loading-spinner" /></div>

  const h = profile?.height_cm
  const w = profile?.weight_kg
  const bmi = h && w ? parseFloat((w / ((h / 100) ** 2)).toFixed(1)) : null
  const bmiCat = bmi ? bmiCategory(bmi) : null

  // Calorie estimate (BMR Harris-Benedict)
  const bmr = w && h
    ? Math.round(88.362 + 13.397 * w + 4.799 * h - 5.677 * 30)
    : null
  // TDEE at moderate activity (4x/week)
  const tdee = bmr ? Math.round(bmr * 1.55) : null

  return (
    <div className="fade-in">
      {toast && (
        <div className="toast">{toast}</div>
      )}

      <div className="hero">
        <div className="hero-label">Your Stats</div>
        <h1 className="hero-title">
          ATHLETE<br /><span>PROFILE</span>
        </h1>
        <div className="hero-meta">
          <div className="meta-chip">Email <b>{kc.email || profile?.email || '—'}</b></div>
          {bmi && <div className="meta-chip">BMI <b style={{ color: bmiCat.color }}>{bmi} · {bmiCat.label}</b></div>}
        </div>
      </div>

      <div className="profile-section">

        {/* Body stats */}
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">Body Measurements</div>
              <div className="card-sub">Used for calorie calculations</div>
            </div>
          </div>
          <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div className="field">
              <label>Display Name</label>
              <input
                className="input"
                value={form.username}
                onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))}
                placeholder="Your name"
              />
            </div>
            <div className="input-row">
              <div className="field" style={{ flex: 1 }}>
                <label>Height (cm)</label>
                <input
                  className="input"
                  type="number"
                  min="100" max="250"
                  value={form.height_cm}
                  onChange={(e) => setForm((f) => ({ ...f, height_cm: e.target.value }))}
                  placeholder="e.g. 178"
                />
              </div>
              <div className="field" style={{ flex: 1 }}>
                <label>Weight (kg)</label>
                <input
                  className="input"
                  type="number"
                  min="30" max="300"
                  value={form.weight_kg}
                  onChange={(e) => setForm((f) => ({ ...f, weight_kg: e.target.value }))}
                  placeholder="e.g. 82"
                />
              </div>
            </div>
            <button className="btn btn-lime btn-full" onClick={save} disabled={saving}>
              {saving ? 'Saving…' : '💾 Save Profile'}
            </button>
          </div>
        </div>

        {/* Workout Program selector */}
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">Workout Program</div>
              <div className="card-sub">Changes take effect on your next visit to the Workout page</div>
            </div>
          </div>
          <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {PROGRAMS.map((prog) => {
              const active = selectedProgram === prog.id
              return (
                <button
                  key={prog.id}
                  className={`program-option${active ? ' program-option-active' : ''}`}
                  onClick={() => !savingProgram && saveProgram(prog.id)}
                  disabled={savingProgram}
                >
                  <span className="program-option-emoji">{prog.emoji}</span>
                  <div className="program-option-text">
                    <div className="program-option-label">{prog.label}</div>
                    <div className="program-option-sub">{prog.sub}</div>
                  </div>
                  {active && <span className="program-option-check">✓</span>}
                </button>
              )
            })}
          </div>
        </div>

        {/* BMI visual */}
        {bmi && (
          <div className="card">
            <div className="card-header">
              <div className="card-title">BMI Analysis</div>
            </div>
            <div className="card-body">
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontSize: 11, color: 'var(--ash)' }}>Body Mass Index</span>
                <span style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: 24, color: bmiCat.color }}>{bmi}</span>
              </div>
              <div className="bmi-bar">
                <div className="bmi-fill" style={{
                  width: `${Math.min(100, ((bmi - 10) / 30) * 100)}%`,
                  background: bmiCat.color,
                }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                <span style={{ fontSize: 9, color: 'var(--ash)' }}>10</span>
                <span style={{ fontSize: 10, color: bmiCat.color, fontWeight: 700 }}>{bmiCat.label}</span>
                <span style={{ fontSize: 9, color: 'var(--ash)' }}>40</span>
              </div>
            </div>
          </div>
        )}

        {/* Calorie targets */}
        {bmr && (
          <div className="card">
            <div className="card-header">
              <div>
                <div className="card-title">Daily Calorie Targets</div>
                <div className="card-sub">Harris-Benedict equation · Moderate activity</div>
              </div>
            </div>
            <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[
                { label: 'Maintenance (TDEE)',    val: tdee,              color: 'var(--silver)', sub: '4× workouts/week' },
                { label: 'Fat Loss (−500 kcal)',  val: tdee - 500,        color: 'var(--lime)',   sub: '~0.5 kg/week loss' },
                { label: 'Aggressive (−750 kcal)',val: tdee - 750,        color: 'var(--orange)', sub: '~0.75 kg/week loss' },
                { label: 'Protein Target',        val: `${Math.round((w || 80) * 1.8)}g`, color: 'var(--lime-dim)', sub: '1.8 g/kg bodyweight' },
              ].map(({ label, val, color, sub }) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: '1px solid var(--iron)' }}>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 500 }}>{label}</div>
                    <div style={{ fontSize: 10, color: 'var(--ash)' }}>{sub}</div>
                  </div>
                  <div style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: 22, color }}>{typeof val === 'number' ? `${val} kcal` : val}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Logout */}
        <button
          className="btn btn-ghost btn-full"
          onClick={() => keycloak.logout({ redirectUri: window.location.origin })}
        >
          🚪 Sign Out
        </button>
      </div>

      <div style={{ height: 14 }} />
    </div>
  )
}
