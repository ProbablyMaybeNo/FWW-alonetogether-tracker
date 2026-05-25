import { useState } from 'react'
import Modal from '../layout/Modal'

// Player selects up to `keepCount` items from the drawn batch to keep.
// `draw` = { structureName, drawnItems, keepCount, typeLabel }
export default function ItemDrawModal({ draw, onKeep, onClose }) {
  const [selected, setSelected] = useState([])
  const { structureName, drawnItems, keepCount, typeLabel } = draw

  function toggle(item) {
    setSelected(prev => {
      if (prev.find(i => i.id === item.id)) return prev.filter(i => i.id !== item.id)
      if (prev.length >= keepCount) return prev
      return [...prev, item]
    })
  }

  return (
    <Modal isOpen onClose={onClose} title={`ITEM DRAW — ${structureName.toUpperCase()}`}>
      <div className="space-y-4">
        <p className="text-muted text-xs">
          Drew <span className="text-pip font-bold">{drawnItems.length}</span> {typeLabel} card{drawnItems.length !== 1 ? 's' : ''}.{' '}
          Select up to <span className="text-amber font-bold">{keepCount}</span> to add to your Item Pool.{' '}
          <span className="text-muted/60">({selected.length}/{keepCount} selected)</span>
        </p>
        <div className="space-y-2 max-h-72 overflow-y-auto">
          {drawnItems.map((item, idx) => {
            const isSel = !!selected.find(i => i.id === item.id)
            const maxed = !isSel && selected.length >= keepCount
            return (
              <div
                key={`${item.id}-${idx}`}
                onClick={() => !maxed && toggle(item)}
                className={`flex items-center gap-3 border rounded px-3 py-2.5 transition-colors ${
                  isSel
                    ? 'border-pip bg-pip-dim/20 cursor-pointer'
                    : maxed
                    ? 'border-muted/20 opacity-40 cursor-not-allowed'
                    : 'border-muted/40 hover:border-pip/60 hover:bg-panel-light cursor-pointer'
                }`}
              >
                <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${isSel ? 'border-pip bg-pip' : 'border-muted'}`}>
                  {isSel && <span className="text-terminal text-xs font-bold leading-none">✓</span>}
                </div>
                <span className="flex-1 min-w-0 text-sm font-bold text-pip truncate">{item.name}</span>
                <span className="text-muted text-xs shrink-0">{item.subType}</span>
                <span className="text-amber text-sm font-bold shrink-0">{item.caps}c</span>
              </div>
            )
          })}
        </div>
        <div className="flex gap-2 pt-1">
          <button
            onClick={() => { onKeep(selected); onClose() }}
            disabled={selected.length === 0}
            className="flex-1 px-4 py-2.5 border border-pip text-pip rounded text-sm hover:bg-pip-dim transition-colors font-bold disabled:opacity-40 disabled:cursor-not-allowed"
            style={selected.length > 0 ? { boxShadow: '0 0 6px var(--color-pip-glow)' } : {}}
          >
            {selected.length > 0 ? `KEEP ${selected.length} ITEM${selected.length !== 1 ? 'S' : ''} → POOL` : 'SELECT ITEMS TO KEEP'}
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2.5 border border-muted/40 text-muted rounded text-sm hover:text-pip hover:border-pip transition-colors"
          >
            Discard All
          </button>
        </div>
      </div>
    </Modal>
  )
}
