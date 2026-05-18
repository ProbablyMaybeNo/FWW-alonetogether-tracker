import { useState } from 'react'
import { useCampaign } from '../../context/CampaignContext'
import { getDeckStats } from '../../utils/cardDraw'
import eventCardsData from '../../data/eventCards.json'

const EVENT_FILTERS = [
  { id: 'all', label: 'ALL' },
  { id: 'available', label: 'AVAILABLE' },
  { id: 'drawn', label: 'DRAWN' },
  { id: 'inPlay', label: 'IN PLAY' },
  { id: 'complete', label: 'COMPLETE' },
]

export default function EventsPage() {
  const { state, setState } = useCampaign()
  const [filter, setFilter] = useState('all')

  const stats = getDeckStats('settlement', state.eventCards, eventCardsData)

  const cards = eventCardsData.filter(c => c.deckType === 'settlement')

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
    if (!confirm('Reset all settlement event cards? This will clear drawn/in-play/complete status.')) return
    setState(prev => {
      const newCards = { ...prev.eventCards }
      cards.forEach(c => { delete newCards[c.id] })
      return {
        ...prev,
        eventCards: newCards,
        activeEvents: prev.activeEvents.filter(e => {
          const card = eventCardsData.find(c => c.id === e.cardId)
          return card?.deckType !== 'settlement'
        }),
      }
    })
  }

  return (
    <div className="p-4 max-w-5xl mx-auto">
      {/* Stats */}
      <div className="flex gap-4 mb-4 text-xs">
        <span className="text-pip font-bold">Available: {stats.available}</span>
        <span className="text-muted">Drawn: {stats.drawn}</span>
        <span className="text-amber font-bold">In Play: {stats.inPlay}</span>
        <span className="text-muted">Complete: {stats.completed}</span>
        <button onClick={handleResetDeck} className="ml-auto text-muted hover:text-danger transition-colors">RESET DECK</button>
      </div>

      {/* Filters */}
      <div className="flex gap-1 mb-4">
        {EVENT_FILTERS.map(f => (
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

      {/* Card List */}
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
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
