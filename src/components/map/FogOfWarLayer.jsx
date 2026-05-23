import { MAP_VIEWBOX, PRESSURE_REGIONS, FACTIONS } from '../../data/campaignMap'

// Renders the base terrain tint, the soft faction pressure overlays, and a grid pattern
// behind everything. Hidden territories are rendered by TerritoryNode itself — we don't
// punch holes through this layer, we just paint atmosphere underneath.
export default function FogOfWarLayer() {
  const { w, h } = MAP_VIEWBOX
  return (
    <g pointerEvents="none">
      {/* Base terminal background */}
      <rect x={0} y={0} width={w} height={h} fill="#080c08" />

      {/* CRT-style grid */}
      <defs>
        <pattern id="map-grid" width="8" height="8" patternUnits="userSpaceOnUse">
          <path d="M 8 0 L 0 0 0 8" fill="none" stroke="#1a261a" strokeWidth="0.15" opacity="0.6" />
        </pattern>
        <pattern id="map-grid-fine" width="2" height="2" patternUnits="userSpaceOnUse">
          <path d="M 2 0 L 0 0 0 2" fill="none" stroke="#102010" strokeWidth="0.08" opacity="0.5" />
        </pattern>
        <radialGradient id="map-vignette" cx="50%" cy="50%" r="70%">
          <stop offset="60%" stopColor="#000" stopOpacity="0" />
          <stop offset="100%" stopColor="#000" stopOpacity="0.8" />
        </radialGradient>
      </defs>
      <rect x={0} y={0} width={w} height={h} fill="url(#map-grid-fine)" />
      <rect x={0} y={0} width={w} height={h} fill="url(#map-grid)" />

      {/* Faction pressure polygons — very soft tint */}
      {PRESSURE_REGIONS.map(region => {
        const fac = FACTIONS[region.faction]
        if (!fac) return null
        const pts = region.polygon.map(([x, y]) => `${x},${y}`).join(' ')
        return (
          <g key={region.id}>
            <polygon points={pts} fill={fac.color} opacity={0.07} />
            <polygon points={pts} fill="none" stroke={fac.color} strokeWidth={0.2}
              strokeDasharray="1.6 1.6" opacity={0.35} />
          </g>
        )
      })}

      {/* Pressure region labels */}
      {PRESSURE_REGIONS.map(region => {
        const fac = FACTIONS[region.faction]
        if (!fac) return null
        const xs = region.polygon.map(p => p[0])
        const ys = region.polygon.map(p => p[1])
        const cx = (Math.min(...xs) + Math.max(...xs)) / 2
        const cy = Math.min(...ys) + 3
        return (
          <text key={region.id + '-l'} x={cx} y={cy}
            fontSize="1.6" fill={fac.color} textAnchor="middle"
            opacity={0.45}
            style={{ fontFamily: "'Share Tech Mono', monospace", letterSpacing: '0.2em' }}>
            {region.label}
          </text>
        )
      })}

      {/* Vignette */}
      <rect x={0} y={0} width={w} height={h} fill="url(#map-vignette)" />
    </g>
  )
}
