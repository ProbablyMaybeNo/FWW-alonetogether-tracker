import { useState } from 'react'
import { Shuffle } from 'lucide-react'
import { shuffleIndices } from '../../utils/inhabitantsState'
import { buildShuffledIndexPile } from '../../utils/battlePageState'

/**
 * Index-based battle deck (creature, stranger, danger, explore, event).
 * cards: [{ id, name }] — indices refer to this array order (stable).
 */
export default function BattleDeckPanel({ title, deckKey, cards, battlePage, patchBattle }) {
  const [pendingIndex, setPendingIndex] = useState(null)

  const ds = battlePage.deckStates[deckKey] || { drawPile: [], discardPile: [] }
  const drawPile = ds.drawPile || []
  const discardPile = ds.discardPile || []
  const total = cards.length
  const remaining = drawPile.length
  const disc = discardPile.length

  function resolveDrawPile(drawP, discP) {
    let dp = [...drawP]
    let di = [...discP]
    if (dp.length === 0 && di.length > 0) {
      dp = shuffleIndices(di.length).map(i => di[i])
      di = []
    }
    return { dp, di }
  }

  function handleShuffle() {
    if (!total) return
    patchBattle(b => {
      const cur = b.deckStates[deckKey]
      return {
        ...b,
        undo: { deckKey, before: { drawPile: [...(cur?.drawPile || [])], discardPile: [...(cur?.discardPile || [])] } },
        deckStates: {
          ...b.deckStates,
          [deckKey]: { drawPile: buildShuffledIndexPile(total), discardPile: [] },
        },
      }
    })
    setPendingIndex(null)
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
      deckStates: {
        ...b.deckStates,
        [deckKey]: { drawPile: newDraw, discardPile: di },
      },
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
          [deckKey]: {
            ...cur,
            discardPile: [...(cur.discardPile || []), idx],
          },
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
      deckStates: {
        ...b.deckStates,
        [deckKey]: { drawPile: u.before.drawPile, discardPile: u.before.discardPile },
      },
      undo: null,
    }))
    setPendingIndex(null)
  }

  const pendingCard = pendingIndex != null ? cards[pendingIndex] : null

  return (
    <div className="border border-pip-dim/40 rounded-lg bg-panel p-3 space-y-2">
      <div className="flex flex-wrap items-center gap-2 border-b border-pip-dim/30 pb-2">
        <h3 className="text-pip text-xs font-bold tracking-widest flex-1">{title}</h3>
        <span className="text-muted text-[10px]">{remaining}/{total} · disc {disc}</span>
        <button
          type="button"
          onClick={handleShuffle}
          disabled={!total}
          className="flex items-center gap-1 text-[10px] text-muted border border-muted/30 rounded px-2 py-1 hover:text-pip"
        >
          <Shuffle size={10} /> SHUFFLE
        </button>
        {battlePage.undo?.deckKey === deckKey && (
          <button type="button" onClick={handleUndo} className="text-[10px] text-amber border border-amber/40 rounded px-2 py-1">
            UNDO
          </button>
        )}
      </div>
      <button
        type="button"
        onClick={handleDraw}
        disabled={pendingIndex !== null || total === 0 || (remaining === 0 && disc === 0)}
        className="text-xs border border-amber text-amber font-bold px-3 py-1.5 rounded hover:bg-amber/10 disabled:opacity-40"
      >
        DRAW
      </button>

      {pendingCard && (
        <div className="border border-amber/40 rounded p-3 space-y-2 mt-2" style={{ boxShadow: '0 0 8px var(--color-amber-glow)' }}>
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
  )
}
