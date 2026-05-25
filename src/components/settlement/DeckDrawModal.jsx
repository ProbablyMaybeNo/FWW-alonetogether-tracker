import { useState, useEffect } from 'react'
import Modal from '../layout/Modal'

const DECK_SUBTYPE_COLOR = {
  Pistol: 'text-amber', Rifle: 'text-amber', 'Heavy Weapon': 'text-amber', Melee: 'text-amber',
  Grenade: 'text-danger', Mine: 'text-danger',
  Armor: 'text-info', Clothing: 'text-info',
  Food: 'text-pip', Drink: 'text-pip', Chem: 'text-pip',
  Mod: 'text-amber', Utility: 'text-muted',
}

// Animated deck-pull reveal — used for structures whose effect text matches
// "Draw X Y, Keep Z" (handleToggleUsed walks the deck until it finds a typeLabel match).
// `draw` = { structureName, typeLabel, drawnCards, foundItem, deckDraw: true }
export default function DeckDrawModal({ draw, onKeep, onClose }) {
  const { structureName, typeLabel, drawnCards = [], foundItem } = draw
  const [visibleCount, setVisibleCount] = useState(0)
  const [done, setDone] = useState(false)

  useEffect(() => {
    if (drawnCards.length === 0) { setDone(true); return }
    let i = 0
    const tick = () => {
      i++
      setVisibleCount(i)
      if (i < drawnCards.length) {
        setTimeout(tick, 340)
      } else {
        setTimeout(() => setDone(true), 200)
      }
    }
    setTimeout(tick, 180)
  }, [drawnCards.length])

  const visibleCards = drawnCards.slice(0, visibleCount)
  const drawing = !done

  return (
    <Modal isOpen onClose={done ? onClose : () => {}} title={`${structureName} — DRAW`}>
      <div className="space-y-4">
        <div className="text-muted text-xs">
          {drawing
            ? <span className="text-pip animate-pulse">DRAWING... searching for <span className="text-amber font-bold">{typeLabel}</span></span>
            : <>Drew <span className="text-pip font-bold">{drawnCards.length}</span> card{drawnCards.length !== 1 ? 's' : ''} looking for a{' '}<span className="text-amber font-bold">{typeLabel}</span> — all go to discard.</>
          }
        </div>

        <div className="space-y-1 max-h-56 overflow-y-auto">
          {visibleCards.map((item, i) => {
            const isMatch = done && foundItem && item.id === foundItem.id && i === drawnCards.length - 1
            const isLatest = i === visibleCards.length - 1 && drawing
            return (
              <div
                key={i}
                className={`flex items-center gap-2 px-3 py-1.5 rounded border text-xs transition-all ${
                  isMatch
                    ? 'border-amber/70 bg-amber/5'
                    : isLatest
                      ? 'border-pip/50 bg-pip-dim/10'
                      : 'border-pip-dim/20 opacity-50'
                }`}
                style={isMatch ? { boxShadow: '0 0 10px rgba(251,191,36,0.3)' } : isLatest ? { boxShadow: '0 0 6px rgba(0,182,90,0.2)' } : {}}
              >
                <span className={isMatch ? 'text-amber font-bold' : isLatest ? 'text-pip' : 'text-muted'}>{item.name}</span>
                <span className={`text-xs px-1 border border-current/30 rounded ml-auto ${DECK_SUBTYPE_COLOR[item.subType] || 'text-muted'}`}>{item.subType}</span>
                {item.caps != null && <span className="text-muted">{item.caps}c</span>}
                {isMatch && <span className="text-amber text-xs font-bold">✓ MATCH</span>}
              </div>
            )
          })}
          {drawing && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded border border-pip-dim/20 text-xs">
              <span className="text-dim animate-pulse">drawing...</span>
            </div>
          )}
        </div>

        {done && (
          foundItem ? (
            <div className="border-t border-pip-dim/30 pt-3 space-y-2">
              <div className="text-pip text-xs">Found: <span className="text-amber font-bold">{foundItem.name}</span></div>
              <div className="flex gap-2">
                <button
                  onClick={() => { onKeep([foundItem]); onClose() }}
                  className="flex-1 py-2 text-xs border border-pip text-pip rounded hover:bg-pip-dim/20 transition-colors font-bold"
                >ADD TO POOL</button>
                <button
                  onClick={onClose}
                  className="px-4 py-2 text-xs border border-muted/40 text-muted rounded hover:text-pip hover:border-pip transition-colors"
                >DISCARD</button>
              </div>
            </div>
          ) : (
            <div className="border-t border-pip-dim/30 pt-3">
              <p className="text-danger text-xs text-center">No matching {typeLabel} found in deck.</p>
              <button onClick={onClose} className="mt-2 w-full py-2 text-xs border border-muted/40 text-muted rounded hover:text-pip hover:border-pip transition-colors">CLOSE</button>
            </div>
          )
        )}
      </div>
    </Modal>
  )
}
