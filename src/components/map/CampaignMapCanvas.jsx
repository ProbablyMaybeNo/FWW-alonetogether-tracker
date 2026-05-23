import { useRef, useState, useCallback, useMemo } from 'react'
import { MAP_VIEWBOX, MARKER_KINDS } from '../../data/campaignMap'
import FogOfWarLayer from './FogOfWarLayer'
import TerritoryNode from './TerritoryNode'
import TradeRouteLine from './TradeRouteLine'

// Coordinate helpers — translate browser pointer events into the SVG's user coordinate space.
function clientToSvg(svg, clientX, clientY) {
  const pt = svg.createSVGPoint()
  pt.x = clientX
  pt.y = clientY
  const ctm = svg.getScreenCTM()
  if (!ctm) return null
  const inv = ctm.inverse()
  return pt.matrixTransform(inv)
}

const MARKER_INDEX = Object.fromEntries(MARKER_KINDS.map(m => [m.kind, m]))

export default function CampaignMapCanvas({
  territories,
  routes,
  markers,
  showHidden,
  selectedTerritoryId,
  onSelectTerritory,
  onSelectRoute,
  onHoverTerritory,
  onHoverRoute,
  onLeaveHover,
  onDropMarker,
  onMoveMarker,
  onRemoveMarker,
}) {
  const svgRef = useRef(null)
  const [dragMarker, setDragMarker] = useState(null) // { id, offsetX, offsetY }

  const territoryById = useMemo(() => {
    const map = {}
    for (const t of territories) map[t.id] = t
    return map
  }, [territories])

  const handleDragOver = useCallback((e) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'copy'
  }, [])

  const handleDrop = useCallback((e) => {
    e.preventDefault()
    const data = e.dataTransfer.getData('text/plain')
    if (!data?.startsWith('marker:')) return
    const kind = data.slice('marker:'.length)
    const svg = svgRef.current
    if (!svg) return
    const pt = clientToSvg(svg, e.clientX, e.clientY)
    if (!pt) return
    onDropMarker?.(kind, pt.x, pt.y)
  }, [onDropMarker])

  // Move marker via pointer events (smoother than HTML5 drag for in-canvas moves).
  const handlePointerMove = useCallback((e) => {
    if (!dragMarker) return
    const svg = svgRef.current
    if (!svg) return
    const pt = clientToSvg(svg, e.clientX, e.clientY)
    if (!pt) return
    onMoveMarker?.(dragMarker.id, pt.x, pt.y)
  }, [dragMarker, onMoveMarker])

  const handlePointerUp = useCallback(() => {
    if (dragMarker) setDragMarker(null)
  }, [dragMarker])

  return (
    <div
      className="border border-pip-mid/50 rounded-lg overflow-hidden bg-terminal"
      style={{ boxShadow: '0 0 24px var(--color-pip-glow), inset 0 0 32px rgba(0,0,0,0.5)' }}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <svg
        ref={svgRef}
        viewBox={`0 0 ${MAP_VIEWBOX.w} ${MAP_VIEWBOX.h}`}
        preserveAspectRatio="xMidYMid meet"
        className="w-full h-auto block"
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        style={{ touchAction: 'none' }}
      >
        {/* Base + fog of war */}
        <FogOfWarLayer />

        {/* Routes (under nodes) */}
        <g>
          {routes.map(r => {
            const from = territoryById[r.from]
            const to = territoryById[r.to]
            const fromHidden = !from || (from.state === 'hidden' && !showHidden)
            const toHidden   = !to   || (to.state === 'hidden' && !showHidden)
            const lineHidden = (r.state === 'hidden' && !showHidden) || fromHidden || toHidden
            return (
              <TradeRouteLine
                key={r.id}
                route={r}
                from={from}
                to={to}
                hidden={lineHidden}
                onClick={onSelectRoute}
                onHover={onHoverRoute}
                onLeave={onLeaveHover}
              />
            )
          })}
        </g>

        {/* Territories */}
        <g>
          {territories.map(t => {
            const hidden = t.state === 'hidden' && !showHidden
            return (
              <TerritoryNode
                key={t.id}
                territory={t}
                hidden={hidden}
                selected={selectedTerritoryId === t.id}
                onClick={onSelectTerritory}
                onHover={onHoverTerritory}
                onLeave={onLeaveHover}
              />
            )
          })}
        </g>

        {/* Markers (top-most layer) */}
        <g>
          {markers.map(m => {
            const info = MARKER_INDEX[m.kind]
            if (!info) return null
            const isDragging = dragMarker?.id === m.id
            return (
              <g
                key={m.id}
                transform={`translate(${m.x} ${m.y})`}
                style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
                onPointerDown={(e) => {
                  e.stopPropagation()
                  e.currentTarget.setPointerCapture?.(e.pointerId)
                  setDragMarker({ id: m.id })
                }}
                onContextMenu={(e) => {
                  e.preventDefault()
                  onRemoveMarker?.(m.id)
                }}
              >
                <circle r={2.2} fill="rgba(8,12,8,0.85)" stroke={info.color} strokeWidth={0.3}
                  style={{ filter: `drop-shadow(0 0 3px ${info.color})` }}
                />
                <text x={0} y={0.4}
                  fontSize="2.6"
                  fill={info.color}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  pointerEvents="none"
                  style={{
                    fontFamily: "'Share Tech Mono', monospace",
                    fontWeight: 'bold',
                    textShadow: `0 0 3px ${info.color}`,
                  }}
                >
                  {info.glyph}
                </text>
              </g>
            )
          })}
        </g>
      </svg>
    </div>
  )
}
