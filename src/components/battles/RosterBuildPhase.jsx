import { useState, useMemo } from 'react'
import { Check, Users } from 'lucide-react'
import { normalizeActiveBattle } from '../../utils/activeBattle'
import { getItemRef } from '../../utils/calculations'
import {
  createInitialSettlementItemDeck,
  contributeRandomCardsToBattle,
  normalizeSettlementItemDeck,
} from '../../utils/settlementItemDeckUtils'
import { supabase } from '../../lib/supabase'

function battleUnitCaps(unit, entry, poolItems) {
  const poolById = new Map((poolItems || []).map(i => [i.id, i]))
  const omitted = new Set(entry?.omittedStandardItemIds || [])
  const itemCaps = (unit.equippedItems || [])
    .filter(id => !omitted.has(id))
    .reduce((s, id) => s + (getItemRef(id)?.caps || 0), 0)
  const addedCaps = (entry?.addedItemInstanceIds || [])
    .reduce((s, instId) => s + (poolById.get(instId)?.caps ?? 0), 0)
  return (unit.baseCaps || 0) + itemCaps + addedCaps
}

export default function RosterBuildPhase({
  activeBattle: activeBattleProp,
  currentUserId,
  roster,
  saveActiveBattle,
  state,
  setState,
  campaignId,
  isOnline,
}) {
  const ab = normalizeActiveBattle(activeBattleProp)
  const setup = ab.setup
  const pointsLimit = setup.pointsLimit ?? 500
  const wastelandN = setup.wastelandItemsCount ?? 6

  const alreadySubmitted = !!ab.battleRosters[currentUserId]
  const [draftEntries, setDraftEntries] = useState([])
  const [submitted, setSubmitted] = useState(alreadySubmitted)

  const activeRoster = (roster || []).filter(u => u.fate === 'Active')
  const poolItems = (state?.itemPool?.items || []).filter(i =>
    i.location === 'stores' || i.location === 'Stores'
  )
  const boostHand = state?.boostHand || []

  const totalUsed = useMemo(() => {
    return draftEntries.reduce((sum, e) => {
      const unit = activeRoster.find(u => u.slotId === e.slotId)
      return sum + (unit ? battleUnitCaps(unit, e, poolItems) : 0)
    }, 0)
  }, [draftEntries, activeRoster, poolItems])

  const overLimit = totalUsed > pointsLimit
  const canSubmit = draftEntries.length > 0 && !overLimit

  const allParticipants = setup.participantUserIds ?? [currentUserId]
  const readyPlayers = Object.entries(ab.readyFlags)
    .filter(([, v]) => v === 'roster_ready')
    .map(([uid]) => uid)
  const waitingFor = allParticipants.filter(uid => !readyPlayers.includes(uid))

  const usedInstanceIds = new Set(draftEntries.flatMap(e => e.addedItemInstanceIds || []))
  const usedBoostIds = new Set(draftEntries.flatMap(e => e.addedBoostInstanceIds || []))

  function addUnit(slotId) {
    if (draftEntries.some(e => e.slotId === slotId)) return
    const unit = activeRoster.find(u => u.slotId === slotId)
    setDraftEntries(prev => [...prev, {
      slotId,
      unitName: unit?.unitName ?? `Unit #${slotId}`,
      omittedStandardItemIds: [],
      addedItemInstanceIds: [],
      addedBoostInstanceIds: [],
    }])
  }

  function patchEntry(slotId, patch) {
    setDraftEntries(prev => prev.map(e => e.slotId === slotId ? { ...e, ...patch } : e))
  }

  function toggleOmitStandard(slotId, itemId) {
    const entry = draftEntries.find(e => e.slotId === slotId)
    if (!entry) return
    const set = new Set(entry.omittedStandardItemIds || [])
    if (set.has(itemId)) set.delete(itemId); else set.add(itemId)
    patchEntry(slotId, { omittedStandardItemIds: [...set] })
  }

  function assignItem(slotId, instanceId) {
    const entry = draftEntries.find(e => e.slotId === slotId)
    if (!entry || entry.addedItemInstanceIds.includes(instanceId)) return
    patchEntry(slotId, { addedItemInstanceIds: [...entry.addedItemInstanceIds, instanceId] })
  }

  function removeItem(slotId, instanceId) {
    const entry = draftEntries.find(e => e.slotId === slotId)
    if (!entry) return
    patchEntry(slotId, { addedItemInstanceIds: entry.addedItemInstanceIds.filter(id => id !== instanceId) })
  }

  function assignBoost(slotId, instanceId) {
    const entry = draftEntries.find(e => e.slotId === slotId)
    if (!entry || entry.addedBoostInstanceIds.includes(instanceId)) return
    patchEntry(slotId, { addedBoostInstanceIds: [...entry.addedBoostInstanceIds, instanceId] })
  }

  function removeBoost(slotId, instanceId) {
    const entry = draftEntries.find(e => e.slotId === slotId)
    if (!entry) return
    patchEntry(slotId, { addedBoostInstanceIds: entry.addedBoostInstanceIds.filter(id => id !== instanceId) })
  }

  async function handleSubmit() {
    // Read from the flat-array format that SettlementPage uses as canonical.
    // Fall back to the object format for backwards compat, then to a fresh deck.
    const flatDraw = state?.settlementDeck ?? []
    const flatDiscard = state?.settlementDiscard ?? []
    let deck = flatDraw.length > 0 || flatDiscard.length > 0
      ? normalizeSettlementItemDeck({ drawPile: flatDraw, discardPile: flatDiscard })
      : normalizeSettlementItemDeck(state?.settlementItemDeck)
    if (deck.drawPile.length === 0 && deck.discardPile.length === 0) {
      deck = createInitialSettlementItemDeck()
    }
    const contrib = contributeRandomCardsToBattle(deck, wastelandN)

    // Write back to both schemas so SettlementPage overview stays in sync.
    setState(prev => ({
      ...prev,
      settlementDeck: contrib.next.drawPile,
      settlementDiscard: contrib.next.discardPile,
      settlementItemDeck: contrib.next,
    }))

    if (isOnline && campaignId && currentUserId && supabase) {
      try {
        await supabase.rpc('patch_settlement_item_deck', {
          p_campaign_id: campaignId,
          p_user_id: currentUserId,
          p_settlement_item_deck: contrib.next,
        })
      } catch (e) {
        console.warn('patch_settlement_item_deck:', e)
      }
    }

    if (isOnline && campaignId && currentUserId && supabase) {
      await supabase.rpc('patch_roster_submission', {
        p_campaign_id: campaignId,
        p_user_id: currentUserId,
        p_roster: { entries: draftEntries },
        p_contrib_ids: contrib.ids,
        p_last_updated_by: currentUserId,
      })
    } else {
      const base = normalizeActiveBattle(activeBattleProp)
      await saveActiveBattle({
        ...base,
        lastUpdatedBy: currentUserId,
        battleRosters: { ...base.battleRosters, [currentUserId]: { entries: draftEntries } },
        readyFlags: { ...base.readyFlags, [currentUserId]: 'roster_ready' },
        wastelandContributions: { ...(base.wastelandContributions || {}), [currentUserId]: contrib.ids },
      })
    }
    setSubmitted(true)
  }

  if (submitted) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4 p-8 text-center">
        <Check size={32} className="text-pip" />
        <p className="text-title font-bold tracking-wider">ROSTER SUBMITTED</p>
        {waitingFor.length > 0 ? (
          <div className="space-y-3">
            <p className="text-muted text-xs">
              Waiting for {waitingFor.length} player{waitingFor.length !== 1 ? 's' : ''} to submit...
            </p>
            <div className="flex gap-2 justify-center flex-wrap">
              {allParticipants.map(uid => (
                <div
                  key={uid}
                  className={`text-xs px-3 py-1.5 rounded border ${
                    readyPlayers.includes(uid)
                      ? 'border-pip text-pip'
                      : 'border-muted/30 text-muted'
                  }`}
                >
                  {uid === currentUserId ? 'You' : 'Opponent'}
                  {readyPlayers.includes(uid) ? ' ✓' : ' …'}
                </div>
              ))}
            </div>
          </div>
        ) : (
          <p className="text-amber text-xs animate-pulse">All rosters in — starting battle…</p>
        )}
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="flex items-center justify-between px-4 pt-4 pb-2 border-b border-pip-dim/30">
        <h2 className="text-title text-sm font-bold tracking-widest flex items-center gap-2">
          <Users size={16} /> BUILD BATTLE ROSTER
        </h2>
        <div className={`text-xs font-bold ${overLimit ? 'text-danger' : 'text-pip'}`}>
          {totalUsed} / {pointsLimit} caps{overLimit && ' — OVER LIMIT'}
        </div>
      </div>

      <p className="text-muted text-xs px-4 pt-2">
        Your roster is hidden from your opponent until you submit. Submitting also draws {wastelandN} cards from your Settlement Item Deck for the Wasteland.
      </p>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-muted text-xs shrink-0">Add unit:</span>
          <select
            className="text-xs flex-1 min-w-[12rem]"
            value=""
            onChange={e => { if (e.target.value) addUnit(Number(e.target.value)); e.target.value = '' }}
          >
            <option value="">— Select —</option>
            {activeRoster
              .filter(u => !draftEntries.some(e => e.slotId === u.slotId))
              .map(u => (
                <option key={u.slotId} value={u.slotId}>
                  {u.unitName} ({u.baseCaps ?? 0}c)
                </option>
              ))}
          </select>
        </div>

        {draftEntries.length === 0 && (
          <p className="text-muted text-xs border border-pip-dim/30 rounded p-3">
            Add at least one active unit to your battle roster.
          </p>
        )}

        {draftEntries.map(entry => {
          const unit = activeRoster.find(u => u.slotId === entry.slotId)
          if (!unit) return null
          const total = battleUnitCaps(unit, entry, poolItems)
          return (
            <div key={entry.slotId} className="border border-pip-dim/30 rounded p-3 space-y-2 text-xs">
              <div className="flex flex-wrap justify-between gap-2 items-start">
                <span className="text-pip font-bold">{unit.unitName}</span>
                <span className="text-muted">Base {unit.baseCaps ?? 0} · Total {total}c</span>
                <button
                  onClick={() => setDraftEntries(prev => prev.filter(e => e.slotId !== entry.slotId))}
                  className="text-danger border border-danger/40 px-2 py-0.5 rounded min-h-[32px]"
                >
                  REMOVE
                </button>
              </div>

              {(unit.equippedItems || []).length > 0 && (
                <div>
                  <p className="text-muted mb-1">Standard items — click to omit for this battle</p>
                  <div className="flex flex-wrap gap-1">
                    {(unit.equippedItems || []).map(eid => {
                      const ref = getItemRef(eid)
                      const omitted = (entry.omittedStandardItemIds || []).includes(eid)
                      return (
                        <button
                          key={eid}
                          onClick={() => toggleOmitStandard(entry.slotId, eid)}
                          className={`text-xs px-2 py-0.5 rounded border transition-opacity ${
                            omitted ? 'opacity-40 line-through border-muted/30 text-muted' : 'border-pip/40 text-pip'
                          }`}
                        >
                          {ref?.name ?? eid} ({ref?.caps ?? 0}c)
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}

              {poolItems.length > 0 && (
                <div>
                  <p className="text-pip mb-1">Battle pool items (Stores)</p>
                  <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto">
                    {poolItems
                      .filter(i => !usedInstanceIds.has(i.id) || entry.addedItemInstanceIds.includes(i.id))
                      .map(i => {
                        const onUnit = entry.addedItemInstanceIds.includes(i.id)
                        return (
                          <button
                            key={i.id}
                            disabled={!onUnit && usedInstanceIds.has(i.id)}
                            onClick={() => onUnit ? removeItem(entry.slotId, i.id) : assignItem(entry.slotId, i.id)}
                            className={`text-xs px-2 py-0.5 rounded border ${
                              onUnit ? 'border-amber text-amber' : 'border-pip-dim/40 text-muted disabled:opacity-30'
                            }`}
                          >
                            {i.name} ({i.caps ?? 0}c)
                          </button>
                        )
                      })}
                  </div>
                </div>
              )}

              {boostHand.length > 0 && (
                <div>
                  <p className="text-pip mb-1">Boost hand</p>
                  <div className="flex flex-wrap gap-1">
                    {boostHand
                      .filter(b => !usedBoostIds.has(b.instanceId) || entry.addedBoostInstanceIds.includes(b.instanceId))
                      .map(b => {
                        const onUnit = entry.addedBoostInstanceIds.includes(b.instanceId)
                        return (
                          <button
                            key={b.instanceId}
                            disabled={!onUnit && usedBoostIds.has(b.instanceId)}
                            onClick={() => onUnit ? removeBoost(entry.slotId, b.instanceId) : assignBoost(entry.slotId, b.instanceId)}
                            className={`text-xs px-2 py-0.5 rounded border ${
                              onUnit ? 'border-purple-400 text-purple-300' : 'border-pip-dim/40 text-muted'
                            }`}
                          >
                            {b.name}
                          </button>
                        )
                      })}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      <div className="p-4 pt-2 border-t border-pip-dim/30">
        <button
          onClick={handleSubmit}
          disabled={!canSubmit}
          className="w-full py-4 rounded-lg font-bold tracking-[0.2em] text-sm border-2 border-amber/80 bg-amber/15 text-amber shadow-[0_0_24px_var(--color-amber-glow)] disabled:opacity-40 disabled:shadow-none flex items-center justify-center gap-2"
        >
          <Check size={18} /> SUBMIT ROSTER
        </button>
        {overLimit && (
          <p className="text-center text-danger text-xs mt-1">Roster exceeds caps limit</p>
        )}
      </div>
    </div>
  )
}
