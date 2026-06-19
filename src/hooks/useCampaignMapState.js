import { useCallback } from 'react'
import { useCampaign } from '../context/CampaignContext'
import { MARKER_KINDS, defaultCampaignMapState } from '../data/campaignMap'

// Pulls the shared campaign map state and exposes mutate helpers.
// Writes go through saveCampaignMapState — online: RPC into campaigns.campaign_map_state so every
// player (and any of their devices) sees the same map; solo: localStorage via setState.
export function useCampaignMapState() {
  const { state, saveCampaignMapState, campaignId, userId, isOnline } = useCampaign()

  const mapState = state?.campaignMap ?? defaultCampaignMapState()

  // Who may edit the map: solo always; online → campaign creator only (P6).
  const createdBy = state?.createdBy ?? null
  const canEdit = !isOnline || (createdBy != null && createdBy === userId)

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
    patchMap(cur => {
      // Drop the icon, any lines touching it, and all their table entries.
      const lines = (cur.lines ?? []).filter(l => l.fromId !== id && l.toId !== id)
      const removedLineIds = (cur.lines ?? [])
        .filter(l => l.fromId === id || l.toId === id)
        .map(l => l.id)
      const table = { ...(cur.table ?? {}) }
      delete table[id]
      removedLineIds.forEach(lid => { delete table[lid] })
      return { ...cur, markers: (cur.markers ?? []).filter(m => m.id !== id), lines, table }
    })
  }, [patchMap])

  const setMarkerColor = useCallback((id, color) => {
    patchMap(cur => ({
      ...cur,
      markers: (cur.markers ?? []).map(m => m.id === id ? { ...m, color } : m),
    }))
  }, [patchMap])

  const setMarkerLabel = useCallback((id, label) => {
    patchMap(cur => ({
      ...cur,
      markers: (cur.markers ?? []).map(m => m.id === id ? { ...m, label } : m),
    }))
  }, [patchMap])

  // ── Lines (snap-to-icon routes) ──────────────────────────────────────
  const addLine = useCallback((fromId, toId) => {
    if (!fromId || !toId || fromId === toId) return
    patchMap(cur => {
      const markers = cur.markers ?? []
      if (!markers.some(m => m.id === fromId) || !markers.some(m => m.id === toId)) return cur
      // Don't create a duplicate route between the same pair (either direction).
      const exists = (cur.lines ?? []).some(l =>
        (l.fromId === fromId && l.toId === toId) || (l.fromId === toId && l.toId === fromId))
      if (exists) return cur
      return {
        ...cur,
        lines: [
          ...(cur.lines ?? []),
          { id: `l-${Date.now()}-${Math.floor(Math.random() * 1000)}`, fromId, toId },
        ],
      }
    })
  }, [patchMap])

  const removeLine = useCallback(id => {
    patchMap(cur => {
      const { [id]: _gone, ...table } = cur.table ?? {}
      return { ...cur, lines: (cur.lines ?? []).filter(l => l.id !== id), table }
    })
  }, [patchMap])

  const setLineColor = useCallback((id, color) => {
    patchMap(cur => ({
      ...cur,
      lines: (cur.lines ?? []).map(l => l.id === id ? { ...l, color } : l),
    }))
  }, [patchMap])

  // ── Table rows (detail keyed by marker/line id) ──────────────────────
  const setTableField = useCallback((id, key, value) => {
    patchMap(cur => ({
      ...cur,
      table: { ...(cur.table ?? {}), [id]: { ...(cur.table?.[id] ?? {}), [key]: value } },
    }))
  }, [patchMap])

  // ── Background image (P2) ────────────────────────────────────────────
  const setBackground = useCallback((bg) => patchMap(cur => ({ ...cur, background: bg })), [patchMap])
  const clearBackground = useCallback(() => patchMap(cur => ({ ...cur, background: null })), [patchMap])

  const resetMap = useCallback(() => patchMap(() => defaultCampaignMapState()), [patchMap])

  return {
    // data
    markers: mapState.markers ?? [],
    lines: mapState.lines ?? [],
    table: mapState.table ?? {},
    background: mapState.background ?? null,

    // permissions / identity
    canEdit,
    campaignId,

    // icon actions
    addMarker,
    moveMarker,
    removeMarker,
    setMarkerColor,
    setMarkerLabel,

    // line actions
    addLine,
    removeLine,
    setLineColor,

    // table actions
    setTableField,

    // background actions
    setBackground,
    clearBackground,

    // ui
    resetMap,
  }
}
