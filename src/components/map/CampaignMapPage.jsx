import { useState } from 'react'
import { RotateCcw } from 'lucide-react'
import { useCampaignMapState } from '../../hooks/useCampaignMapState'
import CampaignMapCanvas from './CampaignMapCanvas'
import MarkerPalette from './MarkerPalette'
import MapImageControls from './MapImageControls'
import MapTable from './MapTable'

export default function CampaignMapPage() {
  const map = useCampaignMapState()
  const [confirmReset, setConfirmReset] = useState(false)
  const [selectedId, setSelectedId] = useState(null)

  function handleReset() {
    if (!confirmReset) {
      setConfirmReset(true)
      setTimeout(() => setConfirmReset(false), 2500)
      return
    }
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
            background={map.background}
            selectedId={selectedId}
            onSelect={setSelectedId}
            onDropMarker={map.addMarker}
            onMoveMarker={map.moveMarker}
            onRemoveMarker={map.removeMarker}
          />
          {map.canEdit && (
            <p className="text-muted/60 text-[10px] tracking-wider mt-2 px-1">
              Drag icons from the palette onto the map · Drag a placed icon to move it · Right-click an icon to remove it
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
          </aside>
        )}
      </div>

      {/* Auto-populating detail table — the edit surface for every placed icon */}
      <MapTable
        markers={map.markers}
        table={map.table}
        canEdit={map.canEdit}
        selectedId={selectedId}
        onSelect={setSelectedId}
        setMarkerColor={map.setMarkerColor}
        setMarkerLabel={map.setMarkerLabel}
        setTableField={map.setTableField}
        onRemoveMarker={map.removeMarker}
      />
    </div>
  )
}
