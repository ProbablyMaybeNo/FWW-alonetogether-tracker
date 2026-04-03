import { useState, useMemo } from 'react'
import { Shuffle, Plus, Minus, ChevronDown, ChevronUp, Users } from 'lucide-react'
import { shuffleIndices } from '../../utils/inhabitantsState'

/**
 * Local Population deck.
 * pool: array of unit IDs the user has manually added — drawn randomly from.
 * drawPile / discardPile: index references into pool (positional).
 */
export default function LocalPopulationDeckPanel({ battlePage, patchBattle, unitsData }) {
  const [pendingUnitId, setPendingUnitId] = useState(null)
  const [showPicker, setShowPicker] = useState(false)
  const [factionFilter, setFactionFilter] = useState('')
  const [search, setSearch] = useState('')

  const ds = battlePage.localPopulation || { pool: [], drawPile: [], discardPile: [] }
  const pool = ds.pool || []
  const drawPile = ds.drawPile || []
  const discardPile = ds.discardPile || []
  const deckIsEmpty = drawPile.length === 0 && discardPile.length === 0
  const unitById = (id) => unitsData.find(u => u.id === id)

  const factions = useMemo(() => {
    const s = new Set(unitsData.map(u => u.faction).filter(Boolean))
    return [...s].sort()
  }, [unitsData])

  const filteredUnits = useMemo(() => {
    return unitsData.filter(u => {
      if (factionFilter && u.faction !== factionFilter) return false
      if (search && !u.name.toLowerCase().includes(search.toLowerCase())) return false
      return true
    })
  }, [unitsData, factionFilter, search])

  function addUnit(unitId) {
    patchBattle(b => ({
      ...b,
      localPopulation: {
        ...b.localPopulation,
        pool: [...(b.localPopulation.pool || []), unitId],
      },
    }))
  }

  function removeFromPool(poolIdx) {
    patchBattle(b => {
      const next = [...(b.localPopulation.pool || [])]
      next.splice(poolIdx, 1)
      return {
        ...b,
        localPopulation: {
          ...b.localPopulation,
          pool: next,
          // Clear draw pile since pool changed
          drawPile: [],
          discardPile: [],
        },
      }
    })
    setPendingUnitId(null)
  }

  function addRandom(count = 1) {
    const available = unitsData.map(u => u.id)
    const shuffled = available.sort(() => Math.random() - 0.5)
    const picked = shuffled.slice(0, count)
    patchBattle(b => ({
      ...b,
      localPopulation: {
        ...b.localPopulation,
        pool: [...(b.localPopulation.pool || []), ...picked],
      },
    }))
  }

  function handleShufflePool() {
    if (!pool.length) return
    patchBattle(b => {
      const p = b.localPopulation.pool || []
      return {
        ...b,
        undo: { deckKey: 'localPopulation', before: { drawPile: [...drawPile], discardPile: [...discardPile] } },
        localPopulation: {
          ...b.localPopulation,
          drawPile: shuffleIndices(p.length).map(i => p[i]),
          discardPile: [],
        },
      }
    })
    setPendingUnitId(null)
  }

  function handleClearPool() {
    patchBattle(b => ({
      ...b,
      localPopulation: { pool: [], drawPile: [], discardPile: [] },
    }))
    setPendingUnitId(null)
  }

  function resolveDrawPile(drawP, discP) {
    let dp = [...drawP]
    let di = [...discP]
    if (dp.length === 0 && di.length > 0) {
      dp = di.sort(() => Math.random() - 0.5)
      di = []
    }
    return { dp, di }
  }

  function handleDraw() {
    if (pendingUnitId != null) return
    const { dp, di } = resolveDrawPile(drawPile, discardPile)
    if (dp.length === 0) return
    const uid = dp[0]
    patchBattle(b => ({
      ...b,
      undo: { deckKey: 'localPopulation', before: { drawPile: [...drawPile], discardPile: [...discardPile] } },
      localPopulation: { ...b.localPopulation, drawPile: dp.slice(1), discardPile: di },
    }))
    setPendingUnitId(uid)
  }

  function confirmDraw() {
    if (pendingUnitId == null) return
    patchBattle(b => ({
      ...b,
      localPopulation: {
        ...b.localPopulation,
        discardPile: [...(b.localPopulation.discardPile || []), pendingUnitId],
      },
    }))
    setPendingUnitId(null)
  }

  function handleUndo() {
    const u = battlePage.undo
    if (!u || u.deckKey !== 'localPopulation' || !u.before) return
    patchBattle(b => ({
      ...b,
      localPopulation: { ...b.localPopulation, drawPile: u.before.drawPile, discardPile: u.before.discardPile },
      undo: null,
    }))
    setPendingUnitId(null)
  }

  const pendingUnit = pendingUnitId != null ? unitById(pendingUnitId) : null

  return (
    <div className="border border-info/40 rounded-lg bg-panel p-3 space-y-3">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-2 border-b border-pip-dim/30 pb-2">
        <h3 className="text-info text-xs font-bold tracking-widest flex-1">LOCAL POPULATION</h3>
        <span className="text-muted text-[10px]">
          Pool: {pool.length} · Draw: {drawPile.length} · Disc: {discardPile.length}
        </span>
        {battlePage.undo?.deckKey === 'localPopulation' && (
          <button type="button" onClick={handleUndo} className="text-[10px] text-amber border border-amber/40 rounded px-2 py-1">UNDO</button>
        )}
        <button
          type="button"
          onClick={() => setShowPicker(v => !v)}
          className="flex items-center gap-1 text-[10px] text-muted border border-muted/30 rounded px-2 py-1 hover:text-pip"
        >
          <Users size={10} /> {showPicker ? 'HIDE UNITS' : 'ADD UNITS'}
          {showPicker ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
        </button>
      </div>

      <p className="text-muted text-[10px]">
        Add units manually or randomly to your local population unit pool, then draw randomly from the pool during your games.
      </p>

      {/* Unit picker */}
      {showPicker && (
        <div className="border border-pip-dim/30 rounded bg-panel-dark p-2 space-y-2">
          <div className="flex gap-2 flex-wrap items-center">
            <select
              value={factionFilter}
              onChange={e => setFactionFilter(e.target.value)}
              className="text-[10px] py-1 px-2 flex-1 min-w-28"
            >
              <option value="">All factions</option>
              {factions.map(f => <option key={f} value={f}>{f}</option>)}
            </select>
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search units..."
              className="text-[10px] py-1 px-2 flex-1 min-w-28"
            />
            <button
              type="button"
              onClick={() => addRandom(3)}
              className="text-[10px] border border-amber/50 text-amber rounded px-2 py-1 hover:bg-amber/10 shrink-0"
            >
              + 3 RANDOM
            </button>
          </div>
          <div className="max-h-52 overflow-y-auto space-y-0.5">
            {filteredUnits.map(unit => (
              <div key={unit.id} className="flex items-center gap-2 px-2 py-1 rounded hover:bg-panel-light">
                <span className="text-pip text-[10px] flex-1 font-bold">{unit.name}</span>
                <span className="text-muted text-[10px] shrink-0">{unit.faction}</span>
                <button
                  type="button"
                  onClick={() => addUnit(unit.id)}
                  className="shrink-0 text-[10px] border border-pip/30 text-pip rounded px-1.5 py-0.5 hover:bg-pip-dim/20"
                >
                  <Plus size={10} />
                </button>
              </div>
            ))}
            {filteredUnits.length === 0 && (
              <p className="text-muted text-[10px] text-center py-3">No units match filter</p>
            )}
          </div>
        </div>
      )}

      {/* Pool contents */}
      {pool.length > 0 && (
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-muted text-[10px] flex-1 tracking-wider">UNIT POOL ({pool.length})</span>
            <button
              type="button"
              onClick={handleShufflePool}
              className="flex items-center gap-1 text-[10px] border border-amber text-amber rounded px-2 py-1 hover:bg-amber/10"
            >
              <Shuffle size={10} /> SHUFFLE INTO DECK
            </button>
            <button
              type="button"
              onClick={handleClearPool}
              className="text-[10px] border border-muted/30 text-muted rounded px-2 py-1 hover:text-danger hover:border-danger/40"
            >
              CLEAR
            </button>
          </div>
          <div className="max-h-32 overflow-y-auto space-y-0.5">
            {pool.map((uid, i) => {
              const u = unitById(uid)
              const inDiscard = discardPile.includes(uid)
              return (
                <div key={i} className={`flex items-center gap-2 px-2 py-1 rounded text-[10px] ${inDiscard ? 'opacity-40' : ''}`}>
                  <span className={`text-pip font-bold flex-1 ${inDiscard ? 'line-through' : ''}`}>{u?.name ?? uid}</span>
                  <span className="text-muted shrink-0">{u?.faction}</span>
                  {deckIsEmpty && (
                    <button
                      type="button"
                      onClick={() => removeFromPool(i)}
                      className="shrink-0 text-muted hover:text-danger"
                    >
                      <Minus size={10} />
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Draw interface */}
      {!deckIsEmpty && (
        <div className="space-y-2 border-t border-pip-dim/20 pt-2">
          <button
            type="button"
            onClick={handleDraw}
            disabled={pendingUnitId != null || (drawPile.length === 0 && discardPile.length === 0)}
            className="text-xs border border-amber text-amber font-bold px-3 py-1.5 rounded hover:bg-amber/10 disabled:opacity-40"
          >
            DRAW
          </button>
          {drawPile.length === 0 && discardPile.length > 0 && (
            <span className="text-muted text-[10px] ml-2">Pool exhausted — next draw reshuffles</span>
          )}
          {pendingUnit && (
            <div className="border border-amber/40 rounded p-3 space-y-2" style={{ boxShadow: '0 0 8px var(--color-amber-glow)' }}>
              <p className="text-muted text-[10px] tracking-wider">DRAWN</p>
              <p className="text-pip font-bold text-sm">{pendingUnit.name}</p>
              <p className="text-muted text-xs">{pendingUnit.faction}</p>
              <button type="button" onClick={confirmDraw} className="w-full text-xs py-2 border border-pip text-pip rounded font-bold">
                RESOLVED → DISCARD
              </button>
            </div>
          )}
        </div>
      )}

      {pool.length === 0 && (
        <p className="text-muted text-[10px] italic">No units in pool. Use ADD UNITS to build your local population.</p>
      )}
    </div>
  )
}
