import { useState } from 'react'
import { Shuffle } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { shuffleIndices } from '../../utils/inhabitantsState'
import itemsData from '../../data/items.json'

function randomSampleIds(count) {
  const pool = [...itemsData]
  const out = []
  for (let i = 0; i < count && pool.length > 0; i++) {
    const j = Math.floor(Math.random() * pool.length)
    out.push(pool[j].id)
    pool.splice(j, 1)
  }
  return out
}

export default function WastelandItemBattleDeck({ battlePage, patchBattle, isOnline }) {
  const { user } = useAuth()
  const [countInput, setCountInput] = useState('2')
  const [pendingCatalogId, setPendingCatalogId] = useState(null)

  const wid = battlePage.wastelandItems || { contributionsByUser: {}, drawPile: [], discardPile: [] }
  const contrib = wid.contributionsByUser || {}
  const uid = user?.id || 'solo'
  const myList = contrib[uid] || []
  const flat = Object.values(contrib).flat()
  const totalContrib = flat.length
  const evenOk = totalContrib % 2 === 0 && totalContrib > 0
  const drawPile = wid.drawPile || []
  const discardPile = wid.discardPile || []

  function handleAddRandom() {
    const n = Math.max(1, parseInt(countInput, 10) || 1)
    const picked = randomSampleIds(n)
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

  function handleClearMine() {
    patchBattle(b => {
      const next = { ...b.wastelandItems.contributionsByUser }
      delete next[uid]
      return { ...b, wastelandItems: { ...b.wastelandItems, contributionsByUser: next } }
    })
  }

  function handleBuildDeck() {
    patchBattle(b => {
      const flat = Object.values(b.wastelandItems?.contributionsByUser || {}).flat()
      if (flat.length % 2 !== 0 || flat.length === 0) return b
      const shuffled = shuffleIndices(flat.length).map(i => flat[i])
      return {
        ...b,
        wastelandItems: {
          ...b.wastelandItems,
          drawPile: shuffled,
          discardPile: [],
        },
      }
    })
    setPendingCatalogId(null)
  }

  function handleDraw() {
    if (pendingCatalogId != null || drawPile.length === 0) return
    const id = drawPile[0]
    patchBattle(b => ({
      ...b,
      wastelandItems: {
        ...b.wastelandItems,
        drawPile: b.wastelandItems.drawPile.slice(1),
      },
    }))
    setPendingCatalogId(id)
  }

  function confirmDraw() {
    if (pendingCatalogId == null) return
    const id = pendingCatalogId
    patchBattle(b => ({
      ...b,
      wastelandItems: {
        ...b.wastelandItems,
        discardPile: [...(b.wastelandItems.discardPile || []), id],
      },
    }))
    setPendingCatalogId(null)
  }

  const item = pendingCatalogId != null ? itemsData.find(i => i.id === pendingCatalogId) : null

  return (
    <div className="border border-amber/40 rounded-lg bg-panel p-3 space-y-3">
      <h3 className="text-amber text-xs font-bold tracking-widest">WASTELAND ITEM DECK (SHARED)</h3>
      <p className="text-muted text-[10px]">
        Each player adds random item cards. Total contributions must be <strong className="text-pip">even</strong> before building the deck.
        {isOnline ? ' You are signed in as a distinct contributor.' : ' Solo: use this to add pairs (e.g. 2, 4, 6…).'}
      </p>
      <div className="flex flex-wrap gap-2 items-end">
        <div>
          <label className="text-muted text-[10px] block">Count</label>
          <input
            type="number"
            min={1}
            max={20}
            value={countInput}
            onChange={e => setCountInput(e.target.value)}
            className="w-16 text-xs py-1"
          />
        </div>
        <button type="button" onClick={handleAddRandom} className="text-xs border border-pip text-pip rounded px-3 py-1.5">
          ADD RANDOM TO MY POOL
        </button>
        <button type="button" onClick={handleClearMine} className="text-xs border border-muted/40 text-muted rounded px-2 py-1.5">
          CLEAR MY CONTRIBUTIONS
        </button>
      </div>
      <div className="text-xs text-pip">
        My cards: <span className="text-amber font-bold">{myList.length}</span>
        {' · '}
        Total: <span className="text-amber font-bold">{totalContrib}</span>
        {!evenOk && totalContrib > 0 && <span className="text-danger ml-2">(need even total)</span>}
        {evenOk && <span className="text-pip ml-2">✓ ready to build</span>}
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={handleBuildDeck}
          disabled={!evenOk}
          className="text-xs border border-amber text-amber font-bold px-3 py-2 rounded hover:bg-amber/10 disabled:opacity-40"
        >
          BUILD / SHUFFLE DECK
        </button>
        <span className="text-muted text-[10px] self-center">
          Draw pile: {drawPile.length} · Discard: {discardPile.length}
        </span>
      </div>
      <button
        type="button"
        onClick={handleDraw}
        disabled={pendingCatalogId != null || drawPile.length === 0}
        className="text-xs border border-pip text-pip font-bold px-3 py-1.5 rounded disabled:opacity-40"
      >
        DRAW ITEM
      </button>
      {item && (
        <div className="border border-pip/40 rounded p-3">
          <p className="text-pip font-bold text-sm">{item.name}</p>
          <p className="text-muted text-xs">{item.subType} · {item.caps}c</p>
          <button type="button" onClick={confirmDraw} className="mt-2 w-full text-xs py-2 border border-pip rounded font-bold">
            RESOLVED → DISCARD
          </button>
        </div>
      )}
    </div>
  )
}
