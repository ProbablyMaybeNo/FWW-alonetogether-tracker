import { TERRITORY_TYPES } from '../../data/campaignMap'

// Visual style per territory state. Tuned for Pip-Boy / recon terminal aesthetic.
const STATE_STYLE = {
  hidden:     { ring: '#1a261a', fill: '#0c120c', text: '#1a261a', glow: 0,  opacity: 0.6,  showLabel: false },
  rumored:    { ring: '#4db87a', fill: '#0c120c', text: '#4db87a', glow: 1,  opacity: 0.85, showLabel: true,  dashed: true },
  revealed:   { ring: '#4db87a', fill: '#101810', text: '#00e676', glow: 2,  opacity: 1.0,  showLabel: true },
  explored:   { ring: '#00e676', fill: '#101810', text: '#00e676', glow: 4,  opacity: 1.0,  showLabel: true },
  controlled: { ring: '#ffd700', fill: '#1a1408', text: '#ffd700', glow: 6,  opacity: 1.0,  showLabel: true },
  contested:  { ring: '#ff9100', fill: '#1a1408', text: '#ff9100', glow: 4,  opacity: 1.0,  showLabel: true },
  ruined:     { ring: '#5a4a30', fill: '#0c120c', text: '#5a4a30', glow: 0,  opacity: 0.8,  showLabel: true },
  threatened: { ring: '#ff3c3c', fill: '#1a0808', text: '#ff3c3c', glow: 5,  opacity: 1.0,  showLabel: true },
}

export default function TerritoryNode({ territory, onClick, onHover, onLeave, hidden, selected }) {
  const display = hidden ? 'hidden' : territory.state
  const style = STATE_STYLE[display] ?? STATE_STYLE.hidden
  const typeInfo = TERRITORY_TYPES[territory.type] ?? { label: territory.type, glyph: '◯' }
  const glyph = display === 'hidden' ? '?' : typeInfo.glyph
  const radius = 3.0
  const labelGap = radius + 2.2

  return (
    <g
      transform={`translate(${territory.x} ${territory.y})`}
      style={{ cursor: hidden ? 'default' : 'pointer' }}
      onClick={hidden ? undefined : (e) => { e.stopPropagation(); onClick?.(territory) }}
      onMouseEnter={() => onHover?.(territory)}
      onMouseLeave={() => onLeave?.(territory)}
    >
      {/* Outer glow ring for high-priority states */}
      {style.glow > 0 && (
        <circle r={radius + 0.8} fill="none" stroke={style.ring} strokeWidth={0.2}
          opacity={0.5}
          style={{ filter: `drop-shadow(0 0 ${style.glow}px ${style.ring})` }}
        />
      )}
      {/* Selection ring */}
      {selected && (
        <circle r={radius + 1.6} fill="none" stroke="#ffd700" strokeWidth={0.25}
          strokeDasharray="0.6 0.6" opacity={0.9}
          style={{ filter: 'drop-shadow(0 0 4px #ffd700)' }}
        />
      )}
      {/* Body */}
      <circle r={radius}
        fill={style.fill}
        stroke={style.ring}
        strokeWidth={0.4}
        strokeDasharray={style.dashed ? '0.8 0.6' : undefined}
        opacity={style.opacity}
      />
      {/* Glyph */}
      <text
        x={0} y={0.4}
        fontSize="3.2"
        fill={style.text}
        textAnchor="middle"
        dominantBaseline="middle"
        pointerEvents="none"
        style={{
          fontFamily: "'Share Tech Mono', monospace",
          textShadow: style.glow > 0 ? `0 0 ${style.glow}px ${style.text}` : undefined,
          fontWeight: 'bold',
        }}
      >
        {glyph}
      </text>
      {/* Label */}
      {style.showLabel && (
        <g pointerEvents="none">
          <text
            x={0} y={labelGap + 1.4}
            fontSize="1.6"
            fill={style.text}
            textAnchor="middle"
            style={{
              fontFamily: "'Share Tech Mono', monospace",
              letterSpacing: '0.05em',
              filter: style.glow > 0 ? `drop-shadow(0 0 1px ${style.text})` : undefined,
            }}
          >
            {territory.name.length > 22 ? territory.name.slice(0, 20) + '…' : territory.name}
          </text>
          {/* threat indicator pip ring */}
          {(territory.threatLevel ?? 0) > 0 && (
            <g transform={`translate(${radius * 0.7} ${-radius * 0.7})`}>
              <circle r={0.9} fill="#ff3c3c" opacity={0.9}
                style={{ filter: 'drop-shadow(0 0 1.5px #ff3c3c)' }} />
              <text x={0} y={0.25} fontSize="1.1" fill="#080c08" textAnchor="middle" dominantBaseline="middle"
                style={{ fontFamily: "'Share Tech Mono', monospace", fontWeight: 'bold' }}>
                {territory.threatLevel}
              </text>
            </g>
          )}
          {/* owner pip (top-left) */}
          {territory.owner && (
            <g transform={`translate(${-radius * 0.7} ${-radius * 0.7})`}>
              <circle r={0.9} fill="#00e676" opacity={0.9}
                style={{ filter: 'drop-shadow(0 0 1.5px #00e676)' }} />
              <text x={0} y={0.25} fontSize="1.1" fill="#080c08" textAnchor="middle" dominantBaseline="middle"
                style={{ fontFamily: "'Share Tech Mono', monospace", fontWeight: 'bold' }}>
                {String(territory.owner).slice(0, 1).toUpperCase()}
              </text>
            </g>
          )}
        </g>
      )}
    </g>
  )
}
