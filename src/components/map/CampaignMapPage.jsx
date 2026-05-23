import { useState, useMemo } from 'react'
import { Eye, EyeOff, RotateCcw } from 'lucide-react'
import { useCampaignMapState } from '../../hooks/useCampaignMapState'
import { FACTIONS, TERRITORY_TYPES } from '../../data/campaignMap'
import CampaignMapCanvas from './CampaignMapCanvas'
import MarkerPalette from './MarkerPalette'
import ThreatTracker from './ThreatTracker'
import CampaignLegend from './CampaignLegend'
import TerritoryPanel from './TerritoryPanel'
import RoutePanel from './RoutePanel'

export default function CampaignMapPage() {
  const map = useCampaignMapState()
  const [selectedTerritoryId, setSelectedTerritoryId] = useState(null)
  const [selectedRouteId, setSelectedRouteId] = useState(null)
  const [hoverTerritory, setHoverTerritory] = useState(null)
  const [hoverRoute, setHoverRoute] = useState(null)
  const [confirmReset, setConfirmReset] = useState(false)

  const selectedTerritory = useMemo(
    () => map.territories.find(t => t.id === selectedTerritoryId) ?? null,
    [map.territories, selectedTerritoryId],
  )
  const selectedRoute = useMemo(
    () => map.routes.find(r => r.id === selectedRouteId) ?? null,
    [map.routes, selectedRouteId],
  )

  const stats = useMemo(() => {
    const t = map.territories
    return {
      total: t.length,
      hidden:     t.filter(x => x.state === 'hidden').length,
      revealed:   t.filter(x => x.state === 'revealed' || x.state === 'rumored').length,
      explored:   t.filter(x => x.state === 'explored').length,
      controlled: t.filter(x => x.state === 'controlled').length,
      contested:  t.filter(x => x.state === 'contested').length,
      threatened: t.filter(x => x.state === 'threatened').length,
    }
  }, [map.territories])

  const routeStats = useMemo(() => {
    const r = map.routes
    return {
      total: r.length,
      controlled: r.filter(x => x.state === 'controlled').length,
      contested:  r.filter(x => x.state === 'contested').length,
      blocked:    r.filter(x => x.state === 'blocked').length,
      income:     r.filter(x => x.state === 'controlled').reduce((s, x) => s + (x.incomeCaps ?? 0), 0),
    }
  }, [map.routes])

  function handleReset() {
    if (!confirmReset) {
      setConfirmReset(true)
      setTimeout(() => setConfirmReset(false), 2500)
      return
    }
    map.resetMap()
    setConfirmReset(false)
  }

  const actions = {
    setTerritoryState:  map.setTerritoryState,
    setTerritoryOwner:  map.setTerritoryOwner,
    setTerritoryNotes:  map.setTerritoryNotes,
    setTerritoryThreat: map.setTerritoryThreat,
    exploreTerritory:   map.exploreTerritory,
    hideTerritory:      map.hideTerritory,
    claimTerritory:     map.claimTerritory,
    contestTerritory:   map.contestTerritory,
    markRewardClaimed:  map.markRewardClaimed,

    setRouteState:  map.setRouteState,
    setRouteOwner:  map.setRouteOwner,
    setRouteNotes:  map.setRouteNotes,
    setRouteThreat: map.setRouteThreat,
    revealRoute:    map.revealRoute,
    claimRoute:     map.claimRoute,
    blockRoute:     map.blockRoute,
    claimRouteOneTimeReward: map.claimRouteOneTimeReward,
  }

  return (
    <div className="p-4 max-w-7xl mx-auto space-y-4">
      {/* Header */}
      <div
        className="bg-panel-light border border-amber/40 rounded-lg px-4 py-3"
        style={{ boxShadow: '0 0 12px var(--color-amber-glow)' }}
      >
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="text-title text-lg font-bold tracking-widest">EXPEDITION MAP</span>
            <span className="text-amber/80 text-xs tracking-wider">— FRONTIER COLORADO</span>
          </div>
          <div className="ml-auto flex items-center gap-2 flex-wrap">
            <Stat label="REVEALED" value={`${map.territories.length - stats.hidden}/${stats.total}`} />
            <Stat label="EXPLORED"  value={stats.explored} />
            <Stat label="CLAIMED"   value={stats.controlled} accent="amber" />
            <Stat label="ROUTES"    value={`${routeStats.controlled}/${routeStats.total}`} />
            <Stat label="INCOME"    value={`+${routeStats.income}c`} accent="amber" />
            <button
              onClick={map.toggleShowHidden}
              className={`inline-flex items-center gap-1.5 text-[10px] tracking-widest px-3 py-1.5 border rounded transition-colors ${
                map.showHidden
                  ? 'border-amber text-amber bg-amber-dim/10'
                  : 'border-pip-dim/50 text-pip/70 hover:border-pip hover:text-pip'
              }`}
              title="Toggle GM view"
            >
              {map.showHidden ? <Eye size={12} /> : <EyeOff size={12} />}
              {map.showHidden ? 'GM VIEW: ON' : 'GM VIEW: OFF'}
            </button>
            <button
              onClick={handleReset}
              className={`inline-flex items-center gap-1.5 text-[10px] tracking-widest px-3 py-1.5 border rounded transition-colors ${
                confirmReset
                  ? 'border-danger text-danger bg-danger/10'
                  : 'border-muted/40 text-muted hover:border-pip hover:text-pip'
              }`}
              title="Reset map to seed"
            >
              <RotateCcw size={12} />
              {confirmReset ? 'CONFIRM RESET' : 'RESET MAP'}
            </button>
          </div>
        </div>
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr,260px] gap-4">
        {/* Canvas + hover tooltip */}
        <div className="relative">
          <CampaignMapCanvas
            territories={map.territories}
            routes={map.routes}
            markers={map.markers}
            showHidden={map.showHidden}
            selectedTerritoryId={selectedTerritoryId}
            onSelectTerritory={t => { setSelectedTerritoryId(t.id); setSelectedRouteId(null) }}
            onSelectRoute={r => { setSelectedRouteId(r.id); setSelectedTerritoryId(null) }}
            onHoverTerritory={t => { setHoverTerritory(t); setHoverRoute(null) }}
            onHoverRoute={r => { setHoverRoute(r); setHoverTerritory(null) }}
            onLeaveHover={() => { setHoverTerritory(null); setHoverRoute(null) }}
            onDropMarker={map.addMarker}
            onMoveMarker={map.moveMarker}
            onRemoveMarker={map.removeMarker}
          />

          {/* Hover tooltip overlay */}
          {(hoverTerritory || hoverRoute) && (
            <div className="absolute top-2 left-2 max-w-xs border border-pip-mid/60 rounded bg-panel/95 px-3 py-2 text-xs pointer-events-none"
              style={{ boxShadow: '0 0 8px var(--color-pip-glow)' }}>
              {hoverTerritory && <TerritoryTooltip t={hoverTerritory} />}
              {hoverRoute && <RouteTooltip r={hoverRoute} />}
            </div>
          )}

          <p className="text-muted/60 text-[10px] tracking-wider mt-2 px-1">
            Click a node to open its panel · Click a route line to edit it · Drag markers from the palette onto the map · Right-click a marker to remove it
          </p>
        </div>

        {/* Right sidebar */}
        <aside className="space-y-3">
          <MarkerPalette />
          <ThreatTracker threats={map.threats} setThreat={map.setThreat} />
          <CampaignLegend />
        </aside>
      </div>

      {/* Detail panels */}
      {selectedTerritory && (
        <TerritoryPanel
          territory={selectedTerritory}
          territoryById={map.territoryById}
          routes={map.routes}
          actions={actions}
          onClose={() => setSelectedTerritoryId(null)}
        />
      )}

      {selectedRoute && (
        <RoutePanel
          route={selectedRoute}
          territoryById={map.territoryById}
          actions={actions}
          onClose={() => setSelectedRouteId(null)}
        />
      )}
    </div>
  )
}

function Stat({ label, value, accent = 'pip' }) {
  const color = accent === 'amber' ? 'text-amber' : 'text-pip'
  return (
    <div className="border border-pip-dim/30 rounded bg-panel-alt px-2 py-1">
      <div className="text-label text-[9px] tracking-widest opacity-80">{label}</div>
      <div className={`text-xs tracking-wider font-bold ${color}`}>{value}</div>
    </div>
  )
}

function TerritoryTooltip({ t }) {
  const type = TERRITORY_TYPES[t.type]
  const fac = FACTIONS[t.factionPressure]
  const isHidden = t.state === 'hidden'
  return (
    <div className="space-y-1">
      <div className="text-amber font-bold tracking-widest text-xs">
        {isHidden ? '??? UNKNOWN ???' : t.name}
      </div>
      <div className="flex flex-wrap gap-x-2 gap-y-0.5 text-[10px]">
        <span className="text-pip">{isHidden ? 'Hidden — unscouted' : type?.label}</span>
        <span className="text-muted">·</span>
        <span className={`tracking-wider`} style={fac ? { color: fac.color } : undefined}>
          {fac?.label ?? '—'}
        </span>
      </div>
      {!isHidden && (
        <>
          <div className="text-[10px] text-pip">STATE: <span className="text-amber tracking-wider">{t.state.toUpperCase()}</span></div>
          <div className="text-[10px] text-pip">THREAT: <span className="text-danger">{t.threatLevel ?? 0}/5</span></div>
          <div className="text-[10px] text-muted">{t.rewardSummary}</div>
        </>
      )}
    </div>
  )
}

function RouteTooltip({ r }) {
  const isHidden = r.state === 'hidden'
  return (
    <div className="space-y-1">
      <div className="text-amber font-bold tracking-widest text-xs">
        {isHidden ? '??? UNKNOWN ROUTE ???' : r.name}
      </div>
      {!isHidden && (
        <>
          <div className="text-[10px] text-pip">STATE: <span className="text-amber tracking-wider">{r.state.toUpperCase()}</span></div>
          <div className="text-[10px] text-pip">OWNER: <span className="text-muted">{r.owner ?? '—'}</span></div>
          <div className="text-[10px] text-pip">INCOME: <span className="text-amber">+{r.incomeCaps ?? 0}c</span></div>
          <div className="text-[10px] text-pip">REWARD: <span className="text-muted">{r.rewardCategory ?? '—'}</span></div>
          <div className="text-[10px] text-pip">THREAT: <span className="text-danger">{r.threatLevel ?? 0}/5</span></div>
        </>
      )}
    </div>
  )
}
