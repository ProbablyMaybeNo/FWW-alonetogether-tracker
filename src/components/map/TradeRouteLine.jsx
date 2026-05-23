import { ROUTE_STATES } from '../../data/campaignMap'

const STYLE_BY_STATE = {
  hidden:     { stroke: '#1a261a', dash: '2 4', width: 0.4, opacity: 0.35, glow: 0 },
  revealed:   { stroke: '#4db87a', dash: '4 3', width: 0.6, opacity: 0.85, glow: 0 },
  open:       { stroke: '#00e676', dash: '0',   width: 0.7, opacity: 0.95, glow: 2 },
  controlled: { stroke: '#ffd700', dash: '0',   width: 0.9, opacity: 1.0,  glow: 3 },
  contested:  { stroke: '#ff9100', dash: '3 2', width: 0.8, opacity: 1.0,  glow: 3 },
  blocked:    { stroke: '#ff3c3c', dash: '1 1', width: 0.7, opacity: 0.9,  glow: 2 },
  threatened: { stroke: '#ff3c3c', dash: '4 2', width: 0.7, opacity: 0.95, glow: 2 },
}

export default function TradeRouteLine({ route, from, to, onClick, onHover, onLeave, hidden }) {
  if (!from || !to) return null
  const display = hidden ? 'hidden' : route.state
  const style = STYLE_BY_STATE[display] ?? STYLE_BY_STATE.hidden

  // Compute a short midpoint label position (income/owner indicator on controlled routes only)
  const mx = (from.x + to.x) / 2
  const my = (from.y + to.y) / 2

  return (
    <g
      style={{ cursor: hidden ? 'default' : 'pointer' }}
      onClick={hidden ? undefined : (e) => { e.stopPropagation(); onClick?.(route) }}
      onMouseEnter={hidden ? undefined : () => onHover?.(route)}
      onMouseLeave={hidden ? undefined : () => onLeave?.(route)}
    >
      {/* hit area — wide invisible stroke for easier clicking */}
      {!hidden && (
        <line
          x1={from.x} y1={from.y} x2={to.x} y2={to.y}
          stroke="transparent" strokeWidth={2.4}
        />
      )}
      <line
        x1={from.x} y1={from.y}
        x2={to.x}  y2={to.y}
        stroke={style.stroke}
        strokeWidth={style.width}
        strokeDasharray={style.dash}
        opacity={style.opacity}
        style={style.glow ? { filter: `drop-shadow(0 0 ${style.glow}px ${style.stroke})` } : undefined}
      />
      {route.state === 'controlled' && !hidden && route.incomeCaps > 0 && (
        <g transform={`translate(${mx} ${my})`} pointerEvents="none">
          <rect x={-3.2} y={-1.6} width={6.4} height={2.4} rx={0.4}
            fill="#080c08" stroke="#ffd700" strokeWidth={0.15} opacity={0.95} />
          <text x={0} y={0.2}
            fontSize="1.5" fill="#ffd700" textAnchor="middle" dominantBaseline="middle"
            style={{ fontFamily: "'Share Tech Mono', monospace", letterSpacing: '0.1em' }}>
            +{route.incomeCaps}c
          </text>
        </g>
      )}
      {route.state === 'blocked' && !hidden && (
        <text x={mx} y={my} fontSize="3" fill="#ff3c3c" textAnchor="middle" dominantBaseline="middle"
          pointerEvents="none" style={{ filter: 'drop-shadow(0 0 2px #ff3c3c)' }}>⊘</text>
      )}
    </g>
  )
}

export { ROUTE_STATES }
