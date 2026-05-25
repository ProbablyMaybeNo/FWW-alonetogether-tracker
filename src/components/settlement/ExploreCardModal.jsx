import { Shuffle } from 'lucide-react'
import Modal from '../layout/Modal'

// Shows an explore card drawn by Listening Post / Ranger Outpost / Scout Camp.
// Scout Camp gets a redraw button. Cards with a consequence can be added to active events.
export default function ExploreCardModal({ card, isScoutCamp, onRedraw, onAddToEvents, onDismiss }) {
  return (
    <Modal isOpen onClose={onDismiss} title="EXPLORE CARD DRAWN">
      <div className="space-y-3">
        <div className="border border-pip-mid/40 rounded p-4 bg-panel-alt space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-title text-xs font-bold tracking-wider">#{card.id}</span>
            {card.type && (
              <span className={`text-xs px-2 py-0.5 rounded font-bold ${
                card.type.includes('★') ? 'bg-amber-dim/50 text-amber' : 'bg-pip-dim/30 text-muted'
              }`}>{card.type}</span>
            )}
          </div>
          <h4 className="text-pip font-bold text-base">{card.name}</h4>
          <p className="text-muted text-sm leading-relaxed">{card.text}</p>
          {card.consequence && (
            <div className="border-t border-pip-dim/30 pt-2 mt-2">
              <p className="text-amber text-xs font-bold mb-1 tracking-wider">CONSEQUENCE</p>
              <p className="text-amber text-sm leading-relaxed">{card.consequence}</p>
            </div>
          )}
        </div>
        <div className="flex gap-2 flex-wrap">
          {isScoutCamp && (
            <button
              onClick={onRedraw}
              className="flex items-center gap-2 px-4 py-2 border border-amber text-amber rounded text-sm hover:bg-amber-dim/30 transition-colors font-bold"
            >
              <Shuffle size={14} /> REDRAW (Scout Camp)
            </button>
          )}
          {card.consequence && (
            <button
              onClick={onAddToEvents}
              className="flex items-center gap-2 px-4 py-2 border border-pip text-pip rounded text-sm hover:bg-pip-dim transition-colors font-bold"
              style={{ boxShadow: '0 0 6px var(--color-pip-glow)' }}
            >
              ADD CONSEQUENCE TO ACTIVE EVENTS
            </button>
          )}
          <button
            onClick={onDismiss}
            className="px-4 py-2 border border-muted/40 text-muted rounded text-sm hover:text-pip hover:border-pip transition-colors ml-auto"
          >
            Dismiss
          </button>
        </div>
      </div>
    </Modal>
  )
}
