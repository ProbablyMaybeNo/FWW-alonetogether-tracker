import { useState, useMemo } from 'react'
import Modal from '../layout/Modal'
import structuresData from '../../data/structures.json'

export default function AddStructureModal({ isOpen, onClose, onAdd, atValidOnly = false }) {
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')

  const baseData = useMemo(() => atValidOnly ? structuresData.filter(s => s.atValid) : structuresData, [atValidOnly])

  const categories = useMemo(() => {
    const set = new Set(baseData.map(s => s.category))
    return Array.from(set).sort()
  }, [baseData])

  const filtered = useMemo(() => {
    return baseData.filter(s => {
      if (categoryFilter && s.category !== categoryFilter) return false
      if (search && !s.name.toLowerCase().includes(search.toLowerCase())) return false
      return true
    })
  }, [baseData, search, categoryFilter])

  function handleAdd(structure) {
    onAdd({
      instanceId: Date.now() + Math.random(),
      structureId: structure.id,
      usedThisRound: false,
      condition: 'Undamaged',
      notes: '',
    })
    onClose()
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="ADD STRUCTURE" wide>
      <div className="flex gap-2 mb-4">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search structures..."
          className="flex-1 text-xs"
          autoFocus
        />
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="text-xs w-48"
        >
          <option value="">All Categories</option>
          {categories.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      <div className="text-xs text-pip-dim mb-2">{filtered.length} structures</div>

      <div className="max-h-96 overflow-y-auto space-y-1">
        {filtered.map(s => (
          <div
            key={s.id}
            className="border border-pip-dim/30 rounded px-3 py-2 hover:bg-panel-alt cursor-pointer transition-colors"
            onClick={() => handleAdd(s)}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-pip text-sm font-bold">{s.name}</span>
              <div className="flex items-center gap-2">
                <span className="text-xs text-pip-dim">{s.category}</span>
                <span className="text-amber text-sm font-bold">{s.cost}c</span>
              </div>
            </div>
            <div className="flex gap-3 text-xs text-pip-dim">
              {s.pwrReq > 0 && <span>PWR: {s.pwrReq}</span>}
              {s.pwrGen > 0 && <span className="text-pip">+{s.pwrGen} PWR</span>}
              {s.waterReq > 0 && <span>H2O: {s.waterReq}</span>}
              {s.waterGen > 0 && <span className="text-pip">+{s.waterGen} H2O</span>}
              {s.perk !== 'None' && <span className="text-amber">Req: {s.perk}</span>}
            </div>
            <p className="text-pip-dim text-xs mt-1 leading-relaxed">{s.effect}</p>
          </div>
        ))}
      </div>
    </Modal>
  )
}
