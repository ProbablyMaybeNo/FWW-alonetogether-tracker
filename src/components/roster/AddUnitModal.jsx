import { useState, useMemo } from 'react'
import Modal from '../layout/Modal'
import unitsData from '../../data/units.json'

export default function AddUnitModal({ isOpen, onClose, onAdd, existingUnitIds }) {
  const [search, setSearch] = useState('')
  const [factionFilter, setFactionFilter] = useState('')

  const factions = useMemo(() => {
    const set = new Set(unitsData.map(u => u.faction))
    return Array.from(set).sort()
  }, [])

  const filtered = useMemo(() => {
    return unitsData.filter(u => {
      if (factionFilter && u.faction !== factionFilter) return false
      if (search && !u.name.toLowerCase().includes(search.toLowerCase())) return false
      return true
    })
  }, [search, factionFilter])

  function handleAdd(unit) {
    onAdd({
      slotId: Date.now(),
      unitId: unit.id,
      unitName: unit.name,
      faction: unit.faction,
      baseCaps: unit.caps,
      battles: 0,
      removed: 0,
      regDamage: 0,
      radDamage: 0,
      isLeader: false,
      fate: 'Active',
      status: 'OK',
      conditions: '',
      notes: '',
      equippedItems: [],
      lucScore: 3,
      perks: [],
      addiction: '',
      capturedBy: '',
      captureRound: null,
    })
    onClose()
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="ADD UNIT TO ROSTER" wide>
      <div className="flex gap-2 mb-4">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search units..."
          className="flex-1 text-xs"
          autoFocus
        />
        <select
          value={factionFilter}
          onChange={(e) => setFactionFilter(e.target.value)}
          className="text-xs w-48"
        >
          <option value="">All Factions</option>
          {factions.map(f => <option key={f} value={f}>{f}</option>)}
        </select>
      </div>

      <div className="text-xs text-pip-dim mb-2">{filtered.length} units</div>

      <div className="max-h-96 overflow-y-auto space-y-1">
        {filtered.map(unit => (
          <div
            key={unit.id}
            className="flex items-center justify-between border border-pip-dim/30 rounded px-3 py-2 hover:bg-panel-alt cursor-pointer transition-colors"
            onClick={() => handleAdd(unit)}
          >
            <div className="flex-1 min-w-0">
              <span className="text-pip text-sm">{unit.name}</span>
              <span className="text-pip-dim text-xs ml-2">{unit.faction}</span>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <span className="text-xs text-pip-dim">{unit.type}</span>
              <span className="text-amber text-sm font-bold">{unit.caps}c</span>
            </div>
          </div>
        ))}
      </div>
    </Modal>
  )
}
