import { useState, useMemo } from 'react'
import Modal from '../layout/Modal'
import itemsData from '../../data/items.json'

export default function AddItemModal({ isOpen, onClose, onAdd, poolItems = [] }) {
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [source, setSource] = useState(poolItems.length > 0 ? 'pool' : 'catalog')

  const subTypes = useMemo(() => {
    const set = new Set(itemsData.map(i => i.subType).filter(Boolean))
    return Array.from(set).sort()
  }, [])

  // Catalog items filtered by search/type
  const filteredCatalog = useMemo(() => {
    return itemsData.filter(item => {
      if (typeFilter && item.subType !== typeFilter) return false
      if (search && !item.name.toLowerCase().includes(search.toLowerCase())) return false
      return true
    })
  }, [search, typeFilter])

  // Pool items filtered by search (exclude boosts, show non-sold items)
  const filteredPool = useMemo(() => {
    return poolItems.filter(item => {
      if (item.isBoost) return false
      if (search && !item.name.toLowerCase().includes(search.toLowerCase())) return false
      if (typeFilter && item.subType !== typeFilter) return false
      return true
    })
  }, [poolItems, search, typeFilter])

  const poolSubTypes = useMemo(() => {
    const set = new Set(poolItems.filter(i => !i.isBoost).map(i => i.subType).filter(Boolean))
    return Array.from(set).sort()
  }, [poolItems])

  const displayedSubTypes = source === 'pool' ? poolSubTypes : subTypes
  const displayedItems = source === 'pool' ? filteredPool : filteredCatalog

  function handleSelect(item) {
    // Pool items store catalogId (items.json id); catalog items use item.id directly
    onAdd(source === 'pool' ? (item.catalogId ?? item.id) : item.id)
    onClose()
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="ADD ITEM / EQUIPMENT" wide>
      {/* Source Toggle */}
      {poolItems.length > 0 && (
        <div className="flex gap-1 mb-4">
          <button
            onClick={() => setSource('pool')}
            className={`flex-1 text-xs py-1.5 px-3 border rounded transition-colors font-bold tracking-wider ${
              source === 'pool'
                ? 'border-amber text-amber bg-amber-dim/20'
                : 'border-muted/40 text-muted hover:border-amber/50 hover:text-amber'
            }`}
          >
            SETTLEMENT POOL ({poolItems.filter(i => !i.isBoost).length})
          </button>
          <button
            onClick={() => setSource('catalog')}
            className={`flex-1 text-xs py-1.5 px-3 border rounded transition-colors font-bold tracking-wider ${
              source === 'catalog'
                ? 'border-pip text-pip bg-pip-dim/10'
                : 'border-muted/40 text-muted hover:border-pip/50 hover:text-pip'
            }`}
          >
            FULL CATALOG
          </button>
        </div>
      )}

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
          {displayedSubTypes.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>

      <div className="text-xs text-muted mb-2">{displayedItems.length} items</div>

      <div className="max-h-96 overflow-y-auto space-y-1">
        {source === 'pool' && displayedItems.length === 0 && (
          <p className="text-muted text-xs text-center py-4">No items in settlement pool. Switch to Full Catalog or add items via Settlement.</p>
        )}
        {displayedItems.map((item, idx) => (
          <div
            key={source === 'pool' ? `pool-${idx}` : item.id}
            className="flex items-center justify-between border border-muted/40 rounded px-3 py-2 hover:bg-panel-alt cursor-pointer transition-colors"
            onClick={() => handleSelect(item)}
          >
            <div className="flex-1 min-w-0">
              <span className="text-pip text-sm">{item.name}</span>
              {source === 'pool' && item.location && (
                <span className="ml-2 text-xs text-muted/60 uppercase">{item.location}</span>
              )}
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
