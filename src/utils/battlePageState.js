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
    localPopulation: { drawPile: [], discardPile: [] },
    wastelandItems: {
      contributionsByUser: {},
      drawPile: [],
      discardPile: [],
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
    undo: raw.undo ?? null,
  }
}

export function buildShuffledIndexPile(length) {
  return shuffleIndices(length)
}
