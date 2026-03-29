import { useState, useMemo } from 'react'
import Modal from '../layout/Modal'
import unitsData from '../../data/units.json'

export default function AddUnitModal({ isOpen, onClose, onAdd, existingUnitIds, caps = Infinity }) {
  const [search, setSearch] = useState('')
  const [factionFilter, setFactionFilter] = useState(() => {
    try { return localStorage.getItem('fww-last-faction') || '' } catch { return '' }
  })

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

  function handleFactionChange(val) {
    setFactionFilter(val)
    try { localStorage.setItem('fww-last-faction', val) } catch { /* ignore */ }
  }

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
      heroic: false,
      fate: 'Active',
      status: 'OK',
      conditions: '',
      condPoisoned: false,
      condInjuredArm: false,
      condInjuredLeg: false,
      hasPowerArmor: false,
      paDegraded: false,
      notes: '',
      equippedItems: [],
      lucScore: 3,
      perks: [],
      perksThisRound: 0,
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
          onChange={(e) => handleFactionChange(e.target.value)}
          className="text-xs w-48"
        >
          <option value="">All Factions</option>
          {factions.map(f => <option key={f} value={f}>{f}</option>)}
        </select>
      </div>

      <div className="text-xs text-muted mb-2">{filtered.length} units</div>

      <div className="max-h-96 overflow-y-auto space-y-1">
        {filtered.map(unit => {
          const canAfford = (unit.caps || 0) <= caps
          return (
            <div
              key={unit.id}
              className={`flex items-center justify-between border rounded px-3 py-2 transition-colors ${
                canAfford
                  ? 'border-muted/40 hover:bg-panel-alt cursor-pointer'
                  : 'border-muted/20 opacity-40 cursor-not-allowed'
              }`}
              onClick={() => canAfford && handleAdd(unit)}
            >
              <div className="flex-1 min-w-0">
                <span className={`text-sm ${canAfford ? 'text-pip' : 'text-muted'}`}>{unit.name}</span>
                <span className="text-muted text-xs ml-2">{unit.faction}</span>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span className="text-xs text-muted">{unit.type}</span>
                <span className={`text-sm font-bold ${canAfford ? 'text-amber' : 'text-danger'}`}>{unit.caps}c</span>
              </div>
            </div>
          )
        })}
      </div>
    </Modal>
  )
}
