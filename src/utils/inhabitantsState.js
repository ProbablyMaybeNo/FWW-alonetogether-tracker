/** @typedef {{ unitId: number; name: string; faction: string; type: string }} InhabitantCard */

/**
 * FWW red dice from d12: 1–4 → 1, 5–7 → 2, 8–10 → 3, 11–12 → 4; then minus 1 → 0–3 models.
 */
export function rollFwRedDiceMinusOne() {
  const d12 = Math.floor(Math.random() * 12) + 1
  let red
  if (d12 <= 4) red = 1
  else if (d12 <= 7) red = 2
  else if (d12 <= 10) red = 3
  else red = 4
  const models = red - 1
  return { d12, red, models }
}

export function defaultInhabitantsState() {
  return {
    decks: [],
    session: { round: 0, items: [] },
    pendingDraw: null,
  }
}

export function normalizeInhabitantsState(raw) {
  const base = defaultInhabitantsState()
  if (!raw || typeof raw !== 'object') return base
  return {
    decks: Array.isArray(raw.decks) ? raw.decks : [],
    session: {
      round: typeof raw.session?.round === 'number' ? raw.session.round : 0,
      items: Array.isArray(raw.session?.items) ? raw.session.items : [],
    },
    pendingDraw: raw.pendingDraw ?? null,
  }
}

export function shuffleIndices(n) {
  const arr = Array.from({ length: n }, (_, i) => i)
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

/**
 * @param {object[]} unitsData
 * @param {{ poolMode: string; faction: string | null; customPoolUnitIds: number[] }} opts
 */
export function getPoolUnits(unitsData, opts) {
  const { poolMode, faction, customPoolUnitIds } = opts
  if (poolMode === 'faction' && faction) {
    return unitsData.filter(u => u.faction === faction)
  }
  if (poolMode === 'custom' && customPoolUnitIds?.length) {
    const set = new Set(customPoolUnitIds)
    return unitsData.filter(u => set.has(u.id))
  }
  return [...unitsData]
}

/** @param {{ id: number; name: string; faction: string; type: string }} u */
export function unitToInhabitantCard(u) {
  return {
    unitId: u.id,
    name: u.name,
    faction: u.faction,
    type: u.type,
  }
}

export function sampleRandomDeckCards(pool, deckSize, { allowDuplicateGenerics = false } = {}) {
  if (deckSize <= 0 || pool.length === 0) return []
  if (!allowDuplicateGenerics) {
    if (pool.length < deckSize) return null
    const shuffled = shuffleIndices(pool.length).slice(0, deckSize)
    return shuffled.map(i => unitToInhabitantCard(pool[i]))
  }
  const out = []
  for (let k = 0; k < deckSize; k++) {
    out.push(unitToInhabitantCard(pool[Math.floor(Math.random() * pool.length)]))
  }
  return out
}
