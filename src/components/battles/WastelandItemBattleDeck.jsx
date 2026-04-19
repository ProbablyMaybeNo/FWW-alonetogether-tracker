import { useState, useMemo } from 'react'
import { Shuffle, Plus, Minus, ChevronDown, ChevronUp } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import itemsData from '../../data/items.json'

export default function WastelandItemBattleDeck({ battlePage, patchBattle, isOnline }) {
  const { user } = useAuth()
  const [showPicker, setShowPicker] = useState(false)
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [pendingItemId, setPendingItemId] = useState(null)

  const uid = user?.id || 'solo'
  const wid = battlePage.wastelandItems || { contributionsByUser: {}, drawPile: [], discardPile: [] }
  const contrib = wid.contributionsByUser || {}
  const myList = contrib[uid] || []
  const allContribIds = Object.values(contrib).flat()
  const drawPile = wid.drawPile || []
  const discardPile = wid.discardPile || []
  const deckBuilt = drawPile.length > 0 || discardPile.length > 0

  const subTypes = useMemo(() => {
    const s = new Set(itemsData.map(i => i.subType).filter(Boolean))
    return [...s].sort()
  }, [])

  const filteredItems = useMemo(() => {
    return itemsData.filter(item => {
      if (typeFilter && item.subType !== typeFilter) return false
      if (search && !item.name.toLowerCase().includes(search.toLowerCase())) return false
      return true
    })
  }, [typeFilter, search])

  function addItem(itemId) {
    patchBattle(b => ({
      ...b,
      wastelandItems: {
        ...b.wastelandItems,
        contributionsByUser: {
          ...b.wastelandItems.contributionsByUser,
          [uid]: [...(b.wastelandItems.contributionsByUser?.[uid] || []), itemId],
        },
      },
    }))
  }

  function addRandom(count = 2) {
    const pool = [...itemsData].sort(() => Math.random() - 0.5)
    const picked = pool.slice(0, count).map(i => i.id)
    patchBattle(b => ({
      ...b,
      wastelandItems: {
        ...b.wastelandItems,
        contributionsByUser: {
          ...b.wastelandItems.contributionsByUser,
          [uid]: [...(b.wastelandItems.contributionsByUser?.[uid] || []), ...picked],
        },
      },
    }))
  }

  function removeMyItem(idx) {
    patchBattle(b => {
      const next = [...(b.wastelandItems.contributionsByUser?.[uid] || [])]
      next.splice(idx, 1)
      return {
        ...b,
        wastelandItems: {
          ...b.wastelandItems,
          contributionsByUser: { ...b.wastelandItems.contributionsByUser, [uid]: next },
        },
      }
    })
  }

  function handleBuildDeck() {
    patchBattle(b => {
      const flat = Object.values(b.wastelandItems?.contributionsByUser || {}).flat()
      if (!flat.length) return b
      const shuffled = flat.sort(() => Math.random() - 0.5)
      return {
        ...b,
        wastelandItems: { ...b.wastelandItems, drawPile: shuffled, discardPile: [] },
      }
    })
    setPendingItemId(null)
  }

  function handleResetDeck() {
    patchBattle(b => ({
      ...b,
      wastelandItems: { ...b.wastelandItems, drawPile: [], discardPile: [] },
    }))
    setPendingItemId(null)
  }

  function handleDraw() {
    if (pendingItemId != null || drawPile.length === 0) return
    const id = drawPile[0]
    patchBattle(b => ({
      ...b,
      wastelandItems: { ...b.wastelandItems, drawPile: b.wastelandItems.drawPile.slice(1) },
    }))
    setPendingItemId(id)
  }

  function confirmDraw() {
    if (pendingItemId == null) return
    patchBattle(b => ({
      ...b,
      wastelandItems: {
        ...b.wastelandItems,
        discardPile: [...(b.wastelandItems.discardPile || []), pendingItemId],
      },
    }))
    setPendingItemId(null)
  }

  const pendingItem = pendingItemId != null ? itemsData.find(i => i.id === pendingItemId) : null

  return (
    <div className="border border-amber/40 rounded-lg bg-panel p-3 space-y-3">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-2 border-b border-pip-dim/30 pb-2">
        <h3 className="text-amber text-xs font-bold tracking-widest flex-1">WASTELAND ITEM DECK</h3>
        <span className="text-muted text-xs">
          Pool: {allContribIds.length} · Draw: {drawPile.length} · Disc: {discardPile.length}
        </span>
        <button
          type="button"
          onClick={() => setShowPicker(v => !v)}
          className="flex items-center gap-1 text-xs text-muted border border-muted/30 rounded px-2 py-1 hover:text-pip"
        >
          {showPicker ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
          ADD ITEMS
        </button>
      </div>

      {/* Item picker */}
      {showPicker && (
        <div className="border border-pip-dim/30 rounded bg-panel-dark p-2 space-y-2">
          <div className="flex gap-2 flex-wrap items-center">
            <select
              value={typeFilter}
              onChange={e => setTypeFilter(e.target.value)}
              className="text-xs py-1 px-2 flex-1 min-w-28"
            >
              <option value="">All types</option>
              {subTypes.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search items..."
              className="text-xs py-1 px-2 flex-1 min-w-28"
            />
            <button
              type="button"
              onClick={() => addRandom(2)}
              className="text-xs border border-amber/50 text-amber rounded px-2 py-1 hover:bg-amber/10 shrink-0"
            >
              + 2 RANDOM
            </button>
          </div>
          <div className="max-h-48 overflow-y-auto space-y-0.5">
            {filteredItems.map(item => (
              <div key={item.id} className="flex items-center gap-2 px-2 py-1 rounded hover:bg-panel-light">
                <span className="text-pip text-xs flex-1 font-bold">{item.name}</span>
                <span className="text-muted text-xs shrink-0">{item.subType}</span>
                <button
                  type="button"
                  onClick={() => addItem(item.id)}
                  className="shrink-0 text-xs border border-pip/30 text-pip rounded px-1.5 py-0.5 hover:bg-pip-dim/20"
                >
                  <Plus size={10} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* My contributions */}
      {myList.length > 0 && (
        <div className="space-y-1">
          <span className="text-muted text-xs tracking-wider">MY ITEMS ({myList.length}){isOnline ? ' · other players add their own' : ''}</span>
          <div className="max-h-28 overflow-y-auto space-y-0.5">
            {myList.map((itemId, i) => {
              const item = itemsData.find(it => it.id === itemId)
              return (
                <div key={i} className="flex items-center gap-2 px-2 py-1 text-xs">
                  <span className="text-pip flex-1">{item?.name ?? itemId}</span>
                  <span className="text-muted shrink-0">{item?.subType}</span>
                  {!deckBuilt && (
                    <button type="button" onClick={() => removeMyItem(i)} className="text-muted hover:text-danger shrink-0">
                      <Minus size={10} />
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Build / Draw controls */}
      <div className="flex flex-wrap gap-2 items-center">
        {!deckBuilt ? (
          <button
            type="button"
            onClick={handleBuildDeck}
            disabled={allContribIds.length === 0}
            className="flex items-center gap-1 text-xs border border-amber text-amber font-bold px-3 py-1.5 rounded hover:bg-amber/10 disabled:opacity-40"
          >
            <Shuffle size={12} /> BUILD & SHUFFLE ({allContribIds.length} items)
          </button>
        ) : (
          <>
            <button
              type="button"
              onClick={handleDraw}
              disabled={pendingItemId != null || drawPile.length === 0}
              className="text-xs border border-pip text-pip font-bold px-3 py-1.5 rounded hover:bg-pip-dim/20 disabled:opacity-40"
            >
              DRAW ITEM
            </button>
            <button
              type="button"
              onClick={handleResetDeck}
              className="text-xs border border-muted/30 text-muted rounded px-3 py-1.5 hover:text-danger hover:border-danger/40"
            >
              RESET DECK
            </button>
          </>
        )}
      </div>

      {pendingItem && (
        <div className="border border-pip/40 rounded p-3 space-y-1" style={{ boxShadow: '0 0 8px var(--color-amber-glow)' }}>
          <p className="text-muted text-xs tracking-wider">DRAWN</p>
          <p className="text-pip font-bold text-sm">{pendingItem.name}</p>
          <p className="text-muted text-xs">{pendingItem.subType} · {pendingItem.caps}c</p>
          <button type="button" onClick={confirmDraw} className="mt-1 w-full text-xs py-2 border border-pip text-pip rounded font-bold hover:bg-pip-dim/20">
            RESOLVED → DISCARD
          </button>
        </div>
      )}
    </div>
  )
}
