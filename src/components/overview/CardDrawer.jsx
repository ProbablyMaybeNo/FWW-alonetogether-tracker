import { useState } from 'react'
import { Shuffle, Lock, Unlock, Plus } from 'lucide-react'
import { useCampaign } from '../../context/CampaignContext'
import { drawCard, getAvailableCount } from '../../utils/cardDraw'
import eventCardsData from '../../data/eventCards.json'

export default function CardDrawer({ deckType, title }) {
  const { state, setState } = useCampaign()
  const [currentCard, setCurrentCard] = useState(null)
  const [locked, setLocked] = useState(false)

  const available = getAvailableCount(deckType, state.eventCards, eventCardsData)

  function handleDraw() {
    if (locked) return
    const card = drawCard(deckType, state.eventCards, eventCardsData)
    if (card) {
      setCurrentCard(card)
      setState(prev => ({
        ...prev,
        eventCards: {
          ...prev.eventCards,
          [card.id]: { ...prev.eventCards[card.id], drawn: true },
        },
      }))
    }
  }

  function handleAddToPlay() {
    if (!currentCard) return
    setState(prev => ({
      ...prev,
      eventCards: {
        ...prev.eventCards,
        [currentCard.id]: { drawn: true, inPlay: true, complete: false },
      },
      activeEvents: [
        ...prev.activeEvents,
        { cardId: currentCard.id, name: currentCard.name, text: currentCard.text, consequence: currentCard.consequence, type: currentCard.type, sinceRound: prev.round },
      ],
    }))
  }

  function handleLock() {
    setLocked(!locked)
  }

  return (
    <div className="border border-pip-mid/50 rounded-lg bg-panel p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-pip text-sm uppercase tracking-widest font-bold">{title}</h3>
        <span className="text-xs text-muted">{available} remaining</span>
      </div>

      <div className="flex gap-2 mb-3">
        <button
          onClick={handleDraw}
          disabled={locked || available === 0}
          className="flex-1 flex items-center justify-center gap-2 py-2 px-3 bg-pip-dim/30 border border-pip-mid/50 rounded text-pip text-sm font-bold
            hover:bg-pip-dim hover:border-pip disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <Shuffle size={14} />
          DRAW
        </button>
        <button
          onClick={handleLock}
          className={`py-2 px-3 border rounded text-sm transition-colors ${
            locked ? 'border-amber text-amber bg-amber-dim/30' : 'border-muted text-muted hover:text-pip hover:border-pip'
          }`}
        >
          {locked ? <Lock size={14} /> : <Unlock size={14} />}
        </button>
        {currentCard && (
          <button
            onClick={handleAddToPlay}
            className="py-2 px-3 border border-pip-mid/50 text-pip rounded text-sm hover:bg-pip-dim hover:border-pip transition-colors"
            title="Add to Active Events"
          >
            <Plus size={14} />
          </button>
        )}
      </div>

      {currentCard ? (
        <div className="border border-pip-mid/40 rounded p-3 bg-panel-alt">
          <div className="flex items-start justify-between mb-1">
            <span className="text-amber text-sm font-bold">#{currentCard.id}</span>
            <span className={`text-xs px-2 py-0.5 rounded font-bold ${
              currentCard.type.includes('★') ? 'bg-amber-dim/50 text-amber' : 'bg-pip-dim/30 text-muted'
            }`}>
              {currentCard.type}
            </span>
          </div>
          <h4 className="text-pip text-sm mb-2 font-bold">{currentCard.name}</h4>
          <p className="text-muted text-xs leading-relaxed">{currentCard.text}</p>
          {currentCard.consequence && (
            <p className="text-amber text-xs leading-relaxed mt-1 italic">{currentCard.consequence}</p>
          )}
        </div>
      ) : (
        <div className="border border-pip-dim/40 border-dashed rounded p-6 text-center">
          <p className="text-muted text-xs">Draw a card to see its effect</p>
        </div>
      )}
    </div>
  )
}
