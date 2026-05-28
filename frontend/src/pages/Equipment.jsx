import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api'

// ── Static equipment catalogue (client-side filtering — instant) ─────────────
const EQUIPMENT_CATALOGUE = [
  { name: 'Barbell', equipment_type: 'barbell' },
  { name: 'Olympic Barbell', equipment_type: 'barbell' },
  { name: 'EZ Curl Bar', equipment_type: 'ez_curl_bar' },
  { name: 'Trap Bar / Hex Bar', equipment_type: 'trap_bar' },
  { name: 'Kettlebell', equipment_type: 'kettlebell' },
  { name: 'Adjustable Dumbbells', equipment_type: 'dumbbells' },
  { name: 'Fixed Dumbbells', equipment_type: 'dumbbells' },
  { name: 'Flat Bench', equipment_type: 'bench' },
  { name: 'Incline / Adjustable Bench', equipment_type: 'incline_bench' },
  { name: 'Treadmill', equipment_type: 'treadmill' },
  { name: 'Stationary Bike', equipment_type: 'stationary_bike' },
  { name: 'Rowing Machine', equipment_type: 'rowing_machine' },
  { name: 'Elliptical', equipment_type: 'elliptical' },
  { name: 'Pull-Up Bar', equipment_type: 'pull_up_bar' },
  { name: 'Dip Bars', equipment_type: 'dip_bars' },
  { name: 'Cable Machine', equipment_type: 'cable_machine' },
  { name: 'Smith Machine', equipment_type: 'smith_machine' },
  { name: 'Power Rack / Squat Rack', equipment_type: 'squat_rack' },
  { name: 'Leg Press Machine', equipment_type: 'leg_press' },
  { name: 'Lat Pulldown Machine', equipment_type: 'lat_pulldown' },
  { name: 'Chest Press Machine', equipment_type: 'chest_press_machine' },
  { name: 'Resistance Bands', equipment_type: 'bands' },
  { name: 'Ab Wheel', equipment_type: 'ab_wheel' },
  { name: 'Medicine Ball', equipment_type: 'medicine_ball' },
  { name: 'Slam Ball', equipment_type: 'slam_ball' },
  { name: 'Battle Ropes', equipment_type: 'battle_ropes' },
  { name: 'Gymnastic Rings', equipment_type: 'rings' },
  { name: 'TRX / Suspension Trainer', equipment_type: 'trx' },
  { name: 'Jump Rope', equipment_type: 'jump_rope' },
  { name: 'Plyo Box / Step Box', equipment_type: 'plyo_box' },
  { name: 'Foam Roller', equipment_type: 'foam_roller' },
  { name: 'Weight Plates (bumper)', equipment_type: 'weight_plates' },
]

const TYPE_ICON = {
  dumbbells:    '🏋️',
  bench:        '🛏️',
  incline_bench: '📐',
  treadmill:    '🏃',
  ab_wheel:     '⚙️',
  bands:        '🔗',
  barbell:      '🔩',
  ez_curl_bar:  '〰️',
  kettlebell:   '🫙',
  cable_machine:'🔄',
  pull_up_bar:  '🔝',
  dip_bars:     '🤸',
  other:        '📦',
}

const PRESET_EQUIPMENT = [
  { name: 'Adjustable Dumbbells', equipment_type: 'dumbbells' },
  { name: 'Flat Bench', equipment_type: 'bench' },
  { name: 'Incline / Adjustable Bench', equipment_type: 'incline_bench' },
  { name: 'Treadmill', equipment_type: 'treadmill' },
  { name: 'Ab Wheel', equipment_type: 'ab_wheel' },
  { name: 'Resistance Bands', equipment_type: 'bands' },
]

function Toast({ msg, onDone }) {
  useEffect(() => {
    const t = setTimeout(onDone, 2200)
    return () => clearTimeout(t)
  }, [onDone])
  return <div className="toast">{msg}</div>
}

// ── AI Swap Modal ─────────────────────────────────────────────────────────────
function SwapModal({ equipmentName, swaps, onApply, onDismiss }) {
  const [accepted, setAccepted] = useState(() => new Set(swaps.map((_, i) => i)))
  const [applying, setApplying] = useState(false)

  const toggle = (i) =>
    setAccepted((prev) => {
      const next = new Set(prev)
      next.has(i) ? next.delete(i) : next.add(i)
      return next
    })

  const handleApply = async () => {
    setApplying(true)
    const chosen = swaps.filter((_, i) => accepted.has(i))
    await onApply(chosen)
  }

  return (
    <div className="swap-modal-overlay">
      <div className="swap-modal">
        <div className="swap-modal-header">
          <span className="swap-modal-icon">🤖</span>
          <div>
            <div className="swap-modal-title">AI Workout Update</div>
            <div className="swap-modal-sub">
              Added <b>{equipmentName}</b> — here's how to upgrade your plan
            </div>
          </div>
        </div>

        <div className="swap-list">
          {swaps.map((s, i) => (
            <div
              key={i}
              className={`swap-item ${accepted.has(i) ? 'swap-item-on' : 'swap-item-off'}`}
              onClick={() => toggle(i)}
            >
              <div className="swap-item-check">{accepted.has(i) ? '✓' : '○'}</div>
              <div className="swap-item-body">
                <div className="swap-item-day">{s.day_name}</div>
                <div className="swap-item-change">
                  <span className="swap-remove">✕ {s.remove_exercise}</span>
                  <span className="swap-arrow">→</span>
                  <span className="swap-add">+ {s.add_exercise.name}</span>
                </div>
                <div className="swap-item-reason">{s.reason}</div>
                <div className="swap-item-meta">
                  {s.add_exercise.sets_default} sets
                  {s.add_exercise.reps_min ? ` · ${s.add_exercise.reps_min}–${s.add_exercise.reps_max} reps` : ''}
                  {s.add_exercise.weight_start ? ` · ${s.add_exercise.weight_start}` : ''}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="swap-modal-footer">
          <button className="btn btn-ghost" onClick={onDismiss} disabled={applying}>
            Skip
          </button>
          <button
            className="btn btn-lime"
            onClick={handleApply}
            disabled={applying || accepted.size === 0}
          >
            {applying ? 'Applying…' : `Apply ${accepted.size} swap${accepted.size !== 1 ? 's' : ''}`}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
export default function Equipment() {
  const navigate = useNavigate()
  const [equipment, setEquipment] = useState([])
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState('')

  // Custom add state
  const [name, setName] = useState('')
  const [adding, setAdding] = useState(false)

  // AI suggestion dropdown
  const [suggestions, setSuggestions] = useState([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const inputRef = useRef(null)

  // AI swap modal
  const [swapPending, setSwapPending] = useState(null)   // { equipmentName, equipmentType, swaps }
  const [swapLoading, setSwapLoading] = useState(false)  // 'Analysing your workout…'

  const load = () =>
    api.get('/equipment/').then(setEquipment).finally(() => setLoading(false))

  useEffect(() => { load() }, [])

  // ── Suggestion filtering (instant, client-side) ──
  const handleNameChange = (val) => {
    setName(val)
    if (val.trim().length < 2) {
      setSuggestions([])
      setShowSuggestions(false)
      return
    }
    const q = val.trim().toLowerCase()
    const matches = EQUIPMENT_CATALOGUE.filter(
      (e) =>
        e.name.toLowerCase().includes(q) &&
        !equipment.some((owned) => owned.equipment_type === e.equipment_type)
    ).slice(0, 6)
    setSuggestions(matches)
    setShowSuggestions(matches.length > 0)
  }

  const pickSuggestion = (s) => {
    setName(s.name)
    setSuggestions([])
    setShowSuggestions(false)
    // Auto-submit with the AI-detected type
    addItem(s.name, s.equipment_type)
  }

  // ── Add equipment + trigger AI swap analysis ──
  const addItem = async (n, t) => {
    setAdding(true)
    setSuggestions([])
    try {
      await api.post('/equipment/', { name: n, equipment_type: t })
      setName('')
      await load()
      setToast('Equipment added!')

      // Kick off AI swap analysis in the background
      setSwapLoading(true)
      try {
        const result = await api.post('/ai/workout-swap', { equipment_name: n, equipment_type: t })
        if (result.swaps && result.swaps.length > 0) {
          setSwapPending({ equipmentName: n, equipmentType: t, swaps: result.swaps })
        } else {
          setToast('Equipment added — no workout swaps suggested.')
        }
      } catch (aiErr) {
        const msg = aiErr?.message || ''
        if (msg.includes('503') || msg.includes('timed out') || msg.includes('504')) {
          setToast('Equipment added! AI is busy — open the app later to get workout swap suggestions.')
        } else {
          setToast('Equipment added — AI suggestions unavailable right now.')
        }
      } finally {
        setSwapLoading(false)
      }
    } catch (e) {
      setToast('Error: ' + e.message)
    } finally {
      setAdding(false)
    }
  }

  const remove = async (id) => {
    await api.delete(`/equipment/${id}`)
    setEquipment((prev) => prev.filter((e) => e.id !== id))
    setToast('Removed.')
  }

  const addPreset = (p) => {
    if (equipment.some((e) => e.equipment_type === p.equipment_type)) {
      setToast('Already added!')
      return
    }
    addItem(p.name, p.equipment_type)
  }

  const applySwaps = async (chosen) => {
    try {
      await api.post('/ai/apply-swaps', { swaps: chosen })
      setToast(`✅ ${chosen.length} exercise${chosen.length !== 1 ? 's' : ''} swapped in!`)
      setSwapPending(null)
    } catch (e) {
      setToast('Error applying swaps: ' + e.message)
    }
  }

  if (loading) return <div className="loading-screen" style={{ height: '60vh' }}><div className="loading-spinner" /></div>

  return (
    <div className="fade-in">
      {toast && <Toast msg={toast} onDone={() => setToast('')} />}

      {swapPending && (
        <SwapModal
          equipmentName={swapPending.equipmentName}
          swaps={swapPending.swaps}
          onApply={applySwaps}
          onDismiss={() => setSwapPending(null)}
        />
      )}

      <div className="hero">
        <div className="hero-label">Gym Setup</div>
        <h1 className="hero-title">YOUR<br /><span>EQUIPMENT</span></h1>
        <div className="hero-meta">
          <div className="meta-chip">Items <b>{equipment.length}</b></div>
          <div className="meta-chip" style={{ cursor: 'pointer' }} onClick={() => navigate('/workout')}>
            → View Workout Plan
          </div>
        </div>
      </div>

      {/* Quick add presets */}
      <div style={{ padding: '14px 14px 0' }}>
        <div style={{ fontSize: 9, letterSpacing: 2, textTransform: 'uppercase', color: 'var(--ash)', marginBottom: 8 }}>
          Quick Add
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {PRESET_EQUIPMENT.map((p) => {
            const owned = equipment.some((e) => e.equipment_type === p.equipment_type)
            return (
              <button
                key={p.equipment_type}
                className={`btn ${owned ? 'btn-steel' : 'btn-ghost'}`}
                style={{ fontSize: 10, padding: '6px 10px', gap: 4 }}
                onClick={() => addPreset(p)}
                disabled={owned || adding || swapLoading}
              >
                {TYPE_ICON[p.equipment_type]} {p.name}
                {owned && ' ✓'}
              </button>
            )
          })}
        </div>
      </div>

      {/* Custom add form with AI suggestions */}
      <div style={{ padding: '14px 14px 0' }}>
        <div style={{ fontSize: 9, letterSpacing: 2, textTransform: 'uppercase', color: 'var(--ash)', marginBottom: 8 }}>
          Add Equipment
        </div>
        <div className="eq-search-wrap">
          <div className="input-row">
            <div className="field" style={{ flex: 1, position: 'relative' }}>
              <label>Name</label>
              <input
                ref={inputRef}
                className="input"
                value={name}
                onChange={(e) => handleNameChange(e.target.value)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
                placeholder="e.g. Barbell, Kettlebell…"
                disabled={adding || swapLoading}
              />
            </div>
            <button
              className="btn btn-lime"
              disabled={!name.trim() || adding || swapLoading}
              onClick={() => addItem(name.trim(), 'other')}
              style={{ alignSelf: 'flex-end' }}
            >
              + Add
            </button>
          </div>

          {showSuggestions && suggestions.length > 0 && (
            <div className="eq-suggestions">
              {suggestions.map((s, i) => (
                <div
                  key={i}
                  className="eq-suggestion-item"
                  onMouseDown={() => pickSuggestion(s)}
                >
                  <span className="eq-suggestion-icon">{TYPE_ICON[s.equipment_type] || '📦'}</span>
                  <span className="eq-suggestion-name">{s.name}</span>
                  <span className="eq-suggestion-type">{s.equipment_type.replace(/_/g, ' ')}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {swapLoading && (
          <div className="ai-thinking">
            <div className="ai-thinking-dot" />
            <div className="ai-thinking-dot" />
            <div className="ai-thinking-dot" />
            <span>AI is analysing your workout plan…</span>
          </div>
        )}
      </div>

      {/* Equipment list */}
      <div style={{ padding: '14px 14px 0' }}>
        <div style={{ fontSize: 9, letterSpacing: 2, textTransform: 'uppercase', color: 'var(--ash)', marginBottom: 8 }}>
          Your Gym ({equipment.length} items)
        </div>
        {equipment.length === 0 ? (
          <div className="card" style={{ padding: 24, textAlign: 'center' }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>🔧</div>
            <div style={{ fontSize: 12, color: 'var(--ash)' }}>
              No equipment added yet.<br />Add your gear and AI will update your workout plan.
            </div>
          </div>
        ) : (
          <div className="equipment-grid">
            {equipment.map((e) => (
              <div key={e.id} className="equipment-item">
                <div className="equipment-icon">{TYPE_ICON[e.equipment_type] || '📦'}</div>
                <div>
                  <div className="equipment-name">{e.name}</div>
                  <div className="equipment-type">{e.equipment_type.replace(/_/g, ' ')}</div>
                </div>
                <button className="equipment-del" onClick={() => remove(e.id)}>✕</button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ height: 14 }} />
    </div>
  )
}
