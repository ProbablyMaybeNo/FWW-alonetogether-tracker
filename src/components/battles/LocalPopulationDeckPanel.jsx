import { useState } from 'react'
import { Shuffle } from 'lucide-react'
import { shuffleIndices } from '../../utils/inhabitantsState'

/** Draw pile stores unit catalog ids from units.json (same roster source). */
export default function LocalPopulationDeckPanel({ battlePage, patchBattle, unitsData }) {
  const [pendingUnitId, setPendingUnitId] = useState(null)

  const ds = battlePage.localPopulation || { drawPile: [], discardPile: [] }
  const drawPile = ds.drawPile || []
  const discardPile = ds.discardPile || []
  const unitById = (id) => unitsData.find(u => u.id === id)

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
    const ids = unitsData.map(u => u.id)
    if (!ids.length) return
    patchBattle(b => ({
      ...b,
      undo: { deckKey: 'localPopulation', before: { drawPile: [...drawPile], discardPile: [...discardPile] } },
      localPopulation: {
        drawPile: shuffleIndices(ids.length).map(i => ids[i]),
        discardPile: [],
      },
    }))
    setPendingUnitId(null)
  }

  function handleDraw() {
    if (pendingUnitId != null) return
    const { dp, di } = resolveDrawPile(drawPile, discardPile)
    if (dp.length === 0) return
    const uid = dp[0]
    patchBattle(b => ({
      ...b,
      undo: { deckKey: 'localPopulation', before: { drawPile: [...drawPile], discardPile: [...discardPile] } },
      localPopulation: { drawPile: dp.slice(1), discardPile: di },
    }))
    setPendingUnitId(uid)
  }

  function confirmDraw() {
    if (pendingUnitId == null) return
    const uid = pendingUnitId
    patchBattle(b => ({
      ...b,
      localPopulation: {
        ...b.localPopulation,
        discardPile: [...(b.localPopulation.discardPile || []), uid],
      },
    }))
    setPendingUnitId(null)
  }

  function handleUndo() {
    const u = battlePage.undo
    if (!u || u.deckKey !== 'localPopulation' || !u.before) return
    patchBattle(b => ({
      ...b,
      localPopulation: { drawPile: u.before.drawPile, discardPile: u.before.discardPile },
      undo: null,
    }))
    setPendingUnitId(null)
  }

  const pendingUnit = pendingUnitId != null ? unitById(pendingUnitId) : null
  const total = unitsData.length

  return (
    <div className="border border-info/40 rounded-lg bg-panel p-3 space-y-2">
      <div className="flex flex-wrap items-center gap-2 border-b border-pip-dim/30 pb-2">
        <h3 className="text-info text-xs font-bold tracking-widest flex-1">LOCAL POPULATION (UNITS)</h3>
        <span className="text-muted text-[10px]">{drawPile.length}/{total} · disc {discardPile.length}</span>
        <button
          type="button"
          onClick={handleShuffle}
          disabled={!total}
          className="flex items-center gap-1 text-[10px] text-muted border border-muted/30 rounded px-2 py-1 hover:text-pip"
        >
          <Shuffle size={10} /> SHUFFLE ALL UNITS
        </button>
        {battlePage.undo?.deckKey === 'localPopulation' && (
          <button type="button" onClick={handleUndo} className="text-[10px] text-amber border border-amber/40 rounded px-2 py-1">UNDO</button>
        )}
      </div>
      <p className="text-muted text-[10px]">Same catalog as ROSTER → Add unit. Names only for now.</p>
      <button
        type="button"
        onClick={handleDraw}
        disabled={pendingUnitId != null || total === 0 || (drawPile.length === 0 && discardPile.length === 0)}
        className="text-xs border border-amber text-amber font-bold px-3 py-1.5 rounded hover:bg-amber/10 disabled:opacity-40"
      >
        DRAW
      </button>
      {pendingUnit && (
        <div className="border border-amber/40 rounded p-3 space-y-2">
          <p className="text-pip font-bold text-sm">{pendingUnit.name}</p>
          <p className="text-muted text-xs">{pendingUnit.faction}</p>
          <button type="button" onClick={confirmDraw} className="w-full text-xs py-2 border border-pip text-pip rounded font-bold">
            RESOLVED → DISCARD
          </button>
        </div>
      )}
    </div>
  )
}
