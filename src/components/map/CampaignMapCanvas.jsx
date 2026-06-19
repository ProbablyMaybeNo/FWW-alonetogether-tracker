import { useRef, useState, useCallback } from 'react'
import { MAP_VIEWBOX, MARKER_KINDS } from '../../data/campaignMap'

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
  markers,
  lines,
  background,
  selectedId,
  onSelect,
  canEdit = true,
  onDropMarker,
  onMoveMarker,
  onRemoveMarker,
  drawMode = false,
  drawFromId = null,
  onPickLineEnd,
  onCancelDraw,
  onRemoveLine,
  adjustImage = false,
  onPanBackground,
}) {
  const svgRef = useRef(null)
  const [dragMarker, setDragMarker] = useState(null) // { id }
  const [panLast, setPanLast] = useState(null)        // { x, y } in viewBox units

  const markerById = Object.fromEntries((markers ?? []).map(m => [m.id, m]))

  const handleDragOver = useCallback((e) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'copy'
  }, [])

  const handleDrop = useCallback((e) => {
    e.preventDefault()
    if (!canEdit) return
    const data = e.dataTransfer.getData('text/plain')
    if (!data?.startsWith('marker:')) return
    const kind = data.slice('marker:'.length)
    const svg = svgRef.current
    if (!svg) return
    const pt = clientToSvg(svg, e.clientX, e.clientY)
    if (!pt) return
    onDropMarker?.(kind, pt.x, pt.y)
  }, [canEdit, onDropMarker])

  // Begin panning the background image (adjust mode).
  const handlePointerDown = useCallback((e) => {
    if (adjustImage) {
      const svg = svgRef.current
      if (!svg) return
      const pt = clientToSvg(svg, e.clientX, e.clientY)
      if (!pt) return
      svg.setPointerCapture?.(e.pointerId)
      setPanLast({ x: pt.x, y: pt.y })
      return
    }
    drawMode ? onCancelDraw?.() : onSelect?.(null)
  }, [adjustImage, drawMode, onCancelDraw, onSelect])

  // Move marker (or pan the image while adjusting) via pointer events.
  const handlePointerMove = useCallback((e) => {
    const svg = svgRef.current
    if (!svg) return
    if (panLast) {
      const pt = clientToSvg(svg, e.clientX, e.clientY)
      if (!pt) return
      onPanBackground?.(pt.x - panLast.x, pt.y - panLast.y)
      setPanLast({ x: pt.x, y: pt.y })
      return
    }
    if (!dragMarker) return
    const pt = clientToSvg(svg, e.clientX, e.clientY)
    if (!pt) return
    onMoveMarker?.(dragMarker.id, pt.x, pt.y)
  }, [panLast, dragMarker, onMoveMarker, onPanBackground])

  const handlePointerUp = useCallback(() => {
    if (dragMarker) setDragMarker(null)
    if (panLast) setPanLast(null)
  }, [dragMarker, panLast])

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
        onPointerDown={handlePointerDown}
        style={{ touchAction: 'none', cursor: adjustImage ? (panLast ? 'grabbing' : 'move') : (drawMode ? 'crosshair' : undefined) }}
      >
        {/* Uploaded background map image (P2) — scale/x/y let the editor reposition
            and resize it (P-image-transform). meet keeps the image's aspect ratio. */}
        {background?.url && (
          <image
            href={background.url}
            x={background.x ?? 0}
            y={background.y ?? 0}
            width={MAP_VIEWBOX.w * (background.scale ?? 1)}
            height={MAP_VIEWBOX.h * (background.scale ?? 1)}
            preserveAspectRatio="xMidYMid meet"
            pointerEvents="none"
          />
        )}

        {/* Route lines — rendered UNDER the icons; endpoints anchored to the
            icons' live x/y so lines follow icons when moved (the "snap"). */}
        <g>
          {(lines ?? []).map(l => {
            const a = markerById[l.fromId]
            const b = markerById[l.toId]
            if (!a || !b) return null // guard: an endpoint icon was removed
            const color = l.color ?? '#3aa0ff'
            const isSelected = selectedId === l.id
            return (
              <g key={l.id}>
                {/* Wide invisible hit area so right-click/select is easy to land */}
                <line
                  x1={a.x} y1={a.y} x2={b.x} y2={b.y}
                  stroke="transparent" strokeWidth={3}
                  style={{ cursor: 'pointer' }}
                  pointerEvents={adjustImage ? 'none' : undefined}
                  onPointerDown={(e) => { e.stopPropagation(); if (!drawMode) onSelect?.(l.id) }}
                  onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); if (canEdit) onRemoveLine?.(l.id) }}
                />
                <line
                  x1={a.x} y1={a.y} x2={b.x} y2={b.y}
                  stroke={color}
                  strokeWidth={isSelected ? 0.8 : 0.5}
                  strokeLinecap="round"
                  pointerEvents="none"
                  style={{ filter: `drop-shadow(0 0 ${isSelected ? 3 : 1.5}px ${color})` }}
                />
              </g>
            )
          })}
        </g>

        {/* Placed icons (markers) */}
        <g>
          {markers.map(m => {
            const info = MARKER_INDEX[m.kind]
            if (!info) return null
            const color = m.color ?? info.color
            const isDragging = dragMarker?.id === m.id
            const isSelected = selectedId === m.id
            const isDrawSource = drawMode && drawFromId === m.id
            return (
              <g
                key={m.id}
                transform={`translate(${m.x} ${m.y})`}
                pointerEvents={adjustImage ? 'none' : undefined}
                style={{ cursor: !canEdit ? 'pointer' : (drawMode ? 'crosshair' : (isDragging ? 'grabbing' : 'grab')) }}
                onPointerDown={(e) => {
                  e.stopPropagation()
                  if (!canEdit) { onSelect?.(m.id); return } // view-only: highlight only
                  if (drawMode) {
                    onPickLineEnd?.(m.id)
                    return
                  }
                  e.currentTarget.setPointerCapture?.(e.pointerId)
                  onSelect?.(m.id)
                  setDragMarker({ id: m.id })
                }}
                onContextMenu={(e) => {
                  e.preventDefault()
                  if (canEdit && !drawMode) onRemoveMarker?.(m.id)
                }}
              >
                {isDrawSource && (
                  <circle r={3.2} fill="none" stroke="var(--color-pip)" strokeWidth={0.5}
                    strokeDasharray="1 0.8"
                    style={{ filter: 'drop-shadow(0 0 4px var(--color-pip))' }}
                  />
                )}
                {isSelected && (
                  <circle r={3.2} fill="none" stroke="var(--color-amber)" strokeWidth={0.4}
                    style={{ filter: 'drop-shadow(0 0 4px var(--color-amber))' }}
                  />
                )}
                <circle r={2.2} fill="rgba(8,12,8,0.85)" stroke={color} strokeWidth={0.3}
                  style={{ filter: `drop-shadow(0 0 3px ${color})` }}
                />
                <text x={0} y={0.4}
                  fontSize="2.6"
                  fill={color}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  pointerEvents="none"
                  style={{
                    fontFamily: "'Share Tech Mono', monospace",
                    fontWeight: 'bold',
                    textShadow: `0 0 3px ${color}`,
                  }}
                >
                  {info.glyph}
                </text>
                {m.label && (
                  <text x={0} y={4.2}
                    fontSize="2"
                    fill={color}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    pointerEvents="none"
                    style={{ fontFamily: "'Share Tech Mono', monospace", textShadow: '0 0 2px rgba(0,0,0,0.9)' }}
                  >
                    {m.label}
                  </text>
                )}
              </g>
            )
          })}
        </g>
      </svg>
    </div>
  )
}
