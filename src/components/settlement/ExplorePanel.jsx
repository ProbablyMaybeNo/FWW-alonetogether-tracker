import { useState } from 'react'
import { Shuffle } from 'lucide-react'
import { getDeckStats } from '../../utils/cardDraw'
import CardDrawer from '../overview/CardDrawer'
import eventCardsData from '../../data/eventCards.json'
import exploreCardDeck from '../../data/exploreCardDeck.json'

const EXPLORE_EVENT_FILTERS = [
  { id: 'all', label: 'ALL' },
  { id: 'available', label: 'AVAILABLE' },
  { id: 'drawn', label: 'DRAWN' },
  { id: 'inPlay', label: 'IN PLAY' },
  { id: 'complete', label: 'COMPLETE' },
]

/* Explore Events + Explore Locations browser. Self-contained — reads state.eventCards
   and state.exploreLocations. Used by SETTLEMENT (and slide-out on HOMESTEAD). */
export default function ExplorePanel({ state, setState }) {
  const [exploreSubTab, setExploreSubTab] = useState('events')
  const [filter, setFilter] = useState('all')

  const exploreStats = getDeckStats('explore', state.eventCards, eventCardsData)
  const cards = eventCardsData.filter(c => c.deckType === 'explore')

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

  function addConsequenceToWasteland(card) {
    try {
      const existing = JSON.parse(localStorage.getItem('fww-wasteland-deck') || '[]')
      const entry = { id: `consequence-${card.id}-${Date.now()}`, name: card.name, type: 'consequence', text: card.consequence || card.text || '' }
      localStorage.setItem('fww-wasteland-deck', JSON.stringify([entry, ...existing]))
    } catch { /* ignore */ }
  }

  function handleResetExploreDeck() {
    if (!confirm('Reset all explore event cards? This will clear drawn/in-play/complete status.')) return
    setState(prev => {
      const newCards = { ...prev.eventCards }
      cards.forEach(c => { delete newCards[c.id] })
      return {
        ...prev,
        eventCards: newCards,
        activeEvents: prev.activeEvents.filter(e => {
          const card = eventCardsData.find(c => c.id === e.cardId)
          return card?.deckType !== 'explore'
        }),
      }
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-1">
        <button
          onClick={() => setExploreSubTab('events')}
          className={`flex-1 py-1.5 text-xs rounded border transition-colors font-bold ${
            exploreSubTab === 'events'
              ? 'border-pip bg-panel-light text-pip'
              : 'border-muted/30 text-muted hover:text-pip hover:border-pip'
          }`}
        >
          EXPLORE EVENTS ({exploreStats.total})
        </button>
        <button
          onClick={() => setExploreSubTab('locations')}
          className={`flex-1 py-1.5 text-xs rounded border transition-colors font-bold ${
            exploreSubTab === 'locations'
              ? 'border-pip bg-panel-light text-pip'
              : 'border-muted/30 text-muted hover:text-pip hover:border-pip'
          }`}
        >
          EXPLORE LOCATIONS ({exploreCardDeck.length})
        </button>
      </div>

      {exploreSubTab === 'events' ? (
        <>
          <CardDrawer deckType="explore" title="DRAW EXPLORE CARD" />

          <div className="flex gap-4 text-xs">
            <span className="text-pip font-bold">Available: {exploreStats.available}</span>
            <span className="text-pip">Drawn: {exploreStats.drawn}</span>
            <span className="text-amber font-bold">In Play: {exploreStats.inPlay}</span>
            <span className="text-pip">Complete: {exploreStats.completed}</span>
            <button onClick={handleResetExploreDeck} className="ml-auto text-pip/60 hover:text-danger transition-colors">RESET DECK</button>
          </div>

          <div className="flex gap-1">
            {EXPLORE_EVENT_FILTERS.map(f => (
              <button
                key={f.id}
                onClick={() => setFilter(f.id)}
                className={`px-3 py-1 text-xs rounded border transition-colors ${
                  filter === f.id ? 'border-pip text-pip bg-pip-dim/30 font-bold' : 'border-muted/30 text-muted hover:text-pip hover:border-pip'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          <div className="space-y-1">
            {filteredCards.map(card => {
              const cardState = state.eventCards[card.id] || {}
              return (
                <div key={card.id} className={`border rounded px-3 py-2 transition-colors ${
                  cardState.complete ? 'border-pip-dim/20 bg-panel-alt opacity-40' :
                  cardState.inPlay ? 'border-amber/60 bg-panel' :
                  cardState.drawn ? 'border-muted/30 bg-panel-alt opacity-70' :
                  'border-pip-mid/40 bg-panel'
                }`}>
                  <div className="flex items-start gap-3">
                    <span className="text-amber text-xs font-bold w-6 shrink-0 mt-0.5">#{card.id}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-pip text-sm font-bold">{card.name}</span>
                        <span className={`text-xs px-1.5 py-0.5 rounded ${
                          card.type.includes('★') ? 'bg-amber-dim/50 text-amber font-bold' : 'bg-pip-dim/20 text-muted'
                        }`}>{card.type}</span>
                      </div>
                      <p className="text-muted text-xs leading-relaxed">{card.text}</p>
                      {card.consequence && (
                        <p className="text-amber text-xs leading-relaxed mt-1 italic">{card.consequence}</p>
                      )}
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <button
                        onClick={() => handleToggle(card.id, 'drawn')}
                        title="Mark as drawn"
                        className={`px-2 py-1 text-xs rounded border transition-colors ${
                          cardState.drawn ? 'border-pip text-pip bg-pip-dim/30 font-bold' : 'border-muted/30 text-muted hover:text-pip hover:border-pip'
                        }`}
                      >DRAWN</button>
                      <button
                        onClick={() => handleToggle(card.id, 'inPlay')}
                        title="Mark as in play"
                        className={`px-2 py-1 text-xs rounded border transition-colors ${
                          cardState.inPlay ? 'border-amber text-amber bg-amber-dim/30 font-bold' : 'border-muted/30 text-muted hover:text-amber hover:border-amber'
                        }`}
                      >IN PLAY</button>
                      <button
                        onClick={() => handleToggle(card.id, 'complete')}
                        title="Mark as complete"
                        className={`px-2 py-1 text-xs rounded border transition-colors ${
                          cardState.complete ? 'border-pip text-pip bg-pip-dim/30 font-bold' : 'border-muted/30 text-muted hover:text-pip hover:border-pip'
                        }`}
                      >DONE</button>
                      {cardState.inPlay && (card.consequence || card.text) && (
                        <button
                          onClick={() => addConsequenceToWasteland(card)}
                          title="Add consequence to top of Wasteland Deck"
                          className="px-2 py-1 text-xs rounded border border-info/40 text-info hover:bg-info-dim/20 transition-colors"
                        >→ DECK</button>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </>
      ) : (
        <ExploreLocationsPanel state={state} setState={setState} />
      )}

    </div>
  )
}

function ExploreLocationsPanel({ state, setState }) {
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
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex gap-4 text-xs">
          <span className="text-pip font-bold">{remainingDeck.length} <span className="text-muted font-normal">remaining</span></span>
          <span className="text-muted">{drawnIds.size} drawn</span>
          <span className="text-muted">{discardedIds.size} discarded</span>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleDrawRandom}
            disabled={remainingDeck.length === 0}
            className="flex items-center gap-1 px-3 py-1.5 border border-pip text-pip rounded text-xs hover:bg-pip-dim disabled:opacity-40 disabled:cursor-not-allowed transition-colors font-bold"
          >
            <Shuffle size={12} /> DRAW ({remainingDeck.length})
          </button>
          <button onClick={handleReset} className="text-xs text-muted hover:text-danger px-2 transition-colors">RESET</button>
        </div>
      </div>

      <input
        type="text"
        value={search}
        onChange={e => setSearch(e.target.value)}
        placeholder="Search all locations..."
        className="w-full text-xs"
      />

      {filteredAll && (
        <div className="border border-pip-mid/30 rounded bg-panel-alt p-2 max-h-48 overflow-y-auto space-y-1">
          {filteredAll.map(card => {
            const isDrawn = drawnIds.has(card.id)
            const isDiscarded = discardedIds.has(card.id)
            return (
              <div key={card.id} className={`flex items-center justify-between px-2 py-1 rounded text-xs ${
                isDiscarded ? 'opacity-40' : isDrawn ? 'text-amber' : 'text-pip'
              }`}>
                <span className={isDiscarded ? 'line-through' : ''}>{card.name}</span>
                <span className="text-muted ml-2">
                  {isDiscarded ? 'discarded' : isDrawn ? 'drawn' : 'available'}
                </span>
              </div>
            )
          })}
        </div>
      )}

      {drawnCards.length > 0 && (
        <div>
          <h3 className="text-amber text-xs tracking-widest mb-2 font-bold">DRAWN ({drawnCards.length})</h3>
          <div className="space-y-1">
            {drawnCards.map(card => (
              <div key={card.id} className="flex items-center justify-between border border-amber/50 rounded px-3 py-1.5 bg-panel">
                <span className="text-amber text-sm font-bold">{card.name}</span>
                <button
                  onClick={() => handleDiscard(card.id)}
                  className="text-xs text-muted hover:text-pip border border-muted/30 hover:border-pip px-2 py-0.5 rounded transition-colors"
                >
                  DISCARD
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {discardedCards.length > 0 && (
        <div>
          <h3 className="text-muted text-xs tracking-widest mb-2 font-bold">DISCARDED ({discardedCards.length})</h3>
          <div className="space-y-1">
            {discardedCards.map(card => (
              <div key={card.id} className="flex items-center justify-between border border-pip-dim/20 rounded px-3 py-1 bg-panel-alt opacity-60">
                <span className="text-muted text-xs line-through">{card.name}</span>
                <button
                  onClick={() => handleUndiscard(card.id)}
                  className="text-xs text-muted/60 hover:text-muted border border-pip-dim/20 px-2 py-0.5 rounded transition-colors"
                >
                  UNDO
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {drawnCards.length === 0 && discardedCards.length === 0 && !search && (
        <p className="text-muted text-xs text-center py-6">
          Press DRAW to pull a random location card from the deck.
        </p>
      )}
    </div>
  )
}
