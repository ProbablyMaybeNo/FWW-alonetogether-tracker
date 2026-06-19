import { useState, useEffect, useCallback } from 'react'
import { RotateCcw, Spline } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { MAP_IMAGE_BUCKET } from '../../data/campaignMap'
import { useCampaignMapState } from '../../hooks/useCampaignMapState'
import CampaignMapCanvas from './CampaignMapCanvas'
import MarkerPalette from './MarkerPalette'
import MapImageControls from './MapImageControls'
import MapTable from './MapTable'

export default function CampaignMapPage() {
  const map = useCampaignMapState()
  const [confirmReset, setConfirmReset] = useState(false)
  const [selectedId, setSelectedId] = useState(null)
  const [drawMode, setDrawMode] = useState(false)
  const [drawFromId, setDrawFromId] = useState(null) // first picked icon while drawing

  const cancelDraw = useCallback(() => { setDrawMode(false); setDrawFromId(null) }, [])

  // First icon click sets the source; second click creates the line + exits.
  const pickLineEnd = useCallback((iconId) => {
    setDrawFromId(prev => {
      if (!prev) return iconId
      if (prev !== iconId) map.addLine(prev, iconId)
      setDrawMode(false)
      return null
    })
  }, [map])

  // Esc cancels draw mode while active.
  useEffect(() => {
    if (!drawMode) return
    const onKey = e => { if (e.key === 'Escape') cancelDraw() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [drawMode, cancelDraw])

  function handleReset() {
    if (!confirmReset) {
      setConfirmReset(true)
      setTimeout(() => setConfirmReset(false), 2500)
      return
    }
    // Best-effort: don't orphan the uploaded background in Storage (like MapImageControls remove).
    const path = map.background?.path
    if (path && supabase) {
      supabase.storage.from(MAP_IMAGE_BUCKET).remove([path]).catch(() => {})
    }
    cancelDraw()
    setSelectedId(null)
    map.resetMap()
    setConfirmReset(false)
  }

  return (
    <div className="p-4 max-w-7xl mx-auto space-y-4">
      {/* Header */}
      <div
        className="bg-panel-light border border-amber/40 rounded-lg px-4 py-3"
        style={{ boxShadow: '0 0 12px var(--color-amber-glow)' }}
      >
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-title text-lg font-bold tracking-widest">CAMPAIGN MAP</span>
          <div className="ml-auto flex items-center gap-2 flex-wrap">
            {!map.canEdit && (
              <span className="text-muted/70 text-[10px] tracking-widest">VIEW ONLY — creator edits the map</span>
            )}
            {map.canEdit && (
              <button
                onClick={handleReset}
                className={`inline-flex items-center gap-1.5 text-[10px] tracking-widest px-3 py-1.5 border rounded transition-colors ${
                  confirmReset
                    ? 'border-danger text-danger bg-danger/10'
                    : 'border-muted/40 text-muted hover:border-pip hover:text-pip'
                }`}
                title="Clear the map back to blank"
              >
                <RotateCcw size={12} />
                {confirmReset ? 'CONFIRM RESET' : 'RESET MAP'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main grid: canvas + (editor-only) icon palette */}
      <div className={`grid grid-cols-1 gap-4 ${map.canEdit ? 'lg:grid-cols-[1fr,260px]' : ''}`}>
        <div className="relative">
          <CampaignMapCanvas
            markers={map.markers}
            lines={map.lines}
            background={map.background}
            selectedId={selectedId}
            onSelect={setSelectedId}
            canEdit={map.canEdit}
            onDropMarker={map.addMarker}
            onMoveMarker={map.moveMarker}
            onRemoveMarker={map.removeMarker}
            drawMode={drawMode}
            drawFromId={drawFromId}
            onPickLineEnd={pickLineEnd}
            onCancelDraw={cancelDraw}
            onRemoveLine={map.removeLine}
          />
          {map.canEdit && drawMode && (
            <p className="text-pip text-[10px] tracking-widest mt-2 px-1"
              style={{ textShadow: '0 0 6px var(--color-pip-glow)' }}>
              {drawFromId ? 'Click a SECOND icon to connect · ' : 'Click the FIRST icon · '}
              Esc or click empty map to cancel
            </p>
          )}
          {map.canEdit && !drawMode && (
            <p className="text-muted/60 text-[10px] tracking-wider mt-2 px-1">
              Drag icons from the palette onto the map · Drag a placed icon to move it · Right-click an icon to remove it · Right-click a line to remove it
            </p>
          )}
        </div>

        {map.canEdit && (
          <aside className="space-y-3">
            <MapImageControls
              background={map.background}
              campaignId={map.campaignId}
              setBackground={map.setBackground}
              clearBackground={map.clearBackground}
            />
            <MarkerPalette />
            <div className="border border-pip-mid/40 rounded bg-panel">
              <div className="px-3 py-2 border-b border-pip-mid/30">
                <h3 className="text-amber text-xs tracking-widest font-bold">ROUTES</h3>
                <p className="text-muted/60 text-[10px] tracking-wider mt-0.5">Connect two icons with a line</p>
              </div>
              <div className="p-2">
                <button
                  onClick={() => (drawMode ? cancelDraw() : setDrawMode(true))}
                  disabled={map.markers.length < 2}
                  className={`w-full inline-flex items-center justify-center gap-1.5 text-[10px] tracking-widest px-3 py-2 border rounded transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                    drawMode
                      ? 'border-pip text-pip bg-pip-dim/20'
                      : 'border-pip-dim/50 text-pip hover:border-pip hover:bg-pip-dim/20'
                  }`}
                  title={map.markers.length < 2 ? 'Place at least two icons first' : 'Draw a route line between two icons'}
                >
                  <Spline size={12} />
                  {drawMode ? 'CANCEL DRAW' : 'DRAW LINE'}
                </button>
              </div>
            </div>
          </aside>
        )}
      </div>

      {/* Auto-populating detail table — the edit surface for every icon + route */}
      <MapTable
        markers={map.markers}
        lines={map.lines}
        table={map.table}
        canEdit={map.canEdit}
        selectedId={selectedId}
        onSelect={setSelectedId}
        setMarkerColor={map.setMarkerColor}
        setMarkerLabel={map.setMarkerLabel}
        setTableField={map.setTableField}
        onRemoveMarker={map.removeMarker}
        onRemoveLine={map.removeLine}
      />
    </div>
  )
}
