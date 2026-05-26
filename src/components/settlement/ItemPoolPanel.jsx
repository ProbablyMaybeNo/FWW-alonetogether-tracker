import { useState } from 'react'
import { Plus, X, ChevronDown, ChevronRight, Trash2 } from 'lucide-react'
import { useCampaign } from '../../context/CampaignContext'
import { getStructureRef } from '../../utils/calculations'

// Each Maintenance Shed / Stores holds "1 Item OR up to 2 Boosts".
// Model as 2 units of capacity per structure; an Item costs 2 units, a Boost costs 1.
const UNITS_PER_STRUCTURE = 2
function itemUnitCost(item) { return item?.isBoost ? 1 : UNITS_PER_STRUCTURE }
function unitsUsed(items) { return (items || []).reduce((s, i) => s + itemUnitCost(i), 0) }
function canFit(items, structureCount, candidate) {
  return unitsUsed(items) + itemUnitCost(candidate) <= structureCount * UNITS_PER_STRUCTURE
}

export default function ItemPoolPanel({ structures }) {
  const { state, setState } = useCampaign()
  const [collapsed, setCollapsed] = useState(false)
  const [activeTab, setActiveTab] = useState('recovery')

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

  const shedUnitsUsed = unitsUsed(storedItems)
  const shedUnitsMax = shedSlots * UNITS_PER_STRUCTURE
  const storesUnitsUsed = unitsUsed(storesItems)
  const storesUnitsMax = storesSlots * UNITS_PER_STRUCTURE

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

  function discardItem(item) {
    if (!confirm(`Discard "${item.name}"? This removes it from the pool with no caps refund.`)) return
    removeItem(item.id)
  }

  function discardAllRecovery() {
    if (!recoveryItems.length) return
    if (!confirm(`Discard all ${recoveryItems.length} recovery items? No caps refund.`)) return
    setState(prev => ({
      ...prev,
      itemPool: {
        ...prev.itemPool,
        items: prev.itemPool.items.filter(i => i.location !== 'recovery' && i.location !== 'Temp Pool'),
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

  // Keep item to shed (stored). Capacity: shedSlots * 2 units; Item = 2, Boost = 1.
  function keepToShed(item) {
    if (!canFit(storedItems, shedSlots, item)) {
      alert(`Maintenance Shed full — needs ${itemUnitCost(item) === 2 ? '1 Item slot' : '1 Boost slot'} (${shedUnitsUsed}/${shedUnitsMax} used). Build another Maintenance Shed.`)
      return
    }
    updateItem(item.id, { location: 'stored' })
  }

  function moveToLocker(item) {
    if (lockerItems.length + 1 > lockerSlots) {
      alert(`Lockers full (${lockerItems.length}/${lockerSlots} used). Build another Locker.`)
      return
    }
    updateItem(item.id, { location: 'locker' })
  }

  function assignToStores(item, unitSlotId) {
    if (!canFit(storesItems, storesSlots, item)) {
      alert(`Stores full — needs ${itemUnitCost(item) === 2 ? '1 Item slot' : '1 Boost slot'} (${storesUnitsUsed}/${storesUnitsMax} used). Build another Stores.`)
      return
    }
    updateItem(item.id, { location: 'stores', assignedUnit: unitSlotId })
  }

  const tabs = [
    { key: 'recovery', label: `POOL (${recoveryItems.length})` },
    { key: 'stored',   label: `SHED (${shedUnitsUsed}/${shedUnitsMax})` },
    { key: 'locker',   label: `LOCKERS (${lockerItems.length}/${lockerSlots})` },
    { key: 'stores',   label: `STORES (${storesUnitsUsed}/${storesUnitsMax})` },
  ]

  return (
    <div className="border border-white/20 rounded bg-panel mt-4">
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-panel-alt transition-colors"
        onClick={() => setCollapsed(!collapsed)}
      >
        <span className="text-title text-sm font-bold tracking-wider">ITEM POOL</span>
        <div className="flex items-center gap-2">
          <span className="text-muted text-xs">{items.length} items</span>
          {collapsed ? <ChevronRight size={14} className="text-muted" /> : <ChevronDown size={14} className="text-muted" />}
        </div>
      </div>

      {!collapsed && (
        <div className="border-t border-white/10 p-4">
          {/* Slot overview — Shed/Stores show units (Item = 2, Boost = 1; 2 units per structure) */}
          <div className="grid grid-cols-3 gap-2 mb-3">
            <div className={`border rounded bg-panel-alt p-2 text-center ${shedUnitsUsed > shedUnitsMax ? 'border-danger/60' : 'border-pip-mid/40'}`}>
              <div className={`font-bold text-sm ${shedUnitsUsed > shedUnitsMax ? 'text-danger' : 'text-pip'}`}>{shedUnitsUsed}/{shedUnitsMax}</div>
              <div className="text-muted text-xs">SHED slots</div>
            </div>
            <div className={`border rounded bg-panel-alt p-2 text-center ${lockerItems.length > lockerSlots ? 'border-danger/60' : 'border-pip-mid/40'}`}>
              <div className={`font-bold text-sm ${lockerItems.length > lockerSlots ? 'text-danger' : 'text-pip'}`}>{lockerItems.length}/{lockerSlots}</div>
              <div className="text-muted text-xs">LOCKERS</div>
            </div>
            <div className={`border rounded bg-panel-alt p-2 text-center ${storesUnitsUsed > storesUnitsMax ? 'border-danger/60' : 'border-pip-mid/40'}`}>
              <div className={`font-bold text-sm ${storesUnitsUsed > storesUnitsMax ? 'text-danger' : 'text-pip'}`}>{storesUnitsUsed}/{storesUnitsMax}</div>
              <div className="text-muted text-xs">STORES slots</div>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 mb-4 flex-wrap">
            {tabs.map(tab => {
              const isActive = activeTab === tab.key
              let activeClass = ''
              if (isActive) {
                if (tab.key === 'recovery') activeClass = 'border-pool-recovery text-pool-recovery bg-pool-recovery-dim/20'
                else if (tab.key === 'stored' || tab.key === 'locker') activeClass = 'border-pool-settlement text-pool-settlement bg-pool-settlement-dim/20'
                else if (tab.key === 'stores') activeClass = 'border-pool-battle text-pool-battle bg-pool-battle-dim/20'
              }
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`text-xs px-3 py-1.5 border rounded transition-colors ${
                    isActive
                      ? activeClass
                      : 'border-white/20 text-title/60 hover:text-title hover:border-white/40'
                  }`}
                >
                  {tab.label}
                </button>
              )
            })}
          </div>

          {/* RECOVERY TAB */}
          {activeTab === 'recovery' && (
            <div>
              <p className="text-muted text-xs mb-3">Items gathered from battle — keep, store, or sell</p>
              {recoveryItems.length === 0 ? (
                <p className="text-muted text-xs">No items in recovery pool.</p>
              ) : (
                <div className="space-y-1">
                  {recoveryItems.map(item => (
                    <div key={item.id} className="flex items-center gap-2 border border-pip-mid/30 border-l-2 border-l-pool-recovery/60 rounded px-3 py-2 bg-panel-light flex-wrap">
                      <span className="text-pip text-xs flex-1 min-w-0">{item.name}</span>
                      <span className="text-muted text-xs px-1.5 py-0.5 border border-muted/40 rounded">{item.subType}</span>
                      <span className="text-amber text-xs font-bold">{item.caps}c</span>
                      <div className="flex gap-1 flex-wrap">
                        <KeepDropdown
                          label="KEEP"
                          options={[
                            {
                              id: 'shed',
                              label: `→ Shed (${Math.max(0, shedUnitsMax - shedUnitsUsed)} left)`,
                              onClick: () => keepToShed(item),
                              disabled: !canFit(storedItems, shedSlots, item),
                              disabledReason: shedSlots === 0
                                ? 'Build a Maintenance Shed first'
                                : `Shed full (${shedUnitsUsed}/${shedUnitsMax} slots)`,
                            },
                            {
                              id: 'locker',
                              label: `→ Locker (${Math.max(0, lockerSlots - lockerItems.length)} left)`,
                              onClick: () => moveToLocker(item),
                              disabled: lockerItems.length >= lockerSlots,
                              disabledReason: lockerSlots === 0
                                ? 'Build a Locker first'
                                : `Lockers full (${lockerItems.length}/${lockerSlots})`,
                            },
                          ]}
                        />
                        <button
                          onClick={() => sellItem(item)}
                          className="text-xs px-2 py-0.5 border border-amber/40 rounded text-amber hover:bg-amber-dim/20"
                        >
                          Sell {item.caps}c
                        </button>
                        <button
                          onClick={() => discardItem(item)}
                          title="Discard (no caps refund)"
                          className="text-xs p-1 border border-muted/40 rounded text-muted hover:text-danger hover:border-danger transition-colors"
                          aria-label="Discard item"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                  ))}
                  <div className="pt-2 flex gap-2 flex-wrap">
                    <button
                      onClick={sellAllRecovery}
                      className="text-xs px-4 py-2 border border-amber/40 text-amber rounded hover:bg-amber-dim/10 transition-colors"
                    >
                      SELL ALL ({recoveryItems.reduce((s, i) => s + (i.caps || 0), 0)}c)
                    </button>
                    <button
                      onClick={discardAllRecovery}
                      className="text-xs px-4 py-2 border border-danger/40 text-danger rounded hover:bg-danger-dim/10 transition-colors flex items-center gap-1.5"
                    >
                      <Trash2 size={12} /> DISCARD ALL
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STORED TAB */}
          {activeTab === 'stored' && (
            <div>
              <p className="text-muted text-xs mb-3">
                Retained via Maintenance Shed (1 Item or 2 Boosts per Shed) — {shedUnitsUsed}/{shedUnitsMax} slots used
                {shedUnitsUsed > shedUnitsMax && <span className="text-danger ml-1">· OVER CAPACITY</span>}
              </p>
              {storedItems.length === 0 ? (
                <p className="text-muted text-xs">No stored items.</p>
              ) : (
                <div className="space-y-1">
                  {storedItems.map(item => (
                    <div key={item.id} className="flex items-center gap-2 border border-pip-mid/30 border-l-2 border-l-pool-settlement/60 rounded px-3 py-2 bg-panel-light flex-wrap">
                      <span className="text-pip text-xs flex-1 min-w-0">{item.name}</span>
                      <span className="text-muted text-xs px-1.5 py-0.5 border border-muted/40 rounded">{item.subType}</span>
                      <span className="text-amber text-xs font-bold">{item.caps}c</span>
                      <div className="flex gap-1 flex-wrap">
                        <button
                          onClick={() => moveToLocker(item)}
                          disabled={lockerItems.length >= lockerSlots}
                          title={lockerSlots === 0
                            ? 'Build a Locker first'
                            : `Lockers: ${lockerItems.length}/${lockerSlots} used`}
                          className="text-xs px-2 py-0.5 border border-muted rounded text-muted hover:text-pip hover:border-pip disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          → Locker ({Math.max(0, lockerSlots - lockerItems.length)})
                        </button>
                        <AssignUnitButton
                          item={item}
                          roster={roster}
                          label={`→ Stores (${Math.max(0, storesUnitsMax - storesUnitsUsed)})`}
                          disabled={!canFit(storesItems, storesSlots, item)}
                          disabledReason={storesSlots === 0 ? 'Build a Stores first' : `Stores full (${storesUnitsUsed}/${storesUnitsMax})`}
                          onAssign={(unitSlotId) => assignToStores(item, unitSlotId)}
                        />
                        <button
                          onClick={() => sellItem(item)}
                          className="text-xs px-2 py-0.5 border border-amber/40 rounded text-amber hover:bg-amber-dim/20"
                        >
                          Sell {item.caps}c
                        </button>
                        <button
                          onClick={() => discardItem(item)}
                          title="Discard (no caps refund)"
                          className="text-xs p-1 border border-muted/40 rounded text-muted hover:text-danger hover:border-danger transition-colors"
                          aria-label="Discard item"
                        >
                          <Trash2 size={12} />
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
                <p className="text-muted text-xs">{lockerItems.length}/{lockerSlots} slots used</p>
                {lockerItems.length > 0 && (
                  <button
                    onClick={returnLockerToPool}
                    className="text-xs px-3 py-1 border border-danger text-danger hover:bg-danger-dim/10"
                  >
                    RETURN LOCKER ITEMS TO POOL
                  </button>
                )}
              </div>
              {lockerItems.length === 0 ? (
                <p className="text-muted text-xs">No items in lockers.</p>
              ) : (
                <div className="space-y-1">
                  {lockerItems.map(item => (
                    <div key={item.id} className="flex items-center gap-2 border border-pip-mid/30 border-l-2 border-l-pool-settlement/60 rounded px-3 py-2 bg-panel-light flex-wrap">
                      <span className="text-pip text-xs flex-1 min-w-0">{item.name}</span>
                      <span className="text-muted text-xs px-1.5 py-0.5 border border-muted/40 rounded">{item.subType}</span>
                      <span className="text-amber text-xs font-bold">{item.caps}c</span>
                      <div className="flex gap-1 flex-wrap">
                        <button
                          onClick={() => updateItem(item.id, { location: 'stored' })}
                          className="text-xs px-2 py-0.5 border border-muted rounded text-muted hover:text-pip hover:border-pip"
                        >
                          Move to Pool
                        </button>
                        <button
                          onClick={() => sellItem(item)}
                          className="text-xs px-2 py-0.5 border border-amber/40 rounded text-amber hover:bg-amber-dim/20"
                        >
                          Sell {item.caps}c
                        </button>
                        <button
                          onClick={() => discardItem(item)}
                          title="Discard (no caps refund)"
                          className="text-xs p-1 border border-muted/40 rounded text-muted hover:text-danger hover:border-danger transition-colors"
                          aria-label="Discard item"
                        >
                          <Trash2 size={12} />
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
                <p className="text-muted text-xs">
                  Items assigned to units for next battle (1 Item or 2 Boosts per Stores) — {storesUnitsUsed}/{storesUnitsMax} slots used
                  {storesUnitsUsed > storesUnitsMax && <span className="text-danger ml-1">· OVER CAPACITY</span>}
                </p>
                {storesItems.length > 0 && (
                  <button
                    onClick={clearAllStores}
                    className="text-xs px-3 py-1 border border-danger text-danger hover:bg-danger-dim/10"
                  >
                    CLEAR ALL STORES
                  </button>
                )}
              </div>
              {storesItems.length === 0 ? (
                <p className="text-muted text-xs">No items in stores assignments.</p>
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
                          <div className="text-muted text-xs mb-1 font-bold">
                            {unit ? unit.unitName : 'Unassigned'}
                          </div>
                          <div className="space-y-1 ml-2">
                            {groupItems.map(item => (
                              <div key={item.id} className="flex items-center gap-2 border border-pip-mid/30 border-l-2 border-l-pool-battle/60 rounded px-3 py-2 bg-panel-light flex-wrap">
                                <span className="text-pip text-xs flex-1 min-w-0">{item.name}</span>
                                <span className="text-muted text-xs">{item.subType}</span>
                                <span className="text-amber text-xs font-bold">{item.caps}c</span>
                                <button
                                  onClick={() => updateItem(item.id, { location: 'stored', assignedUnit: null })}
                                  className="text-xs px-2 py-0.5 border border-muted rounded text-muted hover:text-pip hover:border-pip"
                                >
                                  Unassign
                                </button>
                                <button
                                  onClick={() => discardItem(item)}
                                  title="Discard (no caps refund)"
                                  className="text-xs p-1 border border-muted/40 rounded text-muted hover:text-danger hover:border-danger transition-colors"
                                  aria-label="Discard item"
                                >
                                  <Trash2 size={12} />
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
              <p className="text-muted text-xs mt-3 italic">These items count toward your battle force caps</p>
            </div>
          )}
        </div>
      )}

    </div>
  )
}

/**
 * Compact dropdown that collapses multiple "move/keep" destinations into one button.
 * Each option: { id, label, onClick, disabled, disabledReason }
 */
function KeepDropdown({ label = 'KEEP', options = [] }) {
  const [open, setOpen] = useState(false)
  const allDisabled = options.every(o => o.disabled)
  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        disabled={allDisabled}
        title={allDisabled ? 'No storage available — build a Shed, Locker, or Stores first' : undefined}
        className="text-xs px-2 py-0.5 border border-pip/50 rounded text-pip hover:bg-pip-dim/20 transition-colors flex items-center gap-1 disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {label} <ChevronDown size={10} />
      </button>
    )
  }
  return (
    <div className="flex gap-1 flex-wrap items-center">
      {options.map(opt => (
        <button
          key={opt.id}
          type="button"
          onClick={() => { if (!opt.disabled) { opt.onClick(); setOpen(false) } }}
          disabled={opt.disabled}
          title={opt.disabled ? opt.disabledReason : undefined}
          className="text-xs px-2 py-0.5 border border-muted rounded text-muted hover:text-pip hover:border-pip disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {opt.label}
        </button>
      ))}
      <button
        type="button"
        onClick={() => setOpen(false)}
        className="text-muted hover:text-danger text-xs px-1"
        aria-label="Close menu"
      >
        <X size={10} />
      </button>
    </div>
  )
}

function AssignUnitButton({ item, roster, onAssign, disabled = false, disabledReason = '', label = 'Assign to Unit' }) {
  const [open, setOpen] = useState(false)

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        disabled={disabled}
        title={disabled ? disabledReason : undefined}
        className="text-xs px-2 py-0.5 border border-muted rounded text-muted hover:text-pip hover:border-pip disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {label}
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
      <button onClick={() => setOpen(false)} className="text-muted hover:text-danger">
        <X size={12} />
      </button>
    </div>
  )
}
