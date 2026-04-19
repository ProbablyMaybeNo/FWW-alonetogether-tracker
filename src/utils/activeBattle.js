import { normalizeBattlePageState } from './battlePageState'

export function defaultActiveBattle() {
  return {
    version: 1,
    status: 'setup',
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
    outcome: null,
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
