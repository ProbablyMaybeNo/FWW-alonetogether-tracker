import itemsData from '../data/items.json'

/** Every catalog item id from items.json (source of truth for the Settlement Item Deck). */
export const ALL_ITEM_CATALOG_IDS = itemsData.map(i => i.id)

export function normalizeSettlementItemDeck(raw) {
  const d = raw && typeof raw === 'object' ? raw : {}
  return {
    drawPile: Array.isArray(d.drawPile) ? [...d.drawPile] : [],
    discardPile: Array.isArray(d.discardPile) ? [...d.discardPile] : [],
    manuallyRestored: Array.isArray(d.manuallyRestored) ? [...d.manuallyRestored] : [],
  }
}

export function shuffleArray(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export function createInitialSettlementItemDeck() {
  const drawPile = shuffleArray(ALL_ITEM_CATALOG_IDS)
  return normalizeSettlementItemDeck({ drawPile, discardPile: [], manuallyRestored: [] })
}

/**
 * Draw one card: pop from front of draw pile, append to discard. Reshuffles discard into draw when draw is empty.
 * @returns {{ next: object, lastId: number|null, reshuffledCount: number|null }}
 */
export function drawOneFromSettlementItemDeck(deckState) {
  let { drawPile, discardPile, manuallyRestored } = normalizeSettlementItemDeck(deckState)
  let reshuffledCount = null
  if (drawPile.length === 0 && discardPile.length === 0) {
    return {
      next: normalizeSettlementItemDeck({ drawPile, discardPile, manuallyRestored }),
      lastId: null,
      reshuffledCount: null,
    }
  }
  if (drawPile.length === 0) {
    reshuffledCount = discardPile.length
    drawPile = shuffleArray(discardPile)
    discardPile = []
  }
  const lastId = drawPile[0]
  const nextDraw = drawPile.slice(1)
  const nextDiscard = [...discardPile, lastId]
  return {
    next: normalizeSettlementItemDeck({
      drawPile: nextDraw,
      discardPile: nextDiscard,
      manuallyRestored,
    }),
    lastId,
    reshuffledCount,
  }
}

/**
 * Remove n random cards from draw pile (reshuffling from discard when needed), move to discard. Returns ids in pick order.
 */
export function contributeRandomCardsToBattle(deckState, n) {
  const count = Math.max(0, Math.floor(Number(n) || 0))
  let { drawPile, discardPile, manuallyRestored } = normalizeSettlementItemDeck(deckState)
  const picked = []
  for (let i = 0; i < count; i++) {
    if (drawPile.length === 0 && discardPile.length === 0) break
    if (drawPile.length === 0) {
      drawPile = shuffleArray(discardPile)
      discardPile = []
    }
    if (drawPile.length === 0) break
    const ri = Math.floor(Math.random() * drawPile.length)
    const id = drawPile[ri]
    drawPile = drawPile.filter((_, idx) => idx !== ri)
    discardPile = [...discardPile, id]
    picked.push(id)
  }
  return {
    next: normalizeSettlementItemDeck({ drawPile, discardPile, manuallyRestored }),
    ids: picked,
  }
}

/**
 * Move one occurrence of itemId from discard back into draw at a random index; append to manuallyRestored.
 */
export function restoreCardToDrawPile(deckState, itemId) {
  let { drawPile, discardPile, manuallyRestored } = normalizeSettlementItemDeck(deckState)
  const idx = discardPile.indexOf(itemId)
  if (idx === -1) return { next: normalizeSettlementItemDeck(deckState), ok: false }
  const newDiscard = [...discardPile.slice(0, idx), ...discardPile.slice(idx + 1)]
  const insertAt = Math.floor(Math.random() * (drawPile.length + 1))
  const newDraw = [...drawPile]
  newDraw.splice(insertAt, 0, itemId)
  return {
    next: normalizeSettlementItemDeck({
      drawPile: newDraw,
      discardPile: newDiscard,
      manuallyRestored: [...manuallyRestored, itemId],
    }),
    ok: true,
  }
}

export function lookupItemMeta(itemId) {
  const row = itemsData.find(i => i.id === itemId)
  if (!row) return { name: 'Unknown card', subType: '—' }
  return { name: row.name ?? 'Unknown', subType: row.subType ?? '—' }
}
