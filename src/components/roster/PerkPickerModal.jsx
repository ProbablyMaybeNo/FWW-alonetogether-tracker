import { useState } from 'react'
import Modal from '../layout/Modal'
import { PERK_CARDS, parseSymbols } from '../../data/perkCards'
import { Shuffle, Star } from 'lucide-react'

const CATEGORIES = ['All', 'General', 'Weapon', 'Robot', 'Creature', 'Leader']

function getPerkCategory(perk) {
  const text = perk.text || ''
  const name = perk.name || ''
  const requires = perk.requires || ''

  if (text.includes('Robot') || text.includes('robot')) return 'Robot'
  if (text.includes('Creature') || text.includes('creature') || text.includes('Dog')) return 'Creature'
  if (name.includes('PROGRAM:') || name.includes('COMMAND:') || requires.includes('Leader')) return 'Leader'
  if (
    text.includes('melee') || text.includes('Melee') ||
    text.includes('pistol') || text.includes('Pistol') ||
    text.includes('rifle') || text.includes('Rifle') ||
    text.includes('heavy_weapon') || text.includes('Heavy Weapon') || text.includes('Heavy weapon') ||
    text.includes('[[melee|') || text.includes('[[pistol|') ||
    text.includes('[[rifle|') || text.includes('[[heavy_weapon|')
  ) return 'Weapon'
  return 'General'
}

export default function PerkPickerModal({ isOpen, onClose, onSelect, equippedPerks = [], canAdd = true }) {
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')

  const filtered = PERK_CARDS.filter(p => {
    if (categoryFilter && categoryFilter !== 'All') {
      if (getPerkCategory(p) !== categoryFilter) return false
    }
    if (search) {
      const q = search.toLowerCase()
      if (!p.name.toLowerCase().includes(q) && !p.text.toLowerCase().includes(q)) return false
    }
    return true
  })

  function handleSelect(perkName) {
    onSelect(perkName)
    onClose()
  }

  function handleRandomDraw() {
    const available = filtered.filter(p => !equippedPerks.includes(p.name))
    if (available.length === 0) return
    const picked = available[Math.floor(Math.random() * available.length)]
    handleSelect(picked.name)
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`ADD PERK CARD (${equippedPerks.length} equipped)`} maxWidth="max-w-3xl">
      {/* Header controls */}
      <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
        <div className="flex flex-wrap gap-1">
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat === 'All' ? '' : cat)}
              className={`text-xs px-2 py-1 rounded border transition-colors font-bold ${
                (cat === 'All' && !categoryFilter) || categoryFilter === cat
                  ? 'border-pip bg-pip-dim/30 text-pip'
                  : 'border-pip-dim/40 text-muted hover:border-pip/60 hover:text-pip'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
        <button
          onClick={handleRandomDraw}
          disabled={!canAdd}
          className="flex items-center gap-1.5 text-xs border border-info/60 text-info hover:bg-info-dim/20 rounded px-3 py-1.5 transition-colors disabled:opacity-40 disabled:cursor-not-allowed font-bold tracking-wider"
        >
          <Shuffle size={12} /> RANDOM DRAW
        </button>
      </div>

      {/* Search */}
      <div className="mb-2">
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search perks by name or text..."
          className="w-full text-xs py-1.5 px-3"
          autoFocus
        />
      </div>

      {/* Count */}
      <div className="text-xs text-muted mb-2 tracking-wider">
        {filtered.length} / {PERK_CARDS.length} shown
      </div>

      {/* Perk list */}
      <div className="max-h-[60vh] overflow-y-auto space-y-2">
        {filtered.map(p => {
          const alreadyHas = equippedPerks.includes(p.name)
          return (
            <div
              key={p.id}
              onClick={() => !alreadyHas && canAdd && handleSelect(p.name)}
              className={`border rounded p-3 transition-colors ${
                alreadyHas
                  ? 'border-pip-dim/20 opacity-40 cursor-not-allowed'
                  : canAdd
                  ? 'border-pip-dim/40 hover:border-pip hover:bg-panel-light cursor-pointer'
                  : 'border-pip-dim/20 opacity-50 cursor-not-allowed'
              }`}
            >
              <div className="flex items-start justify-between gap-2 mb-1">
                <span className="text-pip text-sm font-bold leading-tight">{p.name}</span>
                <div className="flex items-center gap-1.5 shrink-0">
                  {alreadyHas && (
                    <span className="text-xs text-pip/60 border border-pip/30 rounded px-1.5 py-0.5">
                      EQUIPPED
                    </span>
                  )}
                  {p.requires && (
                    <span className="text-xs text-amber border border-amber/40 rounded px-1.5 py-0.5">
                      REQ: {p.requires}
                    </span>
                  )}
                  <span className="text-xs text-muted/60">{getPerkCategory(p)}</span>
                </div>
              </div>
              <p className="text-muted text-xs leading-relaxed">{parseSymbols(p.text)}</p>
            </div>
          )
        })}
        {filtered.length === 0 && (
          <div className="text-center py-8 text-muted text-xs">No perks match your search.</div>
        )}
      </div>
    </Modal>
  )
}
