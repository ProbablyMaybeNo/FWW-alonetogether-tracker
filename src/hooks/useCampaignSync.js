import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { usePersistedState } from './usePersistedState'
import { normalizeInhabitantsState } from '../utils/inhabitantsState'
import { normalizeBattlePageState } from '../utils/battlePageState'
import { normalizeSettlementItemDeck } from '../utils/settlementItemDeckUtils'

const DEBOUNCE_MS = 500

// Free starting structures given to every player on first join
// 2x Generator-Small, 1x Stores, 1x Maintenance Shed, 1x Listening Post
const FREE_STRUCTURE_IDS = [1, 1, 53, 54, 50]

function buildFreeStartingStructures() {
  return FREE_STRUCTURE_IDS.map(id => ({
    instanceId: Date.now() + Math.random(),
    structureId: id,
    usedThisRound: false,
    powered: false,
    condition: 'Undamaged',
    notes: '',
  }))
}

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
    settings: state.settings ?? null,
    settlement_deck: state.settlementDeck ?? [],
    settlement_discard: state.settlementDiscard ?? [],
    boost_hand: state.boostHand ?? [],
    boost_deck: state.boostDeck ?? [],
    boost_discard: state.boostDiscard ?? [],
    narrative_log: state.narrativeLog ?? [],
    settlement_item_deck: state.settlementItemDeck ?? { drawPile: [], discardPile: [], manuallyRestored: [] },
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
    settings: row.settings ?? null,
    settlementDeck: row.settlement_deck ?? [],
    settlementDiscard: row.settlement_discard ?? [],
    boostHand: row.boost_hand ?? [],
    boostDeck: row.boost_deck ?? [],
    boostDiscard: row.boost_discard ?? [],
    narrativeLog: row.narrative_log ?? [],
    settlementItemDeck: normalizeSettlementItemDeck(row.settlement_item_deck),
  }
}

function campaignDbToState(row) {
  return {
    phase: row.phase ?? 1,
    round: row.round ?? 0,
    battleCount: row.battle_count ?? 0,
    phase1CapLimit: row.phase1_cap_limit ?? 750,
    exploreLocations: row.explore_locations ?? {},
    battles: row.battles ?? {},
    createdBy: row.created_by ?? null,
    inhabitantsState: normalizeInhabitantsState(row.inhabitants_state),
    battlePageState: normalizeBattlePageState(row.battle_page_state),
    campaignNarratives: row.campaign_narratives ?? [],
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
          const loaded = dbToState(pd)
          // Backfill free structures if settlement is still empty
          const hasStructures = (loaded.settlement?.structures?.length ?? 0) > 0
          if (!hasStructures) {
            const patched = {
              ...loaded,
              settlement: { ...loaded.settlement, structures: buildFreeStartingStructures() },
            }
            setStateLocal(patched)
            // Persist immediately so it sticks on DB
            supabase.from('player_data').upsert(
              { ...stateToDb(patched), campaign_id: campaignId, user_id: userId },
              { onConflict: 'campaign_id,user_id' }
            ).then(({ error }) => { if (error) console.error('backfill structures save error:', error) })
          } else {
            setStateLocal(loaded)
          }
        } else {
          // First join: check for pending settings / player info saved during campaign creation
          const pendingSettings = (() => {
            try {
              const raw = localStorage.getItem('fww-pending-settings')
              if (!raw) return null
              const parsed = JSON.parse(raw)
              if (parsed.campaignId === campaignId) return parsed.settings
            } catch {}
            return null
          })()
          if (pendingSettings) localStorage.removeItem('fww-pending-settings')

          const pendingPlayer = (() => {
            try {
              const raw = localStorage.getItem('fww-pending-player')
              if (!raw) return null
              const parsed = JSON.parse(raw)
              if (parsed.campaignId === campaignId) return parsed.player
            } catch {}
            return null
          })()
          if (pendingPlayer) localStorage.removeItem('fww-pending-player')

          // Strip campaign-level fields from solo state — these come from campaigns table, not local play
          const { phase: _p, round: _r, battleCount: _bc, ...soloPersonal } = solo.state
          const baseState = {
            ...soloPersonal,
            ...(pendingSettings ? { settings: pendingSettings } : {}),
            ...(pendingPlayer ? { player: pendingPlayer } : {}),
          }
          const hasExistingStructures = (baseState.settlement?.structures?.length ?? 0) > 0
          const initialState = hasExistingStructures ? baseState : {
            ...baseState,
            settlement: {
              ...baseState.settlement,
              structures: buildFreeStartingStructures(),
            },
          }
          setStateLocal(initialState)
          // Create the player_data row immediately so it exists on next load
          supabase.from('player_data').upsert(
            { ...stateToDb(initialState), campaign_id: campaignId, user_id: userId },
            { onConflict: 'campaign_id,user_id' }
          ).then(({ error }) => { if (error) console.error('initial player_data create error:', error) })
        }

        // Load shared campaign data
        const { data: camp, error: campErr } = await supabase
          .from('campaigns')
          .select('phase, round, battle_count, phase1_cap_limit, explore_locations, battles, created_by, inhabitants_state, battle_page_state, campaign_narratives')
          .eq('id', campaignId)
          .single()

        if (campErr) throw campErr
        setSharedState(campaignDbToState(camp))

      } catch (e) {
        console.error('useCampaignSync load error:', e)
        setSyncError(e.message)
        // Fall back to personal state — never inherit phase/round/battleCount from solo
        // (those are campaigns-table fields, not player-data fields)
        const { phase: _p, round: _r, battleCount: _bc, ...personalState } = solo.state
        setStateLocal(prev => prev !== null ? prev : personalState)
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
        // Bump player list version so CampaignPage refetches (only for other players)
        if (payload.new?.user_id !== userId) {
          setSharedState(prev => ({ ...prev, _playerListVersion: Date.now() }))
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

  // Update shared campaign fields (phase, round, etc.)
  const updateShared = useCallback(async (field, value) => {
    if (!isOnline) return

    // phase/round/battleCount — optimistic update first, then persist
    if (field === 'phase' || field === 'round' || field === 'battleCount') {
      const colMap = { phase: 'phase', round: 'round', battleCount: 'battle_count' }
      const col = colMap[field]
      const param = { p_campaign_id: campaignId }
      if (field === 'phase') param.p_phase = value
      if (field === 'round') param.p_round = value
      if (field === 'battleCount') param.p_battle_count = value

      // Optimistic update — UI responds immediately regardless of DB result
      setSharedState(prev => ({ ...(prev ?? {}), [field]: value }))

      try {
        const { error } = await supabase.rpc('patch_campaign_progress', param)
        if (error) {
          // RPC not available or failed — fall back to direct UPDATE (creator-only via RLS)
          const { error: e2 } = await supabase.from('campaigns').update({ [col]: value }).eq('id', campaignId)
          if (e2) throw e2
        }
        setSyncError(null)
      } catch (e) {
        console.error('updateShared error:', e)
        setSyncError(e.message)
      }
      return
    }

    // Other fields — direct update (creator-only via RLS)
    const colMap = {
      phase1CapLimit: 'phase1_cap_limit',
      exploreLocations: 'explore_locations',
      battles: 'battles',
      inhabitantsState: 'inhabitants_state',
      battlePageState: 'battle_page_state',
    }
    const col = colMap[field] ?? field

    try {
      const { error } = await supabase
        .from('campaigns')
        .update({ [col]: value })
        .eq('id', campaignId)

      if (error) throw error
      setSharedState(prev => ({ ...prev, [field]: value }))
    } catch (e) {
      console.error('updateShared error:', e)
      setSyncError(e.message)
    }
  }, [campaignId, isOnline])

  const saveInhabitantsState = useCallback(async (nextInhabitantsState) => {
    const normalized = normalizeInhabitantsState(nextInhabitantsState)
    if (!isOnline) {
      solo.setState(prev => ({ ...prev, inhabitantsState: normalized }))
      return
    }
    try {
      const { error } = await supabase.rpc('patch_campaign_inhabitants_state', {
        p_campaign_id: campaignId,
        p_state: normalized,
      })
      if (!error) {
        setSharedState(prev => ({ ...prev, inhabitantsState: normalized }))
        setSyncError(null)
        return
      }
      throw error
    } catch (e) {
      console.warn('patch_campaign_inhabitants_state RPC missing or failed; trying direct campaigns update (creator-only RLS):', e)
      try {
        const { error: e2 } = await supabase
          .from('campaigns')
          .update({ inhabitants_state: normalized })
          .eq('id', campaignId)
        if (e2) throw e2
        setSharedState(prev => ({ ...prev, inhabitantsState: normalized }))
        setSyncError(null)
      } catch (e3) {
        console.error('saveInhabitantsState:', e3)
        setSyncError(e3.message ?? String(e3))
      }
    }
  }, [campaignId, isOnline, solo])

  const saveBattlePageState = useCallback(async (nextBattlePageState) => {
    const normalized = normalizeBattlePageState(nextBattlePageState)
    if (!isOnline) {
      solo.setState(prev => ({ ...prev, battlePageState: normalized }))
      return
    }
    // Optimistic update — reflect immediately before async save
    setSharedState(prev => ({ ...prev, battlePageState: normalized }))
    try {
      const { error } = await supabase.rpc('patch_campaign_battle_page_state', {
        p_campaign_id: campaignId,
        p_state: normalized,
      })
      if (!error) { setSyncError(null); return }
      throw error
    } catch (e) {
      console.warn('patch_campaign_battle_page_state RPC missing or failed; trying direct campaigns update:', e)
      try {
        const { error: e2 } = await supabase
          .from('campaigns')
          .update({ battle_page_state: normalized })
          .eq('id', campaignId)
        if (e2) throw e2
        setSyncError(null)
      } catch (e3) {
        console.error('saveBattlePageState:', e3)
        setSyncError(e3.message ?? String(e3))
      }
    }
  }, [campaignId, isOnline, solo])

  const saveCampaignNarratives = useCallback(async (nextNarratives) => {
    if (!isOnline) return
    setSharedState(prev => ({ ...prev, campaignNarratives: nextNarratives }))
    try {
      const { error } = await supabase
        .from('campaigns')
        .update({ campaign_narratives: nextNarratives })
        .eq('id', campaignId)
      if (error) throw error
      setSyncError(null)
    } catch (e) {
      console.error('saveCampaignNarratives:', e)
      setSyncError(e.message ?? String(e))
    }
  }, [campaignId, isOnline])

  const saveCampaignBattles = useCallback(async (nextBattles) => {
    if (!isOnline) {
      solo.setState(prev => ({ ...prev, battles: nextBattles }))
      return
    }
    // Optimistic update
    setSharedState(prev => ({ ...prev, battles: nextBattles }))
    try {
      const { error } = await supabase.rpc('patch_campaign_battles', {
        p_campaign_id: campaignId,
        p_battles: nextBattles,
      })
      if (!error) { setSyncError(null); return }
      throw error
    } catch (e) {
      console.warn('patch_campaign_battles RPC missing or failed; trying direct update:', e)
      try {
        const { error: e2 } = await supabase
          .from('campaigns')
          .update({ battles: nextBattles })
          .eq('id', campaignId)
        if (e2) throw e2
        setSyncError(null)
      } catch (e3) {
        console.error('saveCampaignBattles:', e3)
        setSyncError(e3.message ?? String(e3))
      }
    }
  }, [campaignId, isOnline, solo])

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
      saveInhabitantsState,
      saveBattlePageState,
      saveCampaignBattles,
      saveCampaignNarratives,
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
    saveInhabitantsState,
    saveBattlePageState,
    saveCampaignBattles,
    saveCampaignNarratives,
    syncing,
    syncError,
    isOnline: true,
  }
}
