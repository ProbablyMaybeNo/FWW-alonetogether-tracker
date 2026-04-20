import { useState, useEffect, useRef } from 'react'
import { ChevronLeft, ChevronRight, Swords } from 'lucide-react'
import { useCampaign } from '../../context/CampaignContext'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'
import { getItemRef } from '../../utils/calculations'
import { defaultActiveBattle, normalizeActiveBattle, deckStatesFromBattlePage, shuffleArray, buildInitialParticipants } from '../../utils/activeBattle'
import {
  createInitialSettlementItemDeck,
  contributeRandomCardsToBattle,
  normalizeSettlementItemDeck,
} from '../../utils/settlementItemDeckUtils'
import { normalizeBattlePageState } from '../../utils/battlePageState'
import battleEnvironments from '../../data/battle/battleEnvironments.json'
import battleBattlefields from '../../data/battle/battleBattlefields.json'
import battlePurposes from '../../data/battle/battlePurposes.json'
import battleScenarios from '../../data/battle/battleScenarios.json'
import { SCAVENGER_OBJECTIVES } from '../../data/scavengerObjectives'
import { SECRET_PURPOSES } from '../../data/secretPurposes'

const GAME_MODES = [
  { id: 'skirmish', label: 'Skirmish' },
  { id: 'wasteland', label: 'Into the Wasteland' },
  { id: 'vault', label: 'Into the Vault' },
]

function battleUnitCaps(unit, entry, poolItems) {
  const poolById = new Map((poolItems || []).map(i => [i.id, i]))
  const omitted = new Set(entry?.omittedStandardItemIds || [])
  let itemCaps = (unit.equippedItems || [])
    .filter(id => !omitted.has(id))
    .reduce((s, id) => s + (getItemRef(id)?.caps || 0), 0)
  for (const instId of entry?.addedItemInstanceIds || []) {
    const inst = poolById.get(instId)
    itemCaps += inst?.caps ?? 0
  }
  return (unit.baseCaps || 0) + itemCaps
}

function rosterEntryTotal(entries, roster, poolItems) {
  let sum = 0
  for (const e of entries) {
    const unit = roster.find(u => u.slotId === e.slotId)
    if (!unit) continue
    sum += battleUnitCaps(unit, e, poolItems)
  }
  return sum
}

export default function MatchTabWizard({
  campaignId,
  opponentRows,
  battlePage,
}) {
  const { state, setState, saveActiveBattle, isOnline, userId: ctxUserId } = useCampaign()
  const { user } = useAuth()
  const userId = ctxUserId ?? 'solo-local'
  const [isNarrow, setIsNarrow] = useState(() => typeof window !== 'undefined' && window.innerWidth < 768)
  const [fightMessage, setFightMessage] = useState(null)
  const seededDefault = useRef(false)

  useEffect(() => {
    function onResize() {
      setIsNarrow(window.innerWidth < 768)
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  const activeBattle = normalizeActiveBattle(state?.activeBattle ?? null)
  const setup = activeBattle.setup || defaultActiveBattle().setup
  const step = setup.wizardStep ?? 1

  const roster = (state?.roster || []).filter(u => u.fate === 'Active')
  const poolItems = (state?.itemPool?.items || []).filter(i => i.location === 'stores' || i.location === 'Stores')
  const boostHand = state?.boostHand || []

  const myBattleEntries = activeBattle.battleRosters?.[userId]?.entries ?? []

  function applyPatch(updater) {
    const base = normalizeActiveBattle(state?.activeBattle ?? defaultActiveBattle())
    const next = typeof updater === 'function' ? updater(structuredClone(base)) : { ...base, ...updater }
    next.status = 'setup'
    if (!next.setup) next.setup = { ...defaultActiveBattle().setup }
    next.setup.participantUserIds = [userId, ...(next.setup.opponentUserIds || [])]
    saveActiveBattle(next)
  }

  useEffect(() => {
    if (seededDefault.current || state?.activeBattle != null) return
    seededDefault.current = true
    const initial = defaultActiveBattle()
    initial.status = 'setup'
    initial.setup.wizardStep = 1
    initial.setup.participantUserIds = [userId]
    saveActiveBattle(initial)
  }, [state?.activeBattle, saveActiveBattle, userId])

  const pointsLimit = setup.pointsLimit ?? 500
  const totalUsed = rosterEntryTotal(myBattleEntries, roster, poolItems)
  const overLimit = totalUsed > pointsLimit

  const canFight =
    (setup.opponentUserIds?.length ?? 0) > 0 &&
    myBattleEntries.length > 0 &&
    !overLimit

  function setStep(n) {
    applyPatch(ab => ({
      ...ab,
      setup: { ...ab.setup, wizardStep: Math.min(5, Math.max(1, n)) },
    }))
  }

  function setSetupField(key, value) {
    applyPatch(ab => ({ ...ab, setup: { ...ab.setup, [key]: value } }))
  }

  function setScenarioField(field, value) {
    applyPatch(ab => ({
      ...ab,
      setup: {
        ...ab.setup,
        scenario: { ...ab.setup.scenario, [field]: value },
      },
    }))
  }

  function toggleOpponent(id) {
    applyPatch(ab => {
      const cur = new Set(ab.setup.opponentUserIds || [])
      if (cur.has(id)) cur.delete(id)
      else cur.add(id)
      return {
        ...ab,
        setup: { ...ab.setup, opponentUserIds: [...cur] },
      }
    })
  }

  function addUnitToBattle(slotId) {
    applyPatch(ab => {
      const entries = [...(ab.battleRosters[userId]?.entries || [])]
      if (entries.some(e => e.slotId === slotId)) return ab
      const unit = roster.find(u => u.slotId === slotId)
      entries.push({
        slotId,
        unitName: unit?.unitName ?? `Unit #${slotId}`,
        omittedStandardItemIds: [],
        addedItemInstanceIds: [],
        addedBoostInstanceIds: [],
      })
      return {
        ...ab,
        battleRosters: {
          ...ab.battleRosters,
          [userId]: { entries },
        },
      }
    })
  }

  function removeUnitFromBattle(slotId) {
    applyPatch(ab => ({
      ...ab,
      battleRosters: {
        ...ab.battleRosters,
        [userId]: {
          entries: (ab.battleRosters[userId]?.entries || []).filter(e => e.slotId !== slotId),
        },
      },
    }))
  }

  function patchEntry(slotId, patch) {
    applyPatch(ab => {
      const entries = (ab.battleRosters[userId]?.entries || []).map(e =>
        e.slotId === slotId ? { ...e, ...patch } : e
      )
      return {
        ...ab,
        battleRosters: { ...ab.battleRosters, [userId]: { entries } },
      }
    })
  }

  function toggleOmitStandard(slotId, itemId) {
    const entry = myBattleEntries.find(e => e.slotId === slotId)
    if (!entry) return
    const set = new Set(entry.omittedStandardItemIds || [])
    if (set.has(itemId)) set.delete(itemId)
    else set.add(itemId)
    patchEntry(slotId, { omittedStandardItemIds: [...set] })
  }

  const usedInstanceIds = new Set()
  for (const e of myBattleEntries) {
    for (const id of e.addedItemInstanceIds || []) usedInstanceIds.add(id)
  }

  const usedBoostIds = new Set()
  for (const e of myBattleEntries) {
    for (const id of e.addedBoostInstanceIds || []) usedBoostIds.add(id)
  }

  function assignItemToUnit(slotId, instanceId) {
    const entry = myBattleEntries.find(e => e.slotId === slotId)
    if (!entry || (entry.addedItemInstanceIds || []).includes(instanceId)) return
    patchEntry(slotId, { addedItemInstanceIds: [...(entry.addedItemInstanceIds || []), instanceId] })
  }

  function removeItemFromUnit(slotId, instanceId) {
    const entry = myBattleEntries.find(e => e.slotId === slotId)
    if (!entry) return
    patchEntry(slotId, {
      addedItemInstanceIds: (entry.addedItemInstanceIds || []).filter(id => id !== instanceId),
    })
  }

  function assignBoostToUnit(slotId, instanceId) {
    const entry = myBattleEntries.find(e => e.slotId === slotId)
    if (!entry || (entry.addedBoostInstanceIds || []).includes(instanceId)) return
    patchEntry(slotId, { addedBoostInstanceIds: [...(entry.addedBoostInstanceIds || []), instanceId] })
  }

  function removeBoostFromUnit(slotId, instanceId) {
    const entry = myBattleEntries.find(e => e.slotId === slotId)
    if (!entry) return
    patchEntry(slotId, {
      addedBoostInstanceIds: (entry.addedBoostInstanceIds || []).filter(id => id !== instanceId),
    })
  }

  async function handleFight() {
    if (!canFight) return
    const wastelandN = setup.wastelandItemsCount ?? 6
    let deck = normalizeSettlementItemDeck(state.settlementItemDeck)
    if (deck.drawPile.length === 0 && deck.discardPile.length === 0) {
      deck = createInitialSettlementItemDeck()
      setState(prev => ({ ...prev, settlementItemDeck: deck }))
    }
    const contrib = contributeRandomCardsToBattle(deck, wastelandN)
    if (contrib.ids.length < wastelandN) {
      alert(`Settlement Item Deck: only ${contrib.ids.length} card(s) available; need ${wastelandN}.`)
      return
    }
    setState(prev => ({ ...prev, settlementItemDeck: contrib.next }))
    if (isOnline && campaignId && user?.id && supabase) {
      try {
        await supabase.rpc('patch_settlement_item_deck', {
          p_campaign_id: campaignId,
          p_user_id: user.id,
          p_settlement_item_deck: contrib.next,
        })
      } catch (e) {
        console.warn('patch_settlement_item_deck:', e)
      }
    }

    const ab = normalizeActiveBattle(state.activeBattle)
    const bp = normalizeBattlePageState(battlePage)
    const mergedDecks = deckStatesFromBattlePage(bp, ab)
    const de = ab.setup.decksEnabled || {}
    for (const k of ['creature', 'stranger', 'danger', 'explore', 'event']) {
      if (de[k] === false) {
        mergedDecks[k] = { drawPile: [], discardPile: [], lastDrawn: null }
      }
    }
    mergedDecks.wastelandItems = {
      drawPile: shuffleArray(contrib.ids),
      discardPile: [],
      lastDrawn: null,
    }

    const participants = buildInitialParticipants(ab)
    const startedAt = new Date().toISOString()
    const fightPayload = {
      ...ab,
      status: 'active',
      lastUpdatedBy: userId,
      startedAt,
      turn: 1,
      turnHistory: [],
      participants,
      setup: {
        ...ab.setup,
        participantUserIds: [userId, ...(ab.setup.opponentUserIds || [])],
      },
      deckStates: mergedDecks,
      log: [
        ...(ab.log || []),
        { turn: 1, timestamp: startedAt, userId, event: 'Battle started' },
      ],
    }

    await saveActiveBattle(fightPayload)
    console.log('FIGHT! triggered', fightPayload)
    setFightMessage('Battle is live — use the full-screen tracker.')
  }

  const selectedScenario = battleScenarios.find(s => s.id === setup.scenario?.scenarioId)

  function stepValid(s) {
    if (s === 1) return (setup.opponentUserIds?.length ?? 0) > 0
    if (s === 2) return true
    if (s === 3) {
      const w = setup.wastelandItemsCount ?? 6
      return w >= 2 && w <= 20 && w % 2 === 0
    }
    if (s === 4) return myBattleEntries.length > 0 && !overLimit
    if (s === 5) return true
    return false
  }

  function nextLabel() {
    if (isNarrow && step < 5) return 'NEXT'
    return 'NEXT'
  }

  const blockingActive = state?.activeBattle?.status === 'active'

  if (blockingActive) {
    return (
      <div className="border border-amber/40 rounded-lg bg-panel p-6 text-center space-y-2">
        <p className="text-title text-sm font-bold tracking-wider">BATTLE IN PROGRESS</p>
        <p className="text-muted text-xs">Finish or clear this battle before editing match setup.</p>
      </div>
    )
  }

  const scenarioSummary = (
    <div className="border border-pip-dim/40 rounded-lg bg-panel-light p-3 space-y-1 text-xs">
      <h3 className="text-title font-bold tracking-wider">SCENARIO SETUP</h3>
      <div className="grid sm:grid-cols-2 gap-2">
        <label className="space-y-0.5">
          <span className="text-muted">Environment</span>
          <select
            value={setup.scenario?.environmentId ?? ''}
            onChange={e => setScenarioField('environmentId', e.target.value ? Number(e.target.value) : null)}
            className="w-full text-xs"
          >
            <option value="">—</option>
            {battleEnvironments.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </label>
        <label className="space-y-0.5">
          <span className="text-muted">Battlefield</span>
          <select
            value={setup.scenario?.battlefieldId ?? ''}
            onChange={e => setScenarioField('battlefieldId', e.target.value ? Number(e.target.value) : null)}
            className="w-full text-xs"
          >
            <option value="">—</option>
            {battleBattlefields.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </label>
        <label className="space-y-0.5">
          <span className="text-muted">Purpose</span>
          <select
            value={setup.scenario?.purposeId ?? ''}
            onChange={e => setScenarioField('purposeId', e.target.value ? Number(e.target.value) : null)}
            className="w-full text-xs"
          >
            <option value="">—</option>
            {battlePurposes.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </label>
        <label className="space-y-0.5">
          <span className="text-muted">Scenario</span>
          <select
            value={setup.scenario?.scenarioId ?? ''}
            onChange={e => setScenarioField('scenarioId', e.target.value ? Number(e.target.value) : null)}
            className="w-full text-xs"
          >
            <option value="">—</option>
            {battleScenarios.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </label>
      </div>
      <label className="block space-y-0.5 pt-1">
        <span className="text-muted">Terrain notes</span>
        <textarea
          value={setup.terrainNotes ?? ''}
          onChange={e => setSetupField('terrainNotes', e.target.value)}
          rows={2}
          className="w-full text-xs"
          placeholder="Describe terrain layout (optional)"
        />
      </label>
      {selectedScenario && (
        <div className="border border-pip/30 rounded p-2 mt-2 bg-panel">
          <p className="text-pip font-bold">{selectedScenario.name}</p>
          <p className="text-muted">{selectedScenario.source}</p>
        </div>
      )}
    </div>
  )

  const configBlock = (
    <div className="border border-pip-dim/40 rounded-lg bg-panel-light p-3 space-y-2 text-xs">
      <h3 className="text-title font-bold tracking-wider">BATTLE CONFIGURATION</h3>
      <div className="flex flex-wrap gap-3">
        <label className="space-y-0.5">
          <span className="text-muted">Points limit</span>
          <input
            type="number"
            min={50}
            step={50}
            value={setup.pointsLimit ?? 500}
            onChange={e => setSetupField('pointsLimit', Number(e.target.value) || 500)}
            className="w-24 text-xs"
          />
        </label>
        <label className="space-y-0.5">
          <span className="text-muted">Turn limit (blank = none)</span>
          <input
            type="number"
            min={1}
            value={setup.turnLimit ?? ''}
            onChange={e => setSetupField('turnLimit', e.target.value === '' ? null : Number(e.target.value))}
            className="w-24 text-xs"
            placeholder="—"
          />
        </label>
        <label className="space-y-0.5">
          <span className="text-muted">Game mode</span>
          <select
            value={setup.gameMode ?? 'skirmish'}
            onChange={e => setSetupField('gameMode', e.target.value)}
            className="text-xs"
          >
            {GAME_MODES.map(m => (
              <option key={m.id} value={m.id}>{m.label}</option>
            ))}
          </select>
        </label>
        <label className="space-y-0.5">
          <span className="text-muted">Wasteland items / player (even 2–20)</span>
          <input
            type="number"
            min={2}
            max={20}
            step={2}
            value={setup.wastelandItemsCount ?? 6}
            onChange={e => {
              let v = Number(e.target.value)
              if (Number.isNaN(v)) v = 6
              v = Math.min(20, Math.max(2, v))
              if (v % 2 !== 0) v -= 1
              setSetupField('wastelandItemsCount', v)
            }}
            className="w-20 text-xs"
          />
        </label>
      </div>
    </div>
  )

  const rosterBlock = (
    <div className="border border-pip-dim/40 rounded-lg bg-panel-light p-3 space-y-3 text-xs">
      <div className="flex flex-wrap gap-2 items-baseline justify-between">
        <h3 className="text-title font-bold tracking-wider">BATTLE ROSTER</h3>
        <div className="text-pip">
          Limit: {pointsLimit} · Used: {totalUsed} · Remaining: {Math.max(0, pointsLimit - totalUsed)}
          {overLimit && <span className="text-danger ml-2 font-bold">OVER LIMIT</span>}
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <span className="text-muted">Add unit:</span>
        <select
          className="text-xs flex-1 min-w-[12rem]"
          value=""
          onChange={e => {
            const v = e.target.value
            if (v) addUnitToBattle(Number(v))
            e.target.value = ''
          }}
        >
          <option value="">— Select —</option>
          {roster.filter(u => !myBattleEntries.some(e => e.slotId === u.slotId)).map(u => (
            <option key={u.slotId} value={u.slotId}>{u.unitName} ({u.baseCaps ?? 0}c)</option>
          ))}
        </select>
      </div>
      {myBattleEntries.length === 0 && (
        <p className="text-muted">Add at least one active roster unit.</p>
      )}
      <div className="space-y-3">
        {myBattleEntries.map(entry => {
          const unit = roster.find(u => u.slotId === entry.slotId)
          if (!unit) return null
          const total = battleUnitCaps(unit, entry, poolItems)
          return (
            <div key={entry.slotId} className="border border-pip-dim/30 rounded p-2 space-y-2">
              <div className="flex flex-wrap justify-between gap-2">
                <span className="text-pip font-bold">{unit.unitName}</span>
                <span className="text-muted">Base {unit.baseCaps ?? 0} · Total {total}c</span>
                <button
                  type="button"
                  onClick={() => removeUnitFromBattle(entry.slotId)}
                  className="text-danger text-xs border border-danger/40 px-2 py-0.5 rounded"
                >
                  REMOVE
                </button>
              </div>
              <p className="text-muted">Standard loadout (omit for this battle only — roster unchanged)</p>
              <div className="flex flex-wrap gap-1">
                {(unit.equippedItems || []).map(eid => {
                  const ref = getItemRef(eid)
                  const omitted = (entry.omittedStandardItemIds || []).includes(eid)
                  return (
                    <button
                      key={eid}
                      type="button"
                      onClick={() => toggleOmitStandard(entry.slotId, eid)}
                      className={`text-[10px] px-2 py-0.5 rounded border ${
                        omitted ? 'opacity-40 line-through border-muted/30' : 'border-pip/40 text-pip'
                      }`}
                    >
                      {ref?.name ?? eid} ({ref?.caps ?? 0}c) {omitted ? '· OFF' : ''}
                    </button>
                  )
                })}
                {!(unit.equippedItems || []).length && <span className="text-muted">—</span>}
              </div>
              <div>
                <p className="text-pip mb-1">Battle pool items (stores)</p>
                <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto">
                  {poolItems.filter(i => !usedInstanceIds.has(i.id) || (entry.addedItemInstanceIds || []).includes(i.id)).map(i => {
                    const onUnit = (entry.addedItemInstanceIds || []).includes(i.id)
                    return (
                      <button
                        key={i.id}
                        type="button"
                        disabled={!onUnit && usedInstanceIds.has(i.id)}
                        onClick={() => (onUnit ? removeItemFromUnit(entry.slotId, i.id) : assignItemToUnit(entry.slotId, i.id))}
                        className={`text-[10px] px-2 py-0.5 rounded border ${
                          onUnit ? 'border-amber text-amber' : 'border-pip-dim/40 text-muted'
                        }`}
                      >
                        {i.name} ({i.caps ?? 0}c)
                      </button>
                    )
                  })}
                </div>
              </div>
              <div>
                <p className="text-pip mb-1">Boost hand</p>
                <div className="flex flex-wrap gap-1">
                  {boostHand.filter(b => !usedBoostIds.has(b.instanceId) || (entry.addedBoostInstanceIds || []).includes(b.instanceId)).map(b => {
                    const onUnit = (entry.addedBoostInstanceIds || []).includes(b.instanceId)
                    return (
                      <button
                        key={b.instanceId}
                        type="button"
                        disabled={!onUnit && usedBoostIds.has(b.instanceId)}
                        onClick={() => (onUnit ? removeBoostFromUnit(entry.slotId, b.instanceId) : assignBoostToUnit(entry.slotId, b.instanceId))}
                        className={`text-[10px] px-2 py-0.5 rounded border ${
                          onUnit ? 'border-purple-400 text-purple-300' : 'border-pip-dim/40 text-muted'
                        }`}
                      >
                        {b.name}
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )

  const objectivesBlock = (
    <div className="border border-pip-dim/40 rounded-lg bg-panel-light p-3 space-y-2 text-xs">
      <h3 className="text-title font-bold tracking-wider">OBJECTIVES & DECKS</h3>
      <label className="block space-y-0.5">
        <span className="text-muted">Battle objective (optional)</span>
        <select
          value={setup.battleObjectiveId ?? ''}
          onChange={e => setSetupField('battleObjectiveId', e.target.value ? Number(e.target.value) : null)}
          className="w-full text-xs"
        >
          <option value="">—</option>
          {SCAVENGER_OBJECTIVES.map(o => (
            <option key={o.id} value={o.id}>{o.name}</option>
          ))}
        </select>
      </label>
      <label className="block space-y-0.5">
        <span className="text-muted">Secret purpose (shown as [SECRET] to opponents)</span>
        <select
          value={setup.secretPurposeId ?? ''}
          onChange={e => setSetupField('secretPurposeId', e.target.value ? Number(e.target.value) : null)}
          className="w-full text-xs"
        >
          <option value="">—</option>
          {SECRET_PURPOSES.map(o => (
            <option key={o.id} value={o.id}>{o.name}</option>
          ))}
        </select>
      </label>
      <div className="space-y-1 pt-1">
        <span className="text-muted">Decks in play</span>
        <div className="flex flex-wrap gap-2">
          {['creature', 'stranger', 'danger', 'explore', 'event'].map(key => (
            <label key={key} className="flex items-center gap-1 cursor-pointer">
              <input
                type="checkbox"
                checked={setup.decksEnabled?.[key] !== false}
                onChange={e => applyPatch(ab => ({
                  ...ab,
                  setup: {
                    ...ab.setup,
                    decksEnabled: { ...ab.setup.decksEnabled, [key]: e.target.checked },
                  },
                }))}
              />
              <span className="uppercase">{key}</span>
            </label>
          ))}
        </div>
      </div>
      <div className="border border-amber/30 rounded p-2 bg-panel text-muted">
        You contribute {setup.wastelandItemsCount ?? 6} cards from your Settlement Item Deck (shared total for the battle setup). They are discarded from your settlement deck when the battle starts.
      </div>
    </div>
  )

  const step1 = (
    <div className="border border-pip-dim/40 rounded-lg bg-panel-light p-3 space-y-2 text-xs">
      <h3 className="text-title font-bold tracking-wider">OPPONENTS</h3>
      <p className="text-muted">Select one or more opponents.</p>
      <div className="flex flex-col gap-2">
        {opponentRows.filter(p => !p.isMe).map(p => (
          <label
            key={p.userId}
            className="flex items-start gap-2 cursor-pointer border border-pip-dim/30 rounded p-2"
          >
            <input
              type="checkbox"
              checked={(setup.opponentUserIds || []).includes(p.userId)}
              onChange={() => toggleOpponent(p.userId)}
            />
            <div>
              <span className="text-pip font-bold">{p.username}</span>
              <span className="text-muted block">{p.faction} · {p.settlement}</span>
            </div>
          </label>
        ))}
      </div>
    </div>
  )

  const mobileNav = isNarrow && (
    <div className="flex items-center justify-between gap-2 py-2 border-b border-pip-dim/30 mb-2">
      <span className="text-xs text-muted">Step {step} of 5</span>
      <div className="flex gap-2">
        <button
          type="button"
          disabled={step <= 1}
          onClick={() => setStep(step - 1)}
          className="flex items-center gap-1 text-xs border border-pip/50 px-3 py-1.5 rounded disabled:opacity-30"
        >
          <ChevronLeft size={14} /> BACK
        </button>
        <button
          type="button"
          disabled={step >= 5 || !stepValid(step)}
          onClick={() => setStep(step + 1)}
          className="flex items-center gap-1 text-xs border border-pip/50 px-3 py-1.5 rounded disabled:opacity-30"
        >
          {nextLabel()} <ChevronRight size={14} />
        </button>
      </div>
    </div>
  )

  const show = (n) => !isNarrow || step === n

  return (
    <div className="space-y-4">
      {mobileNav}

      {show(1) && step1}
      {show(2) && scenarioSummary}
      {show(3) && configBlock}
      {show(4) && rosterBlock}
      {show(5) && objectivesBlock}

      {!isNarrow && (
        <div className="sticky bottom-0 left-0 right-0 pt-2 pb-4 bg-gradient-to-t from-[var(--color-terminal)] via-[var(--color-terminal)] to-transparent">
          <button
            type="button"
            disabled={!canFight}
            onClick={handleFight}
            className="w-full py-4 rounded-lg font-bold tracking-[0.2em] text-sm border-2 border-amber/80 bg-amber/15 text-amber shadow-[0_0_24px_rgba(245,158,11,0.35)] disabled:opacity-40 disabled:shadow-none flex items-center justify-center gap-2"
          >
            <Swords size={18} /> FIGHT!
          </button>
          <p className="text-center text-[10px] text-muted mt-1">Waiting for opponent ready-up — coming later. Launches immediately for now.</p>
        </div>
      )}

      {isNarrow && step === 5 && (
        <button
          type="button"
          disabled={!canFight}
          onClick={handleFight}
          className="w-full py-4 rounded-lg font-bold tracking-[0.2em] text-sm border-2 border-amber/80 bg-amber/15 text-amber shadow-[0_0_24px_rgba(245,158,11,0.35)] disabled:opacity-40 disabled:shadow-none flex items-center justify-center gap-2"
        >
          <Swords size={18} /> FIGHT!
        </button>
      )}

      {fightMessage && (
        <div className="text-center text-pip text-xs border border-pip/40 rounded py-2">
          {fightMessage}
        </div>
      )}
    </div>
  )
}
