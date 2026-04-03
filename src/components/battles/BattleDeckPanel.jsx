import { useState, useMemo } from 'react'
import { Shuffle, ChevronDown, ChevronUp, Search } from 'lucide-react'
import { shuffleIndices } from '../../utils/inhabitantsState'
import { buildShuffledIndexPile } from '../../utils/battlePageState'

/**
 * Index-based battle deck (creature, stranger, danger, explore, event).
 * cards: [{ id, name }] — indices refer to this array order (stable).
 *
 * Setup mode (deck empty): shows card list with checkboxes for manual selection.
 * Draw mode (deck has cards): shows draw/discard interface.
 */
export default function BattleDeckPanel({ title, deckKey, cards, battlePage, patchBattle }) {
  const [pendingIndex, setPendingIndex] = useState(null)
  const [showCardList, setShowCardList] = useState(false)
  const [cardSearch, setCardSearch] = useState('')
  // selectedIndices: Set of array indices selected for deck building
  const [selectedIndices, setSelectedIndices] = useState(() => new Set(cards.map((_, i) => i)))

  const ds = battlePage.deckStates[deckKey] || { drawPile: [], discardPile: [] }
  const drawPile = ds.drawPile || []
  const discardPile = ds.discardPile || []
  const total = cards.length
  const remaining = drawPile.length
  const disc = discardPile.length
  const isEmpty = remaining === 0 && disc === 0

  const filteredCards = useMemo(() =>
    cardSearch
      ? cards.map((c, i) => ({ ...c, idx: i })).filter(c => c.name.toLowerCase().includes(cardSearch.toLowerCase()))
      : cards.map((c, i) => ({ ...c, idx: i })),
    [cards, cardSearch]
  )

  function resolveDrawPile(drawP, discP) {
    let dp = [...drawP]
    let di = [...discP]
    if (dp.length === 0 && di.length > 0) {
      dp = shuffleIndices(di.length).map(i => di[i])
      di = []
    }
    return { dp, di }
  }

  function shuffleFromSelection() {
    const idxArray = [...selectedIndices]
    if (!idxArray.length) return
    // Fisher-Yates via sort with random — or reuse buildShuffledIndexPile pattern
    const shuffled = idxArray
      .map(v => ({ v, sort: Math.random() }))
      .sort((a, b) => a.sort - b.sort)
      .map(({ v }) => v)
    patchBattle(b => ({
      ...b,
      undo: null,
      deckStates: { ...b.deckStates, [deckKey]: { drawPile: shuffled, discardPile: [] } },
    }))
    setPendingIndex(null)
    setShowCardList(false)
  }

  function handleShuffleAll() {
    patchBattle(b => ({
      ...b,
      undo: { deckKey, before: { drawPile: [...(b.deckStates[deckKey]?.drawPile || [])], discardPile: [...(b.deckStates[deckKey]?.discardPile || [])] } },
      deckStates: { ...b.deckStates, [deckKey]: { drawPile: buildShuffledIndexPile(total), discardPile: [] } },
    }))
    setPendingIndex(null)
    setShowCardList(false)
  }

  function handleReset() {
    patchBattle(b => ({
      ...b,
      undo: null,
      deckStates: { ...b.deckStates, [deckKey]: { drawPile: [], discardPile: [] } },
    }))
    setPendingIndex(null)
    setSelectedIndices(new Set(cards.map((_, i) => i)))
    setShowCardList(true)
  }

  function handleDraw() {
    if (pendingIndex !== null) return
    const { dp, di } = resolveDrawPile(drawPile, discardPile)
    if (dp.length === 0) return
    const idx = dp[0]
    const newDraw = dp.slice(1)
    patchBattle(b => ({
      ...b,
      undo: { deckKey, before: { drawPile: [...drawPile], discardPile: [...discardPile] } },
      deckStates: { ...b.deckStates, [deckKey]: { drawPile: newDraw, discardPile: di } },
    }))
    setPendingIndex(idx)
  }

  function confirmDraw() {
    if (pendingIndex === null) return
    const idx = pendingIndex
    patchBattle(b => {
      const cur = b.deckStates[deckKey]
      return {
        ...b,
        deckStates: {
          ...b.deckStates,
          [deckKey]: { ...cur, discardPile: [...(cur.discardPile || []), idx] },
        },
      }
    })
    setPendingIndex(null)
  }

  function handleUndo() {
    const u = battlePage.undo
    if (!u || u.deckKey !== deckKey || !u.before) return
    patchBattle(b => ({
      ...b,
      deckStates: { ...b.deckStates, [deckKey]: { drawPile: u.before.drawPile, discardPile: u.before.discardPile } },
      undo: null,
    }))
    setPendingIndex(null)
  }

  function toggleCard(idx) {
    setSelectedIndices(prev => {
      const next = new Set(prev)
      if (next.has(idx)) next.delete(idx)
      else next.add(idx)
      return next
    })
  }

  function selectAll() { setSelectedIndices(new Set(cards.map((_, i) => i))) }
  function selectNone() { setSelectedIndices(new Set()) }

  const pendingCard = pendingIndex != null ? cards[pendingIndex] : null

  return (
    <div className="border border-pip-dim/40 rounded-lg bg-panel p-3 space-y-2">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-2 border-b border-pip-dim/30 pb-2">
        <h3 className="text-pip text-xs font-bold tracking-widest flex-1">{title}</h3>
        <span className="text-muted text-[10px]">
          {isEmpty ? `${total} cards` : `${remaining}/${remaining + disc} · disc ${disc}`}
        </span>
        {!isEmpty && (
          <>
            <button
              type="button"
              onClick={handleReset}
              className="text-[10px] text-muted border border-muted/30 rounded px-2 py-1 hover:text-danger hover:border-danger/40"
            >
              RESET
            </button>
            {battlePage.undo?.deckKey === deckKey && (
              <button type="button" onClick={handleUndo} className="text-[10px] text-amber border border-amber/40 rounded px-2 py-1">
                UNDO
              </button>
            )}
          </>
        )}
        <button
          type="button"
          onClick={() => setShowCardList(v => !v)}
          className="flex items-center gap-1 text-[10px] text-muted border border-muted/30 rounded px-2 py-1 hover:text-pip"
        >
          {showCardList ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
          CARDS
        </button>
      </div>

      {/* Setup mode: deck empty, prompt to build */}
      {isEmpty && (
        <div className="space-y-2 pt-1">
          <p className="text-muted text-[10px]">
            {selectedIndices.size === total
              ? `All ${total} cards selected.`
              : `${selectedIndices.size} of ${total} cards selected.`}
            {' '}Shuffle to build deck.
          </p>
          <div className="flex gap-2 flex-wrap">
            <button
              type="button"
              onClick={shuffleFromSelection}
              disabled={selectedIndices.size === 0}
              className="flex items-center gap-1 text-xs border border-amber text-amber font-bold px-3 py-1.5 rounded hover:bg-amber/10 disabled:opacity-40"
            >
              <Shuffle size={11} /> SHUFFLE SELECTED ({selectedIndices.size})
            </button>
            <button
              type="button"
              onClick={handleShuffleAll}
              className="flex items-center gap-1 text-xs border border-pip-dim/40 text-muted px-3 py-1.5 rounded hover:border-pip hover:text-pip"
            >
              ALL {total}
            </button>
          </div>
        </div>
      )}

      {/* Draw mode: deck has cards */}
      {!isEmpty && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={handleDraw}
              disabled={pendingIndex !== null || (remaining === 0 && disc === 0)}
              className="text-xs border border-amber text-amber font-bold px-3 py-1.5 rounded hover:bg-amber/10 disabled:opacity-40"
            >
              DRAW
            </button>
            {remaining === 0 && disc > 0 && (
              <span className="text-muted text-[10px]">Deck empty — next draw reshuffles discard</span>
            )}
          </div>

          {pendingCard && (
            <div className="border border-amber/40 rounded p-3 space-y-2" style={{ boxShadow: '0 0 8px var(--color-amber-glow)' }}>
              <p className="text-muted text-[10px] tracking-wider">DRAWN</p>
              <p className="text-pip font-bold text-sm">{pendingCard.name}</p>
              <button
                type="button"
                onClick={confirmDraw}
                className="w-full text-xs py-2 border border-pip text-pip rounded hover:bg-pip-dim/20 font-bold"
              >
                RESOLVED → DISCARD
              </button>
            </div>
          )}
        </div>
      )}

      {/* Card list — collapsible */}
      {showCardList && (
        <div className="border border-pip-dim/30 rounded bg-panel-dark p-2 space-y-2 mt-1">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search size={10} className="absolute left-2 top-1/2 -translate-y-1/2 text-muted" />
              <input
                type="text"
                value={cardSearch}
                onChange={e => setCardSearch(e.target.value)}
                placeholder="Filter cards..."
                className="w-full text-[10px] pl-6 py-1"
              />
            </div>
            {isEmpty && (
              <div className="flex gap-1 shrink-0">
                <button type="button" onClick={selectAll} className="text-[10px] text-muted hover:text-pip px-1">ALL</button>
                <button type="button" onClick={selectNone} className="text-[10px] text-muted hover:text-pip px-1">NONE</button>
              </div>
            )}
          </div>
          <div className="max-h-48 overflow-y-auto space-y-0.5">
            {filteredCards.map(card => {
              const isInDiscard = discardPile.includes(card.idx)
              const isInDraw = drawPile.includes(card.idx)
              const isSelected = selectedIndices.has(card.idx)
              return (
                <div
                  key={card.idx}
                  className={`flex items-center gap-2 px-2 py-1 rounded text-[10px] ${
                    isInDiscard ? 'opacity-40' : ''
                  }`}
                >
                  {isEmpty ? (
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleCard(card.idx)}
                      className="shrink-0"
                    />
                  ) : (
                    <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                      isInDraw ? 'bg-pip' : isInDiscard ? 'bg-muted/40' : 'bg-amber'
                    }`} />
                  )}
                  <span className={isInDiscard ? 'text-muted line-through' : 'text-pip'}>{card.name}</span>
                  {isInDiscard && <span className="text-muted ml-auto">discarded</span>}
                </div>
              )
            })}
          </div>
          {isEmpty && (
            <p className="text-muted text-[10px]">{selectedIndices.size} / {total} selected</p>
          )}
        </div>
      )}
    </div>
  )
}
