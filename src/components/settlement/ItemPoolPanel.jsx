import { useState, useMemo } from 'react'
import { Plus, X, ChevronDown, ChevronRight } from 'lucide-react'
import Modal from '../layout/Modal'
import { useCampaign } from '../../context/CampaignContext'
import { getStructureRef } from '../../utils/calculations'
import itemsData from '../../data/items.json'

const SUBTYPES = ['Weapon', 'Armor', 'Chem', 'Food', 'Drink', 'Boost', 'Gear', 'Junk', 'Other']

function AddItemToPoolModal({ isOpen, onClose, onAdd }) {
  const [search, setSearch] = useState('')
  const [customMode, setCustomMode] = useState(false)
  const [customName, setCustomName] = useState('')
  const [customCaps, setCustomCaps] = useState(0)
  const [customSubType, setCustomSubType] = useState('Other')
  const [customIsBoost, setCustomIsBoost] = useState(false)

  const searchResults = useMemo(() => {
    if (!search.trim()) return []
    const q = search.toLowerCase()
    return itemsData.filter(i => i.name.toLowerCase().includes(q)).slice(0, 20)
  }, [search])

  function handleAddFromSearch(item) {
    onAdd({
      id: Date.now() + Math.random(),
      name: item.name,
      caps: item.caps,
      subType: item.subType,
      isBoost: false,
      location: 'recovery',
      assignedUnit: null,
    })
    onClose()
  }

  function handleAddCustom() {
    if (!customName.trim()) return
    onAdd({
      id: Date.now() + Math.random(),
      name: customName.trim(),
      caps: parseInt(customCaps) || 0,
      subType: customSubType,
      isBoost: customIsBoost,
      location: 'recovery',
      assignedUnit: null,
    })
    onClose()
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="ADD ITEM TO RECOVERY POOL">
      <div className="space-y-4">
        <div className="flex gap-2">
          <button
            onClick={() => setCustomMode(false)}
            className={`flex-1 py-1.5 text-xs border rounded ${!customMode ? 'border-pip text-pip' : 'border-pip-dim text-pip-dim hover:text-pip'}`}
          >
            SEARCH ITEMS
          </button>
          <button
            onClick={() => setCustomMode(true)}
            className={`flex-1 py-1.5 text-xs border rounded ${customMode ? 'border-pip text-pip' : 'border-pip-dim text-pip-dim hover:text-pip'}`}
          >
            CUSTOM ITEM
          </button>
        </div>

        {!customMode ? (
          <div>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search items by name..."
              className="w-full text-xs py-1 px-2 mb-2"
              autoFocus
            />
            <div className="max-h-64 overflow-y-auto space-y-1">
              {searchResults.length === 0 && search.trim() && (
                <p className="text-pip-dim text-xs">No results. Try custom item.</p>
              )}
              {searchResults.map(item => (
                <div
                  key={item.id}
                  onClick={() => handleAddFromSearch(item)}
                  className="flex items-center justify-between border border-pip-dim/30 rounded px-3 py-2 hover:bg-panel-alt cursor-pointer"
                >
                  <span className="text-pip text-xs">{item.name}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-pip-dim text-xs">{item.subType}</span>
                    <span className="text-amber text-xs font-bold">{item.caps}c</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div>
              <label className="text-xs text-pip-dim block mb-1">ITEM NAME</label>
              <input type="text" value={customName} onChange={(e) => setCustomName(e.target.value)} className="w-full text-xs py-1 px-2" placeholder="Item name..." autoFocus />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-pip-dim block mb-1">CAPS VALUE</label>
                <input type="number" min="0" value={customCaps} onChange={(e) => setCustomCaps(e.target.value)} className="w-full text-xs py-1 px-2" />
              </div>
              <div>
                <label className="text-xs text-pip-dim block mb-1">SUB TYPE</label>
                <select value={customSubType} onChange={(e) => setCustomSubType(e.target.value)} className="w-full text-xs py-1 px-2">
                  {SUBTYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={customIsBoost} onChange={(e) => setCustomIsBoost(e.target.checked)} className="accent-pip" />
              <span className="text-xs text-pip-dim">IS BOOST (takes 0.5 slots)</span>
            </label>
            <button
              onClick={handleAddCustom}
              disabled={!customName.trim()}
              className="w-full py-2 border border-pip text-pip text-xs rounded hover:bg-pip-dim/30 disabled:opacity-40"
            >
              ADD TO RECOVERY
            </button>
          </div>
        )}
      </div>
    </Modal>
  )
}

export default function ItemPoolPanel({ structures }) {
  const { state, setState } = useCampaign()
  const [collapsed, setCollapsed] = useState(false)
  const [activeTab, setActiveTab] = useState('recovery')
  const [showAddItem, setShowAddItem] = useState(false)

  const items = state.itemPool?.items || []
  const roster = state.roster || []

  // Compute slot counts from structures
  const shedCount = structures.filter(s => getStructureRef(s.structureId)?.name === 'Maintenance Shed').length
  const lockerCount = structures.filter(s => getStructureRef(s.structureId)?.name === 'Lockers').length
  const storesCount = structures.filter(s => getStructureRef(s.structureId)?.name === 'Stores').length

  const shedSlots = shedCount
  const lockerSlots = lockerCount
  const storesSlots = storesCount

  const recoveryItems = items.filter(i => i.location === 'recovery' || i.location === 'Temp Pool')
  const storedItems = items.filter(i => i.location === 'stored' || i.location === 'Maint. Shed')
  const lockerItems = items.filter(i => i.location === 'locker' || i.location === 'Locker')
  const storesItems = items.filter(i => i.location === 'stores' || i.location === 'Stores')

  function updateItem(id, changes) {
    setState(prev => ({
      ...prev,
      itemPool: {
        ...prev.itemPool,
        items: prev.itemPool.items.map(i => i.id === id ? { ...i, ...changes } : i),
      },
    }))
  }

  function removeItem(id) {
    setState(prev => ({
      ...prev,
      itemPool: {
        ...prev.itemPool,
        items: prev.itemPool.items.filter(i => i.id !== id),
      },
    }))
  }

  function addItem(item) {
    setState(prev => ({
      ...prev,
      itemPool: {
        ...prev.itemPool,
        items: [...(prev.itemPool.items || []), item],
      },
    }))
  }

  function sellItem(item) {
    setState(prev => ({
      ...prev,
      caps: (prev.caps || 0) + (item.caps || 0),
      itemPool: {
        ...prev.itemPool,
        items: prev.itemPool.items.filter(i => i.id !== item.id),
      },
    }))
  }

  function sellAllRecovery() {
    const total = recoveryItems.reduce((s, i) => s + (i.caps || 0), 0)
    if (!confirm(`Sell all ${recoveryItems.length} recovery items for ${total}c?`)) return
    setState(prev => ({
      ...prev,
      caps: (prev.caps || 0) + total,
      itemPool: {
        ...prev.itemPool,
        items: prev.itemPool.items.filter(i => i.location !== 'recovery' && i.location !== 'Temp Pool'),
      },
    }))
  }

  function returnLockerToPool() {
    if (!lockerItems.length) return
    setState(prev => ({
      ...prev,
      itemPool: {
        ...prev.itemPool,
        items: prev.itemPool.items.map(i =>
          (i.location === 'locker' || i.location === 'Locker')
            ? { ...i, location: 'recovery' }
            : i
        ),
      },
    }))
  }

  function clearAllStores() {
    setState(prev => ({
      ...prev,
      itemPool: {
        ...prev.itemPool,
        items: prev.itemPool.items.map(i =>
          (i.location === 'stores' || i.location === 'Stores')
            ? { ...i, location: 'stored', assignedUnit: null }
            : i
        ),
      },
    }))
  }

  // Keep item to shed (stored)
  function keepToShed(item) {
    const nonBoostStored = storedItems.filter(i => !i.isBoost).length
    const boostStored = storedItems.filter(i => i.isBoost).length
    if (!item.isBoost && nonBoostStored >= shedSlots && shedSlots > 0) {
      alert(`Maintenance Shed full (${shedSlots} slots used)`)
      return
    }
    updateItem(item.id, { location: 'stored' })
  }

  function moveToLocker(item) {
    const lockerUsed = lockerItems.length
    if (lockerUsed >= lockerSlots && lockerSlots > 0) {
      alert(`Lockers full (${lockerSlots} slots used)`)
      return
    }
    updateItem(item.id, { location: 'locker' })
  }

  const tabs = [
    { key: 'recovery', label: `RECOVERY (${recoveryItems.length})` },
    { key: 'stored', label: `STORED (${storedItems.length}/${shedSlots || '0'})` },
    { key: 'locker', label: `LOCKERS (${lockerItems.length}/${lockerSlots || '0'})` },
    { key: 'stores', label: `STORES (${storesItems.length})` },
  ]

  return (
    <div className="border border-pip-dim/50 rounded bg-panel mt-4">
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-panel-alt transition-colors"
        onClick={() => setCollapsed(!collapsed)}
      >
        <span className="text-pip text-sm font-bold tracking-wider">ITEM POOL</span>
        <div className="flex items-center gap-2">
          <span className="text-pip-dim text-xs">{items.length} items</span>
          {collapsed ? <ChevronRight size={14} className="text-pip-dim" /> : <ChevronDown size={14} className="text-pip-dim" />}
        </div>
      </div>

      {!collapsed && (
        <div className="border-t border-pip-dim/30 p-4">
          {/* Slot overview */}
          <div className="flex gap-3 text-xs text-pip-dim mb-3 flex-wrap">
            <span>Sheds: <span className="text-pip">{shedSlots}</span> slots</span>
            <span>Lockers: <span className="text-pip">{lockerSlots}</span> slots</span>
            <span>Stores: <span className="text-pip">{storesSlots}</span> slots</span>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 mb-4 flex-wrap">
            {tabs.map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`text-xs px-3 py-1.5 border rounded transition-colors ${
                  activeTab === tab.key
                    ? 'border-pip text-pip bg-pip-dim/20'
                    : 'border-pip-dim/40 text-pip-dim hover:text-pip'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* RECOVERY TAB */}
          {activeTab === 'recovery' && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-pip-dim text-xs">Items from last battle pending decisions</span>
                <button
                  onClick={() => setShowAddItem(true)}
                  className="flex items-center gap-1 text-xs px-3 py-1 border border-pip-dim rounded text-pip-dim hover:text-pip"
                >
                  <Plus size={12} /> ADD ITEM
                </button>
              </div>
              {recoveryItems.length === 0 ? (
                <p className="text-pip-dim text-xs">No items in recovery pool.</p>
              ) : (
                <div className="space-y-1">
                  {recoveryItems.map(item => (
                    <div key={item.id} className="flex items-center gap-2 border border-pip-dim/20 rounded px-3 py-2 bg-panel-light flex-wrap">
                      <span className="text-pip text-xs flex-1 min-w-0">{item.name}</span>
                      <span className="text-pip-dim text-xs px-1.5 py-0.5 border border-pip-dim/30 rounded">{item.subType}</span>
                      <span className="text-amber text-xs font-bold">{item.caps}c</span>
                      <div className="flex gap-1 flex-wrap">
                        <button
                          onClick={() => keepToShed(item)}
                          disabled={!item.isBoost && storedItems.filter(i => !i.isBoost).length >= shedSlots && shedSlots > 0}
                          className="text-xs px-2 py-0.5 border border-pip-dim rounded text-pip-dim hover:text-pip disabled:opacity-40 disabled:cursor-not-allowed"
                          title={`Keep in Maintenance Shed (${storedItems.filter(i => !i.isBoost).length}/${shedSlots} used)`}
                        >
                          Keep ({shedSlots - storedItems.filter(i => !i.isBoost).length} left)
                        </button>
                        <button
                          onClick={() => moveToLocker(item)}
                          disabled={lockerItems.length >= lockerSlots && lockerSlots > 0}
                          className="text-xs px-2 py-0.5 border border-pip-dim rounded text-pip-dim hover:text-pip disabled:opacity-40 disabled:cursor-not-allowed"
                          title={`Move to Locker (${lockerItems.length}/${lockerSlots} used)`}
                        >
                          Locker ({lockerSlots - lockerItems.length} left)
                        </button>
                        <button
                          onClick={() => sellItem(item)}
                          className="text-xs px-2 py-0.5 border border-amber/40 rounded text-amber hover:bg-amber-dim/20"
                        >
                          Sell {item.caps}c
                        </button>
                      </div>
                    </div>
                  ))}
                  <div className="pt-2">
                    <button
                      onClick={sellAllRecovery}
                      className="text-xs px-4 py-2 border border-danger/40 text-danger rounded hover:bg-danger-dim/10 transition-colors"
                    >
                      SELL ALL REMAINING ({recoveryItems.reduce((s, i) => s + (i.caps || 0), 0)}c)
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STORED TAB */}
          {activeTab === 'stored' && (
            <div>
              <p className="text-pip-dim text-xs mb-3">Retained via Maintenance Shed — permanent item pool</p>
              {storedItems.length === 0 ? (
                <p className="text-pip-dim text-xs">No stored items.</p>
              ) : (
                <div className="space-y-1">
                  {storedItems.map(item => (
                    <div key={item.id} className="flex items-center gap-2 border border-pip-dim/20 rounded px-3 py-2 bg-panel-light flex-wrap">
                      <span className="text-pip text-xs flex-1 min-w-0">{item.name}</span>
                      <span className="text-pip-dim text-xs px-1.5 py-0.5 border border-pip-dim/30 rounded">{item.subType}</span>
                      <span className="text-amber text-xs font-bold">{item.caps}c</span>
                      <div className="flex gap-1 flex-wrap">
                        <AssignUnitButton item={item} roster={roster} onAssign={(unitSlotId) => {
                          updateItem(item.id, { location: 'stores', assignedUnit: unitSlotId })
                        }} />
                        <button
                          onClick={() => sellItem(item)}
                          className="text-xs px-2 py-0.5 border border-amber/40 rounded text-amber hover:bg-amber-dim/20"
                        >
                          Sell {item.caps}c
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* LOCKER TAB */}
          {activeTab === 'locker' && (
            <div>
              <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                <p className="text-pip-dim text-xs">{lockerItems.length}/{lockerSlots} slots used</p>
                {lockerItems.length > 0 && (
                  <button
                    onClick={returnLockerToPool}
                    className="text-xs px-3 py-1 border border-pip-dim rounded text-pip-dim hover:text-pip"
                  >
                    RETURN LOCKER ITEMS TO POOL
                  </button>
                )}
              </div>
              {lockerItems.length === 0 ? (
                <p className="text-pip-dim text-xs">No items in lockers.</p>
              ) : (
                <div className="space-y-1">
                  {lockerItems.map(item => (
                    <div key={item.id} className="flex items-center gap-2 border border-pip-dim/20 rounded px-3 py-2 bg-panel-light flex-wrap">
                      <span className="text-pip text-xs flex-1 min-w-0">{item.name}</span>
                      <span className="text-pip-dim text-xs px-1.5 py-0.5 border border-pip-dim/30 rounded">{item.subType}</span>
                      <span className="text-amber text-xs font-bold">{item.caps}c</span>
                      <div className="flex gap-1">
                        <button
                          onClick={() => updateItem(item.id, { location: 'stored' })}
                          className="text-xs px-2 py-0.5 border border-pip-dim rounded text-pip-dim hover:text-pip"
                        >
                          Move to Pool
                        </button>
                        <button
                          onClick={() => sellItem(item)}
                          className="text-xs px-2 py-0.5 border border-amber/40 rounded text-amber hover:bg-amber-dim/20"
                        >
                          Sell {item.caps}c
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* STORES TAB */}
          {activeTab === 'stores' && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <p className="text-pip-dim text-xs">Items assigned to units for next battle</p>
                {storesItems.length > 0 && (
                  <button
                    onClick={clearAllStores}
                    className="text-xs px-3 py-1 border border-pip-dim rounded text-pip-dim hover:text-pip"
                  >
                    CLEAR ALL STORES
                  </button>
                )}
              </div>
              {storesItems.length === 0 ? (
                <p className="text-pip-dim text-xs">No items in stores assignments.</p>
              ) : (
                <div className="space-y-3">
                  {/* Group by assigned unit */}
                  {(() => {
                    const groups = {}
                    storesItems.forEach(item => {
                      const key = item.assignedUnit ?? 'unassigned'
                      if (!groups[key]) groups[key] = []
                      groups[key].push(item)
                    })
                    return Object.entries(groups).map(([unitKey, groupItems]) => {
                      const unit = roster.find(u => String(u.slotId) === String(unitKey))
                      return (
                        <div key={unitKey}>
                          <div className="text-pip-dim text-xs mb-1 font-bold">
                            {unit ? unit.unitName : 'Unassigned'}
                          </div>
                          <div className="space-y-1 ml-2">
                            {groupItems.map(item => (
                              <div key={item.id} className="flex items-center gap-2 border border-pip-dim/20 rounded px-3 py-2 bg-panel-light flex-wrap">
                                <span className="text-pip text-xs flex-1 min-w-0">{item.name}</span>
                                <span className="text-pip-dim text-xs">{item.subType}</span>
                                <span className="text-amber text-xs font-bold">{item.caps}c</span>
                                <button
                                  onClick={() => updateItem(item.id, { location: 'stored', assignedUnit: null })}
                                  className="text-xs px-2 py-0.5 border border-pip-dim rounded text-pip-dim hover:text-pip"
                                >
                                  Unassign
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )
                    })
                  })()}
                </div>
              )}
              <p className="text-pip-dim text-xs mt-3 italic">These items count toward your battle force caps</p>
            </div>
          )}
        </div>
      )}

      <AddItemToPoolModal isOpen={showAddItem} onClose={() => setShowAddItem(false)} onAdd={addItem} />
    </div>
  )
}

function AssignUnitButton({ item, roster, onAssign }) {
  const [open, setOpen] = useState(false)

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="text-xs px-2 py-0.5 border border-pip-dim rounded text-pip-dim hover:text-pip"
      >
        Assign to Unit
      </button>
    )
  }

  return (
    <div className="flex gap-1 flex-wrap">
      <select
        autoFocus
        onChange={(e) => {
          if (e.target.value) {
            onAssign(parseInt(e.target.value))
            setOpen(false)
          }
        }}
        defaultValue=""
        className="text-xs py-0.5 px-1"
      >
        <option value="">Pick unit...</option>
        {roster.map(u => (
          <option key={u.slotId} value={u.slotId}>{u.unitName}</option>
        ))}
      </select>
      <button onClick={() => setOpen(false)} className="text-pip-dim hover:text-danger">
        <X size={12} />
      </button>
    </div>
  )
}
