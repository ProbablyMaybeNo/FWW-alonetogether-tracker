import { useCallback } from 'react'
import { useCampaign } from '../context/CampaignContext'
import { MARKER_KINDS, defaultCampaignMapState } from '../data/campaignMap'

// Pulls the shared campaign map state and exposes mutate helpers.
// Writes go through saveCampaignMapState — online: RPC into campaigns.campaign_map_state so every
// player (and any of their devices) sees the same map; solo: localStorage via setState.
export function useCampaignMapState() {
  const { state, saveCampaignMapState } = useCampaign()

  const mapState = state?.campaignMap ?? defaultCampaignMapState()

  // patchMap takes the next state directly and handles persistence.
  const patchMap = useCallback((patch) => {
    const current = state?.campaignMap ?? defaultCampaignMapState()
    const next = typeof patch === 'function' ? patch(current) : { ...current, ...patch }
    saveCampaignMapState(next)
  }, [state, saveCampaignMapState])

  // ── Icons (markers) ──────────────────────────────────────────────────
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

  const resetMap = useCallback(() => patchMap(() => defaultCampaignMapState()), [patchMap])

  return {
    // data
    markers: mapState.markers ?? [],
    background: mapState.background ?? null,

    // icon actions
    addMarker,
    moveMarker,
    removeMarker,

    // ui
    resetMap,
  }
}
