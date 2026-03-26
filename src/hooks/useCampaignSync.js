import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { usePersistedState } from './usePersistedState'

const DEBOUNCE_MS = 500

// Map between app state keys and player_data DB columns
function stateToDb(state) {
  return {
    caps: state.caps ?? 0,
    roster: state.roster ?? [],
    settlement: state.settlement ?? { structures: [], landPurchased: false },
    item_pool: state.itemPool ?? { items: [] },
    quest_cards: state.questCards ?? [],
    drawn_quest_ids: state.drawnQuestIds ?? [],
    discarded_quest_ids: state.discardedQuestIds ?? [],
    event_cards: state.eventCards ?? {},
    active_events: state.activeEvents ?? [],
    explore_cards_this_round: state.exploreCardsThisRound ?? 0,
    active_scavenger_objective: state.activeScavengerObjective ?? null,
    completed_objectives: state.completedObjectives ?? [],
    objective_progress: state.objectiveProgress ?? {},
    secret_purpose_history: state.secretPurposeHistory ?? [],
    player_info: state.player ?? {},
  }
}

function dbToState(row) {
  return {
    caps: row.caps ?? 0,
    roster: row.roster ?? [],
    settlement: row.settlement ?? { structures: [], landPurchased: false },
    itemPool: row.item_pool ?? { items: [] },
    questCards: row.quest_cards ?? [],
    drawnQuestIds: row.drawn_quest_ids ?? [],
    discardedQuestIds: row.discarded_quest_ids ?? [],
    eventCards: row.event_cards ?? {},
    activeEvents: row.active_events ?? [],
    exploreCardsThisRound: row.explore_cards_this_round ?? 0,
    activeScavengerObjective: row.active_scavenger_objective ?? null,
    completedObjectives: row.completed_objectives ?? [],
    objectiveProgress: row.objective_progress ?? {},
    secretPurposeHistory: row.secret_purpose_history ?? [],
    player: row.player_info ?? {},
  }
}

function campaignDbToState(row) {
  return {
    phase: row.phase ?? 1,
    round: row.round ?? 0,
    battleCount: row.battle_count ?? 0,
    phase1CapLimit: row.phase1_cap_limit ?? 750,
    exploreLocations: row.explore_locations ?? {},
  }
}

/**
 * useCampaignSync
 *
 * When campaignId + userId are provided: syncs with Supabase.
 * Otherwise: falls back to usePersistedState (solo/localStorage mode).
 */
export function useCampaignSync({ campaignId, userId } = {}) {
  const solo = usePersistedState()
  const [state, setStateLocal] = useState(null)
  const [sharedState, setSharedState] = useState(null)
  const [syncing, setSyncing] = useState(false)
  const [syncError, setSyncError] = useState(null)
  const debounceTimer = useRef(null)
  const isOnline = !!(campaignId && userId && supabase)

  // On mount: load player data and campaign shared data
  useEffect(() => {
    if (!isOnline) return

    async function load() {
      setSyncing(true)
      try {
        // Load player data
        const { data: pd, error: pdErr } = await supabase
          .from('player_data')
          .select('*')
          .eq('campaign_id', campaignId)
          .eq('user_id', userId)
          .single()

        if (pdErr && pdErr.code !== 'PGRST116') {
          // PGRST116 = no rows, meaning first time — we'll insert on first save
          throw pdErr
        }

        if (pd) {
          setStateLocal(dbToState(pd))
        } else {
          // First join: start from defaults (usePersistedState defaults)
          setStateLocal(solo.state)
        }

        // Load shared campaign data
        const { data: camp, error: campErr } = await supabase
          .from('campaigns')
          .select('phase, round, battle_count, phase1_cap_limit, explore_locations')
          .eq('id', campaignId)
          .single()

        if (campErr) throw campErr
        setSharedState(campaignDbToState(camp))

      } catch (e) {
        console.error('useCampaignSync load error:', e)
        setSyncError(e.message)
        // Fall back to local state
        setStateLocal(solo.state)
      } finally {
        setSyncing(false)
      }
    }

    load()
  }, [campaignId, userId])

  // Subscribe to realtime changes across all campaign tables
  useEffect(() => {
    if (!isOnline || !supabase) return

    const channel = supabase
      .channel(`campaign:${campaignId}:all`)
      // Shared campaign state (phase, round, etc.)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'campaigns',
        filter: `id=eq.${campaignId}`,
      }, (payload) => {
        setSharedState(campaignDbToState(payload.new))
      })
      // Another player's data updated
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'player_data',
        filter: `campaign_id=eq.${campaignId}`,
      }, (payload) => {
        // Only update our own local state if it's our row coming back
        if (payload.new?.user_id === userId && payload.eventType === 'UPDATE') {
          // Ignore — we wrote this ourselves, avoid feedback loop
        }
      })
      // Someone joined or left
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'campaign_players',
        filter: `campaign_id=eq.${campaignId}`,
      }, () => {
        // Trigger a re-fetch of the player list (consumers can listen to sharedState)
        setSharedState(prev => ({ ...prev, _playerListVersion: Date.now() }))
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [campaignId, userId, isOnline])

  // Debounced save to Supabase
  const saveToSupabase = useCallback(async (newState) => {
    if (!isOnline) return
    try {
      const dbData = {
        ...stateToDb(newState),
        campaign_id: campaignId,
        user_id: userId,
      }

      const { error } = await supabase
        .from('player_data')
        .upsert(dbData, { onConflict: 'campaign_id,user_id' })

      if (error) {
        console.error('Supabase save error:', error)
        setSyncError(error.message)
      } else {
        setSyncError(null)
      }
    } catch (e) {
      console.error('useCampaignSync save error:', e)
      setSyncError(e.message)
    }
  }, [campaignId, userId, isOnline])

  // setState with debounced Supabase sync
  const setState = useCallback((updater) => {
    if (!isOnline) {
      // Solo mode: delegate to usePersistedState
      solo.setState(updater)
      return
    }

    setStateLocal(prev => {
      const next = typeof updater === 'function' ? updater(prev) : { ...prev, ...updater }

      // Debounce the Supabase write
      if (debounceTimer.current) clearTimeout(debounceTimer.current)
      debounceTimer.current = setTimeout(() => {
        saveToSupabase(next)
      }, DEBOUNCE_MS)

      return next
    })
  }, [isOnline, saveToSupabase, solo])

  // Update shared campaign fields (phase, round, etc.) — host/GM use
  const updateShared = useCallback(async (field, value) => {
    if (!isOnline) return

    // Map camelCase to snake_case
    const colMap = {
      phase: 'phase',
      round: 'round',
      battleCount: 'battle_count',
      phase1CapLimit: 'phase1_cap_limit',
      exploreLocations: 'explore_locations',
    }
    const col = colMap[field] ?? field

    try {
      const { error } = await supabase
        .from('campaigns')
        .update({ [col]: value })
        .eq('id', campaignId)

      if (error) throw error

      // Optimistically update local shared state
      setSharedState(prev => ({ ...prev, [field]: value }))
    } catch (e) {
      console.error('updateShared error:', e)
      setSyncError(e.message)
    }
  }, [campaignId, isOnline])

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current)
    }
  }, [])

  if (!isOnline) {
    // Solo mode: return usePersistedState directly
    return {
      ...solo,
      sharedState: null,
      updateShared: () => {},
      syncing: false,
      syncError: null,
      isOnline: false,
    }
  }

  // Merge player state + shared campaign state
  const mergedState = state ? { ...state, ...(sharedState ?? {}) } : null

  return {
    state: mergedState,
    setState,
    updateState: (updater) => setState(prev => {
      const patch = typeof updater === 'function' ? updater(prev) : updater
      return { ...prev, ...patch }
    }),
    exportData: solo.exportData,
    importData: solo.importData,
    sharedState,
    updateShared,
    syncing,
    syncError,
    isOnline: true,
  }
}
