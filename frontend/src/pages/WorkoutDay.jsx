import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api'

const PROGRAM_META = {
  lean_and_mean:   { title: 'LEAN & MEAN',     titleHtml: <>LEAN &amp; <span>MEAN</span></>,     sub: 'Dumbbells' },
  pure_strength:   { title: 'PURE STRENGTH',   titleHtml: <>PURE <span>STRENGTH</span></>,       sub: 'Heavy Compounds' },
  fat_burner:      { title: 'FAT BURNER',      titleHtml: <>FAT <span>BURNER</span></>,          sub: 'HIIT + Circuits' },
  body_recomp:     { title: 'BODY RECOMP',     titleHtml: <>BODY <span>RECOMP</span></>,         sub: 'Strength + Cardio' },
  beginner_basics: { title: 'BEGINNER BASICS', titleHtml: <>BEGINNER <span>BASICS</span></>,     sub: 'Form First' },
  upper_lower:     { title: 'UPPER / LOWER',   titleHtml: <>UPPER / <span>LOWER</span></>,       sub: 'Classic Split' },
}

// ── Returns the start of the current ISO week (Monday 00:00:00) ─────────────
function getWeekStart() {
  const now = new Date()
  const daysSinceMonday = now.getDay() === 0 ? 6 : now.getDay() - 1
  const monday = new Date(now)
  monday.setDate(now.getDate() - daysSinceMonday)
  monday.setHours(0, 0, 0, 0)
  return monday
}

// ── Set row (read-only — set logging happens in the Active Session page) ──────
function SetRow({ num, ex }) {
  const repsLabel = ex.is_time_based
    ? `${ex.time_seconds}s hold`
    : ex.reps_min === ex.reps_max
    ? `${ex.reps_min} reps`
    : `${ex.reps_min}–${ex.reps_max} reps`

  return (
    <div className="set-row">
      <div className="set-num">Set {num}</div>
      <div className="set-target">
        {repsLabel}
        {ex.weight_start && <span className="set-weight"> · {ex.weight_start}</span>}
      </div>
    </div>
  )
}

// ── Exercise card (read-only plan browser) ────────────────────────────────────
function ExerciseCard({ ex, expanded, onToggle }) {
  const unavailable = !ex.available

  return (
    <div className={`ex-card${unavailable ? ' ex-card-unavailable' : ''}`}>
      {/* Clickable header */}
      <div className="ex-card-header" onClick={onToggle}>
        <div className="ex-card-info">
          <div className="ex-name">{ex.name}</div>
          <div className="ex-target">{ex.target}</div>
          {unavailable && (
            <div className="unavailable-badge">⚠ Needs: {(ex.required_equipment || []).join(', ')}</div>
          )}
        </div>

        <div className="ex-card-meta">
          {ex.is_time_based ? (
            <>
              <span className="ex-sets">{ex.sets_default}</span>
              <span className="ex-reps"> × {ex.time_seconds}s</span>
            </>
          ) : (
            <>
              <span className="ex-sets">{ex.sets_default}</span>
              <span className="ex-reps">
                {' × '}{ex.reps_min === ex.reps_max ? ex.reps_min : `${ex.reps_min}–${ex.reps_max}`}
              </span>
            </>
          )}
        </div>

        <span className="ex-card-chevron">{expanded ? '▲' : '▼'}</span>
      </div>

      {/* Expanded: set rows (read-only) */}
      {expanded && (
        <div className="ex-sets-list">
          {Array.from({ length: ex.sets_default }, (_, i) => (
            <SetRow key={i + 1} num={i + 1} ex={ex} />
          ))}

          {ex.rest_seconds > 0 && (
            <div className="ex-rest-note">⏱ {ex.rest_seconds}s rest between sets</div>
          )}
          {ex.tip && <div className="ex-tip-row">💡 {ex.tip}</div>}
          {(ex.weight_step || ex.weight_cap) && (
            <div className="ex-prog-row">
              {ex.weight_step && <div className="wt-step">{ex.weight_step}</div>}
              {ex.weight_cap  && <div className="wt-cap">{ex.weight_cap}</div>}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function WorkoutDay() {
  const navigate = useNavigate()
  const [workouts, setWorkouts]     = useState([])
  const [loading, setLoading]       = useState(true)
  const [starting, setStarting]     = useState(false)
  const [expandedId, setExpandedId] = useState(null)
  const [weekDoneIds, setWeekDoneIds] = useState(new Set())
  const [selected, setSelected]     = useState(() => {
    try { return parseInt(sessionStorage.getItem('workout-day') || '0') } catch { return 0 }
  })

  useEffect(() => {
    const weekStart = getWeekStart()
    Promise.all([
      api.get('/workouts/'),
      api.get('/sessions/history?limit=30'),
    ]).then(([plans, history]) => {
      setWorkouts(plans)
      const doneThisWeek = new Set(
        history
          .filter(s => s.completed_at && new Date(s.completed_at) >= weekStart)
          .map(s => s.workout_template_id)
      )
      setWeekDoneIds(doneThisWeek)
      // Auto-select the first undone day this week
      if (doneThisWeek.size > 0) {
        const firstUndone = plans.findIndex(w => !doneThisWeek.has(w.id))
        if (firstUndone !== -1) {
          setSelected(firstUndone)
          sessionStorage.setItem('workout-day', String(firstUndone))
        }
      }
    }).finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    sessionStorage.setItem('workout-day', String(selected))
  }, [selected])

  const handleSelectDay = (i) => {
    setSelected(i)
    setExpandedId(null)
  }

  const startWorkout = async () => {
    if (!workouts[selected]) return
    setStarting(true)
    try {
      await api.post('/sessions/', { workout_template_id: workouts[selected].id })
      navigate('/session')
    } catch {
      navigate('/session')
    } finally {
      setStarting(false)
    }
  }

  if (loading) return (
    <div className="loading-screen" style={{ height: '60vh' }}>
      <div className="loading-spinner" />
    </div>
  )

  const day  = workouts[selected]
  if (!day) return null

  const available = day.exercises.filter(e => e.available).length
  const total     = day.exercises.length
  const cols      = workouts.length
  const progKey    = workouts[0]?.program || 'lean_and_mean'
  const progMeta   = PROGRAM_META[progKey] || PROGRAM_META.lean_and_mean

  return (
    <div className="fade-in">
      <div className="hero">
        <div className="hero-label">{cols}-Day Program · {progMeta.sub}</div>
        <h1 className="hero-title">{progMeta.titleHtml}</h1>
        <div className="hero-meta">
          <div className="meta-chip">Day <b>{day.day_number}</b></div>
          <div className="meta-chip">Focus <b>{day.focus}</b></div>
          <div className="meta-chip">Exercises <b>{available}/{total}</b></div>
        </div>
      </div>

      {/* Day selector — columns auto-fit to however many days exist */}
      <div className="split-bar" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
        {workouts.map((w, i) => {
          const done = weekDoneIds.has(w.id)
          return (
            <button
              key={w.id}
              className={`split-day${i === selected ? ' active' : ''}${done ? ' day-done' : ''}`}
              onClick={() => handleSelectDay(i)}
            >
              {done && <span className="day-done-tick">✓</span>}
              <span className="day-num">{String(i + 1).padStart(2, '0')}</span>
              <span className="day-name">{w.day_name.slice(0, 3).toUpperCase()}</span>
              <div className="day-focus">{w.focus}</div>
            </button>
          )
        })}
      </div>

      {/* Day header */}
      <div style={{ padding: '10px 14px 4px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: 18, letterSpacing: 1, color: 'var(--white)' }}>
            {day.name}
          </div>
          <div style={{ fontSize: 10.5, color: 'var(--ash)', marginTop: 2 }}>
            Warm-up: {day.warmup}
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
          <span className="badge">{day.day_name}</span>
          {weekDoneIds.has(day.id) && (
            <span style={{
              fontSize: 9, fontWeight: 700, letterSpacing: 1.5,
              textTransform: 'uppercase', color: 'var(--lime)',
              border: '1px solid var(--lime-dim)', borderRadius: 2,
              padding: '2px 6px',
            }}>✓ Done this week</span>
          )}
        </div>
      </div>

      {/* Exercise cards */}
      <div style={{ padding: '8px 14px' }}>
        <div className="ex-cards-list">
          {day.exercises.map(ex => (
            <ExerciseCard
              key={ex.id}
              ex={ex}
              expanded={expandedId === ex.id}
              onToggle={() => setExpandedId(prev => prev === ex.id ? null : ex.id)}
            />
          ))}
        </div>
      </div>

      {/* Start session button */}
      <div style={{ padding: '8px 14px 20px' }}>
        <button
          className={`btn btn-full${weekDoneIds.has(day.id) ? ' btn-muted' : ' btn-lime'}`}
          onClick={startWorkout}
          disabled={starting}
        >
          {starting ? 'Starting…' : weekDoneIds.has(day.id)
            ? `🔁 Redo ${day.day_name}'s Workout`
            : `🏋️  Start ${day.day_name}'s Workout`}
        </button>
      </div>
    </div>
  )
}

