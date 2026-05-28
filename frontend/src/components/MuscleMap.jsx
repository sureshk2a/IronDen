/**
 * Human anatomy SVG diagram.
 * Highlights muscle groups (front + back views) that are in the `muscles` prop.
 * Accepted group names: chest | shoulders | biceps | triceps | back | core | legs
 */
export default function MuscleMap({ muscles = [] }) {
  const active = new Set(muscles)
  const on = (g) => active.has(g)

  const fill    = (g) => (on(g) ? '#b8ff2e' : '#242424')
  const stroke  = (g) => (on(g) ? '#d4ff88' : '#333333')
  const opacity = (g) => (on(g) ? 0.92 : 0.55)
  const filter  = (g) => (on(g) ? 'url(#lime-glow)' : undefined)
  const cls     = (g) => (on(g) ? 'ma' : undefined)

  // Shorthand for repeated ellipses
  const E = ({ g, cx, cy, rx, ry }) => (
    <ellipse
      cx={cx} cy={cy} rx={rx} ry={ry}
      fill={fill(g)} stroke={stroke(g)} strokeWidth="0.5"
      opacity={opacity(g)} filter={filter(g)} className={cls(g)}
    />
  )

  const MUSCLE_LABELS = {
    chest: 'Chest',
    shoulders: 'Shoulders',
    biceps: 'Biceps',
    triceps: 'Triceps',
    back: 'Back',
    core: 'Core',
    legs: 'Legs',
  }

  return (
    <div style={{ width: '100%' }}>
      <style>{`
        .ma { animation: maPulse 2.2s ease-in-out infinite; }
        @keyframes maPulse { 0%,100%{opacity:.88} 50%{opacity:1} }
      `}</style>

      {/* ── SVG diagram ─────────────────────────────────── */}
      <svg
        viewBox="0 0 260 292"
        width="100%"
        style={{ display: 'block', maxHeight: 320 }}
        aria-label="Muscle activation diagram"
      >
        <defs>
          <filter id="lime-glow" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="2.8" result="blur" />
            <feColorMatrix
              in="blur" type="matrix"
              values="0 0 0 0 0.72  0 0 0 0 1  0 0 0 0 0.18  0 0 0 0.75 0"
              result="coloredBlur"
            />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* ════════════════  FRONT FIGURE  ════════════════ */}

        {/* Silhouette */}
        <g fill="#141414" stroke="#1e1e1e" strokeWidth="0.8">
          <circle cx="65" cy="22" r="16" />
          <rect x="59" y="36" width="12" height="11" rx="3" />
          <rect x="44" y="47" width="42" height="98" rx="8" />
          <rect x="25" y="55" width="18" height="55" rx="9" />
          <rect x="87" y="55" width="18" height="55" rx="9" />
          <rect x="18" y="106" width="14" height="42" rx="7" />
          <rect x="98" y="106" width="14" height="42" rx="7" />
          <rect x="41" y="145" width="22" height="128" rx="10" />
          <rect x="67" y="145" width="22" height="128" rx="10" />
        </g>

        {/* SHOULDERS — front delts */}
        <E g="shoulders" cx="36"  cy="60" rx="13" ry="9" />
        <E g="shoulders" cx="94"  cy="60" rx="13" ry="9" />

        {/* CHEST — pectorals */}
        <E g="chest" cx="52" cy="76" rx="14" ry="11" />
        <E g="chest" cx="78" cy="76" rx="14" ry="11" />

        {/* BICEPS */}
        <E g="biceps" cx="28"  cy="86" rx="8" ry="14" />
        <E g="biceps" cx="102" cy="86" rx="8" ry="14" />

        {/* CORE — abs (3 bands) */}
        <E g="core" cx="65" cy="99"  rx="13" ry="7" />
        <E g="core" cx="65" cy="113" rx="12" ry="7" />
        <E g="core" cx="65" cy="127" rx="11" ry="6" />
        {/* CORE — obliques */}
        <E g="core" cx="46" cy="113" rx="7" ry="14" />
        <E g="core" cx="84" cy="113" rx="7" ry="14" />

        {/* LEGS — quads */}
        <E g="legs" cx="51" cy="183" rx="16" ry="24" />
        <E g="legs" cx="79" cy="183" rx="16" ry="24" />
        {/* LEGS — shins */}
        <E g="legs" cx="49" cy="246" rx="10" ry="17" />
        <E g="legs" cx="81" cy="246" rx="10" ry="17" />

        <text x="65" y="285" textAnchor="middle" fill="#444" fontSize="8"
          letterSpacing="2" fontFamily="'DM Sans',sans-serif">FRONT</text>

        {/* ── Divider ───────────────────────────────────── */}
        <line x1="130" y1="16" x2="130" y2="278" stroke="#1e1e1e" strokeWidth="1" />

        {/* ════════════════  BACK FIGURE  ═════════════════ */}

        {/* Silhouette */}
        <g fill="#141414" stroke="#1e1e1e" strokeWidth="0.8">
          <circle cx="195" cy="22" r="16" />
          <rect x="189" y="36" width="12" height="11" rx="3" />
          <rect x="174" y="47" width="42" height="98" rx="8" />
          <rect x="155" y="55" width="18" height="55" rx="9" />
          <rect x="217" y="55" width="18" height="55" rx="9" />
          <rect x="148" y="106" width="14" height="42" rx="7" />
          <rect x="228" y="106" width="14" height="42" rx="7" />
          <rect x="171" y="145" width="22" height="128" rx="10" />
          <rect x="197" y="145" width="22" height="128" rx="10" />
        </g>

        {/* SHOULDERS — rear delts */}
        <E g="shoulders" cx="166" cy="60" rx="13" ry="9" />
        <E g="shoulders" cx="224" cy="60" rx="13" ry="9" />

        {/* BACK — lats (upper back) */}
        <E g="back" cx="178" cy="95" rx="11" ry="36" />
        <E g="back" cx="212" cy="95" rx="11" ry="36" />
        {/* BACK — lower back / erectors */}
        <E g="back" cx="195" cy="132" rx="18" ry="12" />

        {/* TRICEPS */}
        <E g="triceps" cx="158" cy="87" rx="8" ry="14" />
        <E g="triceps" cx="232" cy="87" rx="8" ry="14" />

        {/* LEGS — glutes */}
        <E g="legs" cx="181" cy="158" rx="17" ry="14" />
        <E g="legs" cx="209" cy="158" rx="17" ry="14" />
        {/* LEGS — hamstrings */}
        <E g="legs" cx="179" cy="198" rx="14" ry="22" />
        <E g="legs" cx="211" cy="198" rx="14" ry="22" />
        {/* LEGS — calves */}
        <E g="legs" cx="177" cy="248" rx="10" ry="17" />
        <E g="legs" cx="213" cy="248" rx="10" ry="17" />

        <text x="195" y="285" textAnchor="middle" fill="#444" fontSize="8"
          letterSpacing="2" fontFamily="'DM Sans',sans-serif">BACK</text>
      </svg>

      {/* ── Muscle legend ────────────────────────────────── */}
      {muscles.length > 0 ? (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
          {muscles.map((m) => (
            <span key={m} style={{
              background: 'rgba(184,255,46,0.1)',
              border: '1px solid var(--lime)',
              color: 'var(--lime)',
              fontSize: 9,
              letterSpacing: 1.5,
              textTransform: 'uppercase',
              padding: '3px 8px',
              borderRadius: 2,
              fontWeight: 600,
            }}>
              {MUSCLE_LABELS[m] ?? m}
            </span>
          ))}
        </div>
      ) : (
        <p style={{ textAlign: 'center', color: 'var(--ash)', fontSize: 11, marginTop: 8 }}>
          Complete a workout to see muscle activation
        </p>
      )}
    </div>
  )
}
