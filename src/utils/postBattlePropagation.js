import { getItemRef } from './calculations'
import { normalizeActiveBattle } from './activeBattle'

export const OUTCOME_OPTIONS = [
  { id: 'major_victory', label: 'Major Victory' },
  { id: 'minor_victory', label: 'Minor Victory' },
  { id: 'draw', label: 'Draw' },
  { id: 'loss', label: 'Loss' },
  { id: 'na', label: 'N/A' },
]

export function outcomeLabel(id) {
  return OUTCOME_OPTIONS.find(o => o.id === id)?.label ?? id ?? '—'
}

/** Deterministic host for one-time campaign writes (both clients must agree). */
export function canonicalBattleHostUserId(participantUserIds) {
  const ids = [...(participantUserIds || [])].filter(Boolean)
  if (ids.length === 0) return null
  return [...ids].sort()[0]
}

export function participantIdsFromBattle(ab) {
  const n = normalizeActiveBattle(ab)
  const fromSetup = n.setup?.participantUserIds
  if (Array.isArray(fromSetup) && fromSetup.length > 0) return fromSetup
  return [...new Set([...Object.keys(n.battleRosters || {}), ...Object.keys(n.participants || {})])]
}

export function outcomesConflict(outcome, participantUserIds) {
  const ids = participantUserIds.filter(Boolean)
  if (ids.length !== 2) return false
  const [a, b] = ids
  const oa = outcome?.[a]
  const ob = outcome?.[b]
  if (!oa || !ob) return false
  if (oa !== ob) return false
  return oa === 'major_victory' || oa === 'minor_victory'
}

export function allParticipantsSubmittedOutcome(outcome, participantUserIds) {
  const ids = participantUserIds.filter(Boolean)
  if (ids.length === 0) return false
  return ids.every(id => {
    const v = outcome?.[id]
    return typeof v === 'string' && v.length > 0
  })
}

export function countUnitsRemoved(participants, userId) {
  const units = participants?.[userId]?.units || {}
  return Object.values(units).filter(u => u?.removed).length
}

export function collectLootedItemsForPlayer(participants, userId) {
  const p = participants?.[userId]
  if (!p) return []
  const tray = [...(p.itemTray || [])]
  const fromUnits = Object.values(p.units || {}).flatMap(u => u.lootedItems || [])
  return [...tray, ...fromUnits]
}

export function sumCapsFromBattleLog(log, userId = null) {
  if (!Array.isArray(log)) return 0
  let sum = 0
  for (const e of log) {
    if (userId && e.userId && e.userId !== userId) continue
    const ev = (e?.event || '').toLowerCase()
    const m = ev.match(/(\d+)\s*caps?/)
    if (m) sum += parseInt(m[1], 10)
  }
  return sum
}

/**
 * Merge live battle tracking into persistent roster units (draft for editing).
 */
export function buildProposedRosterMerge(roster, battleParticipants, userId) {
  const bp = battleParticipants?.[userId]?.units || {}
  return (roster || []).map(u => {
    const b = bp[u.slotId]
    if (!b) return { ...u, __inBattle: false }
    let next = {
      ...u,
      __inBattle: true,
      regDamage: (u.regDamage || 0) + (b.regDamage || 0),
      radDamage: (u.radDamage || 0) + (b.radDamage || 0),
      battles: (u.battles || 0) + 1,
    }
    const c = b.conditions || {}
    if (c.poisoned) next.condPoisoned = true
    if (c.injuredArm) next.condInjuredArm = true
    if (c.injuredLeg) next.condInjuredLeg = true
    if (b.removed) {
      next.removed = (u.removed || 0) + 1
      next.fate = 'Pending'
    }
    return next
  })
}

export function lootToPoolItems(lootList) {
  const out = []
  for (const loot of lootList || []) {
    const itemId = loot.itemId
    const ref = itemId != null ? getItemRef(itemId) : null
    out.push({
      id: Date.now() + Math.random(),
      name: loot.name || ref?.name || 'Item',
      caps: ref?.caps ?? 0,
      subType: ref?.subType ?? 'Other',
      isBoost: false,
      boostId: null,
      boostType: null,
      location: 'recovery',
      assignedUnit: null,
    })
  }
  return out
}

/**
 * Move battle-added item instances (from roster entries) to recovery in item pool.
 */
export function moveBattleEquipmentToRecovery(itemPoolItems, battleEntries) {
  const ids = new Set()
  for (const e of battleEntries || []) {
    for (const id of e.addedItemInstanceIds || []) ids.add(id)
  }
  if (ids.size === 0) return itemPoolItems || []
  return (itemPoolItems || []).map(it => {
    if (ids.has(it.id)) {
      return { ...it, location: 'recovery', assignedUnit: null }
    }
    return it
  })
}

function newId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID()
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

export function buildLiveBattleRecord({
  activeBattle,
  outcome,
  participantUserIds,
  playerNames,
}) {
  const ab = normalizeActiveBattle(activeBattle)
  const id = newId()
  const setup = ab.setup || {}
  const participants = participantUserIds.map(userId => ({
    userId,
    playerName: playerNames?.[userId] || `Player ${String(userId).slice(0, 8)}`,
    outcome: outcome?.[userId] ?? null,
    objectivesComplete: ab.participants?.[userId]?.objectiveComplete ? 1 : 0,
  }))
  return {
    id,
    date: new Date().toISOString(),
    label: setup.label || 'Battle',
    scenario: setup.scenario?.scenarioId ?? null,
    gameMode: setup.gameMode ?? null,
    turns: ab.turn ?? 0,
    participants,
  }
}

/** Single shared log per round (host writes once). */
export function appendLiveBattleRecordToBattles(battles, roundKey, record) {
  const b = battles && typeof battles === 'object' ? { ...battles } : {}
  const roundData = { ...(b[roundKey] || {}) }
  const prev = roundData.__liveBattleRecords ?? []
  roundData.__liveBattleRecords = [...prev, record]
  b[roundKey] = roundData
  return b
}
