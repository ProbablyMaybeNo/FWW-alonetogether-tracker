import { normalizeBattlePageState } from './battlePageState'

export function defaultActiveBattle() {
  return {
    version: 1,
    status: 'setup',
    lastUpdatedBy: null,
    startedAt: null,
    setup: {
      gameMode: 'skirmish',
      participantUserIds: [],
      opponentUserIds: [],
      scenario: { environmentId: null, battlefieldId: null, purposeId: null, scenarioId: null },
      terrainNotes: '',
      pointsLimit: 500,
      turnLimit: null,
      wastelandItemsCount: 6,
      decksEnabled: {
        creature: true,
        stranger: true,
        danger: true,
        explore: true,
        event: true,
      },
      battleObjectiveId: null,
      secretPurposeId: null,
      wizardStep: 1,
    },
    readyFlags: {},
    turn: 0,
    turnHistory: [],
    participants: {},
    deckStates: {
      creature: { drawPile: [], discardPile: [], lastDrawn: null },
      stranger: { drawPile: [], discardPile: [], lastDrawn: null },
      danger: { drawPile: [], discardPile: [], lastDrawn: null },
      explore: { drawPile: [], discardPile: [], lastDrawn: null },
      event: { drawPile: [], discardPile: [], lastDrawn: null },
      wastelandItems: { drawPile: [], discardPile: [], lastDrawn: null },
    },
    battleRosters: {},
    log: [],
    outcome: {},
    endedAt: null,
  }
}

export function normalizeActiveBattle(raw) {
  const base = defaultActiveBattle()
  if (!raw || typeof raw !== 'object') return base
  const setup = { ...base.setup, ...(raw.setup || {}) }
  const scenario = { ...base.setup.scenario, ...(raw.setup?.scenario || {}) }
  setup.scenario = scenario
  setup.decksEnabled = { ...base.setup.decksEnabled, ...(raw.setup?.decksEnabled || {}) }
  const ds = raw.deckStates || {}
  const mergeDeck = (key) => ({
    drawPile: Array.isArray(ds[key]?.drawPile) ? ds[key].drawPile : [],
    discardPile: Array.isArray(ds[key]?.discardPile) ? ds[key].discardPile : [],
    lastDrawn: ds[key]?.lastDrawn ?? null,
  })
  return {
    ...base,
    ...raw,
    lastUpdatedBy: raw.lastUpdatedBy ?? null,
    setup,
    deckStates: {
      creature: mergeDeck('creature'),
      stranger: mergeDeck('stranger'),
      danger: mergeDeck('danger'),
      explore: mergeDeck('explore'),
      event: mergeDeck('event'),
      wastelandItems: mergeDeck('wastelandItems'),
    },
    battleRosters: raw.battleRosters && typeof raw.battleRosters === 'object' ? raw.battleRosters : {},
    readyFlags: raw.readyFlags && typeof raw.readyFlags === 'object' ? raw.readyFlags : {},
    turnHistory: Array.isArray(raw.turnHistory) ? raw.turnHistory : [],
    log: Array.isArray(raw.log) ? raw.log : [],
    outcome: (raw.outcome && typeof raw.outcome === 'object' && !Array.isArray(raw.outcome)) ? raw.outcome : {},
  }
}

/**
 * Merge battle page deck builder state into active_battle deckStates (lastDrawn cleared).
 * @param {ReturnType<normalizeBattlePageState>} battlePage
 * @param {ReturnType<normalizeActiveBattle>} active
 */
export function deckStatesFromBattlePage(battlePage, active) {
  const bp = normalizeBattlePageState(battlePage)
  const out = normalizeActiveBattle(active).deckStates
  const keys = ['creature', 'stranger', 'danger', 'explore', 'event']
  for (const k of keys) {
    out[k] = {
      drawPile: [...(bp.deckStates[k]?.drawPile || [])],
      discardPile: [...(bp.deckStates[k]?.discardPile || [])],
      lastDrawn: null,
    }
  }
  return out
}

export function shuffleArray(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

/**
 * Build initial per-player battle tracking from roster entries (live battle start).
 */
export function buildInitialParticipants(ab) {
  const base = normalizeActiveBattle(ab)
  const participants = {}
  const rosterMap = base.battleRosters || {}
  const userIds = new Set([
    ...Object.keys(rosterMap),
    ...((base.setup && base.setup.participantUserIds) || []),
  ])
  for (const uid of userIds) {
    const entries = rosterMap[uid]?.entries || []
    const units = {}
    for (const e of entries) {
      const slotId = e.slotId
      units[slotId] = {
        slotId,
        regDamage: 0,
        radDamage: 0,
        conditions: { poisoned: false, injuredArm: false, injuredLeg: false },
        removed: false,
        lootedItems: [],
      }
    }
    participants[uid] = {
      units,
      itemTray: [],
      objectiveComplete: false,
    }
  }
  return participants
}
