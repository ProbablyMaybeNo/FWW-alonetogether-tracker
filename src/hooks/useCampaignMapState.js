import { useCallback, useMemo } from 'react'
import { useCampaign } from '../context/CampaignContext'
import {
  SEED_TERRITORIES,
  SEED_ROUTES,
  MARKER_KINDS,
  THREAT_FACTIONS,
  STARTER_REVEALED_IDS,
  buildAdjacency,
  defaultCampaignMapState,
} from '../data/campaignMap'

// Pulls the shared campaign map and produces the merged view (seed + runtime) the UI consumes.
// Writes go through saveCampaignMapState — online: RPC into campaigns.campaign_map_state so every
// player (and any of their devices) sees the same map; solo: localStorage via setState.
export function useCampaignMapState() {
  const { state, saveCampaignMapState } = useCampaign()

  const mapState = state?.campaignMap ?? defaultCampaignMapState()

  // Seed lookups never change.
  const territoryById = useMemo(() => {
    const map = {}
    for (const t of SEED_TERRITORIES) map[t.id] = t
    return map
  }, [])

  const routeById = useMemo(() => {
    const map = {}
    for (const r of SEED_ROUTES) map[r.id] = r
    return map
  }, [])

  const adjacency = useMemo(() => buildAdjacency(SEED_ROUTES), [])

  // Merged territories — seed + runtime state.
  const territories = useMemo(() => {
    return SEED_TERRITORIES.map(seed => {
      const runtime = mapState.territories?.[seed.id] ?? {}
      return {
        ...seed,
        state: runtime.state ?? (STARTER_REVEALED_IDS.includes(seed.id) ? 'revealed' : 'hidden'),
        owner: runtime.owner ?? null,
        threatLevel: runtime.threatLevel ?? seed.threatLevel ?? 0,
        notes: runtime.notes ?? '',
        rewardClaimed: !!runtime.rewardClaimed,
      }
    })
  }, [mapState])

  const routes = useMemo(() => {
    return SEED_ROUTES.map(seed => {
      const runtime = mapState.routes?.[seed.id] ?? {}
      return {
        ...seed,
        state: runtime.state ?? 'hidden',
        owner: runtime.owner ?? null,
        threatLevel: runtime.threatLevel ?? 0,
        notes: runtime.notes ?? '',
        oneTimeRewardClaimed: !!runtime.oneTimeRewardClaimed,
      }
    })
  }, [mapState])

  // ── mutate helpers ───────────────────────────────────────────────────
  // Use a ref for the current map state so callbacks stay stable but always see latest values.
  // (saveCampaignMapState takes the next state directly and handles persistence.)
  const patchMap = useCallback((patch) => {
    const current = mapState
    const next = typeof patch === 'function' ? patch(current) : { ...current, ...patch }
    saveCampaignMapState(next)
  }, [mapState, saveCampaignMapState])

  const patchTerritory = useCallback((id, patch) => {
    patchMap(cur => ({
      ...cur,
      territories: {
        ...cur.territories,
        [id]: { ...(cur.territories?.[id] ?? {}), ...patch },
      },
    }))
  }, [patchMap])

  const patchRoute = useCallback((id, patch) => {
    patchMap(cur => ({
      ...cur,
      routes: {
        ...cur.routes,
        [id]: { ...(cur.routes?.[id] ?? {}), ...patch },
      },
    }))
  }, [patchMap])

  // Territory actions
  const revealTerritory  = useCallback(id => patchTerritory(id, { state: 'revealed' }), [patchTerritory])
  const hideTerritory    = useCallback(id => patchTerritory(id, { state: 'hidden' }), [patchTerritory])
  const exploreTerritory = useCallback(id => {
    // explore reveals neighbours + their connecting routes
    patchMap(cur => {
      const territoriesNext = {
        ...cur.territories,
        [id]: { ...(cur.territories?.[id] ?? {}), state: 'explored' },
      }
      const neighbours = adjacency[id] ?? new Set()
      for (const nid of neighbours) {
        const existing = cur.territories?.[nid] ?? {}
        if (existing.state == null || existing.state === 'hidden') {
          territoriesNext[nid] = { ...existing, state: 'revealed' }
        }
      }
      const routesNext = { ...cur.routes }
      for (const r of SEED_ROUTES) {
        if (r.from === id || r.to === id) {
          const ex = routesNext[r.id] ?? {}
          if (ex.state == null || ex.state === 'hidden') {
            routesNext[r.id] = { ...ex, state: 'revealed' }
          }
        }
      }
      return { ...cur, territories: territoriesNext, routes: routesNext }
    })
  }, [adjacency, patchMap])

  const claimTerritory   = useCallback((id, owner = 'self') => patchTerritory(id, { state: 'controlled', owner }), [patchTerritory])
  const contestTerritory = useCallback(id => patchTerritory(id, { state: 'contested' }), [patchTerritory])
  const setTerritoryState = useCallback((id, s) => patchTerritory(id, { state: s }), [patchTerritory])
  const setTerritoryThreat = useCallback((id, n) => patchTerritory(id, { threatLevel: Math.max(0, Math.min(5, n)) }), [patchTerritory])
  const setTerritoryOwner = useCallback((id, owner) => patchTerritory(id, { owner }), [patchTerritory])
  const setTerritoryNotes = useCallback((id, notes) => patchTerritory(id, { notes }), [patchTerritory])
  const markRewardClaimed = useCallback((id, claimed = true) => patchTerritory(id, { rewardClaimed: claimed }), [patchTerritory])

  // Route actions
  const revealRoute   = useCallback(id => patchRoute(id, { state: 'revealed' }), [patchRoute])
  const claimRoute    = useCallback((id, owner = 'self') => patchRoute(id, { state: 'controlled', owner }), [patchRoute])
  const blockRoute    = useCallback(id => patchRoute(id, { state: 'blocked' }), [patchRoute])
  const setRouteState = useCallback((id, s) => patchRoute(id, { state: s }), [patchRoute])
  const setRouteThreat = useCallback((id, n) => patchRoute(id, { threatLevel: Math.max(0, Math.min(5, n)) }), [patchRoute])
  const setRouteOwner = useCallback((id, owner) => patchRoute(id, { owner }), [patchRoute])
  const setRouteNotes = useCallback((id, notes) => patchRoute(id, { notes }), [patchRoute])
  const claimRouteOneTimeReward = useCallback((id, claimed = true) => patchRoute(id, { oneTimeRewardClaimed: claimed }), [patchRoute])

  // Markers
  const addMarker = useCallback((kind, x, y, label) => {
    if (!MARKER_KINDS.some(m => m.kind === kind)) return
    patchMap(cur => ({
      ...cur,
      markers: [
        ...(cur.markers ?? []),
        { id: `m-${Date.now()}-${Math.floor(Math.random() * 1000)}`, kind, x, y, label: label ?? '' },
      ],
    }))
  }, [patchMap])

  const moveMarker = useCallback((id, x, y) => {
    patchMap(cur => ({
      ...cur,
      markers: (cur.markers ?? []).map(m => m.id === id ? { ...m, x, y } : m),
    }))
  }, [patchMap])

  const removeMarker = useCallback(id => {
    patchMap(cur => ({ ...cur, markers: (cur.markers ?? []).filter(m => m.id !== id) }))
  }, [patchMap])

  // Threats
  const setThreat = useCallback((faction, n) => {
    if (!THREAT_FACTIONS.includes(faction)) return
    patchMap(cur => ({ ...cur, threats: { ...(cur.threats ?? {}), [faction]: Math.max(0, Math.min(5, n)) } }))
  }, [patchMap])

  const toggleShowHidden = useCallback(() => {
    patchMap(cur => ({ ...cur, showHidden: !cur.showHidden }))
  }, [patchMap])

  // Reset back to seed
  const resetMap = useCallback(() => {
    patchMap(() => defaultCampaignMapState())
  }, [patchMap])

  return {
    // data
    territories,
    routes,
    markers: mapState.markers ?? [],
    threats: mapState.threats ?? {},
    showHidden: !!mapState.showHidden,
    territoryById,
    routeById,
    adjacency,

    // territory
    revealTerritory,
    hideTerritory,
    exploreTerritory,
    claimTerritory,
    contestTerritory,
    setTerritoryState,
    setTerritoryThreat,
    setTerritoryOwner,
    setTerritoryNotes,
    markRewardClaimed,

    // route
    revealRoute,
    claimRoute,
    blockRoute,
    setRouteState,
    setRouteThreat,
    setRouteOwner,
    setRouteNotes,
    claimRouteOneTimeReward,

    // markers
    addMarker,
    moveMarker,
    removeMarker,

    // threats + ui
    setThreat,
    toggleShowHidden,
    resetMap,
  }
}
