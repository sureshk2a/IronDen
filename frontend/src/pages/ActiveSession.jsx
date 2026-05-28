import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api'

// ── Timer ────────────────────────────────────────────────────────────────────
function useTimer() {
  const [elapsed, setElapsed] = useState(0)
  const ref = useRef(null)
  const start = useCallback(() => {
    if (ref.current) return
    const t0 = Date.now() - elapsed * 1000
    ref.current = setInterval(() => setElapsed(Math.floor((Date.now() - t0) / 1000)), 1000)
  }, [elapsed])
  const stop = useCallback(() => { clearInterval(ref.current); ref.current = null }, [])
  useEffect(() => () => clearInterval(ref.current), [])
  return { elapsed, start, stop }
}

function fmtTime(s) {
  const m = Math.floor(s / 60)
  const ss = String(s % 60).padStart(2, '0')
  return `${m}:${ss}`
}

// ── Set-logging modal ────────────────────────────────────────────────────────
function LogSetModal({ exercise, sessionId, nextSet, onLogged, onClose }) {
  const [reps, setReps]     = useState(exercise.reps_max || '')
  const [weight, setWeight] = useState('')
  const [duration, setDuration] = useState(exercise.time_seconds || '')
  const [saving, setSaving] = useState(false)
  const [restTimer, setRestTimer] = useState(null)
  const restRef = useRef(null)

  useEffect(() => () => clearInterval(restRef.current), [])

  const startRest = (secs) => {
    setRestTimer(secs)
    restRef.current = setInterval(() => {
      setRestTimer((t) => {
        if (t <= 1) { clearInterval(restRef.current); return 0 }
        return t - 1
      })
    }, 1000)
  }

  const submit = async () => {
    setSaving(true)
    try {
      const payload = {
        exercise_id:   exercise.id,
        set_number:    nextSet,
        notes: null,
      }
      if (exercise.is_time_based) {
        payload.duration_seconds = parseInt(duration) || exercise.time_seconds
      } else {
        payload.reps      = parseInt(reps)   || null
        payload.weight_kg = parseFloat(weight) || null
      }
      const log = await api.post(`/sessions/${sessionId}/sets`, payload)
      onLogged(log)
      if (exercise.rest_seconds > 0) startRest(exercise.rest_seconds)
    } catch (e) {
      alert('Error: ' + e.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)',
        display: 'flex', alignItems: 'flex-end', zIndex: 300,
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        style={{
          width: '100%', background: 'var(--carbon)',
          border: '1px solid var(--steel)', borderRadius: '8px 8px 0 0',
          padding: 20, animation: 'fadeIn 0.2s ease',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
          <div>
            <div style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: 22, color: 'var(--lime)' }}>
              Set {nextSet}
            </div>
            <div style={{ fontSize: 14, fontWeight: 500, marginTop: 2 }}>{exercise.name}</div>
            <div style={{ fontSize: 10, color: 'var(--ash)' }}>{exercise.target}</div>
          </div>
          <button style={{ background: 'none', border: 'none', color: 'var(--ash)', fontSize: 20, cursor: 'pointer' }} onClick={onClose}>✕</button>
        </div>

        {/* Suggested weight */}
        {exercise.weight_start && (
          <div style={{ background: 'var(--iron)', borderLeft: '3px solid var(--orange)', padding: '8px 12px', borderRadius: 2, marginBottom: 14, fontSize: 11, color: 'var(--silver)' }}>
            Suggested: <b style={{ color: 'var(--orange)' }}>{exercise.weight_start}</b>
            {exercise.weight_step && <div style={{ color: 'var(--lime-dim)', marginTop: 2 }}>{exercise.weight_step}</div>}
          </div>
        )}

        {exercise.is_time_based ? (
          <div className="field" style={{ marginBottom: 14 }}>
            <label>Duration (seconds)</label>
            <input
              className="input"
              type="number"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              placeholder={`${exercise.time_seconds || 30}s`}
            />
          </div>
        ) : (
          <div className="input-row" style={{ marginBottom: 14 }}>
            <div className="field" style={{ flex: 1 }}>
              <label>Reps</label>
              <input
                className="input"
                type="number"
                min="1"
                value={reps}
                onChange={(e) => setReps(e.target.value)}
                placeholder={exercise.reps_min ? `${exercise.reps_min}–${exercise.reps_max}` : '—'}
              />
            </div>
            <div className="field" style={{ flex: 1 }}>
              <label>Weight (kg each)</label>
              <input
                className="input"
                type="number"
                step="0.5"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                placeholder="kg"
              />
            </div>
          </div>
        )}

        <button
          className="btn btn-lime btn-full"
          onClick={submit}
          disabled={saving}
          style={{ marginBottom: restTimer ? 14 : 0 }}
        >
          {saving ? 'Logging…' : `✓ Log Set ${nextSet}`}
        </button>

        {restTimer !== null && (
          <div style={{ textAlign: 'center', marginTop: 12 }}>
            <div style={{ fontSize: 10, color: 'var(--ash)', letterSpacing: 2, marginBottom: 4 }}>REST TIMER</div>
            <div
              style={{
                fontFamily: 'Bebas Neue, sans-serif',
                fontSize: 48, lineHeight: 1,
                color: restTimer > 10 ? 'var(--lime)' : 'var(--orange)',
              }}
            >
              {fmtTime(restTimer)}
            </div>
            {restTimer === 0 && (
              <div style={{ color: 'var(--lime)', fontSize: 12, marginTop: 4, fontWeight: 700 }}>
                ✓ Rest complete — next set!
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Exercise panel ───────────────────────────────────────────────────────────
function ExercisePanel({ ex, sessionId, allLogs, onLogged, onDeleteLog }) {
  const [showModal, setShowModal] = useState(false)
  const exLogs = allLogs.filter((l) => l.exercise_id === ex.id)
  const nextSet = exLogs.length + 1
  const done = exLogs.length >= ex.sets_default
  const totalCal = exLogs.reduce((s, l) => s + l.calories_burned, 0)

  return (
    <div style={{ margin: '0 14px 10px' }}>
      <div className="card">
        <div
          className="card-header"
          style={{ cursor: ex.available ? 'pointer' : 'default', opacity: ex.available ? 1 : 0.45 }}
          onClick={() => ex.available && !done && setShowModal(true)}
        >
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div className="card-title">{ex.name}</div>
              {done && <span className="badge">✓ Done</span>}
              {!ex.available && <span className="badge badge-red">Needs Equipment</span>}
            </div>
            <div className="card-sub">{ex.target}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: 20, color: 'var(--lime)' }}>
              {exLogs.length}/{ex.sets_default}
            </div>
            <div style={{ fontSize: 9, color: 'var(--ash)', letterSpacing: 1 }}>SETS</div>
          </div>
        </div>

        {/* Logged sets */}
        {exLogs.length > 0 && (
          <div>
            {exLogs.map((log) => (
              <div key={log.id} className="set-log-row">
                <div className="set-num">{log.set_number}</div>
                <div className="set-info">
                  {log.duration_seconds
                    ? `${log.duration_seconds}s`
                    : `${log.reps ?? '—'} reps${log.weight_kg ? ` @ ${log.weight_kg} kg` : ''}`}
                </div>
                <div className="set-cal">~{log.calories_burned.toFixed(1)} kcal</div>
                <button className="set-del" onClick={() => onDeleteLog(log.id)}>✕</button>
              </div>
            ))}
            <div style={{ padding: '6px 10px', fontSize: 10, color: 'var(--lime-dim)', textAlign: 'right' }}>
              Total: {totalCal.toFixed(1)} kcal burned
            </div>
          </div>
        )}

        {/* Log button */}
        {ex.available && !done && (
          <div style={{ padding: '8px 10px' }}>
            <button
              className="btn btn-ghost btn-full"
              style={{ fontSize: 10, padding: '8px' }}
              onClick={() => setShowModal(true)}
            >
              + Log Set {nextSet}
            </button>
          </div>
        )}
      </div>

      {showModal && (
        <LogSetModal
          exercise={ex}
          sessionId={sessionId}
          nextSet={nextSet}
          onLogged={(log) => { onLogged(log); setShowModal(false) }}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function ActiveSession() {
  const navigate  = useNavigate()
  const { elapsed, start, stop } = useTimer()
  const [session, setSession]   = useState(null)
  const [workout, setWorkout]   = useState(null)
  const [logs,    setLogs]      = useState([])
  const [loading, setLoading]   = useState(true)
  const [completing, setCompleting] = useState(false)
  const [confirmEnd, setConfirmEnd] = useState(false)

  const totalCal = logs.reduce((s, l) => s + l.calories_burned, 0)
  const totalSets = logs.length

  useEffect(() => {
    api.get('/sessions/active').then(async (active) => {
      if (!active) { setLoading(false); return }
      setSession(active)
      setLogs(active.set_logs || [])

      const wo = await api.get(`/workouts/${active.workout_template_id}`)
      setWorkout(wo)
      start()
    }).catch(console.error).finally(() => setLoading(false))
  }, [])

  const handleLogged = (log) => {
    setLogs((prev) => [...prev, log])
  }

  const handleDeleteLog = async (logId) => {
    await api.delete(`/sessions/${session.id}/sets/${logId}`)
    setLogs((prev) => prev.filter((l) => l.id !== logId))
  }

  const completeSession = async () => {
    setCompleting(true)
    stop()
    try {
      await api.post(`/sessions/${session.id}/complete`, { notes: null })
      navigate('/dashboard')
    } catch (e) {
      alert('Error: ' + e.message)
      setCompleting(false)
    }
  }

  if (loading) return <div className="loading-screen" style={{ height: '60vh' }}><div className="loading-spinner" /></div>

  if (!session || !workout) {
    return (
      <div className="fade-in">
        <div className="hero">
          <div className="hero-label">Workout Session</div>
          <h1 className="hero-title">NO ACTIVE<br /><span>SESSION</span></h1>
        </div>
        <div style={{ padding: '24px 14px', textAlign: 'center' }}>
          <div style={{ fontSize: 40, marginBottom: 10 }}>🏋️</div>
          <div style={{ fontSize: 13, color: 'var(--ash)', marginBottom: 20 }}>
            Start a workout from the Workout tab to begin logging sets.
          </div>
          <button className="btn btn-lime" onClick={() => navigate('/workout')}>
            View Workout Plan →
          </button>
        </div>
      </div>
    )
  }

  // Group exercises by type for display
  const strengthExercises = workout.exercises.filter((e) => e.exercise_type === 'strength')
  const coreExercises     = workout.exercises.filter((e) => e.exercise_type === 'core')
  const cardioExercises   = workout.exercises.filter((e) => e.exercise_type === 'cardio')

  return (
    <div className="fade-in">
      {/* Header */}
      <div className="hero" style={{ paddingBottom: 20 }}>
        <div className="hero-label">Active Session · {workout.day_name}</div>
        <h1 className="hero-title" style={{ fontSize: 'clamp(28px,7vw,48px)' }}>
          {workout.focus.toUpperCase()}
        </h1>
        <div className="hero-meta">
          <div className="meta-chip">📅 <b>{new Date(session.started_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</b></div>
          <div className="meta-chip">⏱ <b>{fmtTime(elapsed)}</b></div>
          <div className="meta-chip">Sets <b>{totalSets}</b></div>
          <div className="meta-chip">🔥 <b>{Math.round(totalCal)} kcal</b></div>
        </div>
      </div>

      {/* Calorie banner */}
      <div className="cal-banner">
        <div>
          <div className="cal-label">Calories Burned</div>
          <div className="cal-total">{Math.round(totalCal)}</div>
          <div style={{ fontSize: 10, color: 'var(--ash)' }}>kcal · {totalSets} sets logged</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 9, color: 'var(--ash)', letterSpacing: 2, marginBottom: 4 }}>SESSION TIME</div>
          <div style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: 36, color: 'var(--white)' }}>
            {fmtTime(elapsed)}
          </div>
        </div>
      </div>

      {/* Strength exercises */}
      {strengthExercises.length > 0 && (
        <>
          <div className="section-header" style={{ paddingTop: 16 }}>
            <div className="section-num">01</div>
            <div>
              <div className="section-title">Strength</div>
              <div className="section-sub">Main lifting block</div>
            </div>
          </div>
          {strengthExercises.map((ex) => (
            <ExercisePanel key={ex.id} ex={ex} sessionId={session.id} allLogs={logs} onLogged={handleLogged} onDeleteLog={handleDeleteLog} />
          ))}
        </>
      )}

      {/* Core exercises */}
      {coreExercises.length > 0 && (
        <>
          <div className="section-header" style={{ paddingTop: 8 }}>
            <div className="section-num">02</div>
            <div>
              <div className="section-title">Core</div>
              <div className="section-sub">Abs & stability work</div>
            </div>
          </div>
          {coreExercises.map((ex) => (
            <ExercisePanel key={ex.id} ex={ex} sessionId={session.id} allLogs={logs} onLogged={handleLogged} onDeleteLog={handleDeleteLog} />
          ))}
        </>
      )}

      {/* Cardio exercises */}
      {cardioExercises.length > 0 && (
        <>
          <div className="section-header" style={{ paddingTop: 8 }}>
            <div className="section-num">03</div>
            <div>
              <div className="section-title">Cardio</div>
              <div className="section-sub">Finisher</div>
            </div>
          </div>
          {cardioExercises.map((ex) => (
            <ExercisePanel key={ex.id} ex={ex} sessionId={session.id} allLogs={logs} onLogged={handleLogged} onDeleteLog={handleDeleteLog} />
          ))}
        </>
      )}

      {/* Finish session */}
      <div style={{ padding: '14px 14px 14px' }}>
        {!confirmEnd ? (
          <button className="btn btn-red btn-full" onClick={() => setConfirmEnd(true)}>
            🏁 Finish Session
          </button>
        ) : (
          <div className="card" style={{ padding: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 12, textAlign: 'center' }}>
              End session with {totalSets} sets · {Math.round(totalCal)} kcal burned?
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-ghost" style={{ flex: 1, justifyContent: 'center' }} onClick={() => setConfirmEnd(false)}>
                Cancel
              </button>
              <button className="btn btn-lime" style={{ flex: 1, justifyContent: 'center' }} onClick={completeSession} disabled={completing}>
                {completing ? 'Saving…' : '✓ Complete!'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
