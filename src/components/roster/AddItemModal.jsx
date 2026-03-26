import { useState, useMemo } from 'react'
import Modal from '../layout/Modal'
import itemsData from '../../data/items.json'

export default function AddItemModal({ isOpen, onClose, onAdd }) {
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('')

  const subTypes = useMemo(() => {
    const set = new Set(itemsData.map(i => i.subType).filter(Boolean))
    return Array.from(set).sort()
  }, [])

  const filtered = useMemo(() => {
    return itemsData.filter(item => {
      if (typeFilter && item.subType !== typeFilter) return false
      if (search && !item.name.toLowerCase().includes(search.toLowerCase())) return false
      return true
    })
  }, [search, typeFilter])

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="ADD ITEM / EQUIPMENT" wide>
      <div className="flex gap-2 mb-4">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search items..."
          className="flex-1 text-xs"
          autoFocus
        />
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="text-xs w-48"
        >
          <option value="">All Types</option>
          {subTypes.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>

      <div className="text-xs text-muted mb-2">{filtered.length} items</div>

      <div className="max-h-96 overflow-y-auto space-y-1">
        {filtered.map(item => (
          <div
            key={item.id}
            className="flex items-center justify-between border border-muted/40 rounded px-3 py-2 hover:bg-panel-alt cursor-pointer transition-colors"
            onClick={() => { onAdd(item.id); onClose() }}
          >
            <div className="flex-1 min-w-0">
              <span className="text-pip text-sm">{item.name}</span>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <span className="text-xs text-muted">{item.subType}</span>
              <span className="text-amber text-sm font-bold">{item.caps}c</span>
            </div>
          </div>
        ))}
      </div>
    </Modal>
  )
}
