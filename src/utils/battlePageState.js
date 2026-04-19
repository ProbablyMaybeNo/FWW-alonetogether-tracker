import { shuffleIndices } from './inhabitantsState'

export function defaultBattlePageState() {
  return {
    version: 1,
    sessionActive: false,
    sessionStartedAt: null,
    setup: {
      gameMode: 'skirmish',
      opponentUserIds: [],
      label: '',
    },
    scenario: {
      environmentId: null,
      battlefieldId: null,
      purposeId: null,
      scenarioId: null,
    },
    deckStates: {
      creature: { drawPile: [], discardPile: [] },
      stranger: { drawPile: [], discardPile: [] },
      danger: { drawPile: [], discardPile: [] },
      explore: { drawPile: [], discardPile: [] },
      event: { drawPile: [], discardPile: [] },
    },
    localPopulation: { pool: [], drawPile: [], discardPile: [] },
    wastelandItems: {
      contributionsByUser: {},
      drawPile: [],
      discardPile: [],
    },
    /** Per deck-type named presets: { [presetName]: number[] (card indices) } */
    deckPresets: {
      creature: {},
      stranger: {},
      danger: {},
      explore: {},
      event: {},
    },
    undo: null,
  }
}

export function normalizeBattlePageState(raw) {
  const base = defaultBattlePageState()
  if (!raw || typeof raw !== 'object') return base
  const ds = raw.deckStates || {}
  const mergeDeck = (key) => ({
    drawPile: Array.isArray(ds[key]?.drawPile) ? ds[key].drawPile : [],
    discardPile: Array.isArray(ds[key]?.discardPile) ? ds[key].discardPile : [],
  })
  return {
    ...base,
    ...raw,
    setup: { ...base.setup, ...(raw.setup || {}) },
    scenario: { ...base.scenario, ...(raw.scenario || {}) },
    deckStates: {
      creature: mergeDeck('creature'),
      stranger: mergeDeck('stranger'),
      danger: mergeDeck('danger'),
      explore: mergeDeck('explore'),
      event: mergeDeck('event'),
    },
    localPopulation: {
      pool: Array.isArray(raw.localPopulation?.pool) ? raw.localPopulation.pool : [],
      drawPile: Array.isArray(raw.localPopulation?.drawPile) ? raw.localPopulation.drawPile : [],
      discardPile: Array.isArray(raw.localPopulation?.discardPile) ? raw.localPopulation.discardPile : [],
    },
    wastelandItems: {
      contributionsByUser:
        raw.wastelandItems?.contributionsByUser && typeof raw.wastelandItems.contributionsByUser === 'object'
          ? raw.wastelandItems.contributionsByUser
          : {},
      drawPile: Array.isArray(raw.wastelandItems?.drawPile) ? raw.wastelandItems.drawPile : [],
      discardPile: Array.isArray(raw.wastelandItems?.discardPile) ? raw.wastelandItems.discardPile : [],
    },
    deckPresets: normalizeDeckPresets(raw.deckPresets),
    undo: raw.undo ?? null,
  }
}

function normalizePresetMap(m) {
  if (!m || typeof m !== 'object') return {}
  const out = {}
  for (const [name, arr] of Object.entries(m)) {
    if (!Array.isArray(arr)) continue
    const nums = arr.filter(n => typeof n === 'number' && Number.isInteger(n) && n >= 0)
    if (nums.length) out[name] = nums
  }
  return out
}

function normalizeDeckPresets(raw) {
  const base = defaultBattlePageState().deckPresets
  if (!raw || typeof raw !== 'object') return base
  return {
    creature: { ...base.creature, ...normalizePresetMap(raw.creature) },
    stranger: { ...base.stranger, ...normalizePresetMap(raw.stranger) },
    danger: { ...base.danger, ...normalizePresetMap(raw.danger) },
    explore: { ...base.explore, ...normalizePresetMap(raw.explore) },
    event: { ...base.event, ...normalizePresetMap(raw.event) },
  }
}

export function buildShuffledIndexPile(length) {
  return shuffleIndices(length)
}
