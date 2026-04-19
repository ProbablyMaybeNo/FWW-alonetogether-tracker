import { useState, useEffect, useCallback, useRef } from 'react'
import { useCampaign } from '../context/CampaignContext'
import {
  normalizeSettlementItemDeck,
  createInitialSettlementItemDeck,
  drawOneFromSettlementItemDeck,
  contributeRandomCardsToBattle as pickCardsForBattle,
  restoreCardToDrawPile,
  lookupItemMeta,
  ALL_ITEM_CATALOG_IDS,
} from '../utils/settlementItemDeckUtils'

const INIT_NOTICE_MS = 8000
const EXHAUST_ALERT_MS = 4000

/**
 * Settlement Item Deck — full items.json catalog, draw/discard/restore + battle contribution.
 * State persists via useCampaign (Supabase player_data.settlement_item_deck + offline localStorage).
 */
export function useSettlementItemDeck() {
  const { state, setState } = useCampaign()
  const [lastDrawn, setLastDrawn] = useState(null)
  const [exhaustAlert, setExhaustAlert] = useState(null)
  const [initNotice, setInitNotice] = useState(null)
  const [discardOpen, setDiscardOpen] = useState(false)
  const [discardSearch, setDiscardSearch] = useState('')
  const autoInitRef = useRef(false)

  const deck = normalizeSettlementItemDeck(state?.settlementItemDeck)

  const drawLen = state?.settlementItemDeck?.drawPile?.length ?? 0
  const discLen = state?.settlementItemDeck?.discardPile?.length ?? 0

  // Auto-init when both piles empty (new player / null column)
  useEffect(() => {
    if (!state || autoInitRef.current) return
    if (drawLen > 0 || discLen > 0) {
      autoInitRef.current = true
      return
    }
    autoInitRef.current = true
    queueMicrotask(() => {
      const initial = createInitialSettlementItemDeck()
      setState(prev => ({ ...prev, settlementItemDeck: initial }))
      setInitNotice(`Settlement Item Deck initialized with ${initial.drawPile.length} cards.`)
    })
  }, [state, setState, drawLen, discLen])

  useEffect(() => {
    if (!initNotice) return
    const t = setTimeout(() => setInitNotice(null), INIT_NOTICE_MS)
    return () => clearTimeout(t)
  }, [initNotice])

  useEffect(() => {
    if (!exhaustAlert) return
    const t = setTimeout(() => setExhaustAlert(null), EXHAUST_ALERT_MS)
    return () => clearTimeout(t)
  }, [exhaustAlert])

  const patchDeck = useCallback(
    (next) => {
      setState(prev => ({ ...prev, settlementItemDeck: normalizeSettlementItemDeck(next) }))
    },
    [setState]
  )

  const drawCard = useCallback(() => {
    const norm = normalizeSettlementItemDeck(state?.settlementItemDeck)
    const { next, lastId, reshuffledCount } = drawOneFromSettlementItemDeck(norm)
    if (lastId == null) return
    patchDeck(next)
    if (reshuffledCount != null && reshuffledCount > 0) {
      setExhaustAlert(`Deck exhausted — reshuffled ${reshuffledCount} cards back in.`)
    }
    const meta = lookupItemMeta(lastId)
    setLastDrawn({ id: lastId, name: meta.name, subType: meta.subType })
  }, [state?.settlementItemDeck, patchDeck])

  const restoreCard = useCallback(
    (itemId) => {
      const norm = normalizeSettlementItemDeck(state?.settlementItemDeck)
      const { next, ok } = restoreCardToDrawPile(norm, itemId)
      if (!ok) return
      patchDeck(next)
    },
    [state?.settlementItemDeck, patchDeck]
  )

  /**
   * Removes n random cards from the draw pile (reshuffling from discard when needed),
   * moves them to discard, returns their catalog ids (for Wasteland Items Deck).
   */
  const contributeCardsToBattle = useCallback(
    (n) => {
      const norm = normalizeSettlementItemDeck(state?.settlementItemDeck)
      const { next, ids } = pickCardsForBattle(norm, n)
      patchDeck(next)
      return ids
    },
    [state?.settlementItemDeck, patchDeck]
  )

  const discardEntries = deck.discardPile.map(id => {
    const m = lookupItemMeta(id)
    return { id, name: m.name, subType: m.subType }
  })

  const filteredDiscard = discardSearch.trim()
    ? discardEntries.filter(
        e =>
          e.name.toLowerCase().includes(discardSearch.trim().toLowerCase()) ||
          e.subType.toLowerCase().includes(discardSearch.trim().toLowerCase())
      )
    : discardEntries

  return {
    settlementItemDeck: deck,
    drawPile: deck.drawPile,
    discardPile: deck.discardPile,
    manuallyRestored: deck.manuallyRestored,
    drawCard,
    restoreCard,
    contributeCardsToBattle,
    lastDrawn,
    exhaustAlert,
    initNotice,
    discardOpen,
    setDiscardOpen,
    discardSearch,
    setDiscardSearch,
    filteredDiscard,
    discardCount: deck.discardPile.length,
    drawCount: deck.drawPile.length,
    catalogTotal: ALL_ITEM_CATALOG_IDS.length,
  }
}
