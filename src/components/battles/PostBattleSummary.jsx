import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { Loader2 } from 'lucide-react'
import Modal from '../layout/Modal'
import { supabase } from '../../lib/supabase'
import { normalizeActiveBattle } from '../../utils/activeBattle'
import {
  OUTCOME_OPTIONS,
  outcomeLabel,
  canonicalBattleHostUserId,
  participantIdsFromBattle,
  outcomesConflict,
  allParticipantsSubmittedOutcome,
  countUnitsRemoved,
  collectLootedItemsForPlayer,
  sumCapsFromBattleLog,
  buildProposedRosterMerge,
  lootToPoolItems,
  moveBattleEquipmentToRecovery,
  buildLiveBattleRecord,
  appendLiveBattleRecordToBattles,
} from '../../utils/postBattlePropagation'
import battleScenarios from '../../data/battle/battleScenarios.json'
import { SCAVENGER_OBJECTIVES } from '../../data/scavengerObjectives'

function stripBattleMeta(unit) {
  const { __inBattle, ...rest } = unit
  return rest
}

export default function PostBattleSummary({
  campaignId,
  activeBattle: activeBattleProp,
  currentUserId,
  saveActiveBattle,
  setState,
  updateShared,
  saveCampaignBattles,
  saveCampaignNarratives,
  sharedState,
  state,
  isOnline,
  onNavigateBattlesTab,
}) {
  const ab = normalizeActiveBattle(activeBattleProp)
  const setup = ab.setup || {}
  const scenario = battleScenarios.find(s => s.id === setup.scenario?.scenarioId)
  const participants = useMemo(() => {
    const p = participantIdsFromBattle(ab)
    return p.length > 0 ? p : [currentUserId]
  }, [ab, currentUserId])
  const hostUserId = canonicalBattleHostUserId(participants)
  const iAmHost = !isOnline || currentUserId === hostUserId

  const [uiStep, setUiStep] = useState('outcome') // outcome | summary | roster | applying
  const [playerNames, setPlayerNames] = useState({})
  const [draftRoster, setDraftRoster] = useState(null)
  const [applyError, setApplyError] = useState('')
  const [pendingNav, setPendingNav] = useState(false)
  const hostFinalizeLock = useRef(false)
  const finalizedEndedAtRef = useRef(null)

  const outcome = ab.outcome && typeof ab.outcome === 'object' ? ab.outcome : {}
  const conflict = outcomesConflict(outcome, participants)
  const allOutcomesIn = allParticipantsSubmittedOutcome(outcome, participants) && !conflict

  useEffect(() => {
    if (uiStep === 'outcome' && allOutcomesIn) {
      setUiStep('summary')
    }
  }, [uiStep, allOutcomesIn])

  useEffect(() => {
    if (pendingNav && activeBattleProp == null) {
      onNavigateBattlesTab?.()
      setPendingNav(false)
    }
  }, [pendingNav, activeBattleProp, onNavigateBattlesTab])

  const finalizeBattleCampaign = useCallback(async (snap) => {
    const abSnap = normalizeActiveBattle(snap)
    if (abSnap.status !== 'ended') return
    const round = state?.round ?? 0
    const roundKey = String(round)
    const parts = participantIdsFromBattle(abSnap)
    if (parts.length === 0) return
    const applied = abSnap.postBattleAppliedBy || {}
    if (!parts.every(id => applied[id])) return

    const oc = abSnap.outcome && typeof abSnap.outcome === 'object' ? abSnap.outcome : {}
    const record = buildLiveBattleRecord({
      activeBattle: abSnap,
      outcome: oc,
      participantUserIds: parts,
      playerNames: Object.fromEntries(parts.map(id => [id, displayName(id)])),
    })
    const nextBattles = appendLiveBattleRecordToBattles(sharedState?.battles ?? state?.battles ?? {}, roundKey, record)
    await saveCampaignBattles(nextBattles)

    const scen = battleScenarios.find(s => s.id === abSnap.setup?.scenario?.scenarioId)
    const pLabels = parts.map(id => `${displayName(id)} (${outcomeLabel(oc[id])})`).join(' · ')
    const line = `${pLabels} — ${scen?.name || 'Battle'} (Turn ${abSnap.turn ?? 1})`

    if (!isOnline) {
      setState(prev => ({
        ...prev,
        battleCount: (prev.battleCount ?? 0) + 1,
        narrativeLog: [
          ...(prev.narrativeLog || []),
          { id: Date.now(), title: 'Battle', content: line, round },
        ],
      }))
    } else {
      const battleCount = (sharedState?.battleCount ?? state?.battleCount ?? 0) + 1
      await updateShared('battleCount', battleCount)
      const narratives = sharedState?.campaignNarratives ?? []
      await saveCampaignNarratives([
        ...narratives,
        {
          id: Date.now(),
          round,
          title: 'Battle',
          content: line,
          display: false,
          createdAt: new Date().toISOString(),
        },
      ])
    }

    await saveActiveBattle(null)
    setPendingNav(true)
  }, [isOnline, setState, state?.round, state?.battles, state?.battleCount, sharedState?.battles, sharedState?.battleCount, sharedState?.campaignNarratives, displayName, saveCampaignBattles, updateShared, saveCampaignNarratives, saveActiveBattle])

  useEffect(() => {
    if (!iAmHost || !activeBattleProp) return
    const abn = normalizeActiveBattle(activeBattleProp)
    if (abn.status !== 'ended') return
    const parts = participantIdsFromBattle(abn)
    if (parts.length === 0) return
    const applied = abn.postBattleAppliedBy || {}
    if (!parts.every(id => applied[id])) return
    const ed = abn.endedAt || ''
    if (finalizedEndedAtRef.current === ed) return
    if (hostFinalizeLock.current) return

    let cancelled = false
    ;(async () => {
      hostFinalizeLock.current = true
      try {
        finalizedEndedAtRef.current = ed
        await finalizeBattleCampaign(activeBattleProp)
      } catch (e) {
        console.error('host finalize battle:', e)
        finalizedEndedAtRef.current = null
      } finally {
        if (!cancelled) hostFinalizeLock.current = false
      }
    })()
    return () => { cancelled = true }
  }, [iAmHost, activeBattleProp, finalizeBattleCampaign])

  useEffect(() => {
    if (!isOnline || !campaignId || !supabase) {
      setPlayerNames({ [currentUserId]: state?.player?.name || 'You' })
      return
    }
    let cancelled = false
    async function load() {
      const { data: playerData } = await supabase
        .from('player_data')
        .select('user_id, player_info')
        .eq('campaign_id', campaignId)
      if (cancelled) return
      const m = {}
      ;(playerData || []).forEach(pd => {
        m[pd.user_id] = pd.player_info?.name || 'Player'
      })
      setPlayerNames(m)
    }
    load()
    return () => { cancelled = true }
  }, [campaignId, isOnline, currentUserId, state?.player?.name])

  const displayName = useCallback((uid) => {
    if (uid === currentUserId) return state?.player?.name || playerNames[uid] || 'You'
    return playerNames[uid] || `Player ${String(uid).slice(0, 8)}…`
  }, [currentUserId, state?.player?.name, playerNames])

  const patchOutcome = (value) => {
    const next = normalizeActiveBattle(activeBattleProp)
    const prev = (next.outcome && typeof next.outcome === 'object') ? next.outcome : {}
    saveActiveBattle({
      ...next,
      outcome: { ...prev, [currentUserId]: value },
      lastUpdatedBy: currentUserId,
    })
  }

  const myOutcome = outcome[currentUserId]
  const waitingForOpponent =
    isOnline &&
    participants.filter(id => id !== currentUserId).some(id => !outcome[id])

  const perPlayerStats = useMemo(() => {
    const out = {}
    for (const uid of participants) {
      const loot = collectLootedItemsForPlayer(ab.participants, uid)
      const obj = ab.participants?.[uid]?.objectiveComplete
      const objTotal = setup.battleObjectiveId ? 1 : 0
      out[uid] = {
        removed: countUnitsRemoved(ab.participants, uid),
        loot,
        caps: sumCapsFromBattleLog(ab.log, uid),
        objectives: obj ? 1 : 0,
        objectivesTotal: objTotal,
      }
    }
    return out
  }, [ab.participants, ab.log, participants, setup.battleObjectiveId])

  const battleObjective = SCAVENGER_OBJECTIVES.find(o => o.id === setup.battleObjectiveId)

  function beginRosterGate() {
    const merged = buildProposedRosterMerge(state?.roster || [], ab.participants, currentUserId)
    setDraftRoster(merged.map(u => stripBattleMeta(u)))
    setUiStep('roster')
  }

  async function runApplyAll() {
    setApplyError('')
    setUiStep('applying')
    try {
      const loot = collectLootedItemsForPlayer(ab.participants, currentUserId)
      const newItems = lootToPoolItems(loot)
      const myEntries = ab.battleRosters?.[currentUserId]?.entries || []
      const capsGain = sumCapsFromBattleLog(ab.log, currentUserId)

      let completedPatch = [...(state?.completedObjectives || [])]
      const oid = setup.battleObjectiveId
      if (oid != null && ab.participants?.[currentUserId]?.objectiveComplete && !completedPatch.includes(oid)) {
        completedPatch = [...completedPatch, oid]
      }

      setState(prev => {
        const poolItems = moveBattleEquipmentToRecovery(prev.itemPool?.items || [], myEntries)
        const mergedItems = [...poolItems, ...newItems]
        return {
          ...prev,
          roster: (draftRoster || prev.roster || []).map(u => stripBattleMeta(u)),
          caps: (prev.caps ?? 0) + capsGain,
          itemPool: { ...prev.itemPool, items: mergedItems },
          completedObjectives: completedPatch,
        }
      })

      const iso = new Date().toISOString()
      const prevApplied = (ab.postBattleAppliedBy && typeof ab.postBattleAppliedBy === 'object')
        ? ab.postBattleAppliedBy
        : {}
      const nextApplied = { ...prevApplied, [currentUserId]: iso }

      await saveActiveBattle({
        ...normalizeActiveBattle(activeBattleProp),
        postBattleAppliedBy: nextApplied,
        lastUpdatedBy: currentUserId,
      })

      setPendingNav(true)
    } catch (e) {
      console.error(e)
      setApplyError(e?.message || 'Apply failed')
      setUiStep('roster')
    }
  }

  const outcomePicker = (
    <div className="space-y-4">
      <h3 className="text-pip font-bold tracking-widest text-center">HOW DID IT GO?</h3>
      {conflict && (
        <p className="text-amber text-xs border border-amber/40 rounded p-2 bg-amber/10">
          You both picked the same competitive outcome — agree on results and resubmit (each pick again).
        </p>
      )}
      <div className="grid grid-cols-2 gap-2">
        {OUTCOME_OPTIONS.map(opt => (
          <button
            key={opt.id}
            type="button"
            className={`min-h-[48px] rounded-lg border-2 text-xs font-bold tracking-wide transition-colors ${
              myOutcome === opt.id
                ? 'border-amber bg-amber/20 text-amber'
                : 'border-pip-dim/50 text-pip hover:border-pip/60'
            }`}
            onClick={() => patchOutcome(opt.id)}
          >
            {opt.label}
          </button>
        ))}
      </div>
      {waitingForOpponent && myOutcome && (
        <p className="text-muted text-xs text-center">Waiting for opponent to submit…</p>
      )}
      {!isOnline && (
        <p className="text-muted text-xs text-center">Solo — confirm your outcome to continue.</p>
      )}
    </div>
  )

  const summaryBody = (
    <div className="space-y-4 text-xs">
      <div className="text-center border-b border-pip-dim/40 pb-2">
        <p className="text-pip font-bold tracking-widest">BATTLE COMPLETE</p>
        <p className="text-muted mt-1">
          {scenario?.name || 'Scenario'} | Turn {ab.turn ?? 1}
        </p>
      </div>
      {[...participants].sort().map((uid, idx) => {
        const st = perPlayerStats[uid] || {}
        const accent = idx === 0 ? 'border-pip/50 bg-pip/5' : 'border-info/50 bg-info/5'
        const titleColor = idx === 0 ? 'text-pip' : 'text-info'
        return (
          <section key={uid} className={`border rounded-lg p-3 space-y-2 ${accent}`}>
            <h4 className={`${titleColor} font-bold`}>
              {displayName(uid)} ({outcomeLabel(outcome[uid])})
            </h4>
            <p>Units lost: {st.removed ?? 0}</p>
            <div>
              <span className="text-muted">Items gained: </span>
              {st.loot?.length ? (
                <ul className="mt-1 space-y-0.5">
                  {st.loot.map((it, i) => (
                    <li key={i}>{it.name || `Item #${it.itemId}`}</li>
                  ))}
                </ul>
              ) : (
                <span>—</span>
              )}
            </div>
            <p>Caps gained: +{st.caps ?? 0}</p>
            <p>
              Objectives complete: {st.objectives ?? 0} / {st.objectivesTotal ?? 0}
            </p>
          </section>
        )
      })}
      {battleObjective && (
        <div className="border border-amber/30 rounded p-2 space-y-1">
          <p className="text-amber font-bold text-xs">COMPLETED OBJECTIVES</p>
          {participants.some(uid => ab.participants?.[uid]?.objectiveComplete) ? (
            <p className="text-pip">• {battleObjective.name}</p>
          ) : (
            <p className="text-muted">—</p>
          )}
        </div>
      )}
      <button
        type="button"
        className="w-full min-h-[48px] rounded-lg bg-amber/90 text-terminal font-bold tracking-widest border border-amber shadow-[0_0_16px_rgba(245,158,11,0.35)]"
        onClick={beginRosterGate}
      >
        CONFIRM &amp; APPLY
      </button>
    </div>
  )

  const battleSlots = useMemo(() => {
    return new Set(
      (ab.battleRosters?.[currentUserId]?.entries || []).map(e => e.slotId),
    )
  }, [ab.battleRosters, currentUserId])

  const rosterGate = draftRoster && (
    <div className="space-y-3 text-xs">
      <div className="border-2 border-amber/60 rounded-lg p-3 bg-amber/5 space-y-2">
        <p className="text-amber font-bold">These changes will be applied to your roster</p>
        <p className="text-muted">Edit values below if needed, then apply.</p>
        <ul className="space-y-2 max-h-[40vh] overflow-y-auto">
          {draftRoster
            .filter(u => battleSlots.has(u.slotId))
            .map(u => (
              <li key={u.slotId} className="border border-pip-dim/30 rounded p-2 space-y-2">
                <p className="text-pip font-bold">{u.unitName || `Unit #${u.slotId}`}</p>
                <div className="grid grid-cols-2 gap-2">
                  <label className="space-y-0.5">
                    <span className="text-muted">Wounds (total)</span>
                    <input
                      type="number"
                      min="0"
                      className="w-full bg-terminal border rounded px-2 py-1"
                      value={u.regDamage ?? 0}
                      onChange={e => {
                        const v = parseInt(e.target.value, 10) || 0
                        setDraftRoster(dr => dr.map(x => (x.slotId === u.slotId ? { ...x, regDamage: v } : x)))
                      }}
                    />
                  </label>
                  <label className="space-y-0.5">
                    <span className="text-muted">Rads (total)</span>
                    <input
                      type="number"
                      min="0"
                      className="w-full bg-terminal border rounded px-2 py-1"
                      value={u.radDamage ?? 0}
                      onChange={e => {
                        const v = parseInt(e.target.value, 10) || 0
                        setDraftRoster(dr => dr.map(x => (x.slotId === u.slotId ? { ...x, radDamage: v } : x)))
                      }}
                    />
                  </label>
                  <label className="space-y-0.5">
                    <span className="text-muted">Removed count</span>
                    <input
                      type="number"
                      min="0"
                      className="w-full bg-terminal border rounded px-2 py-1"
                      value={u.removed ?? 0}
                      onChange={e => {
                        const v = parseInt(e.target.value, 10) || 0
                        setDraftRoster(dr => dr.map(x => (x.slotId === u.slotId ? { ...x, removed: v } : x)))
                      }}
                    />
                  </label>
                  <label className="space-y-0.5">
                    <span className="text-muted">Fate</span>
                    <select
                      className="w-full bg-terminal border rounded px-2 py-1 min-h-[36px]"
                      value={u.fate || 'Active'}
                      onChange={e => {
                        const v = e.target.value
                        setDraftRoster(dr => dr.map(x => (x.slotId === u.slotId ? { ...x, fate: v } : x)))
                      }}
                    >
                      <option value="Active">Active</option>
                      <option value="Pending">Pending</option>
                      <option value="Delayed">Delayed</option>
                      <option value="Shaken">Shaken</option>
                      <option value="Injured">Injured</option>
                      <option value="Lost">Lost</option>
                      <option value="Captured">Captured</option>
                      <option value="Dead">Dead</option>
                    </select>
                  </label>
                </div>
              </li>
            ))}
        </ul>
      </div>
      {applyError && <p className="text-danger text-xs">{applyError}</p>}
      <button
        type="button"
        className="w-full min-h-[48px] rounded-lg bg-amber text-terminal font-bold flex items-center justify-center gap-2"
        onClick={runApplyAll}
      >
        APPLY ROSTER CHANGES
      </button>
    </div>
  )

  const applying = (
    <div className="flex flex-col items-center justify-center gap-3 py-12">
      <Loader2 className="animate-spin text-amber" size={40} />
      <p className="text-pip text-sm font-bold">Applying…</p>
    </div>
  )

  const title =
    uiStep === 'outcome' ? 'POST-BATTLE' :
      uiStep === 'summary' ? 'BATTLE SUMMARY' :
        uiStep === 'roster' ? 'ROSTER CHANGES' : 'WORKING'

  return (
    <Modal
      isOpen
      wide
      onClose={() => {}}
      title={title}
    >
      {uiStep === 'outcome' && outcomePicker}
      {uiStep === 'summary' && summaryBody}
      {uiStep === 'roster' && rosterGate}
      {uiStep === 'applying' && applying}
    </Modal>
  )
}
