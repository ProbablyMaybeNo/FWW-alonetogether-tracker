import { useState } from 'react'
import { useCampaign } from '../../context/CampaignContext'
import { getDeckStats } from '../../utils/cardDraw'
import eventCardsData from '../../data/eventCards.json'
import exploreCardDeck from '../../data/exploreCardDeck.json'
import { Shuffle } from 'lucide-react'

const EVENT_FILTERS = [
  { id: 'all', label: 'ALL' },
  { id: 'available', label: 'AVAILABLE' },
  { id: 'drawn', label: 'DRAWN' },
  { id: 'inPlay', label: 'IN PLAY' },
  { id: 'complete', label: 'COMPLETE' },
]

const DECK_TABS = [
  { id: 'settlement', label: 'SETTLEMENT EVENTS' },
  { id: 'explore',    label: 'EXPLORE EVENTS' },
  { id: 'locations',  label: 'EXPLORE LOCATIONS' },
]

export default function EventsPage() {
  const { state, setState } = useCampaign()
  const [filter, setFilter] = useState('all')
  const [deckTab, setDeckTab] = useState('settlement')

  const settlementStats = getDeckStats('settlement', state.eventCards, eventCardsData)
  const exploreStats = getDeckStats('explore', state.eventCards, eventCardsData)

  const cards = eventCardsData.filter(c => c.deckType === (deckTab === 'explore' ? 'explore' : 'settlement'))

  const filteredCards = cards.filter(card => {
    const cardState = state.eventCards[card.id]
    switch (filter) {
      case 'available': return !cardState || (!cardState.drawn && !cardState.inPlay && !cardState.complete)
      case 'drawn': return cardState?.drawn && !cardState.inPlay && !cardState.complete
      case 'inPlay': return cardState?.inPlay
      case 'complete': return cardState?.complete
      default: return true
    }
  })

  function handleToggle(cardId, field) {
    setState(prev => {
      const current = prev.eventCards[cardId] || {}
      const updates = { ...current }

      if (field === 'drawn') {
        updates.drawn = !updates.drawn
        if (!updates.drawn) { updates.inPlay = false; updates.complete = false }
      } else if (field === 'inPlay') {
        updates.inPlay = !updates.inPlay
        if (updates.inPlay) updates.drawn = true
        updates.complete = false
      } else if (field === 'complete') {
        updates.complete = !updates.complete
        if (updates.complete) { updates.drawn = true; updates.inPlay = false }
      }

      return { ...prev, eventCards: { ...prev.eventCards, [cardId]: updates } }
    })
  }

  function handleResetDeck() {
    const type = deckTab === 'explore' ? 'explore' : 'settlement'
    if (!confirm(`Reset all ${type} cards? This will clear drawn/in-play/complete status.`)) return
    setState(prev => {
      const newCards = { ...prev.eventCards }
      cards.forEach(c => { delete newCards[c.id] })
      return { ...prev, eventCards: newCards, activeEvents: prev.activeEvents.filter(e => {
        const card = eventCardsData.find(c => c.id === e.cardId)
        return card?.deckType !== type
      })}
    })
  }

  const stats = deckTab === 'explore' ? exploreStats : settlementStats

  return (
    <div className="p-4 max-w-5xl mx-auto">
      {/* Deck Tabs */}
      <div className="flex gap-1 mb-4">
        {DECK_TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setDeckTab(t.id)}
            className={`flex-1 py-2 text-xs rounded border transition-colors ${
              deckTab === t.id ? 'border-pip bg-panel-light text-pip' : 'border-pip-dim/30 text-pip-dim hover:text-pip'
            }`}
          >
            {t.id === 'settlement' ? `${t.label} (${settlementStats.total})` :
             t.id === 'explore' ? `${t.label} (${exploreStats.total})` :
             `${t.label} (${exploreCardDeck.length})`}
          </button>
        ))}
      </div>

      {deckTab === 'locations' ? (
        <ExploreLocationsPanel />
      ) : (
        <>
          {/* Stats */}
          <div className="flex gap-4 mb-4 text-xs">
            <span className="text-pip">Available: {stats.available}</span>
            <span className="text-pip-dim">Drawn: {stats.drawn}</span>
            <span className="text-amber">In Play: {stats.inPlay}</span>
            <span className="text-pip-dim">Complete: {stats.completed}</span>
            <button onClick={handleResetDeck} className="ml-auto text-danger-dim hover:text-danger">RESET DECK</button>
          </div>

          {/* Filters */}
          <div className="flex gap-1 mb-4">
            {EVENT_FILTERS.map(f => (
              <button
                key={f.id}
                onClick={() => setFilter(f.id)}
                className={`px-3 py-1 text-xs rounded border transition-colors ${
                  filter === f.id ? 'border-pip text-pip bg-pip-dim/20' : 'border-pip-dim/30 text-pip-dim hover:text-pip'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Card List */}
          <div className="space-y-1">
            {filteredCards.map(card => {
              const cardState = state.eventCards[card.id] || {}
              return (
                <div key={card.id} className={`border rounded px-3 py-2 transition-colors ${
                  cardState.complete ? 'border-pip-dim/20 bg-panel-alt opacity-40' :
                  cardState.inPlay ? 'border-amber bg-panel' :
                  cardState.drawn ? 'border-pip-dim/30 bg-panel-alt opacity-70' :
                  'border-pip-dim/50 bg-panel'
                }`}>
                  <div className="flex items-start gap-3">
                    <span className="text-amber text-xs font-bold w-6 shrink-0 mt-0.5">#{card.id}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-pip text-sm font-bold">{card.name}</span>
                        <span className={`text-xs px-1.5 py-0.5 rounded ${
                          card.type.includes('★') ? 'bg-amber-dim/50 text-amber' : 'bg-pip-dim/20 text-pip-dim'
                        }`}>{card.type}</span>
                      </div>
                      <p className="text-pip-dim text-xs leading-relaxed">{card.text}</p>
                      {card.consequence && (
                        <p className="text-amber text-xs leading-relaxed mt-1 italic">{card.consequence}</p>
                      )}
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <button
                        onClick={() => handleToggle(card.id, 'drawn')}
                        title="Mark as drawn"
                        className={`px-2 py-1 text-xs rounded border transition-colors ${
                          cardState.drawn ? 'border-pip text-pip bg-pip-dim/20' : 'border-pip-dim/30 text-pip-dim hover:text-pip'
                        }`}
                      >DRAWN</button>
                      <button
                        onClick={() => handleToggle(card.id, 'inPlay')}
                        title="Mark as in play"
                        className={`px-2 py-1 text-xs rounded border transition-colors ${
                          cardState.inPlay ? 'border-amber text-amber bg-amber-dim/20' : 'border-pip-dim/30 text-pip-dim hover:text-amber'
                        }`}
                      >IN PLAY</button>
                      <button
                        onClick={() => handleToggle(card.id, 'complete')}
                        title="Mark as complete"
                        className={`px-2 py-1 text-xs rounded border transition-colors ${
                          cardState.complete ? 'border-pip text-pip bg-pip/20' : 'border-pip-dim/30 text-pip-dim hover:text-pip'
                        }`}
                      >DONE</button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}

/* ── Explore Locations Deck ── */
function ExploreLocationsPanel() {
  const { state, setState } = useCampaign()
  const [search, setSearch] = useState('')

  const locations = state.exploreLocations || {}

  const drawnIds = new Set(
    Object.entries(locations).filter(([, v]) => v.drawn && !v.discarded).map(([k]) => parseInt(k))
  )
  const discardedIds = new Set(
    Object.entries(locations).filter(([, v]) => v.discarded).map(([k]) => parseInt(k))
  )
  const remainingDeck = exploreCardDeck.filter(c => !drawnIds.has(c.id) && !discardedIds.has(c.id))

  function handleDrawRandom() {
    if (remainingDeck.length === 0) return
    const idx = Math.floor(Math.random() * remainingDeck.length)
    const card = remainingDeck[idx]
    setState(prev => ({
      ...prev,
      exploreLocations: {
        ...prev.exploreLocations,
        [card.id]: { drawn: true, discarded: false },
      },
    }))
  }

  function handleDiscard(id) {
    setState(prev => ({
      ...prev,
      exploreLocations: {
        ...prev.exploreLocations,
        [id]: { drawn: true, discarded: true },
      },
    }))
  }

  function handleUndiscard(id) {
    setState(prev => ({
      ...prev,
      exploreLocations: {
        ...prev.exploreLocations,
        [id]: { drawn: false, discarded: false },
      },
    }))
  }

  function handleReset() {
    if (!confirm('Reset explore location deck? This clears all drawn/discarded tracking.')) return
    setState(prev => ({ ...prev, exploreLocations: {} }))
  }

  const drawnCards = exploreCardDeck.filter(c => drawnIds.has(c.id))
  const discardedCards = exploreCardDeck.filter(c => discardedIds.has(c.id))

  const filteredAll = search
    ? exploreCardDeck.filter(c => c.name.toLowerCase().includes(search.toLowerCase()))
    : null

  return (
    <div className="space-y-4">
      {/* Stats + Controls */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex gap-4 text-xs">
          <span className="text-pip">{remainingDeck.length} <span className="text-pip-dim">remaining</span></span>
          <span className="text-pip-dim">{drawnIds.size} drawn</span>
          <span className="text-pip-dim">{discardedIds.size} discarded</span>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleDrawRandom}
            disabled={remainingDeck.length === 0}
            className="flex items-center gap-1 px-3 py-1.5 border border-pip rounded text-pip text-xs hover:bg-pip-dim/30 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <Shuffle size={12} /> DRAW ({remainingDeck.length})
          </button>
          <button onClick={handleReset} className="text-xs text-danger-dim hover:text-danger px-2">RESET</button>
        </div>
      </div>

      {/* Search */}
      <input
        type="text"
        value={search}
        onChange={e => setSearch(e.target.value)}
        placeholder="Search all locations..."
        className="w-full text-xs"
      />

      {/* Search Results */}
      {filteredAll && (
        <div className="border border-pip-dim/30 rounded bg-panel-alt p-2 max-h-48 overflow-y-auto space-y-1">
          {filteredAll.map(card => {
            const isDrawn = drawnIds.has(card.id)
            const isDiscarded = discardedIds.has(card.id)
            return (
              <div key={card.id} className={`flex items-center justify-between px-2 py-1 rounded text-xs ${
                isDiscarded ? 'opacity-40' : isDrawn ? 'text-amber' : 'text-pip'
              }`}>
                <span className={isDiscarded ? 'line-through' : ''}>{card.name}</span>
                <span className="text-pip-dim ml-2">
                  {isDiscarded ? 'discarded' : isDrawn ? 'drawn' : 'available'}
                </span>
              </div>
            )
          })}
        </div>
      )}

      {/* Currently Drawn */}
      {drawnCards.length > 0 && (
        <div>
          <h3 className="text-amber text-xs tracking-wider mb-2">DRAWN ({drawnCards.length})</h3>
          <div className="space-y-1">
            {drawnCards.map(card => (
              <div key={card.id} className="flex items-center justify-between border border-amber/30 rounded px-3 py-1.5 bg-panel">
                <span className="text-amber text-sm font-bold">{card.name}</span>
                <button
                  onClick={() => handleDiscard(card.id)}
                  className="text-xs text-pip-dim hover:text-pip border border-pip-dim/30 px-2 py-0.5 rounded"
                >
                  DISCARD
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Discarded Pile */}
      {discardedCards.length > 0 && (
        <div>
          <h3 className="text-pip-dim text-xs tracking-wider mb-2">DISCARDED ({discardedCards.length})</h3>
          <div className="space-y-1">
            {discardedCards.map(card => (
              <div key={card.id} className="flex items-center justify-between border border-pip-dim/20 rounded px-3 py-1 bg-panel-alt opacity-60">
                <span className="text-pip-dim text-xs line-through">{card.name}</span>
                <button
                  onClick={() => handleUndiscard(card.id)}
                  className="text-xs text-pip-dim/60 hover:text-pip-dim border border-pip-dim/20 px-2 py-0.5 rounded"
                >
                  UNDO
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {drawnCards.length === 0 && discardedCards.length === 0 && !search && (
        <p className="text-pip-dim text-xs text-center py-6">
          Press DRAW to pull a random location card from the deck.
        </p>
      )}
    </div>
  )
}
